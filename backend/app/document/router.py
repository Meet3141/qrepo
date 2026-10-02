import uuid
from typing import List
from fastapi import APIRouter, Depends, status, UploadFile, File
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.api.dependencies import get_current_active_user, RequireRole
from app.permissions.catalog import DOCUMENTS_DELETE, DOCUMENTS_UPLOAD
from app.permissions.dependencies import RequirePermission
from app.auth.models import User
from app.document.schemas import DocumentResponse, DocumentUpdate
from app.document.service import DocumentService
from app.document.storage import DocumentStorage
from app.document.dependencies import get_document_service, get_document_storage, get_ingestion_service
from app.shared.responses import APIResponse
from app.core.exceptions import AppException

unit_document_router = APIRouter()
document_router = APIRouter()

# -----------------------------
# Unit Document Endpoints
# -----------------------------

@unit_document_router.post(
    "/{unit_id}/documents",
    response_model=APIResponse[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new Document to a Unit"
)
async def upload_document(
    unit_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(RequirePermission(DOCUMENTS_UPLOAD)),
    service: DocumentService = Depends(get_document_service),
    storage: DocumentStorage = Depends(get_document_storage)
):
    # We must first verify the unit and faculty ownership before saving the physical file 
    # to avoid unnecessary disk I/O for unauthorized users.
    service._verify_faculty_ownership(unit_id, current_user)
    
    # 1. Save physical file
    file_metadata = await storage.save_document(file)
    
    # 2. Create DB Record
    try:
        document = service.create_document(
            unit_id=unit_id,
            file_name=file_metadata["file_name"],
            file_type=file_metadata["file_type"],
            file_size=file_metadata["file_size"],
            storage_path=file_metadata["storage_path"],
            current_user=current_user
        )
    except Exception as e:
        # Failure cleanup
        storage.delete_document(file_metadata["storage_path"])
        raise e
    finally:
        await file.close()
        
    response_data = DocumentResponse.model_validate(document)
    return APIResponse(success=True, message="Document uploaded successfully", data=response_data)


@unit_document_router.get(
    "/{unit_id}/documents",
    response_model=APIResponse[List[DocumentResponse]],
    summary="List all Documents for a Unit"
)
def get_documents_by_unit(
    unit_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: DocumentService = Depends(get_document_service)
):
    documents = service.get_documents_by_unit(unit_id)
    response_data = [DocumentResponse.model_validate(d) for d in documents]
    return APIResponse(success=True, message="Documents retrieved", data=response_data)


# -----------------------------
# Document Endpoints
# -----------------------------

@document_router.get(
    "/{document_id}",
    response_model=APIResponse[DocumentResponse],
    summary="Get a Document by ID"
)
def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: DocumentService = Depends(get_document_service)
):
    document = service.get_document(document_id)
    response_data = DocumentResponse.model_validate(document)
    return APIResponse(success=True, message="Document retrieved", data=response_data)


@document_router.put(
    "/{document_id}",
    response_model=APIResponse[DocumentResponse],
    summary="Update a Document"
)
def update_document(
    document_id: uuid.UUID,
    data: DocumentUpdate,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY])),
    service: DocumentService = Depends(get_document_service)
):
    document = service.update_document(document_id, data, current_user)
    response_data = DocumentResponse.model_validate(document)
    return APIResponse(success=True, message="Document updated", data=response_data)


@document_router.delete(
    "/{document_id}",
    response_model=APIResponse[None],
    summary="Delete a Document"
)
def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(RequirePermission(DOCUMENTS_DELETE)),
    service: DocumentService = Depends(get_document_service),
    storage: DocumentStorage = Depends(get_document_storage)
):
    # Verify Document exists and RBAC applies
    document = service.get_document(document_id)
    service._verify_faculty_ownership(document.unit_id, current_user)
    
    # 1. Delete physical file
    storage.delete_document(document.storage_path)
    
    # 2. Delete database record
    service.delete_document(document_id, current_user)
    
    return APIResponse(success=True, message="Document deleted")

@document_router.post(
    "/{document_id}/process",
    response_model=APIResponse[DocumentResponse],
    summary="Trigger ingestion process for a Document"
)
def process_document(
    document_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY])),
    service: DocumentService = Depends(get_document_service),
    ingestion_service = Depends(get_ingestion_service)
):
    document = service.get_document(document_id)
    service._verify_faculty_ownership(document.unit_id, current_user)
    
    processed_doc = ingestion_service.ingest_document(document_id)
    response_data = DocumentResponse.model_validate(processed_doc)
    return APIResponse(success=True, message="Document processed", data=response_data)

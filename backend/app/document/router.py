import uuid
import mimetypes
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, status, UploadFile, File
from fastapi.responses import FileResponse
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.api.dependencies import get_current_active_user, RequireRole
from app.permissions.catalog import DOCUMENTS_DELETE, DOCUMENTS_UPLOAD
from app.permissions.dependencies import RequirePermission
from app.auth.models import User
from app.document.schemas import DocumentResponse, DocumentUpdate
from app.document.service import DocumentService
from app.document.storage import DocumentStorage
from app.document.dependencies import get_document_service, get_document_storage, get_ingestion_service
from app.subject.repository import UnitRepository, SubjectRepository
from app.db.init_db import get_db
from sqlalchemy.orm import Session
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


@document_router.get(
    "/{document_id}/download",
    summary="Download the physical file for a Document",
    response_class=FileResponse
)
def download_document(
    document_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: DocumentService = Depends(get_document_service),
    storage: DocumentStorage = Depends(get_document_storage),
    db: Session = Depends(get_db)
):
    document = service.get_document(document_id)

    # Students may only download documents from subjects within their own department
    if current_user.role and current_user.role.name == ROLE_STUDENT:
        if not current_user.department_id:
            raise AppException("Your account is not assigned to a department", status_code=403)
        unit_repo = UnitRepository(db)
        subject_repo = SubjectRepository(db)
        unit = unit_repo.get_by_id(document.unit_id)
        if not unit:
            raise AppException("Document unit not found", status_code=404)
        subject = subject_repo.get_by_id(unit.subject_id)
        if not subject:
            raise AppException("Subject not found", status_code=404)
        # Resolve subject department via the faculty member who owns it
        from app.auth.repository import UserRepository
        faculty_repo = UserRepository(db)
        faculty = faculty_repo.get_user_by_id(subject.faculty_id) if subject.faculty_id else None
        subject_dept = faculty.department_id if faculty else None
        if subject_dept != current_user.department_id:
            raise AppException("You can only download documents from your own department", status_code=403)

    # storage_path is stored relative (e.g. "media/documents/<uuid>.pdf").
    # Use the storage object's resolved dir (absolute on disk) + the filename.
    file_path = (storage.storage_dir.resolve() / Path(document.storage_path).name)
    if not file_path.exists():
        raise AppException("Physical file not found on server", status_code=404)

    # Determine media type from stored file_type or fall back to extension sniff
    media_type = document.file_type or (mimetypes.guess_type(document.file_name)[0] or "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=document.file_name,        # sets Content-Disposition: attachment; filename=...
        headers={"Content-Disposition": f'attachment; filename="{document.file_name}"'}
    )


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

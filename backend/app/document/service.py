import uuid
from typing import Sequence
from app.document.repository import DocumentRepository
from app.subject.repository import UnitRepository, SubjectRepository
from app.document.models import Document
from app.document.schemas import DocumentCreate, DocumentUpdate
from app.core.exceptions import AppException
from app.auth.constants import ROLE_FACULTY, ROLE_ADMIN, ROLE_HOD
from app.auth.models import User

class DocumentService:
    def __init__(
        self,
        document_repo: DocumentRepository,
        unit_repo: UnitRepository,
        subject_repo: SubjectRepository
    ):
        self.document_repo = document_repo
        self.unit_repo = unit_repo
        self.subject_repo = subject_repo

    def _verify_faculty_ownership(self, unit_id: uuid.UUID, current_user: User) -> None:
        """
        Enforces that if the current user is a Faculty, they can only manage
        documents for the subjects explicitly assigned to them.
        Admins and HODs inherently have global access.
        """
        if current_user.role and current_user.role.name in [ROLE_ADMIN, ROLE_HOD]:
            return
            
        if current_user.role and current_user.role.name == ROLE_FACULTY:
            unit = self.unit_repo.get_by_id(unit_id)
            if not unit:
                raise AppException("Unit not found", status_code=404)
                
            subject = self.subject_repo.get_by_id(unit.subject_id)
            if not subject:
                raise AppException("Subject not found", status_code=404)
                
            if subject.faculty_id != current_user.id:
                raise AppException("You can only manage documents for subjects assigned to you", status_code=403)
            return
            
        raise AppException("You do not have permission to manage documents", status_code=403)

    def get_document(self, document_id: uuid.UUID) -> Document:
        document = self.document_repo.get_by_id(document_id)
        if not document:
            raise AppException("Document not found", status_code=404)
        return document

    def get_documents_by_unit(self, unit_id: uuid.UUID) -> Sequence[Document]:
        unit = self.unit_repo.get_by_id(unit_id)
        if not unit:
            raise AppException("Unit not found", status_code=404)
        return self.document_repo.get_by_unit_id(unit_id)

    def get_all_documents(self) -> Sequence[Document]:
        return self.document_repo.get_all()

    def create_document(self, unit_id: uuid.UUID, file_name: str, file_type: str, file_size: int, storage_path: str, current_user: User) -> Document:
        unit = self.unit_repo.get_by_id(unit_id)
        if not unit:
            raise AppException("Unit not found", status_code=404)

        self._verify_faculty_ownership(unit_id, current_user)

        data = DocumentCreate(
            unit_id=unit_id,
            uploaded_by=current_user.id,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            storage_path=storage_path,
            processing_status="PENDING"
        )
        
        document = self.document_repo.create(data)
        if not document:
            raise AppException("Failed to create document", status_code=500)
        return document

    def update_document(self, document_id: uuid.UUID, data: DocumentUpdate, current_user: User) -> Document:
        document = self.get_document(document_id)
        self._verify_faculty_ownership(document.unit_id, current_user)
        
        updated_document = self.document_repo.update(document, data)
        if not updated_document:
            raise AppException("Failed to update document", status_code=500)
            
        return updated_document

    def delete_document(self, document_id: uuid.UUID, current_user: User) -> None:
        document = self.get_document(document_id)
        self._verify_faculty_ownership(document.unit_id, current_user)
        
        self.document_repo.delete(document)

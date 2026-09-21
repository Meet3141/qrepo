from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.init_db import get_db
from app.document.repository import DocumentRepository
from app.subject.repository import UnitRepository, SubjectRepository
from app.document.service import DocumentService
from app.document.storage import DocumentStorage

def get_document_service(db: Session = Depends(get_db)) -> DocumentService:
    document_repo = DocumentRepository(db)
    unit_repo = UnitRepository(db)
    subject_repo = SubjectRepository(db)
    return DocumentService(document_repo, unit_repo, subject_repo)

def get_document_storage() -> DocumentStorage:
    return DocumentStorage()

def get_ingestion_service(db: Session = Depends(get_db)) -> "DocumentIngestionService":
    from app.document.ingestion import DocumentIngestionService
    document_repo = DocumentRepository(db)
    return DocumentIngestionService(document_repo)

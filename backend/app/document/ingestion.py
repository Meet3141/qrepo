import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.document.repository import DocumentRepository
from app.document.models import Document
from app.document.schemas import DocumentUpdate
from app.document.extractor import extract_text
from app.core.exceptions import AppException
from app.core.config import settings

class DocumentIngestionService:
    def __init__(self, document_repo: DocumentRepository):
        self.document_repo = document_repo

    def ingest_document(self, document_id: uuid.UUID) -> Document:
        document = self.document_repo.get_by_id(document_id)
        if not document:
            raise AppException("Document not found", status_code=404)
            
        if document.processing_status == "COMPLETED":
            return document

        # Update to PROCESSING
        document.processing_status = "PROCESSING"
        self.document_repo.db.commit()
        
        try:
            # Resolve absolute path from storage dir to avoid CWD-dependent failures
            from app.document.storage import DocumentStorage
            storage_dir = DocumentStorage().storage_dir.resolve()
            absolute_path = str(storage_dir / Path(document.storage_path).name)
            
            extracted = extract_text(absolute_path, document.file_type)
            
            document.extracted_text = extracted
            document.processing_status = "COMPLETED"
            document.processed_at = datetime.now(timezone.utc)
            
            self.document_repo.db.commit()
            
        except Exception as e:
            # Revert to FAILED on error
            document.processing_status = "FAILED"
            self.document_repo.db.commit()
            raise AppException(f"Ingestion failed: {str(e)}", status_code=500)
            
        return document

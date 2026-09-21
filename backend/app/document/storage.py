import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings
from app.core.exceptions import AppException

ALLOWED_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain"
}

class DocumentStorage:
    def __init__(self):
        self.storage_dir = Path(settings.DOCUMENT_STORAGE_DIR)
        self.max_size = settings.MAX_DOCUMENT_SIZE
        # Ensure storage directory exists
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _validate_file(self, upload_file: UploadFile) -> str:
        if not upload_file.filename:
            raise AppException("Missing filename", status_code=400)

        # Secure the filename by stripping path traversal components
        safe_original_name = Path(upload_file.filename).name
        ext = Path(safe_original_name).suffix.lower()
        
        if ext not in ALLOWED_MIME_TYPES:
            raise AppException("Unsupported file extension", status_code=400)
            
        mime_type = upload_file.content_type
        if mime_type != ALLOWED_MIME_TYPES[ext]:
            raise AppException("MIME type and extension mismatch or unsupported MIME type", status_code=400)
            
        return ext

    async def save_document(self, upload_file: UploadFile) -> dict:
        ext = self._validate_file(upload_file)
        
        file_uuid = str(uuid.uuid4())
        safe_filename = f"{file_uuid}{ext}"
        
        target_path = self.storage_dir / safe_filename
        
        if self.storage_dir.resolve() not in target_path.resolve().parents:
            raise AppException("Invalid storage path detected", status_code=400)
            
        file_size = 0
        chunk_size = 1024 * 1024 # 1MB chunks
        
        try:
            with open(target_path, "wb") as buffer:
                while True:
                    chunk = await upload_file.read(chunk_size)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > self.max_size:
                        raise AppException("File exceeds maximum allowed size (10 MB)", status_code=400)
                    buffer.write(chunk)
                    
            if file_size == 0:
                raise AppException("Empty file", status_code=400)
                
        except Exception as e:
            if target_path.exists():
                target_path.unlink()
            if isinstance(e, AppException):
                raise e
            raise AppException("Storage failure", status_code=500)
            
        relative_storage_path = f"{settings.DOCUMENT_STORAGE_DIR}/{safe_filename}"
        
        return {
            "file_name": Path(upload_file.filename).name,
            "file_type": upload_file.content_type,
            "file_size": file_size,
            "storage_path": relative_storage_path
        }
        
    def delete_document(self, storage_path: str) -> None:
        try:
            target_path = Path(storage_path).resolve()
            storage_root = self.storage_dir.resolve()
            
            if storage_root not in target_path.parents:
                raise AppException("Path traversal attempt detected", status_code=403)
                
            if target_path.exists():
                target_path.unlink()
        except AppException as e:
            raise e
        except Exception:
            raise AppException("Failed to delete physical file", status_code=500)

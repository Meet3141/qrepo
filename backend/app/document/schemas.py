from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class DocumentBase(BaseModel):
    file_name: str = Field(..., max_length=255)
    file_type: str = Field(..., max_length=100)
    file_size: int
    storage_path: str = Field(..., max_length=500)
    processing_status: str = Field("PENDING", max_length=50)

class DocumentCreate(DocumentBase):
    unit_id: uuid.UUID
    uploaded_by: uuid.UUID

class DocumentUpdate(BaseModel):
    file_name: Optional[str] = Field(None, max_length=255)
    processing_status: Optional[str] = Field(None, max_length=50)
    # Excluded: id, unit_id, uploaded_by, created_at, updated_at to prevent unauthorized/unsafe changes

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    unit_id: uuid.UUID
    uploaded_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

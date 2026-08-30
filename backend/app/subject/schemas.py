from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

# --------------------------
# Unit Schemas
# --------------------------

class UnitBase(BaseModel):
    unit_number: int
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=500)

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    unit_number: Optional[int] = None
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)

class UnitResponse(UnitBase):
    id: uuid.UUID
    subject_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --------------------------
# Subject Schemas
# --------------------------

class SubjectBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=500)

class SubjectCreate(SubjectBase):
    faculty_id: Optional[uuid.UUID] = None

class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    faculty_id: Optional[uuid.UUID] = None

class SubjectResponse(SubjectBase):
    id: uuid.UUID
    faculty_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    
    # We can optionally include units if we want a nested response
    units: List[UnitResponse] = []

    model_config = ConfigDict(from_attributes=True)

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.auth.constants import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH
from app.users.schemas import _check_password


class UserRef(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None
    hod: Optional[UserRef] = None
    faculty_count: int = 0
    member_count: int = 0
    subject_count: int = 0
    created_at: datetime
    updated_at: datetime


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_-]+$")
    description: Optional[str] = Field(None, max_length=500)
    hod_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("code")
    @classmethod
    def _upper(cls, value: str) -> str:
        return value.upper()


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_-]+$")
    description: Optional[str] = Field(None, max_length=500)
    hod_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("code")
    @classmethod
    def _upper(cls, value: Optional[str]) -> Optional[str]:
        return value.upper() if value else value


# ── Faculty management (HOD / Admin) ───────────────────────────────────

class FacultyResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    department_id: Optional[uuid.UUID] = None
    department_name: Optional[str] = None
    subjects_assigned: int
    questions_generated: int
    questions_accepted: int
    acceptance_rate: Optional[float] = None
    papers_created: int
    papers_approved: int
    created_at: datetime


class FacultyCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    department_id: Optional[uuid.UUID] = None  # defaults to the HOD's department

    model_config = ConfigDict(extra="forbid")

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value):
        return _check_password(value)


class FacultyUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    is_active: Optional[bool] = None
    department_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(extra="forbid")


class FacultyListResponse(BaseModel):
    items: List[FacultyResponse]
    departments: List[DepartmentResponse]

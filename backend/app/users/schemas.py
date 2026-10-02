import re
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.auth.constants import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_REGEX


def _check_password(value: Optional[str]) -> Optional[str]:
    if value is not None and not re.match(PASSWORD_REGEX, value):
        raise ValueError("Password must contain at least one letter, one number, and one special character.")
    return value


class RoleOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentRef(BaseModel):
    id: uuid.UUID
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str  # output: don't re-validate stored data
    full_name: Optional[str] = None
    is_active: bool
    role: Optional[RoleOut] = None
    department: Optional[DepartmentRef] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    items: List[AdminUserResponse]
    total: int
    page: int
    page_size: int


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    full_name: Optional[str] = Field(None, max_length=255)
    role: str = Field(..., max_length=50)
    department_id: Optional[uuid.UUID] = None
    is_active: bool = True

    model_config = ConfigDict(extra="forbid")

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value):
        return _check_password(value)


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=50)
    department_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    model_config = ConfigDict(extra="forbid")

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value):
        return _check_password(value)

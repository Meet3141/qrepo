import uuid
import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.auth.constants import (
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_REGEX,
    TOKEN_TYPE
)

class RoleResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(
        ...,
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
        description="Password must contain at least one letter, one number, and one special character."
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(PASSWORD_REGEX, v):
            raise ValueError("Password must contain at least one letter, one number, and one special character.")
        return v

    # Note: `role` is intentionally excluded to prevent privilege escalation during public registration.
    # The service layer will assign `DEFAULT_ROLE` (Student) explicitly.


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    is_active: bool
    created_at: datetime
    role: Optional[RoleResponse] = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = TOKEN_TYPE

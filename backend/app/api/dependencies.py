import uuid
from typing import List
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import AppException
from app.auth.models import User
from app.auth.service import AuthService
from app.auth.dependencies import get_auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise AppException("Could not validate credentials", status_code=status.HTTP_401_UNAUTHORIZED)
            
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            raise AppException("Could not validate credentials", status_code=status.HTTP_401_UNAUTHORIZED)
            
    except JWTError:
        raise AppException("Could not validate credentials", status_code=status.HTTP_401_UNAUTHORIZED)
        
    user = auth_service.repo.get_user_by_id(user_id)
    if user is None:
        raise AppException("User not found", status_code=status.HTTP_401_UNAUTHORIZED)
        
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise AppException("Inactive user", status_code=status.HTTP_403_FORBIDDEN)
    return current_user

class RequireRole:
    """
    Dependency factory to enforce Role-Based Access Control (RBAC).
    Usage: Depends(RequireRole([ROLE_ADMIN, ROLE_HOD]))
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.role or current_user.role.name not in self.allowed_roles:
            raise AppException("Insufficient permissions", status_code=status.HTTP_403_FORBIDDEN)
        return current_user

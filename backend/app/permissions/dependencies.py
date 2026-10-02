from fastapi import Depends, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_active_user
from app.auth.models import User
from app.core.exceptions import AppException
from app.db.init_db import get_db
from app.permissions.catalog import BY_KEY
from app.permissions.service import PermissionService


class RequirePermission:
    """
    Dependency enforcing a Role Matrix permission. Usage: Depends(RequirePermission(PAPERS_APPROVE)).
    Resource-level rules (e.g. Faculty may only touch their own subjects) still apply in services.
    """
    def __init__(self, key: str):
        if key not in BY_KEY:
            raise ValueError(f"Unknown permission key: {key}")
        self.key = key

    def __call__(self, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> User:
        if not PermissionService(db).has_permission(current_user.role, self.key):
            raise AppException("Insufficient permissions", status_code=status.HTTP_403_FORBIDDEN)
        return current_user

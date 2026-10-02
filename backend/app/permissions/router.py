from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import RequireRole, get_current_active_user
from app.auth.constants import ROLE_ADMIN
from app.auth.models import User
from app.db.init_db import get_db
from app.permissions.schemas import PermissionMatrixResponse, PermissionMatrixUpdate
from app.permissions.service import PermissionService
from app.shared.responses import APIResponse

permissions_router = APIRouter()


@permissions_router.get("/matrix", response_model=APIResponse[PermissionMatrixResponse],
                        summary="Get the role/permission matrix (Admin only)")
def get_matrix(current_user: User = Depends(RequireRole([ROLE_ADMIN])), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Permission matrix", data=PermissionService(db).matrix())


@permissions_router.put("/matrix", response_model=APIResponse[PermissionMatrixResponse],
                        summary="Save permission matrix changes (Admin only)")
def update_matrix(update: PermissionMatrixUpdate, current_user: User = Depends(RequireRole([ROLE_ADMIN])),
                  db: Session = Depends(get_db)):
    matrix = PermissionService(db).update_matrix(update, current_user.id)
    return APIResponse(success=True, message="Permission matrix saved", data=matrix)


@permissions_router.post("/matrix/reset", response_model=APIResponse[PermissionMatrixResponse],
                         summary="Restore default permissions (Admin only)")
def reset_matrix(current_user: User = Depends(RequireRole([ROLE_ADMIN])), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Permission matrix reset to defaults", data=PermissionService(db).reset())


@permissions_router.get("/me", response_model=APIResponse[List[str]],
                        summary="Permission keys granted to the current user")
def my_permissions(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Current user permissions",
                       data=sorted(PermissionService(db).effective(current_user.role)))

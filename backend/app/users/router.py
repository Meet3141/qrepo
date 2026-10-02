import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import RequireRole
from app.auth.constants import ROLE_ADMIN, ROLE_HOD
from app.auth.models import User
from app.db.init_db import get_db
from app.shared.csv_export import csv_response
from app.shared.responses import APIResponse
from app.users.schemas import AdminUserCreate, AdminUserResponse, AdminUserUpdate, RoleOut, UserListResponse
from app.users.service import UserAdminService

users_router = APIRouter()
roles_router = APIRouter()

ADMIN_ONLY = RequireRole([ROLE_ADMIN])


@users_router.get("", response_model=APIResponse[UserListResponse], summary="List users (Admin only)")
def list_users(
    search: Optional[str] = Query(None, max_length=255),
    role: Optional[str] = Query(None, max_length=50),
    department_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    items, total = UserAdminService(db).list(search, role, department_id, is_active, page, page_size)
    data = UserListResponse(items=[AdminUserResponse.model_validate(u) for u in items],
                            total=total, page=page, page_size=page_size)
    return APIResponse(success=True, message="Users retrieved", data=data)


@users_router.get("/export", summary="Export users as CSV (Admin only)")
def export_users(current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    items, _ = UserAdminService(db).list(page=1, page_size=100_000)
    rows = [(u.email, u.full_name or "", u.role.name if u.role else "", u.department.name if u.department else "",
             "Active" if u.is_active else "Suspended", u.created_at.date().isoformat()) for u in items]
    return csv_response("qrepo-users.csv", ["Email", "Name", "Role", "Department", "Status", "Created"], rows)


@users_router.post("", response_model=APIResponse[AdminUserResponse], status_code=status.HTTP_201_CREATED,
                   summary="Create a user with any role (Admin only)")
def create_user(data: AdminUserCreate, current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    user = UserAdminService(db).create(data)
    return APIResponse(success=True, message="User created", data=AdminUserResponse.model_validate(user))


@users_router.get("/{user_id}", response_model=APIResponse[AdminUserResponse], summary="Get a user (Admin only)")
def get_user(user_id: uuid.UUID, current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="User retrieved",
                       data=AdminUserResponse.model_validate(UserAdminService(db).get(user_id)))


@users_router.put("/{user_id}", response_model=APIResponse[AdminUserResponse],
                  summary="Update role, department, status, name or password (Admin only)")
def update_user(user_id: uuid.UUID, data: AdminUserUpdate, current_user: User = Depends(ADMIN_ONLY),
                db: Session = Depends(get_db)):
    user = UserAdminService(db).update(user_id, data, current_user)
    return APIResponse(success=True, message="User updated", data=AdminUserResponse.model_validate(user))


@users_router.delete("/{user_id}", response_model=APIResponse[None],
                     summary="Delete a user with no academic records (Admin only)")
def delete_user(user_id: uuid.UUID, current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    UserAdminService(db).delete(user_id, current_user)
    return APIResponse(success=True, message="User deleted")


@roles_router.get("", response_model=APIResponse[List[RoleOut]], summary="List roles (Admin, HOD)")
def list_roles(current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD])), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Roles retrieved",
                       data=[RoleOut.model_validate(r) for r in UserAdminService(db).roles()])

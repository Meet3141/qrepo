import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import RequireRole
from app.auth.constants import ROLE_ADMIN, ROLE_HOD
from app.auth.models import User
from app.db.init_db import get_db
from app.department.schemas import (
    DepartmentCreate, DepartmentResponse, DepartmentUpdate, FacultyCreate, FacultyListResponse, FacultyResponse,
    FacultyUpdate,
)
from app.department.service import DepartmentService
from app.shared.csv_export import csv_response
from app.shared.responses import APIResponse

departments_router = APIRouter()
faculty_router = APIRouter()

ADMIN_ONLY = RequireRole([ROLE_ADMIN])
ADMIN_OR_HOD = RequireRole([ROLE_ADMIN, ROLE_HOD])


@departments_router.get("", response_model=APIResponse[List[DepartmentResponse]], summary="List departments")
def list_departments(search: Optional[str] = Query(None, max_length=255),
                     current_user: User = Depends(ADMIN_OR_HOD), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Departments retrieved", data=DepartmentService(db).list(search))


@departments_router.get("/export", summary="Export departments as CSV (Admin only)")
def export_departments(current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    rows = [(d.code, d.name, (d.hod.full_name or d.hod.email) if d.hod else "Unassigned", d.faculty_count,
             d.member_count, d.subject_count) for d in DepartmentService(db).list()]
    return csv_response("qrepo-departments.csv",
                        ["Code", "Department", "Head of Department", "Faculty", "Members", "Subjects"], rows)


@departments_router.post("", response_model=APIResponse[DepartmentResponse], status_code=status.HTTP_201_CREATED,
                         summary="Create a department (Admin only)")
def create_department(data: DepartmentCreate, current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Department created", data=DepartmentService(db).create(data))


@departments_router.put("/{department_id}", response_model=APIResponse[DepartmentResponse],
                        summary="Update a department or assign its HOD (Admin only)")
def update_department(department_id: uuid.UUID, data: DepartmentUpdate, current_user: User = Depends(ADMIN_ONLY),
                      db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Department updated", data=DepartmentService(db).update(department_id, data))


@departments_router.delete("/{department_id}", response_model=APIResponse[None],
                           summary="Delete a department; members are kept without a department (Admin only)")
def delete_department(department_id: uuid.UUID, current_user: User = Depends(ADMIN_ONLY), db: Session = Depends(get_db)):
    DepartmentService(db).delete(department_id)
    return APIResponse(success=True, message="Department deleted")


# ── Faculty (HOD: own departments; Admin: all) ─────────────────────────

@faculty_router.get("", response_model=APIResponse[FacultyListResponse], summary="List faculty with activity stats")
def list_faculty(department_id: Optional[uuid.UUID] = None, search: Optional[str] = Query(None, max_length=255),
                 current_user: User = Depends(ADMIN_OR_HOD), db: Session = Depends(get_db)):
    service = DepartmentService(db)
    scope = service.scope(current_user)
    departments = [d for d in service.list() if scope is None or d.id in scope]
    data = FacultyListResponse(items=service.list_faculty(current_user, department_id, search), departments=departments)
    return APIResponse(success=True, message="Faculty retrieved", data=data)


@faculty_router.get("/export", summary="Export the faculty report as CSV")
def export_faculty(department_id: Optional[uuid.UUID] = None, current_user: User = Depends(ADMIN_OR_HOD),
                   db: Session = Depends(get_db)):
    items = DepartmentService(db).list_faculty(current_user, department_id)
    rows = [(f.full_name or "", f.email, f.department_name or "", "Active" if f.is_active else "Inactive",
             f.subjects_assigned, f.questions_generated, f.questions_accepted,
             "" if f.acceptance_rate is None else f"{f.acceptance_rate:.0%}", f.papers_created, f.papers_approved)
            for f in items]
    return csv_response("qrepo-faculty-report.csv",
                        ["Name", "Email", "Department", "Status", "Subjects", "Questions generated",
                         "Questions accepted", "Acceptance rate", "Papers created", "Papers approved"], rows)


@faculty_router.post("", response_model=APIResponse[FacultyResponse], status_code=status.HTTP_201_CREATED,
                     summary="Add a faculty member to a department")
def create_faculty(data: FacultyCreate, current_user: User = Depends(ADMIN_OR_HOD), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Faculty member added",
                       data=DepartmentService(db).create_faculty(current_user, data))


@faculty_router.patch("/{user_id}", response_model=APIResponse[FacultyResponse],
                      summary="Activate/deactivate, rename or move a faculty member")
def update_faculty(user_id: uuid.UUID, data: FacultyUpdate, current_user: User = Depends(ADMIN_OR_HOD),
                   db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Faculty member updated",
                       data=DepartmentService(db).update_faculty(current_user, user_id, data))

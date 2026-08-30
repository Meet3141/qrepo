import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.api.dependencies import get_current_active_user, RequireRole
from app.auth.models import User
from app.subject.schemas import SubjectCreate, SubjectUpdate, SubjectResponse, UnitCreate, UnitUpdate, UnitResponse
from app.subject.service import SubjectService
from app.subject.dependencies import get_subject_service
from app.shared.responses import APIResponse

subject_router = APIRouter()
unit_router = APIRouter()

# -----------------------------
# Subject Endpoints
# -----------------------------

@subject_router.post(
    "",
    response_model=APIResponse[SubjectResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Subject"
)
def create_subject(
    data: SubjectCreate,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD])),
    service: SubjectService = Depends(get_subject_service)
):
    subject = service.create_subject(data)
    response_data = SubjectResponse.model_validate(subject)
    return APIResponse(success=True, message="Subject created successfully", data=response_data)


@subject_router.get(
    "",
    response_model=APIResponse[List[SubjectResponse]],
    summary="List all Subjects"
)
def get_subjects(
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: SubjectService = Depends(get_subject_service)
):
    subjects = service.get_subjects()
    response_data = [SubjectResponse.model_validate(s) for s in subjects]
    return APIResponse(success=True, message="Subjects retrieved", data=response_data)


@subject_router.get(
    "/{subject_id}",
    response_model=APIResponse[SubjectResponse],
    summary="Get a Subject by ID"
)
def get_subject(
    subject_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: SubjectService = Depends(get_subject_service)
):
    subject = service.get_subject(subject_id)
    response_data = SubjectResponse.model_validate(subject)
    return APIResponse(success=True, message="Subject retrieved", data=response_data)


@subject_router.put(
    "/{subject_id}",
    response_model=APIResponse[SubjectResponse],
    summary="Update a Subject"
)
def update_subject(
    subject_id: uuid.UUID,
    data: SubjectUpdate,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD])),
    service: SubjectService = Depends(get_subject_service)
):
    subject = service.update_subject(subject_id, data)
    response_data = SubjectResponse.model_validate(subject)
    return APIResponse(success=True, message="Subject updated", data=response_data)


@subject_router.delete(
    "/{subject_id}",
    response_model=APIResponse[None],
    summary="Delete a Subject"
)
def delete_subject(
    subject_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD])),
    service: SubjectService = Depends(get_subject_service)
):
    service.delete_subject(subject_id)
    return APIResponse(success=True, message="Subject deleted")


# -----------------------------
# Unit Endpoints (Nested in Subject)
# -----------------------------

@subject_router.post(
    "/{subject_id}/units",
    response_model=APIResponse[UnitResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a Unit for a Subject"
)
def create_unit(
    subject_id: uuid.UUID,
    data: UnitCreate,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY])),
    service: SubjectService = Depends(get_subject_service)
):
    unit = service.create_unit(subject_id, data, current_user)
    response_data = UnitResponse.model_validate(unit)
    return APIResponse(success=True, message="Unit created successfully", data=response_data)


@subject_router.get(
    "/{subject_id}/units",
    response_model=APIResponse[List[UnitResponse]],
    summary="List all Units for a Subject"
)
def get_units_by_subject(
    subject_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: SubjectService = Depends(get_subject_service)
):
    units = service.get_units_by_subject(subject_id)
    response_data = [UnitResponse.model_validate(u) for u in units]
    return APIResponse(success=True, message="Units retrieved", data=response_data)


# -----------------------------
# Unit Endpoints (Independent)
# -----------------------------

@unit_router.get(
    "/{unit_id}",
    response_model=APIResponse[UnitResponse],
    summary="Get a Unit by ID"
)
def get_unit(
    unit_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT])),
    service: SubjectService = Depends(get_subject_service)
):
    unit = service.get_unit(unit_id)
    response_data = UnitResponse.model_validate(unit)
    return APIResponse(success=True, message="Unit retrieved", data=response_data)


@unit_router.put(
    "/{unit_id}",
    response_model=APIResponse[UnitResponse],
    summary="Update a Unit"
)
def update_unit(
    unit_id: uuid.UUID,
    data: UnitUpdate,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY])),
    service: SubjectService = Depends(get_subject_service)
):
    unit = service.update_unit(unit_id, data, current_user)
    response_data = UnitResponse.model_validate(unit)
    return APIResponse(success=True, message="Unit updated", data=response_data)


@unit_router.delete(
    "/{unit_id}",
    response_model=APIResponse[None],
    summary="Delete a Unit"
)
def delete_unit(
    unit_id: uuid.UUID,
    current_user: User = Depends(RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY])),
    service: SubjectService = Depends(get_subject_service)
):
    service.delete_unit(unit_id, current_user)
    return APIResponse(success=True, message="Unit deleted")

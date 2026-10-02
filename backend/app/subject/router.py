import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.api.dependencies import get_current_active_user, RequireRole
from app.auth.models import User
from app.subject.schemas import (
    SubjectCreate, SubjectUpdate, SubjectResponse,
    UnitCreate, UnitUpdate, UnitResponse,
    UnitTopicCreate, UnitTopicUpdate, UnitTopicResponse,
)
from app.subject.service import SubjectService
from app.subject.repository import UnitTopicRepository
from app.subject.dependencies import get_subject_service, get_unit_topic_repo
from app.shared.responses import APIResponse
from app.core.exceptions import AppException

subject_router = APIRouter()
unit_router = APIRouter()

MANAGE_ROLES = [ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY]
ALL_ROLES = [ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT]

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
    return APIResponse(success=True, message="Subject created successfully", data=SubjectResponse.model_validate(subject))


@subject_router.get(
    "",
    response_model=APIResponse[List[SubjectResponse]],
    summary="List all Subjects"
)
def get_subjects(
    current_user: User = Depends(RequireRole(ALL_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    subjects = service.get_subjects()
    return APIResponse(success=True, message="Subjects retrieved", data=[SubjectResponse.model_validate(s) for s in subjects])


@subject_router.get(
    "/{subject_id}",
    response_model=APIResponse[SubjectResponse],
    summary="Get a Subject by ID"
)
def get_subject(
    subject_id: uuid.UUID,
    current_user: User = Depends(RequireRole(ALL_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    subject = service.get_subject(subject_id)
    return APIResponse(success=True, message="Subject retrieved", data=SubjectResponse.model_validate(subject))


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
    return APIResponse(success=True, message="Subject updated", data=SubjectResponse.model_validate(subject))


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
    current_user: User = Depends(RequireRole(MANAGE_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    unit = service.create_unit(subject_id, data, current_user)
    return APIResponse(success=True, message="Unit created successfully", data=UnitResponse.model_validate(unit))


@subject_router.get(
    "/{subject_id}/units",
    response_model=APIResponse[List[UnitResponse]],
    summary="List all Units for a Subject"
)
def get_units_by_subject(
    subject_id: uuid.UUID,
    current_user: User = Depends(RequireRole(ALL_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    units = service.get_units_by_subject(subject_id)
    return APIResponse(success=True, message="Units retrieved", data=[UnitResponse.model_validate(u) for u in units])


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
    current_user: User = Depends(RequireRole(ALL_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    unit = service.get_unit(unit_id)
    return APIResponse(success=True, message="Unit retrieved", data=UnitResponse.model_validate(unit))


@unit_router.put(
    "/{unit_id}",
    response_model=APIResponse[UnitResponse],
    summary="Update a Unit"
)
def update_unit(
    unit_id: uuid.UUID,
    data: UnitUpdate,
    current_user: User = Depends(RequireRole(MANAGE_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    unit = service.update_unit(unit_id, data, current_user)
    return APIResponse(success=True, message="Unit updated", data=UnitResponse.model_validate(unit))


@unit_router.delete(
    "/{unit_id}",
    response_model=APIResponse[None],
    summary="Delete a Unit"
)
def delete_unit(
    unit_id: uuid.UUID,
    current_user: User = Depends(RequireRole(MANAGE_ROLES)),
    service: SubjectService = Depends(get_subject_service)
):
    service.delete_unit(unit_id, current_user)
    return APIResponse(success=True, message="Unit deleted")


# -----------------------------
# Unit Topic Endpoints  GET/POST /units/{unit_id}/topics, PUT/DELETE /topics/{topic_id}
# -----------------------------

@unit_router.get(
    "/{unit_id}/topics",
    response_model=APIResponse[List[UnitTopicResponse]],
    summary="List all sub-topics for a Unit"
)
def list_unit_topics(
    unit_id: uuid.UUID,
    current_user: User = Depends(RequireRole(ALL_ROLES)),
    repo: UnitTopicRepository = Depends(get_unit_topic_repo)
):
    topics = repo.get_by_unit_id(unit_id)
    return APIResponse(success=True, message="Topics retrieved", data=[UnitTopicResponse.model_validate(t) for t in topics])


@unit_router.post(
    "/{unit_id}/topics",
    response_model=APIResponse[UnitTopicResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add a sub-topic to a Unit"
)
def create_unit_topic(
    unit_id: uuid.UUID,
    data: UnitTopicCreate,
    current_user: User = Depends(RequireRole(MANAGE_ROLES)),
    repo: UnitTopicRepository = Depends(get_unit_topic_repo)
):
    # auto order_index = max existing + 1 if not specified
    existing = repo.get_by_unit_id(unit_id)
    order_index = data.order_index if data.order_index else (max((t.order_index for t in existing), default=-1) + 1)
    topic = repo.create(unit_id, data.title, data.description, order_index)
    return APIResponse(success=True, message="Topic added", data=UnitTopicResponse.model_validate(topic))


@unit_router.put(
    "/topics/{topic_id}",
    response_model=APIResponse[UnitTopicResponse],
    summary="Update a sub-topic"
)
def update_unit_topic(
    topic_id: uuid.UUID,
    data: UnitTopicUpdate,
    current_user: User = Depends(RequireRole(MANAGE_ROLES)),
    repo: UnitTopicRepository = Depends(get_unit_topic_repo)
):
    topic = repo.get_by_id(topic_id)
    if not topic:
        raise AppException("Topic not found", status_code=404)
    updates = data.model_dump(exclude_unset=True)
    topic = repo.update(topic, updates)
    return APIResponse(success=True, message="Topic updated", data=UnitTopicResponse.model_validate(topic))


@unit_router.delete(
    "/topics/{topic_id}",
    response_model=APIResponse[None],
    summary="Delete a sub-topic"
)
def delete_unit_topic(
    topic_id: uuid.UUID,
    current_user: User = Depends(RequireRole(MANAGE_ROLES)),
    repo: UnitTopicRepository = Depends(get_unit_topic_repo)
):
    topic = repo.get_by_id(topic_id)
    if not topic:
        raise AppException("Topic not found", status_code=404)
    repo.delete(topic)
    return APIResponse(success=True, message="Topic deleted")

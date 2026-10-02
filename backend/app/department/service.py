"""Departments (Admin) and department faculty management (HOD within own departments, Admin anywhere)."""
import uuid
from collections import Counter
from typing import Dict, List, Optional, Sequence
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from app.ai.models import AIGeneration, QuestionDraft
from app.ai.schemas import QUESTION_BANK_ELIGIBLE
from app.auth.constants import ROLE_ADMIN, ROLE_FACULTY, ROLE_HOD
from app.auth.models import Role, User
from app.core.exceptions import AppException
from app.core.security import get_password_hash
from app.department.models import Department
from app.department.schemas import (
    DepartmentCreate, DepartmentResponse, DepartmentUpdate, FacultyCreate, FacultyResponse, FacultyUpdate, UserRef,
)
from app.papers.models import Paper
from app.subject.models import Subject


def _role_name(user: User) -> Optional[str]:
    return user.role.name if user.role else None


class DepartmentService:
    def __init__(self, db: Session):
        self.db = db

    # ── Departments ────────────────────────────────────────────────────

    def get(self, department_id: uuid.UUID) -> Department:
        department = self.db.get(Department, department_id)
        if not department:
            raise AppException("Department not found", status_code=404)
        return department

    def _validate_hod(self, hod_id: Optional[uuid.UUID], department_id: Optional[uuid.UUID]) -> Optional[User]:
        if hod_id is None:
            return None
        hod = self.db.get(User, hod_id)
        if not hod or _role_name(hod) != ROLE_HOD:
            raise AppException("Head of Department must be a user with the HOD role", status_code=422)
        if not hod.is_active:
            raise AppException("Head of Department must be an active user", status_code=422)
        other = self.db.execute(select(Department).where(Department.hod_id == hod_id)).scalar_one_or_none()
        if other and other.id != department_id:
            raise AppException(f"{hod.email} already heads {other.name}", status_code=409)
        return hod

    def _check_unique(self, name: Optional[str], code: Optional[str], exclude: Optional[uuid.UUID] = None) -> None:
        for column, value, label in ((Department.name, name, "name"), (Department.code, code, "code")):
            if value is None:
                continue
            found = self.db.execute(select(Department).where(func.lower(column) == value.lower())).scalar_one_or_none()
            if found and found.id != exclude:
                raise AppException(f"A department with this {label} already exists", status_code=409)

    def to_response(self, department: Department, counts: Optional[Dict] = None) -> DepartmentResponse:
        counts = counts or self._counts([department.id]).get(department.id, {})
        return DepartmentResponse(
            id=department.id, name=department.name, code=department.code, description=department.description,
            hod=UserRef.model_validate(department.hod) if department.hod else None,
            faculty_count=counts.get("faculty", 0), member_count=counts.get("members", 0),
            subject_count=counts.get("subjects", 0),
            created_at=department.created_at, updated_at=department.updated_at,
        )

    def _counts(self, department_ids: Sequence[uuid.UUID]) -> Dict[uuid.UUID, Dict[str, int]]:
        counts: Dict[uuid.UUID, Dict[str, int]] = {d: {"faculty": 0, "members": 0, "subjects": 0} for d in department_ids}
        if not department_ids:
            return counts
        members = self.db.execute(
            select(User.department_id, Role.name, func.count())
            .join(Role, User.role_id == Role.id, isouter=True)
            .where(User.department_id.in_(department_ids))
            .group_by(User.department_id, Role.name)
        ).all()
        for dept_id, role_name, n in members:
            counts[dept_id]["members"] += n
            if role_name == ROLE_FACULTY:
                counts[dept_id]["faculty"] += n
        # A subject belongs to the department of its assigned faculty member
        subjects = self.db.execute(
            select(User.department_id, func.count(Subject.id))
            .join(User, Subject.faculty_id == User.id)
            .where(User.department_id.in_(department_ids))
            .group_by(User.department_id)
        ).all()
        for dept_id, n in subjects:
            counts[dept_id]["subjects"] = n
        return counts

    def list(self, search: Optional[str] = None) -> List[DepartmentResponse]:
        stmt = select(Department).options(selectinload(Department.hod)).order_by(Department.name)
        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(Department.name).like(pattern) | func.lower(Department.code).like(pattern))
        departments = self.db.execute(stmt).scalars().all()
        counts = self._counts([d.id for d in departments])
        return [self.to_response(d, counts[d.id]) for d in departments]

    def create(self, data: DepartmentCreate) -> DepartmentResponse:
        self._check_unique(data.name, data.code)
        hod = self._validate_hod(data.hod_id, None)
        department = Department(name=data.name, code=data.code, description=data.description or None, hod_id=data.hod_id)
        self.db.add(department)
        self.db.flush()
        if hod and hod.department_id is None:
            hod.department_id = department.id  # the HOD belongs to the department they head
        self.db.commit()
        return self.to_response(self.get(department.id))

    def update(self, department_id: uuid.UUID, data: DepartmentUpdate) -> DepartmentResponse:
        department = self.get(department_id)
        changes = data.model_dump(exclude_unset=True)
        self._check_unique(changes.get("name"), changes.get("code"), exclude=department_id)
        if "hod_id" in changes:
            hod = self._validate_hod(changes["hod_id"], department_id)
            department.hod_id = changes["hod_id"]
            if hod and hod.department_id is None:
                hod.department_id = department.id
        for field in ("name", "code", "description"):
            if field in changes and changes[field] is not None:
                setattr(department, field, changes[field])
        self.db.commit()
        self.db.expire(department)
        return self.to_response(self.get(department_id))

    def delete(self, department_id: uuid.UUID) -> None:
        department = self.get(department_id)
        # Members are kept; their department_id becomes NULL (FK ON DELETE SET NULL)
        for member in department.members:
            member.department_id = None
        self.db.delete(department)
        self.db.commit()

    # ── Faculty management ─────────────────────────────────────────────

    def scope(self, actor: User) -> Optional[List[uuid.UUID]]:
        """Department IDs the actor may manage. None = all (Admin)."""
        role = _role_name(actor)
        if role == ROLE_ADMIN:
            return None
        if role == ROLE_HOD:
            headed = self.db.execute(select(Department.id).where(Department.hod_id == actor.id)).scalars().all()
            return list(headed)
        raise AppException("You do not have permission to manage faculty", status_code=403)

    def _check_in_scope(self, actor: User, department_id: Optional[uuid.UUID]) -> None:
        allowed = self.scope(actor)
        if allowed is not None and department_id not in allowed:
            raise AppException("You can only manage faculty in departments you head", status_code=403)

    def _faculty_role(self) -> Role:
        role = self.db.execute(select(Role).where(Role.name == ROLE_FACULTY)).scalar_one_or_none()
        if not role:
            raise AppException("System error: Faculty role not found", status_code=500)
        return role

    def _faculty_stats(self, user_ids: List[uuid.UUID]) -> Dict[uuid.UUID, Dict[str, int]]:
        stats = {u: Counter() for u in user_ids}
        if not user_ids:
            return stats
        for uid, n in self.db.execute(select(Subject.faculty_id, func.count()).where(Subject.faculty_id.in_(user_ids))
                                      .group_by(Subject.faculty_id)).all():
            stats[uid]["subjects"] = n
        drafts = self.db.execute(
            select(AIGeneration.requested_by, QuestionDraft.faculty_review_status, func.count())
            .join(QuestionDraft, QuestionDraft.generation_id == AIGeneration.id)
            .where(AIGeneration.requested_by.in_(user_ids))
            .group_by(AIGeneration.requested_by, QuestionDraft.faculty_review_status)
        ).all()
        eligible = {s.value for s in QUESTION_BANK_ELIGIBLE}
        for uid, review_status, n in drafts:
            stats[uid]["generated"] += n
            if review_status in eligible:
                stats[uid]["accepted"] += n
            if review_status != "DRAFT":
                stats[uid]["reviewed"] += n
        for uid, paper_status, n in self.db.execute(
                select(Paper.created_by, Paper.status, func.count()).where(Paper.created_by.in_(user_ids))
                .group_by(Paper.created_by, Paper.status)).all():
            stats[uid]["papers"] += n
            if paper_status == "APPROVED":
                stats[uid]["approved"] += n
        return stats

    def list_faculty(self, actor: User, department_id: Optional[uuid.UUID] = None,
                     search: Optional[str] = None) -> List[FacultyResponse]:
        allowed = self.scope(actor)
        if department_id is not None:
            self._check_in_scope(actor, department_id)
        stmt = (select(User).join(Role, User.role_id == Role.id).where(Role.name == ROLE_FACULTY)
                .options(selectinload(User.department)).order_by(User.full_name, User.email))
        if department_id is not None:
            stmt = stmt.where(User.department_id == department_id)
        elif allowed is not None:
            if not allowed:
                return []
            stmt = stmt.where(User.department_id.in_(allowed))
        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(User.email).like(pattern) | func.lower(User.full_name).like(pattern))
        users = self.db.execute(stmt).scalars().all()
        stats = self._faculty_stats([u.id for u in users])
        return [self._faculty_response(u, stats[u.id]) for u in users]

    @staticmethod
    def _faculty_response(user: User, s: Counter) -> FacultyResponse:
        return FacultyResponse(
            id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active,
            department_id=user.department_id, department_name=user.department.name if user.department else None,
            subjects_assigned=s["subjects"], questions_generated=s["generated"], questions_accepted=s["accepted"],
            acceptance_rate=round(s["accepted"] / s["reviewed"], 3) if s["reviewed"] else None,
            papers_created=s["papers"], papers_approved=s["approved"], created_at=user.created_at,
        )

    def _get_faculty(self, user_id: uuid.UUID) -> User:
        user = self.db.execute(select(User).options(selectinload(User.role), selectinload(User.department))
                               .where(User.id == user_id)).scalar_one_or_none()
        if not user or _role_name(user) != ROLE_FACULTY:
            raise AppException("Faculty member not found", status_code=404)
        return user

    def create_faculty(self, actor: User, data: FacultyCreate) -> FacultyResponse:
        department_id = data.department_id
        if department_id is None:
            allowed = self.scope(actor)
            if allowed is None or len(allowed) != 1:
                raise AppException("department_id is required", status_code=422)
            department_id = allowed[0]
        self.get(department_id)
        self._check_in_scope(actor, department_id)
        if self.db.execute(select(User).where(func.lower(User.email) == str(data.email).lower())).scalar_one_or_none():
            raise AppException("Email already registered", status_code=409)
        user = User(email=str(data.email), full_name=data.full_name.strip(), hashed_password=get_password_hash(data.password),
                    role_id=self._faculty_role().id, department_id=department_id, is_active=True)
        self.db.add(user)
        self.db.commit()
        user = self._get_faculty(user.id)
        return self._faculty_response(user, self._faculty_stats([user.id])[user.id])

    def update_faculty(self, actor: User, user_id: uuid.UUID, data: FacultyUpdate) -> FacultyResponse:
        user = self._get_faculty(user_id)
        self._check_in_scope(actor, user.department_id)
        changes = data.model_dump(exclude_unset=True)
        if "department_id" in changes:
            if changes["department_id"] is not None:
                self.get(changes["department_id"])
            # Moving faculty requires authority over the destination too (Admin, or HOD heading it)
            self._check_in_scope(actor, changes["department_id"])
            user.department_id = changes["department_id"]
        if changes.get("full_name"):
            user.full_name = changes["full_name"].strip()
        if changes.get("is_active") is not None:
            user.is_active = changes["is_active"]
        self.db.commit()
        user = self._get_faculty(user_id)
        return self._faculty_response(user, self._faculty_stats([user.id])[user.id])

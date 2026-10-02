"""Admin user management (create, list, update, deactivate, delete)."""
import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload
from app.ai.models import AIGeneration, DraftFeedback
from app.auth.constants import ROLE_ADMIN
from app.auth.models import Role, User
from app.core.exceptions import AppException
from app.core.security import get_password_hash
from app.department.models import Department
from app.document.models import Document
from app.papers.models import Paper, PaperComment
from app.subject.models import Subject
from app.users.schemas import AdminUserCreate, AdminUserUpdate


class UserAdminService:
    def __init__(self, db: Session):
        self.db = db

    # ── Lookups ────────────────────────────────────────────────────────

    def _role(self, name: str) -> Role:
        role = self.db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
        if not role:
            raise AppException(f"Unknown role '{name}'", status_code=422)
        return role

    def _department(self, department_id: Optional[uuid.UUID]) -> Optional[Department]:
        if department_id is None:
            return None
        department = self.db.get(Department, department_id)
        if not department:
            raise AppException("Department not found", status_code=404)
        return department

    def get(self, user_id: uuid.UUID) -> User:
        user = self.db.execute(
            select(User).options(selectinload(User.role), selectinload(User.department)).where(User.id == user_id)
        ).scalar_one_or_none()
        if not user:
            raise AppException("User not found", status_code=404)
        return user

    def roles(self) -> Sequence[Role]:
        return self.db.execute(select(Role).order_by(Role.id)).scalars().all()

    def list(self, search: Optional[str] = None, role: Optional[str] = None,
             department_id: Optional[uuid.UUID] = None, is_active: Optional[bool] = None,
             page: int = 1, page_size: int = 25) -> Tuple[Sequence[User], int]:
        stmt = select(User)
        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(or_(func.lower(User.email).like(pattern), func.lower(User.full_name).like(pattern)))
        if role:
            stmt = stmt.join(Role, User.role_id == Role.id).where(Role.name == role)
        if department_id:
            stmt = stmt.where(User.department_id == department_id)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        total = self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        items = self.db.execute(
            stmt.options(selectinload(User.role), selectinload(User.department))
            .order_by(User.created_at.desc(), User.email)
            .offset((page - 1) * page_size).limit(page_size)
        ).scalars().all()
        return items, total

    # ── Mutations ──────────────────────────────────────────────────────

    def create(self, data: AdminUserCreate) -> User:
        email = str(data.email)  # stored as given: login matches emails exactly, like registration
        if self.db.execute(select(User).where(func.lower(User.email) == email.lower())).scalar_one_or_none():
            raise AppException("Email already registered", status_code=409)
        role = self._role(data.role)
        self._department(data.department_id)
        user = User(email=email, hashed_password=get_password_hash(data.password), role_id=role.id,
                    full_name=(data.full_name or "").strip() or None, department_id=data.department_id, is_active=data.is_active)
        self.db.add(user)
        self.db.commit()
        return self.get(user.id)

    def _active_admin_count(self) -> int:
        return self.db.execute(
            select(func.count()).select_from(User).join(Role, User.role_id == Role.id)
            .where(Role.name == ROLE_ADMIN, User.is_active.is_(True))
        ).scalar_one()

    def _guard_last_admin(self, user: User, actor: User, *, demoting: bool, deactivating: bool, deleting: bool) -> None:
        is_admin = user.role is not None and user.role.name == ROLE_ADMIN
        if not is_admin or not (demoting or deactivating or deleting):
            return
        if user.id == actor.id:
            raise AppException("You cannot remove your own administrator access", status_code=409)
        if user.is_active and self._active_admin_count() <= 1:
            raise AppException("At least one active administrator is required", status_code=409)

    def update(self, user_id: uuid.UUID, data: AdminUserUpdate, actor: User) -> User:
        user = self.get(user_id)
        changes = data.model_dump(exclude_unset=True)

        new_role = self._role(changes["role"]) if changes.get("role") else None
        demoting = new_role is not None and new_role.name != ROLE_ADMIN
        deactivating = changes.get("is_active") is False
        self._guard_last_admin(user, actor, demoting=demoting, deactivating=deactivating, deleting=False)

        if new_role is not None:
            user.role_id = new_role.id
        if "department_id" in changes:
            self._department(changes["department_id"])
            user.department_id = changes["department_id"]
        if "full_name" in changes:
            user.full_name = (changes["full_name"] or "").strip() or None
        if "is_active" in changes and changes["is_active"] is not None:
            user.is_active = changes["is_active"]
        if changes.get("password"):
            user.hashed_password = get_password_hash(changes["password"])
        self.db.commit()
        self.db.expire(user)
        return self.get(user_id)

    def activity_counts(self, user_id: uuid.UUID) -> dict:
        def count(model, column):
            return self.db.execute(select(func.count()).select_from(model).where(column == user_id)).scalar_one()
        return {
            "subjects": count(Subject, Subject.faculty_id),
            "documents": count(Document, Document.uploaded_by),
            "ai_generations": count(AIGeneration, AIGeneration.requested_by),
            "draft_reviews": count(DraftFeedback, DraftFeedback.reviewer_id),
            "papers": count(Paper, Paper.created_by),
            "paper_comments": count(PaperComment, PaperComment.author_id),
            "departments_headed": count(Department, Department.hod_id),
        }

    def delete(self, user_id: uuid.UUID, actor: User) -> None:
        user = self.get(user_id)
        self._guard_last_admin(user, actor, demoting=False, deactivating=False, deleting=True)
        if user.id == actor.id:
            raise AppException("You cannot delete your own account", status_code=409)
        activity = {k: v for k, v in self.activity_counts(user_id).items() if v}
        if activity:
            # Deleting would orphan or cascade academic records; keep history intact instead
            summary = ", ".join(f"{v} {k.replace('_', ' ')}" for k, v in activity.items())
            raise AppException(
                f"User has existing records ({summary}). Deactivate the account instead of deleting it.",
                status_code=409)
        self.db.delete(user)
        self.db.commit()

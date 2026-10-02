import uuid
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class RolePermission(Base, TimestampMixin):
    """
    Admin overrides of the default role/permission matrix (app.permissions.catalog).
    A missing row means "use the catalog default", so an empty table keeps today's behaviour.
    """
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_key", name="uq_role_permissions_role_id_permission_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), index=True, nullable=False)
    permission_key: Mapped[str] = mapped_column(String(100), nullable=False)
    allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

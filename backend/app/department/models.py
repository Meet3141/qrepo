import uuid
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Head of Department (a user with the HOD role)
    hod_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)

    hod: Mapped[Optional["app.auth.models.User"]] = relationship(
        "app.auth.models.User", foreign_keys=[hod_id])
    members: Mapped[List["app.auth.models.User"]] = relationship(
        "app.auth.models.User", foreign_keys="app.auth.models.User.department_id", back_populates="department")

    def __repr__(self) -> str:
        return f"<Department(id={self.id}, code='{self.code}')>"

import uuid
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    
    users: Mapped[List["User"]] = relationship(back_populates="role")
    
    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name='{self.name}')>"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True, nullable=True)
    
    role_id: Mapped[Optional[int]] = mapped_column(ForeignKey("roles.id"))
    role: Mapped[Optional["Role"]] = relationship(back_populates="users")
    
    subjects: Mapped[List["app.subject.models.Subject"]] = relationship("app.subject.models.Subject", back_populates="faculty")
    documents: Mapped[List["app.document.models.Document"]] = relationship("app.document.models.Document", back_populates="uploader")
    department: Mapped[Optional["app.department.models.Department"]] = relationship(
        "app.department.models.Department", foreign_keys=[department_id], back_populates="members")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"

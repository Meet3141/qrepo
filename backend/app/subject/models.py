import uuid
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Uuid, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Faculty Association (User model with Role="Faculty")
    faculty_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    
    faculty: Mapped[Optional["app.auth.models.User"]] = relationship("app.auth.models.User", back_populates="subjects")
    units: Mapped[List["Unit"]] = relationship(back_populates="subject", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Subject(id={self.id}, code='{self.code}', name='{self.name}')>"

class Unit(Base, TimestampMixin):
    __tablename__ = "units"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    unit_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))

    subject: Mapped["Subject"] = relationship(back_populates="units")
    
    def __repr__(self) -> str:
        return f"<Unit(id={self.id}, unit_number={self.unit_number}, title='{self.title}')>"

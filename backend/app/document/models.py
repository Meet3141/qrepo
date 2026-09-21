import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Uuid, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    unit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    processing_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    extracted_text: Mapped[str | None] = mapped_column(String, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    
    unit: Mapped["app.subject.models.Unit"] = relationship("app.subject.models.Unit", back_populates="documents")
    uploader: Mapped["app.auth.models.User"] = relationship("app.auth.models.User", back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, file_name='{self.file_name}', status='{self.processing_status}')>"

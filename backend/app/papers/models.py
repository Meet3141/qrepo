"""
Question papers assembled from faculty-accepted question drafts.

Each PaperQuestion is a snapshot of the source draft at the time the paper was built, so an
approved paper can never change underneath the reviewer if the draft is edited later.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Paper(Base, TimestampMixin):
    __tablename__ = "papers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    exam_type: Mapped[str] = mapped_column(String(50), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    blueprint: Mapped[dict] = mapped_column(JSON, nullable=False)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT", index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    questions: Mapped[List["PaperQuestion"]] = relationship(
        back_populates="paper", cascade="all, delete-orphan", order_by="PaperQuestion.position")
    comments: Mapped[List["PaperComment"]] = relationship(
        back_populates="paper", cascade="all, delete-orphan", order_by="PaperComment.created_at")

    def __repr__(self) -> str:
        return f"<Paper(id={self.id}, status='{self.status}')>"


class PaperQuestion(Base, TimestampMixin):
    __tablename__ = "paper_questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    source_draft_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("question_drafts.id", ondelete="SET NULL"), index=True, nullable=True)
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"), nullable=True)

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False)
    topic: Mapped[str] = mapped_column(String(300), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    bloom_level: Mapped[str] = mapped_column(String(20), nullable=False)
    marks: Mapped[float] = mapped_column(Float, nullable=False)
    options: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    correct_option_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expected_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    paper: Mapped["Paper"] = relationship(back_populates="questions")


class PaperComment(Base, TimestampMixin):
    """Review thread. Status-changing actions are recorded here too, so the history is complete."""
    __tablename__ = "paper_comments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True, nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # COMMENT / SUBMITTED / APPROVED / ...
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paper_version: Mapped[int] = mapped_column(Integer, nullable=False)

    paper: Mapped["Paper"] = relationship(back_populates="comments")

"""
AI generation persistence.

- AIGeneration: one row per generation request (reproducibility + observability). Stores
  parameters and metadata only: never the API key, the raw prompt, or document text.
- QuestionDraft: generated questions awaiting faculty review. Drafts are NOT Question Bank
  questions; only VALIDATED/EDITED drafts may be promoted later.
- DraftFeedback: append-only faculty review events (accept/edit/reject, reason, rating),
  kept as a future supervised / reward-signal dataset. Nothing trains on it in v1.
- PooledQuestion: permanent question pool per subject. Auto-created when a draft is
  ACCEPTED or EDITED by faculty. Deletable by faculty/admin; edit-safe (a pool edit never
  touches the original draft or the immutable ai_original snapshot).
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class AIGeneration(Base, TimestampMixin):
    __tablename__ = "ai_generations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"), index=True, nullable=True)

    parameters_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False)
    validation_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    error_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Validation issue codes from the last failed attempt (codes only, no content)
    validation_issue_codes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    question_count: Mapped[int] = mapped_column(Integer, nullable=False)        # requested
    questions_returned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    generation_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # initial + repair
    provider_calls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)       # incl. transient retries
    repair_attempted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    context_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    context_chars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    context_truncated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    context_sections_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Which documents fed the prompt (IDs only, never their text)
    context_document_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    drafts: Mapped[List["QuestionDraft"]] = relationship(
        back_populates="generation", cascade="all, delete-orphan", order_by="QuestionDraft.position")

    def __repr__(self) -> str:
        return f"<AIGeneration(id={self.id}, status='{self.status}')>"


class QuestionDraft(Base, TimestampMixin):
    __tablename__ = "question_drafts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    generation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_generations.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"), index=True, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

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

    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quality_signals: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    validation_status: Mapped[str] = mapped_column(String(20), nullable=False)
    faculty_review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT", index=True)
    # Immutable copy of the model's version, so edits never lose the original (future training pairs)
    ai_original: Mapped[dict] = mapped_column(JSON, nullable=False)

    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    generation: Mapped["AIGeneration"] = relationship(back_populates="drafts")
    feedback: Mapped[List["DraftFeedback"]] = relationship(
        back_populates="draft", cascade="all, delete-orphan", order_by="DraftFeedback.created_at")

    def __repr__(self) -> str:
        return f"<QuestionDraft(id={self.id}, review='{self.faculty_review_status}')>"


class DraftFeedback(Base, TimestampMixin):
    __tablename__ = "draft_feedback"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    draft_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("question_drafts.id", ondelete="CASCADE"), index=True, nullable=False)
    generation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_generations.id", ondelete="CASCADE"), index=True, nullable=False)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    action: Mapped[str] = mapped_column(String(20), nullable=False)            # ACCEPT / EDIT / REJECT
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)       # 1-5, optional
    previous_review_status: Mapped[str] = mapped_column(String(20), nullable=False)
    before_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    after_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # set for EDIT
    changed_fields: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    draft: Mapped["QuestionDraft"] = relationship(back_populates="feedback")

    def __repr__(self) -> str:
        return f"<DraftFeedback(id={self.id}, action='{self.action}')>"


class PooledQuestion(Base, TimestampMixin):
    """
    Permanent, subject-scoped question pool.

    Created automatically when a QuestionDraft is ACCEPTED (VALIDATE) or ACCEPTED-WITH-EDITS
    (EDIT) during faculty review. The content stored here is the faculty-approved version
    (i.e. the draft's current fields at promotion time, which may differ from ai_original).

    A PooledQuestion can be edited or deleted by faculty/admin without touching the source draft.
    The source_draft_id link enables audit trails and deduplication.
    """
    __tablename__ = "pooled_questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"), index=True, nullable=True)
    source_draft_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("question_drafts.id", ondelete="SET NULL"), index=True, nullable=True)
    added_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    topic: Mapped[str] = mapped_column(String(300), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bloom_level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    marks: Mapped[float] = mapped_column(Float, nullable=False)
    options: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    correct_option_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expected_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    def __repr__(self) -> str:
        return f"<PooledQuestion(id={self.id}, subject_id={self.subject_id})>"

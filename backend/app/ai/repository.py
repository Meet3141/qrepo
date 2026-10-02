import uuid
from typing import List, Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.ai.models import AIGeneration, QuestionDraft, DraftFeedback


class AIGenerationRepository:
    def __init__(self, db: Session):
        self.db = db

    def end_read_transaction(self) -> None:
        """
        Close the current read-only transaction so its pooled connection is released while we
        wait on the AI provider (which can take minutes with retries). Loaded ORM objects are
        expired; callers must have copied what they need.
        """
        if self.db.in_transaction():
            self.db.rollback()

    def save_generation(self, generation: AIGeneration, drafts: Optional[List[QuestionDraft]] = None) -> AIGeneration:
        """Persist a generation and its drafts atomically."""
        try:
            self.db.add(generation)
            self.db.flush()
            for draft in drafts or []:
                draft.generation_id = generation.id
                self.db.add(draft)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(generation)
        return generation

    def get_generation(self, generation_id: uuid.UUID) -> Optional[AIGeneration]:
        stmt = (select(AIGeneration)
                .options(selectinload(AIGeneration.drafts))
                .where(AIGeneration.id == generation_id))
        return self.db.execute(stmt).scalar_one_or_none()

    def list_generations(self, subject_ids: Optional[Sequence[uuid.UUID]] = None, limit: int = 20) -> Sequence[AIGeneration]:
        """subject_ids=None means unrestricted (Admin/HOD); an empty list returns nothing."""
        stmt = select(AIGeneration).order_by(AIGeneration.created_at.desc()).limit(limit)
        if subject_ids is not None:
            if not subject_ids:
                return []
            stmt = stmt.where(AIGeneration.subject_id.in_(subject_ids))
        return self.db.execute(stmt).scalars().all()

    def get_draft(self, draft_id: uuid.UUID) -> Optional[QuestionDraft]:
        stmt = select(QuestionDraft).where(QuestionDraft.id == draft_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def save_review(self, draft: QuestionDraft, feedback: DraftFeedback) -> QuestionDraft:
        """Update the draft and append its feedback event in one transaction."""
        try:
            self.db.add(feedback)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(draft)
        return draft

    def get_feedback(self, draft_id: uuid.UUID) -> Sequence[DraftFeedback]:
        stmt = select(DraftFeedback).where(DraftFeedback.draft_id == draft_id).order_by(DraftFeedback.created_at)
        return self.db.execute(stmt).scalars().all()

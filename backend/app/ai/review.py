"""
Faculty review of AI question drafts and feedback capture.

Review outcomes are stored as append-only DraftFeedback events (before/after snapshots,
rejection reason, optional rating) for future supervised / reward-signal datasets.
No model training happens here.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Sequence
from pydantic import ValidationError

from app.ai.models import AIGeneration, DraftFeedback, QuestionDraft, PooledQuestion
from app.ai.repository import AIGenerationRepository
from app.ai.schemas import DraftReviewRequest, FacultyReviewStatus, GeneratedQuestion, ReviewAction
from app.ai.services import authorize_subject_access, question_snapshot, visible_subject_ids
from app.ai.validation import validate_question
from app.auth.models import User
from app.core.exceptions import AppException

_ACTION_TO_STATUS = {
    ReviewAction.ACCEPT: FacultyReviewStatus.VALIDATED,
    ReviewAction.EDIT: FacultyReviewStatus.EDITED,
    ReviewAction.REJECT: FacultyReviewStatus.REJECTED,
}


class DraftReviewService:
    def __init__(self, repository: AIGenerationRepository, subject_repo):
        self.repository = repository
        self.subject_repo = subject_repo

    def _authorize_subject(self, subject_id: uuid.UUID, current_user: User) -> None:
        subject = self.subject_repo.get_by_id(subject_id)
        if not subject:
            raise AppException("Subject not found", status_code=404)
        authorize_subject_access(subject, current_user)

    def get_generation(self, generation_id: uuid.UUID, current_user: User) -> AIGeneration:
        generation = self.repository.get_generation(generation_id)
        if not generation:
            raise AppException("Generation not found", status_code=404)
        self._authorize_subject(generation.subject_id, current_user)
        return generation

    def list_generations(self, current_user: User, subject_id: Optional[uuid.UUID] = None,
                         limit: int = 20) -> Sequence[AIGeneration]:
        if subject_id is not None:
            self._authorize_subject(subject_id, current_user)
            return self.repository.list_generations([subject_id], limit)
        allowed = visible_subject_ids(self.subject_repo.get_all(), current_user)
        return self.repository.list_generations(allowed, limit)

    def review(self, draft_id: uuid.UUID, request: DraftReviewRequest, current_user: User) -> QuestionDraft:
        draft = self.repository.get_draft(draft_id)
        if not draft:
            raise AppException("Draft not found", status_code=404)
        self._authorize_subject(draft.subject_id, current_user)

        before = question_snapshot(draft)
        previous_status = draft.faculty_review_status
        after = None
        changed = None

        if request.action == ReviewAction.EDIT:
            edits = request.edits.model_dump(exclude_unset=True, mode="json")
            candidate = {**before, **edits}
            changed = sorted(k for k, v in edits.items() if before.get(k) != v)
            if not changed:
                raise AppException("No changes were made to the question", status_code=400)
            try:
                question = GeneratedQuestion.model_validate(candidate)
            except ValidationError as exc:
                details = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
                raise AppException(f"Edited question is invalid: {details}", status_code=422)
            issues = validate_question(question)
            if issues:
                raise AppException(
                    "Edited question is invalid: " + "; ".join(i.message for i in issues), status_code=422)
            after = question_snapshot(question)
            for name in changed:
                setattr(draft, name, after[name])

        draft.faculty_review_status = _ACTION_TO_STATUS[request.action].value
        draft.reviewed_by = current_user.id
        draft.reviewed_at = datetime.now(timezone.utc)

        feedback = DraftFeedback(
            draft_id=draft.id,
            generation_id=draft.generation_id,
            reviewer_id=current_user.id,
            action=request.action.value,
            rejection_reason=request.rejection_reason.value if request.rejection_reason else None,
            comment=request.comment or None,
            rating=request.rating,
            previous_review_status=previous_status,
            before_snapshot=before,
            after_snapshot=after,
            changed_fields=changed,
        )
        
        pooled_question = None
        if draft.faculty_review_status in [FacultyReviewStatus.VALIDATED.value, FacultyReviewStatus.EDITED.value]:
            pooled_question = PooledQuestion(
                subject_id=draft.subject_id,
                unit_id=draft.unit_id,
                source_draft_id=draft.id,
                added_by=current_user.id,
                question_text=draft.question_text,
                question_type=draft.question_type,
                topic=draft.topic,
                difficulty=draft.difficulty,
                bloom_level=draft.bloom_level,
                marks=draft.marks,
                options=draft.options,
                correct_option_index=draft.correct_option_index,
                expected_answer=draft.expected_answer,
                explanation=draft.explanation,
                quality_score=draft.quality_score,
            )

        return self.repository.save_review(draft, feedback, pooled_question)

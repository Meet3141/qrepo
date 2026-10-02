"""
API -> QuestionGenerationService -> Context/Prompt engine -> AIProvider -> Gemini
                                 -> QuestionValidationEngine -> QualityEngine -> drafts

The service owns authorization, context, prompt construction, validation, the single repair
attempt, quality scoring, persistence and observability. The provider only turns a prompt
into raw structured JSON.
"""
import json
import logging
import time
from typing import Iterable, List, Optional

from app.ai.context import AcademicContext, AcademicContextBuilder
from app.ai.exceptions import AIException, AIOutputValidationError
from app.ai.models import AIGeneration, QuestionDraft
from app.ai.prompts import ACTIVE_QUESTION_PROMPT
from app.ai.provider import AIProvider
from app.ai.quality import QualityEngine
from app.ai.repository import AIGenerationRepository
from app.ai.schemas import (
    FacultyReviewStatus,
    GeneratedQuestion,
    GenerationStatus,
    QuestionGenerationRequest,
    ValidationStatus,
)
from app.ai.validation import QuestionValidationEngine, ValidationReport, parse_output
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY
from app.auth.models import User
from app.core.exceptions import AppException

logger = logging.getLogger("qrepo.ai")

# Initial generation + one controlled repair. Hard limit: bounds API cost and latency.
MAX_GENERATION_ATTEMPTS = 2


def authorize_subject_access(subject, current_user: User) -> None:
    """Same ownership rule as Subject/Unit/Document management."""
    role = current_user.role.name if current_user.role else None
    if role in (ROLE_ADMIN, ROLE_HOD):
        return
    if role == ROLE_FACULTY:
        if subject.faculty_id != current_user.id:
            raise AppException("You can only generate or review questions for subjects assigned to you", status_code=403)
        return
    raise AppException("You do not have permission to generate or review questions", status_code=403)


def parse_question_batch(raw_json: str):
    """Structural parse that raises instead of returning issues (kept for callers/tests)."""
    batch, issues = parse_output(raw_json)
    if batch is None:
        raise AIOutputValidationError("Schema validation failed: " + "; ".join(i.code for i in issues))
    return batch


def question_snapshot(source) -> dict:
    fields = ("question_text", "question_type", "topic", "difficulty", "bloom_level", "marks",
              "options", "correct_option_index", "expected_answer", "explanation")
    snapshot = {}
    for name in fields:
        value = getattr(source, name)
        snapshot[name] = value.value if hasattr(value, "value") else value
    return snapshot


class QuestionGenerationService:
    def __init__(
        self,
        provider: AIProvider,
        context_builder: AcademicContextBuilder,
        repository: AIGenerationRepository,
        validator: Optional[QuestionValidationEngine] = None,
        quality_engine: Optional[QualityEngine] = None,
    ):
        self.provider = provider
        self.context_builder = context_builder
        self.repository = repository
        self.validator = validator or QuestionValidationEngine()
        self.quality_engine = quality_engine or QualityEngine()

    def generate(self, request: QuestionGenerationRequest, current_user: User) -> AIGeneration:
        subject = self.context_builder.subject_repo.get_by_id(request.subject_id)
        if not subject:
            raise AppException("Subject not found", status_code=404)
        # Authorize before reading any unit or document content
        authorize_subject_access(subject, current_user)

        context = self.context_builder.build(request.subject_id, request.unit_id, topic=request.topic)
        generation = self._new_generation(request, context, current_user)
        # Don't hold a pooled DB connection open (idle in transaction) during the provider calls
        self.repository.end_read_transaction()

        start = time.perf_counter()
        report: Optional[ValidationReport] = None
        prompt = ACTIVE_QUESTION_PROMPT.build_prompt(request, context)
        try:
            for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):
                generation.generation_attempts = attempt
                response = self.provider.generate_questions(prompt)
                generation.provider_calls += response.attempts

                report = self.validator.validate(
                    response.raw_json, request, final_attempt=attempt == MAX_GENERATION_ATTEMPTS)
                if report.passed:
                    break

                generation.validation_issue_codes = report.issue_codes
                logger.info("ai_generation_validation attempt=%d status=%s issues=%s",
                            attempt, report.status.value, ",".join(report.issue_codes))
                if attempt < MAX_GENERATION_ATTEMPTS:
                    generation.repair_attempted = True
                    prompt = ACTIVE_QUESTION_PROMPT.build_repair_prompt(
                        request, context, response.raw_json, report.issues)
        except AIException as exc:
            generation.provider_calls += exc.attempts
            generation.status = GenerationStatus.FAILED.value
            generation.error_category = exc.category.value
            self._finish(generation, start, current_user, detail=exc.internal_detail)
            raise

        if not report.passed:
            generation.status = GenerationStatus.REJECTED.value
            generation.validation_status = ValidationStatus.REJECTED.value
            generation.error_category = AIOutputValidationError.category.value
            if report.batch is not None:
                generation.quality_score = self.quality_engine.score_batch(report.batch.questions, request).score
            self._finish(generation, start, current_user, detail="issues=" + ",".join(report.issue_codes))
            raise AIOutputValidationError(
                "Output rejected after repair: " + ",".join(report.issue_codes),
                message="The AI could not produce questions that passed validation, even after an automatic "
                        "repair attempt. Please try again or adjust the topic.",
            )

        questions = report.batch.questions
        quality = self.quality_engine.score_batch(questions, request)
        generation.status = GenerationStatus.SUCCESS.value
        generation.validation_status = ValidationStatus.PASS.value
        generation.quality_score = quality.score
        generation.questions_returned = len(questions)
        drafts = [
            self._new_draft(generation, q, position, q_quality.score, q_quality.signals)
            for position, (q, q_quality) in enumerate(zip(questions, quality.questions), start=1)
        ]
        return self._finish(generation, start, current_user, drafts=drafts)

    @staticmethod
    def _new_generation(request: QuestionGenerationRequest, context: AcademicContext, user: User) -> AIGeneration:
        return AIGeneration(
            requested_by=user.id,
            subject_id=request.subject_id,
            unit_id=request.unit_id,
            parameters_json=request.model_dump(mode="json"),
            prompt_version=ACTIVE_QUESTION_PROMPT.PROMPT_VERSION,
            provider="",
            model_name="",
            status=GenerationStatus.FAILED.value,
            question_count=request.number_of_questions,
            questions_returned=0,
            generation_attempts=0,
            provider_calls=0,
            repair_attempted=False,
            latency_ms=0,
            context_available=context.context_available,
            context_chars=context.context_chars,
            context_truncated=context.truncated,
            context_sections_used=context.sections_selected,
            context_document_ids=[str(d) for d in context.document_ids],
        )

    @staticmethod
    def _new_draft(generation: AIGeneration, q: GeneratedQuestion, position: int,
                   quality_score: float, quality_signals: dict) -> QuestionDraft:
        snapshot = question_snapshot(q)
        return QuestionDraft(
            subject_id=generation.subject_id,
            unit_id=generation.unit_id,
            position=position,
            quality_score=quality_score,
            quality_signals=quality_signals,
            validation_status=ValidationStatus.PASS.value,
            faculty_review_status=FacultyReviewStatus.DRAFT.value,
            ai_original=snapshot,
            **snapshot,
        )

    def _finish(self, generation: AIGeneration, start: float, current_user: User,
                drafts: Optional[List[QuestionDraft]] = None, detail: str = "") -> AIGeneration:
        generation.provider = self.provider.name
        generation.model_name = self.provider.model
        generation.latency_ms = int((time.perf_counter() - start) * 1000)
        saved = self.repository.save_generation(generation, drafts)
        self._log(saved, current_user, detail)
        return saved

    @staticmethod
    def _log(generation: AIGeneration, current_user: User, detail: str = "") -> None:
        # Structured metadata only: never the API key, prompt, source material or model output
        record = {
            "generation_id": str(generation.id),
            "generated_at": generation.created_at.isoformat() if generation.created_at else None,
            "user_id": str(current_user.id),
            "provider": generation.provider,
            "model": generation.model_name,
            "prompt_version": generation.prompt_version,
            "status": generation.status,
            "validation_status": generation.validation_status,
            "error_category": generation.error_category,
            "latency_ms": generation.latency_ms,
            "generation_attempts": generation.generation_attempts,
            "provider_calls": generation.provider_calls,
            "repair_attempted": generation.repair_attempted,
            "questions_requested": generation.question_count,
            "questions_returned": generation.questions_returned,
            "quality_score": generation.quality_score,
            "context_available": generation.context_available,
            "context_chars": generation.context_chars,
            "context_truncated": generation.context_truncated,
        }
        if detail:
            record["detail"] = detail
        level = logging.INFO if generation.status == GenerationStatus.SUCCESS.value else logging.WARNING
        logger.log(level, "ai_generation %s", json.dumps(record, sort_keys=True))


def visible_subject_ids(subjects: Iterable, current_user: User) -> Optional[List]:
    """None = unrestricted (Admin/HOD); otherwise the subject IDs this user may see."""
    role = current_user.role.name if current_user.role else None
    if role in (ROLE_ADMIN, ROLE_HOD):
        return None
    if role == ROLE_FACULTY:
        return [s.id for s in subjects if s.faculty_id == current_user.id]
    raise AppException("You do not have permission to view generated questions", status_code=403)

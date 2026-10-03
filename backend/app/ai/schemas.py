import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# --------------------------
# Controlled vocabularies
# --------------------------

class QuestionType(str, Enum):
    MCQ = "MCQ"
    SHORT_ANSWER = "SHORT_ANSWER"
    LONG_ANSWER = "LONG_ANSWER"
    TRUE_FALSE = "TRUE_FALSE"


class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class BloomLevel(str, Enum):
    # Cognitive process level; deliberately independent of Difficulty
    REMEMBER = "REMEMBER"
    UNDERSTAND = "UNDERSTAND"
    APPLY = "APPLY"
    ANALYZE = "ANALYZE"
    EVALUATE = "EVALUATE"
    CREATE = "CREATE"


class ValidationStatus(str, Enum):
    PASS = "PASS"
    REPAIR_REQUIRED = "REPAIR_REQUIRED"
    REJECTED = "REJECTED"


class GenerationStatus(str, Enum):
    SUCCESS = "SUCCESS"
    REJECTED = "REJECTED"   # output failed validation after the repair attempt
    FAILED = "FAILED"       # provider/configuration failure


class FacultyReviewStatus(str, Enum):
    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"  # accepted as-is by faculty
    EDITED = "EDITED"        # accepted with faculty edits
    REJECTED = "REJECTED"


# Only these review states may later be promoted into the official Question Bank
QUESTION_BANK_ELIGIBLE = frozenset({FacultyReviewStatus.VALIDATED, FacultyReviewStatus.EDITED})


class ReviewAction(str, Enum):
    ACCEPT = "ACCEPT"
    EDIT = "EDIT"
    REJECT = "REJECT"


class RejectionReason(str, Enum):
    INCORRECT = "INCORRECT"
    AMBIGUOUS = "AMBIGUOUS"
    OFF_TOPIC = "OFF_TOPIC"
    WRONG_DIFFICULTY = "WRONG_DIFFICULTY"
    WRONG_BLOOM_LEVEL = "WRONG_BLOOM_LEVEL"
    DUPLICATE = "DUPLICATE"
    POOR_LANGUAGE = "POOR_LANGUAGE"
    OTHER = "OTHER"


# Flexible batch size: 1–20. Larger batches cost more tokens and take longer to validate.
DEFAULT_QUESTIONS = 5
MIN_QUESTIONS_PER_BATCH = 1
MAX_QUESTIONS_PER_BATCH = 20

MCQ_OPTION_COUNT = 4
TRUE_FALSE_OPTIONS = ["True", "False"]

DEFAULT_MARKS_PER_QUESTION = 1.0


def _reject_control_chars(value: str) -> str:
    if any(ord(c) < 32 and c not in "\t\n\r" for c in value):
        raise ValueError("must not contain control characters")
    return value


def _single_line(value: str) -> str:
    _reject_control_chars(value)
    if "\n" in value or "\r" in value:
        raise ValueError("must be a single line")
    return value


# --------------------------
# Request contract
# --------------------------

class QuestionGenerationRequest(BaseModel):
    """
    Client-facing request. Only database IDs identify the academic scope (names come from
    PostgreSQL). extra="forbid" ensures callers cannot smuggle in system prompts, schemas,
    model names or generation parameters.
    """
    subject_id: uuid.UUID
    unit_id: Optional[uuid.UUID] = None
    topic: str = Field(..., min_length=2, max_length=200)
    target_audience: str = Field(..., min_length=2, max_length=100)
    question_type: QuestionType
    difficulty: Difficulty
    bloom_level: BloomLevel
    mark_distribution: Dict[str, int] = Field(...)

    @property
    def number_of_questions(self) -> int:
        return sum(self.mark_distribution.values())

    @model_validator(mode="after")
    def _validate_counts(self) -> "QuestionGenerationRequest":
        total = self.number_of_questions
        if total < MIN_QUESTIONS_PER_BATCH or total > MAX_QUESTIONS_PER_BATCH:
            raise ValueError(f"Total questions must be between {MIN_QUESTIONS_PER_BATCH} and {MAX_QUESTIONS_PER_BATCH}")
        # Validate keys are valid floats > 0
        for k, v in self.mark_distribution.items():
            if v > 0:
                try:
                    m = float(k)
                    if m <= 0 or m > 100:
                        raise ValueError(f"Marks must be between 0.5 and 100 (got {k})")
                except ValueError:
                    raise ValueError(f"Invalid mark value: {k}")
        return self

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("topic", "target_audience")
    @classmethod
    def _single_line_text(cls, value: str) -> str:
        return _single_line(value)


# --------------------------
# Structured model output (structural only — policy lives in app.ai.validation)
# --------------------------

class GeneratedQuestion(BaseModel):
    """
    Structural contract for one model-generated question. Bounds here are hard caps that also
    guide Gemini's response schema; semantic rules (option counts, answer keys, lengths,
    parameter compliance) are enforced by QuestionValidationEngine so they can be reported
    back to the model in a repair prompt.
    """
    question_text: str
    question_type: QuestionType
    topic: str
    difficulty: Difficulty
    bloom_level: BloomLevel
    marks: float
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    expected_answer: Optional[str] = None
    explanation: Optional[str] = None
    
    model_config = ConfigDict(extra="forbid")

class GeneratedQuestionBatch(BaseModel):
    questions: List[GeneratedQuestion]
    
    model_config = ConfigDict(extra="forbid")



# --------------------------
# Draft / generation API responses
# --------------------------

class QuestionDraftResponse(BaseModel):
    id: uuid.UUID
    generation_id: uuid.UUID
    position: int
    question_text: str
    question_type: QuestionType
    topic: str
    difficulty: Difficulty
    bloom_level: BloomLevel
    marks: float
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    expected_answer: Optional[str] = None
    explanation: Optional[str] = None
    quality_score: Optional[float] = None
    validation_status: ValidationStatus
    faculty_review_status: FacultyReviewStatus
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PooledQuestionResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    unit_id: Optional[uuid.UUID] = None
    source_draft_id: Optional[uuid.UUID] = None
    added_by: uuid.UUID
    
    question_text: str
    question_type: QuestionType
    topic: str
    difficulty: Difficulty
    bloom_level: BloomLevel
    marks: float
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    expected_answer: Optional[str] = None
    explanation: Optional[str] = None
    quality_score: Optional[float] = None
    
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerationMetadataPublic(BaseModel):
    generated_at: datetime
    latency_ms: int
    questions_requested: int
    questions_returned: int
    generation_attempts: int
    repair_attempted: bool
    context_available: bool
    context_truncated: bool
    context_sections_used: int


class QuestionGenerationResponse(BaseModel):
    generation_id: uuid.UUID
    status: GenerationStatus
    validation_status: Optional[ValidationStatus] = None
    quality_score: Optional[float] = None
    prompt_version: str
    model: str
    parameters: Dict[str, Any]
    questions: List[QuestionDraftResponse]
    metadata: GenerationMetadataPublic


class GenerationSummaryResponse(BaseModel):
    generation_id: uuid.UUID
    subject_id: uuid.UUID
    unit_id: Optional[uuid.UUID] = None
    status: GenerationStatus
    validation_status: Optional[ValidationStatus] = None
    quality_score: Optional[float] = None
    question_count: int
    parameters: Dict[str, Any]
    created_at: datetime


# --------------------------
# Faculty review
# --------------------------

class DraftEdits(BaseModel):
    """Fields faculty may change. question_type and topic are fixed by the generation."""
    question_text: Optional[str] = Field(None, max_length=4000)
    difficulty: Optional[Difficulty] = None
    bloom_level: Optional[BloomLevel] = None
    marks: Optional[float] = Field(None, ge=0, le=100)
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    expected_answer: Optional[str] = Field(None, max_length=8000)
    explanation: Optional[str] = Field(None, max_length=4000)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class DraftReviewRequest(BaseModel):
    action: ReviewAction
    edits: Optional[DraftEdits] = None
    rejection_reason: Optional[RejectionReason] = None
    comment: Optional[str] = Field(None, max_length=1000)
    rating: Optional[int] = Field(None, ge=1, le=5)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @model_validator(mode="after")
    def _action_requirements(self) -> "DraftReviewRequest":
        if self.action == ReviewAction.EDIT:
            if not self.edits or not self.edits.model_dump(exclude_unset=True):
                raise ValueError("EDIT requires at least one edited field")
        elif self.edits is not None:
            raise ValueError("edits are only allowed with action EDIT")
        if self.action == ReviewAction.REJECT and self.rejection_reason is None:
            raise ValueError("REJECT requires a rejection_reason")
        if self.action != ReviewAction.REJECT and self.rejection_reason is not None:
            raise ValueError("rejection_reason is only allowed with action REJECT")
        return self


class AIHealthResponse(BaseModel):
    available: bool
    latency_ms: Optional[int] = None
    error_category: Optional[str] = None

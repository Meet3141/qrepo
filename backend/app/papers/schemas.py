import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.ai.schemas import BloomLevel, Difficulty, QuestionType


class PaperStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    APPROVED = "APPROVED"     # finalized; frozen
    REJECTED = "REJECTED"     # terminal


EDITABLE_STATUSES = frozenset({PaperStatus.DRAFT, PaperStatus.CHANGES_REQUESTED})


class ReviewDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_CHANGES = "REQUEST_CHANGES"


class CommentKind(str, Enum):
    COMMENT = "COMMENT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"


DEFAULT_DIFFICULTY_MIX = {Difficulty.EASY: 30, Difficulty.MEDIUM: 50, Difficulty.HARD: 20}


def _check_mix(mix: Optional[Dict], label: str) -> Optional[Dict]:
    if mix is None:
        return None
    if not mix:
        raise ValueError(f"{label} must not be empty")
    if any(v < 0 or v > 100 for v in mix.values()):
        raise ValueError(f"{label} percentages must be between 0 and 100")
    if sum(mix.values()) != 100:
        raise ValueError(f"{label} percentages must add up to 100")
    return mix


class PaperBlueprint(BaseModel):
    """What the paper should contain. Used to auto-select a balanced set of accepted questions."""
    question_count: int = Field(10, ge=1, le=100)
    unit_ids: Optional[List[uuid.UUID]] = Field(None, max_length=50)
    question_types: Optional[List[QuestionType]] = None
    topics: Optional[List[str]] = Field(None, max_length=20)
    difficulty_mix: Dict[Difficulty, int] = Field(default_factory=lambda: dict(DEFAULT_DIFFICULTY_MIX))
    # None = spread evenly across the Bloom levels available in the question bank
    bloom_mix: Optional[Dict[BloomLevel, int]] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("difficulty_mix")
    @classmethod
    def _difficulty(cls, value):
        return _check_mix(value, "difficulty_mix")

    @field_validator("bloom_mix")
    @classmethod
    def _bloom(cls, value):
        return _check_mix(value, "bloom_mix")

    @field_validator("topics")
    @classmethod
    def _topics(cls, value):
        if value is None:
            return None
        cleaned = [t.strip() for t in value if t and t.strip()]
        if any(len(t) > 200 for t in cleaned):
            raise ValueError("topics must be at most 200 characters each")
        return cleaned or None


class _PaperMeta(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    exam_type: str = Field("Exam", min_length=2, max_length=50)
    duration_minutes: int = Field(60, ge=5, le=600)
    instructions: Optional[str] = Field(None, max_length=4000)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PaperCreate(_PaperMeta):
    subject_id: uuid.UUID
    blueprint: PaperBlueprint = Field(default_factory=PaperBlueprint)
    # Explicit ordered selection of accepted drafts. Omit to auto-build from the blueprint.
    question_draft_ids: Optional[List[uuid.UUID]] = Field(None, min_length=1, max_length=100)


class PaperUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    exam_type: Optional[str] = Field(None, min_length=2, max_length=50)
    duration_minutes: Optional[int] = Field(None, ge=5, le=600)
    instructions: Optional[str] = Field(None, max_length=4000)
    blueprint: Optional[PaperBlueprint] = None
    question_draft_ids: Optional[List[uuid.UUID]] = Field(None, min_length=1, max_length=100)
    # Re-select questions from the (new) blueprint
    rebuild: bool = False

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @model_validator(mode="after")
    def _one_selection_mode(self):
        if self.rebuild and self.question_draft_ids:
            raise ValueError("Use either rebuild or question_draft_ids, not both")
        return self


class ReviewRequest(BaseModel):
    decision: ReviewDecision
    comment: Optional[str] = Field(None, max_length=2000)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @model_validator(mode="after")
    def _comment_required(self):
        if self.decision != ReviewDecision.APPROVE and (not self.comment or len(self.comment) < 3):
            raise ValueError("A comment explaining the decision is required to reject or request changes")
        return self


class SubmitRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=2000)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# ── Responses ──────────────────────────────────────────────────────────

class PersonRef(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaperQuestionResponse(BaseModel):
    id: uuid.UUID
    position: int
    source_draft_id: Optional[uuid.UUID] = None
    unit_id: Optional[uuid.UUID] = None
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

    model_config = ConfigDict(from_attributes=True)


class CommentResponse(BaseModel):
    id: uuid.UUID
    kind: CommentKind
    body: Optional[str] = None
    paper_version: int
    author: Optional[PersonRef] = None
    created_at: datetime


class Distribution(BaseModel):
    total_marks: float
    question_count: int
    difficulty: Dict[str, float]   # percentages of questions
    bloom: Dict[str, float]
    question_types: Dict[str, int]


class PaperSummary(BaseModel):
    id: uuid.UUID
    title: str
    subject_id: uuid.UUID
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    exam_type: str
    duration_minutes: int
    status: PaperStatus
    version: int
    question_count: int
    total_marks: float
    created_by: Optional[PersonRef] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PaperDetail(PaperSummary):
    instructions: Optional[str] = None
    blueprint: dict
    questions: List[PaperQuestionResponse]
    comments: List[CommentResponse]
    distribution: Distribution
    reviewed_by: Optional[PersonRef] = None
    warnings: List[str] = []
    can_edit: bool = False
    can_review: bool = False
    can_submit: bool = False
    can_delete: bool = False


class PaperListResponse(BaseModel):
    items: List[PaperSummary]
    total: int
    page: int
    page_size: int
    status_counts: Dict[str, int]

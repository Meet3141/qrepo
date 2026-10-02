"""
QuestionValidationEngine — deterministic structural and policy checks on model output.

Scope: this validates structure and backend-owned constraints (counts, types, answer keys,
lengths, parameter compliance, duplicates). It cannot prove academic correctness; faculty
review remains the authoritative quality gate.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from pydantic import ValidationError

from app.ai.schemas import (
    GeneratedQuestion,
    GeneratedQuestionBatch,
    QuestionGenerationRequest,
    QuestionType,
    ValidationStatus,
    MCQ_OPTION_COUNT,
    TRUE_FALSE_OPTIONS,
)
from app.ai.text import normalize_for_comparison, similarity

# --------------------------
# Policy constants
# --------------------------

QUESTION_TEXT_MIN_CHARS = 15
QUESTION_TEXT_MAX_CHARS = 1500
OPTION_MAX_CHARS = 300
EXPLANATION_MAX_CHARS = 1500
EXPECTED_ANSWER_BOUNDS = {
    QuestionType.SHORT_ANSWER: (5, 1000),
    QuestionType.LONG_ANSWER: (50, 6000),
}
MARKS_BOUNDS = {
    QuestionType.MCQ: (0.5, 5),
    QuestionType.TRUE_FALSE: (0.5, 2),
    QuestionType.SHORT_ANSWER: (1, 10),
    QuestionType.LONG_ANSWER: (5, 30),
}
# Normalized-text similarity at or above this is treated as a near-duplicate
NEAR_DUPLICATE_THRESHOLD = 0.88
MAX_REPORTED_ISSUES = 25


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str
    question_index: Optional[int] = None  # zero-based; None for batch-level issues

    def describe(self) -> str:
        prefix = f"Question {self.question_index + 1}: " if self.question_index is not None else ""
        return prefix + self.message


@dataclass
class ValidationReport:
    status: ValidationStatus
    issues: List[ValidationIssue] = field(default_factory=list)
    batch: Optional[GeneratedQuestionBatch] = None

    @property
    def passed(self) -> bool:
        return self.status == ValidationStatus.PASS

    @property
    def issue_codes(self) -> List[str]:
        return sorted({i.code for i in self.issues})


def parse_output(raw_json: str) -> Tuple[Optional[GeneratedQuestionBatch], List[ValidationIssue]]:
    """
    Strict structural parse. Strict mode stops silent coercion ("3" -> 3); extra="forbid"
    rejects fields the model invents. Issue messages carry field paths and error types only.
    """
    try:
        return GeneratedQuestionBatch.model_validate_json(raw_json, strict=True), []
    except ValidationError as exc:
        issues = []
        for err in exc.errors()[:MAX_REPORTED_ISSUES]:
            loc = list(err["loc"])
            index = loc[1] if len(loc) >= 2 and loc[0] == "questions" and isinstance(loc[1], int) else None
            path = ".".join(str(p) for p in (loc[2:] if index is not None else loc)) or "(root)"
            code = "FORBIDDEN_FIELD" if err["type"] == "extra_forbidden" else "SCHEMA_INVALID"
            issues.append(ValidationIssue(code, f"{path}: {err['msg']}", index))
        return None, issues


def _length_issue(code: str, label: str, value: str, lo: int, hi: int, index: int) -> Optional[ValidationIssue]:
    n = len(value.strip())
    if n < lo:
        return ValidationIssue(code, f"{label} is too short ({n} chars, minimum {lo})", index)
    if n > hi:
        return ValidationIssue(code, f"{label} is too long ({n} chars, maximum {hi})", index)
    return None


def validate_question(q: GeneratedQuestion, index: int = 0) -> List[ValidationIssue]:
    """Single-question policy checks. Also used to validate faculty edits."""
    issues: List[ValidationIssue] = []

    if not q.question_text.strip():
        issues.append(ValidationIssue("EMPTY_QUESTION", "question_text is empty", index))
    else:
        issue = _length_issue("QUESTION_LENGTH", "question_text", q.question_text,
                              QUESTION_TEXT_MIN_CHARS, QUESTION_TEXT_MAX_CHARS, index)
        if issue:
            issues.append(issue)

    lo, hi = MARKS_BOUNDS[q.question_type]
    if not lo <= q.marks <= hi:
        issues.append(ValidationIssue(
            "MARKS_OUT_OF_RANGE", f"marks must be between {lo:g} and {hi:g} for {q.question_type.value} (got {q.marks:g})", index))

    if q.explanation is not None and len(q.explanation.strip()) > EXPLANATION_MAX_CHARS:
        issues.append(ValidationIssue(
            "EXPLANATION_LENGTH", f"explanation exceeds {EXPLANATION_MAX_CHARS} chars", index))

    if q.question_type == QuestionType.MCQ:
        issues.extend(_check_mcq(q, index))
    elif q.question_type == QuestionType.TRUE_FALSE:
        issues.extend(_check_true_false(q, index))
    else:
        issues.extend(_check_written(q, index))
    return issues


def _check_mcq(q: GeneratedQuestion, index: int) -> List[ValidationIssue]:
    issues = []
    options = q.options or []
    if len(options) != MCQ_OPTION_COUNT:
        issues.append(ValidationIssue(
            "MCQ_OPTION_COUNT", f"MCQ must have exactly {MCQ_OPTION_COUNT} options (got {len(options)})", index))
    if any(not o.strip() for o in options):
        issues.append(ValidationIssue("MCQ_EMPTY_OPTION", "MCQ options must not be blank", index))
    if any(len(o.strip()) > OPTION_MAX_CHARS for o in options):
        issues.append(ValidationIssue("MCQ_OPTION_LENGTH", f"MCQ options must be at most {OPTION_MAX_CHARS} chars", index))
    normalized = [normalize_for_comparison(o) for o in options if o.strip()]
    if len(set(normalized)) != len(normalized):
        issues.append(ValidationIssue("MCQ_DUPLICATE_OPTIONS", "MCQ options must be distinct", index))
    if q.correct_option_index is None:
        issues.append(ValidationIssue("MCQ_MISSING_ANSWER", "MCQ requires correct_option_index", index))
    elif not 0 <= q.correct_option_index < len(options):
        issues.append(ValidationIssue(
            "MCQ_ANSWER_INDEX", f"correct_option_index {q.correct_option_index} is out of range", index))
    if q.expected_answer:
        issues.append(ValidationIssue("MCQ_UNEXPECTED_ANSWER", "MCQ must not set expected_answer", index))
    return issues


def _check_true_false(q: GeneratedQuestion, index: int) -> List[ValidationIssue]:
    issues = []
    if q.options != TRUE_FALSE_OPTIONS:
        issues.append(ValidationIssue("TF_OPTIONS", f"TRUE_FALSE options must be exactly {TRUE_FALSE_OPTIONS}", index))
    if q.correct_option_index not in (0, 1):
        issues.append(ValidationIssue("TF_ANSWER", "TRUE_FALSE correct_option_index must be 0 (True) or 1 (False)", index))
    if q.expected_answer:
        issues.append(ValidationIssue("TF_UNEXPECTED_ANSWER", "TRUE_FALSE must not set expected_answer", index))
    return issues


def _check_written(q: GeneratedQuestion, index: int) -> List[ValidationIssue]:
    issues = []
    if q.options or q.correct_option_index is not None:
        issues.append(ValidationIssue(
            "WRITTEN_HAS_OPTIONS", f"{q.question_type.value} must not have options or correct_option_index", index))
    if not q.expected_answer or not q.expected_answer.strip():
        issues.append(ValidationIssue("MISSING_EXPECTED_ANSWER", f"{q.question_type.value} requires expected_answer", index))
    else:
        lo, hi = EXPECTED_ANSWER_BOUNDS[q.question_type]
        issue = _length_issue("ANSWER_LENGTH", "expected_answer", q.expected_answer, lo, hi, index)
        if issue:
            issues.append(issue)
    return issues


def topics_match(generated: str, requested: str) -> bool:
    return normalize_for_comparison(generated) == normalize_for_comparison(requested)


class QuestionValidationEngine:
    def validate(self, raw_json: str, request: QuestionGenerationRequest, *, final_attempt: bool) -> ValidationReport:
        batch, issues = parse_output(raw_json)
        if batch is not None:
            issues = self.validate_batch(batch.questions, request)

        if not issues:
            status = ValidationStatus.PASS
        else:
            status = ValidationStatus.REJECTED if final_attempt else ValidationStatus.REPAIR_REQUIRED
        return ValidationReport(status=status, issues=issues[:MAX_REPORTED_ISSUES], batch=batch)

    def validate_batch(self, questions: List[GeneratedQuestion], request: QuestionGenerationRequest) -> List[ValidationIssue]:
        issues: List[ValidationIssue] = []

        if len(questions) != request.number_of_questions:
            issues.append(ValidationIssue(
                "QUESTION_COUNT", f"expected exactly {request.number_of_questions} questions, got {len(questions)}"))

        for i, q in enumerate(questions):
            for name, got, want in (
                ("question_type", q.question_type, request.question_type),
                ("difficulty", q.difficulty, request.difficulty),
                ("bloom_level", q.bloom_level, request.bloom_level),
            ):
                if got != want:
                    issues.append(ValidationIssue(
                        f"{name.upper()}_MISMATCH", f"{name} must be {want.value} (got {got.value})", i))
            if not topics_match(q.topic, request.topic):
                issues.append(ValidationIssue("TOPIC_MISMATCH", "topic must repeat the requested topic verbatim", i))
            issues.extend(validate_question(q, i))

        issues.extend(self._duplicates(questions))
        return issues

    @staticmethod
    def _duplicates(questions: List[GeneratedQuestion]) -> List[ValidationIssue]:
        issues = []
        for j in range(len(questions)):
            for i in range(j):
                score = similarity(questions[i].question_text, questions[j].question_text)
                if score == 1.0:
                    issues.append(ValidationIssue("DUPLICATE_QUESTION", f"duplicates question {i + 1}", j))
                    break
                if score >= NEAR_DUPLICATE_THRESHOLD:
                    issues.append(ValidationIssue(
                        "NEAR_DUPLICATE_QUESTION", f"is a near-duplicate of question {i + 1} (similarity {score:.2f})", j))
                    break
        return issues

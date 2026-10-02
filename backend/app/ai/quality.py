"""
QualityEngine — deterministic, rule-based v1 quality score in [0, 1].

This is NOT a learned reward model and does not judge academic correctness. It summarizes
observable signals so faculty can prioritise review. The score is advisory: acceptance is
decided by QuestionValidationEngine (structure/policy) and faculty review (correctness).
"""
from dataclasses import dataclass
from typing import Dict, List

from app.ai.schemas import GeneratedQuestion, QuestionGenerationRequest, QuestionType, MCQ_OPTION_COUNT
from app.ai.text import content_terms, coverage, normalize_for_comparison, similarity
from app.ai.validation import NEAR_DUPLICATE_THRESHOLD, validate_question

WEIGHTS: Dict[str, float] = {
    "parameter_compliance": 0.20,  # type / difficulty / Bloom level match the request
    "answer_completeness": 0.20,   # explanation or model answer present and substantive
    "topic_relevance": 0.20,       # requested topic terms appear in the question/answer
    "length_sanity": 0.15,         # question text within a sensible length band
    "option_quality": 0.15,        # MCQ options distinct and balanced; TF well-formed
    "uniqueness": 0.10,            # penalty for similarity to other questions in the batch
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

IDEAL_QUESTION_CHARS = (40, 600)
HARD_QUESTION_CHARS = (15, 1500)
# Similarity at or below this is not penalised; at the near-duplicate threshold the signal is 0
UNIQUENESS_FREE_SIMILARITY = 0.5


@dataclass(frozen=True)
class QuestionQuality:
    score: float
    signals: Dict[str, float]


@dataclass(frozen=True)
class BatchQuality:
    score: float
    questions: List[QuestionQuality]


def _band(value: float, ideal: tuple, hard: tuple) -> float:
    lo, hi = ideal
    hard_lo, hard_hi = hard
    if lo <= value <= hi:
        return 1.0
    if value < lo:
        return max(0.0, (value - hard_lo) / (lo - hard_lo))
    return max(0.0, (hard_hi - value) / (hard_hi - hi))


def _ramp(value: float, full_at: float) -> float:
    return max(0.0, min(1.0, value / full_at))


class QualityEngine:
    def score_batch(self, questions: List[GeneratedQuestion], request: QuestionGenerationRequest) -> BatchQuality:
        if not questions:
            return BatchQuality(score=0.0, questions=[])
        topic_terms = content_terms(request.topic)
        scored = [
            self.score_question(q, request, topic_terms, [o.question_text for j, o in enumerate(questions) if j != i])
            for i, q in enumerate(questions)
        ]
        return BatchQuality(score=round(sum(s.score for s in scored) / len(scored), 3), questions=scored)

    def score_question(self, q: GeneratedQuestion, request: QuestionGenerationRequest,
                       topic_terms: List[str], other_texts: List[str]) -> QuestionQuality:
        signals = {
            "parameter_compliance": sum((
                q.question_type == request.question_type,
                q.difficulty == request.difficulty,
                q.bloom_level == request.bloom_level,
            )) / 3,
            "answer_completeness": self._answer_completeness(q),
            "topic_relevance": coverage(
                topic_terms, " ".join(filter(None, (q.question_text, q.expected_answer, q.explanation, *(q.options or []))))),
            "length_sanity": _band(len(q.question_text.strip()), IDEAL_QUESTION_CHARS, HARD_QUESTION_CHARS),
            "option_quality": self._option_quality(q),
            "uniqueness": self._uniqueness(q.question_text, other_texts),
        }
        signals = {k: round(v, 3) for k, v in signals.items()}
        score = sum(WEIGHTS[k] * v for k, v in signals.items())
        # Structurally invalid questions can't score well regardless of other signals
        if validate_question(q):
            score *= 0.5
        return QuestionQuality(score=round(score, 3), signals=signals)

    @staticmethod
    def _answer_completeness(q: GeneratedQuestion) -> float:
        if q.question_type in (QuestionType.MCQ, QuestionType.TRUE_FALSE):
            return _ramp(len((q.explanation or "").strip()), 40)
        target = 30 if q.question_type == QuestionType.SHORT_ANSWER else 200
        return _ramp(len((q.expected_answer or "").strip()), target)

    @staticmethod
    def _option_quality(q: GeneratedQuestion) -> float:
        if q.question_type == QuestionType.MCQ:
            options = [o.strip() for o in (q.options or []) if o.strip()]
            if not options:
                return 0.0
            distinct = len({normalize_for_comparison(o) for o in options}) / max(len(q.options or []), 1)
            count_ok = 1.0 if len(q.options or []) == MCQ_OPTION_COUNT else 0.5
            lengths = [len(o) for o in options]
            # A single option far longer than the rest is a classic give-away
            balance = 1.0 if max(lengths) <= 4 * max(min(lengths), 1) else 0.6
            return distinct * count_ok * balance
        if q.question_type == QuestionType.TRUE_FALSE:
            return 1.0 if q.options == ["True", "False"] and q.correct_option_index in (0, 1) else 0.0
        return 1.0 if not q.options else 0.0

    @staticmethod
    def _uniqueness(text: str, others: List[str]) -> float:
        if not others:
            return 1.0
        worst = max(similarity(text, o) for o in others)
        if worst <= UNIQUENESS_FREE_SIMILARITY:
            return 1.0
        if worst >= NEAR_DUPLICATE_THRESHOLD:
            return 0.0
        return 1.0 - (worst - UNIQUENESS_FREE_SIMILARITY) / (NEAR_DUPLICATE_THRESHOLD - UNIQUENESS_FREE_SIMILARITY)

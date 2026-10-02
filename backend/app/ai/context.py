"""
Deterministic academic context for prompts. No embeddings, no pgvector, no semantic or external
search: context comes only from Subject/Unit metadata and the extracted text of COMPLETED
documents attached to the selected Unit.

Selection: documents are split into bounded sections, each section is scored by weighted lexical
overlap with the requested topic, unit and subject, and the best sections are packed into a fixed
character budget. Selected sections are emitted in their original reading order.
"""
import math
import re
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from app.ai.text import normalize_whitespace, term_frequencies
from app.core.exceptions import AppException

COMPLETED_STATUS = "COMPLETED"

SECTION_MAX_CHARS = 1200
SECTION_MIN_CHARS = 200   # smaller paragraphs are merged with their neighbours
MIN_USEFUL_CHARS = 150    # don't spend remaining budget on fragments smaller than this
SECTION_JOINER = "\n\n"

# Query term weights: the requested topic matters most, then unit, then subject
TOPIC_WEIGHT = 3.0
UNIT_TITLE_WEIGHT = 2.0
UNIT_DESCRIPTION_WEIGHT = 1.0
SUBJECT_WEIGHT = 1.0

_SENTENCE_BREAK = re.compile(r"(?<=[.!?;:])\s+|\n")


class SelectionStrategy:
    NONE = "none"          # no document text available
    LEXICAL = "lexical"    # sections ranked by query-term overlap
    LEADING = "leading"    # no overlap found; fall back to the start of each document


@dataclass
class Section:
    document_index: int
    order: int
    text: str
    score: float = 0.0


@dataclass
class AcademicContext:
    subject_id: uuid.UUID
    subject_name: str
    subject_code: str
    unit_id: Optional[uuid.UUID] = None
    unit_number: Optional[int] = None
    unit_title: Optional[str] = None
    unit_description: Optional[str] = None
    source_excerpt: str = ""
    document_ids: List[uuid.UUID] = field(default_factory=list)
    sections_total: int = 0
    sections_selected: int = 0
    selection_strategy: str = SelectionStrategy.NONE
    truncated: bool = False
    max_chars: int = 0

    @property
    def context_available(self) -> bool:
        return bool(self.source_excerpt)

    @property
    def context_chars(self) -> int:
        return len(self.source_excerpt)


def normalize_text(text: str) -> str:
    return normalize_whitespace(text)


def split_sections(text: str, max_chars: int = SECTION_MAX_CHARS, min_chars: int = SECTION_MIN_CHARS) -> List[str]:
    """Paragraph-based sections bounded to max_chars; tiny paragraphs are merged."""
    pieces: List[str] = []
    for paragraph in normalize_text(text).split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) <= max_chars:
            pieces.append(paragraph)
            continue
        # Split long paragraphs at sentence/line boundaries, hard-cutting runaway sentences
        current = ""
        for sentence in (s.strip() for s in _SENTENCE_BREAK.split(paragraph)):
            if not sentence:
                continue
            while len(sentence) > max_chars:
                if current:
                    pieces.append(current)
                    current = ""
                pieces.append(sentence[:max_chars])
                sentence = sentence[max_chars:].lstrip()
            if current and len(current) + 1 + len(sentence) > max_chars:
                pieces.append(current)
                current = sentence
            else:
                current = f"{current} {sentence}".strip()
        if current:
            pieces.append(current)

    sections: List[str] = []
    for piece in pieces:
        too_small = len(piece) < min_chars or (sections and len(sections[-1]) < min_chars)
        if sections and too_small and len(sections[-1]) + 2 + len(piece) <= max_chars:
            sections[-1] = f"{sections[-1]}\n\n{piece}"
        else:
            sections.append(piece)
    return sections


def build_query_weights(topic: str, unit_title: Optional[str], unit_description: Optional[str],
                        subject_name: str) -> Dict[str, float]:
    weights: Dict[str, float] = {}
    for text, weight in ((subject_name, SUBJECT_WEIGHT), (unit_description or "", UNIT_DESCRIPTION_WEIGHT),
                         (unit_title or "", UNIT_TITLE_WEIGHT), (topic, TOPIC_WEIGHT)):
        for term in term_frequencies(text):
            weights[term] = max(weights.get(term, 0.0), weight)
    return weights


def score_section(text: str, weights: Dict[str, float]) -> float:
    freq = term_frequencies(text)
    raw = sum(w * (1 + math.log(freq[t])) for t, w in weights.items() if t in freq)
    # Mild length normalization so long sections don't win just by being long
    n_terms = sum(freq.values())
    return raw / (1 + math.log(1 + n_terms / 100))


class AcademicContextBuilder:
    def __init__(self, subject_repo, unit_repo, document_repo, max_chars: int):
        self.subject_repo = subject_repo
        self.unit_repo = unit_repo
        self.document_repo = document_repo
        self.max_chars = max(0, max_chars)

    def build(self, subject_id: uuid.UUID, unit_id: Optional[uuid.UUID] = None, topic: str = "") -> AcademicContext:
        subject = self.subject_repo.get_by_id(subject_id)
        if not subject:
            raise AppException("Subject not found", status_code=404)

        context = AcademicContext(
            subject_id=subject.id,
            subject_name=subject.name,
            subject_code=subject.code,
            max_chars=self.max_chars,
        )
        if unit_id is None:
            return context

        unit = self.unit_repo.get_by_id(unit_id)
        if not unit:
            raise AppException("Unit not found", status_code=404)
        if unit.subject_id != subject.id:
            raise AppException("Unit does not belong to the selected subject", status_code=400)

        context.unit_id = unit.id
        context.unit_number = unit.unit_number
        context.unit_title = unit.title
        context.unit_description = unit.description

        self._select_sections(context, topic)
        return context

    def _select_sections(self, context: AcademicContext, topic: str) -> None:
        documents = [
            d for d in self.document_repo.get_by_unit_id(context.unit_id)  # newest first
            if d.processing_status == COMPLETED_STATUS and d.extracted_text and d.extracted_text.strip()
        ]
        if not documents or self.max_chars == 0:
            return

        sections = [
            Section(document_index=di, order=si, text=text)
            for di, document in enumerate(documents)
            for si, text in enumerate(split_sections(document.extracted_text))
        ]
        context.sections_total = len(sections)

        weights = build_query_weights(topic, context.unit_title, context.unit_description, context.subject_name)
        for section in sections:
            section.score = score_section(section.text, weights)

        if any(s.score > 0 for s in sections):
            context.selection_strategy = SelectionStrategy.LEXICAL
            # Highest relevance first; ties resolved by document recency then reading order
            candidates = sorted((s for s in sections if s.score > 0),
                                key=lambda s: (-s.score, s.document_index, s.order))
        else:
            context.selection_strategy = SelectionStrategy.LEADING
            candidates = sorted(sections, key=lambda s: (s.order, s.document_index))

        selected = self._pack(candidates, documents)
        context.sections_selected = len(selected)
        context.truncated = len(selected) < len(sections) or any(s.text.endswith("…") for s in selected)
        context.document_ids = [documents[i].id for i in sorted({s.document_index for s in selected})]
        context.source_excerpt = self._render(selected, documents)[: self.max_chars]

    def _pack(self, candidates: List[Section], documents) -> List[Section]:
        selected: List[Section] = []
        used_docs = set()
        remaining = self.max_chars
        for section in candidates:
            header_cost = 0 if section.document_index in used_docs else len(self._header(documents[section.document_index])) + len(SECTION_JOINER)
            cost = header_cost + len(section.text) + len(SECTION_JOINER)
            if cost <= remaining:
                selected.append(section)
            elif not selected and remaining - header_cost >= MIN_USEFUL_CHARS:
                # The single best section is larger than the whole budget: keep its beginning
                keep = remaining - header_cost - len(SECTION_JOINER) - 1
                selected.append(Section(section.document_index, section.order, section.text[:keep].rstrip() + "…", section.score))
                cost = remaining
            else:
                continue
            used_docs.add(section.document_index)
            remaining -= cost
            if remaining < MIN_USEFUL_CHARS:
                break
        return selected

    @staticmethod
    def _header(document) -> str:
        return f"--- Document: {document.file_name} ---"

    def _render(self, selected: List[Section], documents) -> str:
        blocks: List[str] = []
        for doc_index in sorted({s.document_index for s in selected}):
            blocks.append(self._header(documents[doc_index]))
            blocks.extend(s.text for s in sorted((s for s in selected if s.document_index == doc_index), key=lambda s: s.order))
        return SECTION_JOINER.join(blocks)

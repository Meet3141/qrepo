"""
Deterministic balanced paper builder.

Selects faculty-accepted questions so the paper's difficulty and Bloom distributions track the
blueprint as closely as the question bank allows, avoiding near-duplicates. Pure functions: the
same inputs always produce the same paper.
"""
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence

from app.ai.schemas import BloomLevel, Difficulty
from app.ai.text import normalize_for_comparison, similarity
from app.ai.validation import NEAR_DUPLICATE_THRESHOLD
from app.papers.schemas import PaperBlueprint

DIFFICULTY_ORDER = [d.value for d in Difficulty]
BLOOM_ORDER = [b.value for b in BloomLevel]
MAX_CANDIDATES = 1000


@dataclass
class BuildResult:
    selected: List  # ordered drafts
    warnings: List[str] = field(default_factory=list)
    difficulty_targets: Dict[str, int] = field(default_factory=dict)
    bloom_targets: Dict[str, int] = field(default_factory=dict)


def allocate(total: int, percentages: Dict[str, int]) -> Dict[str, int]:
    """Largest-remainder apportionment of `total` items by percentage (deterministic tie-break by key)."""
    raw = {k: total * p / 100 for k, p in percentages.items()}
    counts = {k: int(v) for k, v in raw.items()}
    remaining = total - sum(counts.values())
    for k in sorted(raw, key=lambda k: (-(raw[k] - counts[k]), k))[:remaining]:
        counts[k] += 1
    return counts


def filter_candidates(drafts: Iterable, blueprint: PaperBlueprint) -> List:
    unit_ids = set(blueprint.unit_ids or [])
    types = {t.value for t in blueprint.question_types or []}
    topics = [normalize_for_comparison(t) for t in blueprint.topics or []]
    out = []
    for d in drafts:
        if unit_ids and d.unit_id not in unit_ids:
            continue
        if types and d.question_type not in types:
            continue
        if topics and not any(t in normalize_for_comparison(d.topic) for t in topics):
            continue
        out.append(d)
    return out


def dedupe(drafts: Sequence) -> List:
    """Keep the best-quality representative of each near-duplicate group."""
    ordered = sorted(drafts, key=lambda d: (-(d.quality_score or 0), str(d.created_at), str(d.id)))[:MAX_CANDIDATES]
    kept: List = []
    for d in ordered:
        if all(similarity(d.question_text, k.question_text) < NEAR_DUPLICATE_THRESHOLD for k in kept):
            kept.append(d)
    return kept


def build_paper(drafts: Iterable, blueprint: PaperBlueprint) -> BuildResult:
    pool = dedupe(filter_candidates(drafts, blueprint))
    n = blueprint.question_count
    difficulty_targets = allocate(n, {k.value: v for k, v in blueprint.difficulty_mix.items()})

    if blueprint.bloom_mix:
        bloom_targets = allocate(n, {k.value: v for k, v in blueprint.bloom_mix.items()})
    else:
        levels = sorted({d.bloom_level for d in pool}, key=BLOOM_ORDER.index)
        bloom_targets = allocate(n, {lvl: 100 // len(levels) + (1 if i < 100 % len(levels) else 0)
                                     for i, lvl in enumerate(levels)}) if levels else {}

    result = BuildResult(selected=[], difficulty_targets=difficulty_targets, bloom_targets=bloom_targets)
    if not pool:
        result.warnings.append("No accepted questions match this blueprint. Accept AI drafts in the Question Bank first.")
        return result

    diff_left = dict(difficulty_targets)
    bloom_left = dict(bloom_targets)
    remaining = list(pool)  # already in deterministic quality order
    while remaining and len(result.selected) < n:
        def score(item):
            index, d = item
            return (
                (1 if diff_left.get(d.difficulty, 0) > 0 else 0) + (1 if bloom_left.get(d.bloom_level, 0) > 0 else 0),
                d.quality_score or 0,
                -index,
            )
        index, best = max(enumerate(remaining), key=score)
        result.selected.append(best)
        remaining.pop(index)
        diff_left[best.difficulty] = diff_left.get(best.difficulty, 0) - 1
        bloom_left[best.bloom_level] = bloom_left.get(best.bloom_level, 0) - 1

    if len(result.selected) < n:
        result.warnings.append(
            f"Only {len(result.selected)} of {n} requested questions are available in the question bank for this blueprint.")
    for label, targets, left in (("difficulty", difficulty_targets, diff_left), ("Bloom level", bloom_targets, bloom_left)):
        for key in targets:
            if left.get(key, 0) > 0:
                result.warnings.append(
                    f"Requested {targets[key]} {key} questions ({label}); only {targets[key] - left[key]} could be placed.")

    # Present easier questions first, then by Bloom level, keeping selection order as the final tie-break
    rank = {id(d): i for i, d in enumerate(result.selected)}
    result.selected.sort(key=lambda d: (DIFFICULTY_ORDER.index(d.difficulty), BLOOM_ORDER.index(d.bloom_level), rank[id(d)]))
    return result


def distribution(questions: Sequence) -> dict:
    n = len(questions)

    def pct(values: List[str], order: List[str]) -> Dict[str, float]:
        return {k: round(100 * values.count(k) / n, 1) if n else 0.0 for k in order}

    types: Dict[str, int] = {}
    for q in questions:
        types[q.question_type] = types.get(q.question_type, 0) + 1
    return {
        "total_marks": round(sum(q.marks for q in questions), 2),
        "question_count": n,
        "difficulty": pct([q.difficulty for q in questions], DIFFICULTY_ORDER),
        "bloom": pct([q.bloom_level for q in questions], BLOOM_ORDER),
        "question_types": types,
    }


def balanced_bloom_mix() -> Dict[str, int]:
    """Even mix over the six Bloom levels, used when a subject's papers are skewed."""
    base, extra = divmod(100, len(BLOOM_ORDER))
    return {level: base + (1 if i < extra else 0) for i, level in enumerate(BLOOM_ORDER)}

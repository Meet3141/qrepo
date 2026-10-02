"""
Deterministic text helpers shared by the context, validation and quality engines.
Pure functions, no external NLP libraries, no embeddings.
"""
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Dict, Iterable, List

_WORD = re.compile(r"[a-z0-9]+")
_INLINE_WS = re.compile(r"[ \t\f\v]+")
_BLANK_LINES = re.compile(r"\n\s*\n+")

STOPWORDS = frozenset("""
a about above after again against all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have having
he her here hers herself him himself his how i if in into is it its itself just me more most my myself no
nor not now of off on once only or other our ours ourselves out over own same she should so some such than
that the their theirs them themselves then there these they this those through to too under until up very
was we were what when where which while who whom why will with would you your yours yourself yourselves
using use used based given following explain describe define discuss write question questions answer
introduction overview basics basic concept concepts topic unit chapter
""".split())


def normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _INLINE_WS.sub(" ", text)
    text = _BLANK_LINES.sub("\n\n", text)
    return text.strip()


def normalize_for_comparison(text: str) -> str:
    """Casefolded, accent-stripped, punctuation-free, single-spaced."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return " ".join(_WORD.findall(text.casefold()))


_ES_PLURAL = re.compile(r"(?:s|x|z|ch|sh)es$")


def stem(token: str) -> str:
    base = _strip_suffix(token)
    # Drop a trailing 'e' so 'balance'/'balanced' and 'tree'/'trees' share a stem
    return base[:-1] if len(base) > 3 and base.endswith("e") else base


def _strip_suffix(token: str) -> str:
    """
    Tiny deterministic suffix stripper so singular/plural and simple inflections match:
    'trees'->'tree', 'classes'->'class', 'queries'->'query', 'sorting'->'sort'.
    """
    def strip(suffix: str, replacement: str = "") -> str:
        return token[: -len(suffix)] + replacement

    if len(token) <= 3:
        return token
    for suffix in ("ations", "ation", "ings", "ing"):
        if token.endswith(suffix) and len(token) - len(suffix) >= 3:
            return strip(suffix)
    if token.endswith("ies") and len(token) > 4:
        return strip("ies", "y")
    if _ES_PLURAL.search(token):
        return strip("es")
    if token.endswith("ed") and len(token) > 4:
        return strip("ed")
    if token.endswith("s") and not token.endswith(("ss", "us", "is")):
        return strip("s")
    return token


def content_terms(text: str) -> List[str]:
    """Stemmed, stopword-free terms of length >= 2 (keeps short technical tokens like 'os', 'ai')."""
    return [stem(t) for t in _WORD.findall(normalize_for_comparison(text)) if len(t) >= 2 and t not in STOPWORDS]


def term_frequencies(text: str) -> Dict[str, int]:
    freq: Dict[str, int] = {}
    for term in content_terms(text):
        freq[term] = freq.get(term, 0) + 1
    return freq


def similarity(a: str, b: str) -> float:
    """Normalized-text similarity in [0, 1] (difflib ratio; deterministic)."""
    na, nb = normalize_for_comparison(a), normalize_for_comparison(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb, autojunk=False).ratio()


def coverage(terms: Iterable[str], text: str) -> float:
    """Fraction of `terms` present in `text` (after stemming). 1.0 when there are no terms."""
    wanted = set(terms)
    if not wanted:
        return 1.0
    present = set(content_terms(text))
    return len(wanted & present) / len(wanted)

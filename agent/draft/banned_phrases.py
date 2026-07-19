"""Banned phrase list and lint helper for editorial voice."""

from __future__ import annotations

import re
from dataclasses import dataclass

BANNED_PHRASES: list[str] = [
    "w dzisiejszych czasach",
    "warto zauważyć",
    "w świecie motoryzacji",
    "rewolucyjny",
    "niesamowity",
    "fenomenalny",
    "absolutnie wyjątkowy",
    "game changer",
    "must have",
    "hit sezonu",
    "nie da się przeoczyć",
    "z pewnością zainteresuje",
    "warto wspomnieć",
    "jak wiadomo",
    "bez wątpienia",
]

_EMPTY_SUPERLATIVE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bnajlepsz[aeyiou]?\b", re.IGNORECASE),
    re.compile(r"\bnajbardziej\b", re.IGNORECASE),
    re.compile(r"\bnajnowsz[aeyiou]?\b", re.IGNORECASE),
]


@dataclass
class LintResult:
    hits: list[str]
    clean: bool


def lint_text(text: str) -> LintResult:
    """
    Return banned phrase hits in ``text``.

    Flags known filler phrases and empty superlatives without supporting numbers nearby.
    """

    lowered = text.lower()
    hits: list[str] = []

    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            hits.append(phrase)

    for pattern in _EMPTY_SUPERLATIVE_PATTERNS:
        for match in pattern.finditer(text):
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 40)
            window = text[start:end]
            if not re.search(r"\d", window):
                hits.append(match.group(0).lower())

    # Deduplicate while preserving order.
    seen: set[str] = set()
    unique_hits: list[str] = []
    for hit in hits:
        if hit not in seen:
            seen.add(hit)
            unique_hits.append(hit)

    return LintResult(hits=unique_hits, clean=len(unique_hits) == 0)

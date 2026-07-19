"""Editorial gate scoring."""

from __future__ import annotations

import logging
import re
from typing import Iterable

from models import DraftDocument, EnrichResult, GateScore

logger = logging.getLogger(__name__)

# Thresholds (0–1 scale).
THRESHOLD_INFORMATION_GAIN = 0.55
THRESHOLD_NUMBER_ACCURACY = 0.50
THRESHOLD_UNIQUENESS = 0.45


def _score_information_gain(draft: DraftDocument, enrich: EnrichResult) -> float:
    score = 0.25
    if enrich.signal_count >= 2:
        score += 0.2
    if enrich.signal_count >= 3:
        score += 0.15

    body = draft.body_markdown.lower()
    if "polsk" in body:
        score += 0.1
    if "co to znaczy dla polskiego kupującego" in body:
        score += 0.15
    if "[galeria:" in body:
        score += 0.05
    if "leasing" in body or "finansow" in body:
        score += 0.1

    return min(1.0, score)


def _score_number_accuracy(draft: DraftDocument, enrich: EnrichResult) -> float:
    numbers_in_draft = {m.group(0) for m in re.finditer(r"\d[\d\s]*", draft.body_markdown)}
    reference_numbers: set[str] = set()

    signals = enrich.signals
    if signals.pl_price_pln:
        reference_numbers.add(str(int(signals.pl_price_pln)))
    if signals.lease_rent_from_finance:
        reference_numbers.add(str(int(signals.lease_rent_from_finance)))

    if not reference_numbers:
        return 0.6 if numbers_in_draft else 0.5

    overlap = sum(1 for ref in reference_numbers if any(ref in n.replace(" ", "") for n in numbers_in_draft))
    ratio = overlap / max(1, len(reference_numbers))
    return min(1.0, 0.4 + ratio * 0.6)


def _jaccard_similarity(a: str, b: str) -> float:
    tokens_a = set(re.findall(r"\w+", a.lower()))
    tokens_b = set(re.findall(r"\w+", b.lower()))
    if not tokens_a or not tokens_b:
        return 0.0
    return len(tokens_a & tokens_b) / len(tokens_a | tokens_b)


def _score_uniqueness(draft: DraftDocument, existing_titles: Iterable[str]) -> float:
    if not existing_titles:
        return 0.8

    max_sim = max(_jaccard_similarity(draft.title, title) for title in existing_titles)
    return max(0.0, 1.0 - max_sim)


def score_draft(
    draft: DraftDocument,
    enrich: EnrichResult,
    *,
    existing_titles: Iterable[str] | None = None,
) -> GateScore:
    """Compute gate scores and pass/fail against thresholds."""

    information_gain = _score_information_gain(draft, enrich)
    number_accuracy = _score_number_accuracy(draft, enrich)
    uniqueness = _score_uniqueness(draft, existing_titles or [])

    notes: list[str] = []
    if draft.banned_phrase_hits:
        notes.append(f"Banned phrases: {', '.join(draft.banned_phrase_hits)}")
    if draft.is_stub:
        notes.append("Draft produced via LLM stub fallback")

    passed = (
        information_gain >= THRESHOLD_INFORMATION_GAIN
        and number_accuracy >= THRESHOLD_NUMBER_ACCURACY
        and uniqueness >= THRESHOLD_UNIQUENESS
        and not draft.banned_phrase_hits
    )

    logger.info(
        "Gate score item=%s info=%.2f num=%.2f uniq=%.2f passed=%s",
        draft.item_id,
        information_gain,
        number_accuracy,
        uniqueness,
        passed,
    )

    return GateScore(
        item_id=draft.item_id,
        information_gain=round(information_gain, 3),
        number_accuracy=round(number_accuracy, 3),
        uniqueness=round(uniqueness, 3),
        passed=passed,
        notes=notes,
    )

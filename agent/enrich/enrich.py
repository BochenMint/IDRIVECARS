"""Enrichment gate for Polish-market news items."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from config import CONFIG
from db import connect, ensure_db, fetch_enrichment
from models import EnrichResult, EnrichSignals, IngestItem

logger = logging.getLogger(__name__)

MIN_SIGNALS_REQUIRED = 2

_SIGNAL_FIELDS = (
    "pl_price_pln",
    "pl_premiere_date",
    "lease_rent_from_finance",
    "segment_comparison_table",
    "archive_test_link",
)


def _signal_is_present(name: str, value: Any) -> bool:
    if name == "segment_comparison_table":
        return bool(value)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (int, float)):
        return value > 0
    return bool(value)


def _count_signals(signals: EnrichSignals) -> int:
    data = signals.model_dump()
    return sum(1 for field in _SIGNAL_FIELDS if _signal_is_present(field, data[field]))


def _infer_signals_from_text(item: IngestItem) -> EnrichSignals:
    """Heuristic extraction from title/summary when DB row is missing."""

    text = f"{item.title} {item.summary}".lower()
    signals = EnrichSignals()

    price_match = re.search(
        r"(\d[\d\s]{2,8})\s*(?:zł|pln|zl)",
        text,
        flags=re.IGNORECASE,
    )
    if price_match:
        digits = re.sub(r"\s+", "", price_match.group(1))
        try:
            signals.pl_price_pln = float(digits)
        except ValueError:
            pass

    lease_match = re.search(
        r"(?:leasing|rata|wynajem)[^\d]{0,20}(\d{3,5})",
        text,
        flags=re.IGNORECASE,
    )
    if lease_match:
        try:
            signals.lease_rent_from_finance = float(lease_match.group(1))
        except ValueError:
            pass

    premiere_match = re.search(
        r"(premiera|debiut|od\s+\d{1,2}[\./-]\d{1,2}[\./-]\d{2,4})",
        text,
        flags=re.IGNORECASE,
    )
    if premiere_match:
        signals.pl_premiere_date = premiere_match.group(0)

    if any(token in text for token in ("porównanie", "vs", "kontra", "segment")):
        signals.segment_comparison_table = True

    brand_slug = re.sub(r"[^a-z0-9]+", "-", item.brand.lower()).strip("-")
    if brand_slug:
        signals.archive_test_link = f"/testy?brand={brand_slug}"

    return signals


def _signals_from_db_row(row: dict[str, Any]) -> EnrichSignals:
    return EnrichSignals(
        pl_price_pln=row.get("pl_price_pln"),
        pl_premiere_date=row.get("pl_premiere_date"),
        lease_rent_from_finance=row.get("lease_rent_from_finance"),
        segment_comparison_table=bool(row.get("segment_comparison_table")),
        archive_test_link=row.get("archive_test_link"),
    )


def evaluate_enrichment(item: IngestItem, db_path=None) -> EnrichResult:
    """
    Enrichment gate: pass when at least MINIMUM 2 of the PL-market signals are present.

    Reads enrichment overrides from SQLite when available.
    """

    path = db_path or CONFIG.db_path
    ensure_db(path)

    reasons: list[str] = []
    row = fetch_enrichment(item.id, db_path=path)
    if row:
        signals = _signals_from_db_row(row)
        reasons.append("Loaded enrichment row from SQLite")
        metadata = json.loads(row.get("metadata_json") or "{}")
    else:
        signals = _infer_signals_from_text(item)
        reasons.append("Inferred enrichment signals from ingest text")
        metadata = {}

    signal_count = _count_signals(signals)
    passed = signal_count >= MIN_SIGNALS_REQUIRED

    if not passed:
        reasons.append(
            f"Only {signal_count}/{MIN_SIGNALS_REQUIRED} required signals present"
        )
    else:
        reasons.append(f"Passed with {signal_count} signals")

    logger.info(
        "Enrichment %s item=%s signals=%d passed=%s",
        item.id,
        item.title[:80],
        signal_count,
        passed,
    )

    return EnrichResult(
        item_id=item.id,
        passed=passed,
        signal_count=signal_count,
        signals=signals,
        reasons=reasons,
        metadata=metadata,
    )


def enrich_batch(items: list[IngestItem]) -> list[tuple[IngestItem, EnrichResult]]:
    return [(item, evaluate_enrichment(item)) for item in items]

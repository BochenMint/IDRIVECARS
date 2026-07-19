"""Shared Pydantic models for the news agent pipeline."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IngestItem(BaseModel):
    """Normalized item from RSS or HTML diff ingest."""

    id: str
    source_id: str
    source_name: str
    brand: str
    title: str
    url: str
    summary: str = ""
    published_at: datetime | None = None
    content_hash: str
    license: str = "official-newsroom"
    ingest_type: Literal["rss", "html"] = "rss"
    raw: dict[str, Any] = Field(default_factory=dict)


class EnrichSignals(BaseModel):
    """Polish-market enrichment signals used by the enrichment gate."""

    pl_price_pln: float | None = None
    pl_premiere_date: str | None = None
    lease_rent_from_finance: float | None = None
    segment_comparison_table: bool = False
    archive_test_link: str | None = None


class EnrichResult(BaseModel):
    """Outcome of the enrichment gate."""

    item_id: str
    passed: bool
    signal_count: int
    signals: EnrichSignals
    reasons: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DraftDocument(BaseModel):
    """Generated article draft before editorial gate."""

    item_id: str
    slug: str
    title: str
    lead: str
    body_markdown: str
    source_url: str
    source_name: str
    brand: str
    facts: dict[str, Any] = Field(default_factory=dict)
    # True when produced by LLM stub fallback.
    is_stub: bool = False
    banned_phrase_hits: list[str] = Field(default_factory=list)


class GateScore(BaseModel):
    """Editorial quality scores before Telegram review."""

    item_id: str
    information_gain: float
    number_accuracy: float
    uniqueness: float
    passed: bool
    notes: list[str] = Field(default_factory=list)


class PublishResult(BaseModel):
    """Result of an approved publish action."""

    slug: str
    mdx_path: str
    git_committed: bool
    build_hook_triggered: bool
    indexnow_pinged: bool
    message: str

"""Fetch and parse RSS feeds from the source registry."""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urlparse

import feedparser
import httpx

from config import CONFIG
from ingest.registry import SourceEntry, iter_active_sources, load_registry
from models import IngestItem

logger = logging.getLogger(__name__)


def _parse_published(entry: dict[str, Any]) -> datetime | None:
    for key in ("published", "updated", "created"):
        raw = entry.get(key)
        if not raw:
            continue
        try:
            dt = parsedate_to_datetime(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (TypeError, ValueError):
            pass
        if hasattr(raw, "timetuple"):
            try:
                return datetime(*raw.timetuple()[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                continue
    return None


def _clean_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def _item_hash(source_id: str, title: str, url: str) -> str:
    payload = f"{source_id}|{title.strip().lower()}|{url.strip().lower()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _make_item_id(source_id: str, title: str, url: str) -> str:
    digest = hashlib.sha256(f"{source_id}:{url or title}".encode("utf-8")).hexdigest()
    return digest[:16]


def fetch_feed_xml(url: str, client: httpx.Client | None = None) -> str:
    """Download raw RSS/Atom XML."""

    headers = {"User-Agent": CONFIG.user_agent}
    if client is not None:
        response = client.get(url, headers=headers, timeout=CONFIG.http_timeout_seconds)
        response.raise_for_status()
        return response.text

    with httpx.Client(follow_redirects=True) as own_client:
        response = own_client.get(url, headers=headers, timeout=CONFIG.http_timeout_seconds)
        response.raise_for_status()
        return response.text


def parse_feed_entries(source: SourceEntry, xml: str) -> list[IngestItem]:
    """Parse feed XML into ingest items."""

    parsed = feedparser.parse(xml)
    items: list[IngestItem] = []

    for entry in parsed.entries:
        title = _clean_text(entry.get("title", ""))
        link = entry.get("link") or entry.get("id") or ""
        if not title or not link:
            continue

        summary = _clean_text(
            entry.get("summary")
            or entry.get("description")
            or entry.get("content", [{}])[0].get("value", "")
        )
        content_hash = _item_hash(source.id, title, link)
        item_id = _make_item_id(source.id, title, link)

        items.append(
            IngestItem(
                id=item_id,
                source_id=source.id,
                source_name=source.name,
                brand=source.brand,
                title=title,
                url=link,
                summary=summary[:2000],
                published_at=_parse_published(entry),
                content_hash=content_hash,
                license=source.license,
                ingest_type="rss",
                raw={"feed_title": parsed.feed.get("title", "")},
            )
        )

    return items


def fetch_rss_items(
    registry_path: str | None = None,
    *,
    client: httpx.Client | None = None,
) -> list[IngestItem]:
    """
    Fetch RSS feeds for all active registry sources of type ``rss``.

    Respects ``embargo_until`` and logs source + license for each feed.
    """

    registry = load_registry()
    if registry_path:
        from pathlib import Path

        registry = load_registry(Path(registry_path))

    results: list[IngestItem] = []
    rss_sources = [s for s in iter_active_sources(registry) if s.type == "rss"]

    for source in rss_sources:
        logger.info(
            "Fetching RSS source=%s license=%s url=%s",
            source.name,
            source.license,
            source.url,
        )
        try:
            xml = fetch_feed_xml(source.url, client=client)
            items = parse_feed_entries(source, xml)
            logger.info("Parsed %d items from %s", len(items), source.id)
            results.extend(items)
        except Exception as exc:  # noqa: BLE001 - log and continue per source
            logger.exception("Failed RSS ingest for %s: %s", source.id, exc)

    return results

"""HTML page snapshot diff ingest for sources without RSS."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from config import CONFIG
from ingest.registry import SourceEntry, iter_active_sources, load_registry
from models import IngestItem

logger = logging.getLogger(__name__)

_SNAPSHOT_VERSION = 1


def _snapshot_path(source_id: str, snapshots_dir: Path | None = None) -> Path:
    base = snapshots_dir or CONFIG.snapshots_dir
    base.mkdir(parents=True, exist_ok=True)
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", source_id)
    return base / f"{safe_id}.json"


def _content_hash(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _extract_main_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.body
    if main is None:
        return soup.get_text(" ", strip=True)
    return main.get_text(" ", strip=True)


def _extract_headlines(html: str, base_url: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    headlines: list[dict[str, str]] = []

    for anchor in soup.find_all("a", href=True):
        title = anchor.get_text(" ", strip=True)
        href = urljoin(base_url, anchor["href"])
        if len(title) < 12:
            continue
        if not any(token in href.lower() for token in ("news", "aktual", "press", "media", "story")):
            continue
        key = f"{title.lower()}|{href.lower()}"
        if key in seen:
            continue
        seen.add(key)
        headlines.append({"title": title, "url": href})

    return headlines[:25]


def load_snapshot(source_id: str, snapshots_dir: Path | None = None) -> dict[str, Any] | None:
    path = _snapshot_path(source_id, snapshots_dir)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_snapshot(
    source_id: str,
    *,
    content_hash: str,
    headlines: list[dict[str, str]],
    fetched_at: datetime,
    snapshots_dir: Path | None = None,
) -> None:
    path = _snapshot_path(source_id, snapshots_dir)
    payload = {
        "version": _SNAPSHOT_VERSION,
        "source_id": source_id,
        "content_hash": content_hash,
        "headlines": headlines,
        "fetched_at": fetched_at.isoformat(),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def fetch_page(url: str, client: httpx.Client | None = None) -> str:
    headers = {"User-Agent": CONFIG.user_agent}
    if client is not None:
        response = client.get(url, headers=headers, timeout=CONFIG.http_timeout_seconds)
        response.raise_for_status()
        return response.text

    with httpx.Client(follow_redirects=True) as own_client:
        response = own_client.get(url, headers=headers, timeout=CONFIG.http_timeout_seconds)
        response.raise_for_status()
        return response.text


def diff_source(
    source: SourceEntry,
    *,
    client: httpx.Client | None = None,
    snapshots_dir: Path | None = None,
) -> list[IngestItem]:
    """Fetch HTML page, compare with previous snapshot, emit new/changed headlines."""

    logger.info(
        "Fetching HTML source=%s license=%s url=%s",
        source.name,
        source.license,
        source.url,
    )

    html = fetch_page(source.url, client=client)
    main_text = _extract_main_text(html)
    page_hash = _content_hash(main_text)
    headlines = _extract_headlines(html, source.url)
    now = datetime.now(timezone.utc)

    previous = load_snapshot(source.id, snapshots_dir)
    save_snapshot(
        source.id,
        content_hash=page_hash,
        headlines=headlines,
        fetched_at=now,
        snapshots_dir=snapshots_dir,
    )

    if previous is None:
        logger.info("Initial snapshot for %s – no diff items emitted", source.id)
        return []

    if previous.get("content_hash") == page_hash:
        logger.info("No HTML changes detected for %s", source.id)
        return []

    prev_headlines = {
        f"{h.get('title', '').lower()}|{h.get('url', '').lower()}"
        for h in previous.get("headlines", [])
    }

    items: list[IngestItem] = []
    for headline in headlines:
        key = f"{headline['title'].lower()}|{headline['url'].lower()}"
        if key in prev_headlines:
            continue

        item_hash = hashlib.sha256(
            f"{source.id}|{headline['title']}|{headline['url']}".encode("utf-8")
        ).hexdigest()

        items.append(
            IngestItem(
                id=item_hash[:16],
                source_id=source.id,
                source_name=source.name,
                brand=source.brand,
                title=headline["title"],
                url=headline["url"],
                summary=f"Wykryto nowy nagłówek na stronie {source.name}.",
                published_at=now,
                content_hash=item_hash,
                license=source.license,
                ingest_type="html",
                raw={"page_hash": page_hash, "base_url": source.url},
            )
        )

    logger.info("HTML diff for %s produced %d new items", source.id, len(items))
    return items


def fetch_html_changes(
    registry_path: str | None = None,
    *,
    client: httpx.Client | None = None,
    snapshots_dir: Path | None = None,
) -> list[IngestItem]:
    """Run HTML diff ingest for all active ``html`` sources in the registry."""

    registry = load_registry()
    if registry_path:
        from pathlib import Path as _Path

        registry = load_registry(_Path(registry_path))

    html_sources = [s for s in iter_active_sources(registry) if s.type == "html"]
    results: list[IngestItem] = []

    for source in html_sources:
        try:
            results.extend(
                diff_source(source, client=client, snapshots_dir=snapshots_dir)
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed HTML diff for %s: %s", source.id, exc)

    return results

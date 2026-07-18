#!/usr/bin/env python3
"""CLI entrypoint: ingest → dedup → enrich → draft → gate."""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

# Ensure agent package root is on sys.path when run as script.
AGENT_ROOT = Path(__file__).resolve().parent
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

import httpx

from config import CONFIG, load_config
from db import ensure_db, log_pipeline_event, upsert_ingest_item
from draft.draft import generate_draft
from enrich.enrich import evaluate_enrichment
from enrich.refresh_tests import refresh_tests_wave
from gate.score import score_draft
from gate.telegram import send_draft_for_review
from ingest.htmldiff import fetch_html_changes
from ingest.rss import fetch_rss_items
from models import IngestItem


def setup_logging(verbose: bool = False) -> None:
    CONFIG.pipeline_log_dir.mkdir(parents=True, exist_ok=True)
    level = logging.DEBUG if verbose else logging.INFO
    log_file = CONFIG.pipeline_log_dir / f"pipeline-{datetime.now(timezone.utc):%Y%m%d}.log"

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )


def _normalize_title(title: str) -> str:
    text = title.lower().strip()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text)


def title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize_title(a), _normalize_title(b)).ratio()


def deduplicate_items(
    items: list[IngestItem],
    *,
    similarity_threshold: float | None = None,
) -> tuple[list[IngestItem], list[IngestItem]]:
    """Deduplicate by content_hash and near-duplicate titles."""

    threshold = similarity_threshold or CONFIG.dedup_similarity_threshold
    unique: list[IngestItem] = []
    dropped: list[IngestItem] = []
    seen_hashes: set[str] = set()

    for item in items:
        if item.content_hash in seen_hashes:
            dropped.append(item)
            continue

        is_similar = False
        for kept in unique:
            if title_similarity(item.title, kept.title) >= threshold:
                is_similar = True
                break

        if is_similar:
            dropped.append(item)
            continue

        seen_hashes.add(item.content_hash)
        unique.append(item)

    return unique, dropped


def ingest_all(client: httpx.Client) -> list[IngestItem]:
    rss_items = fetch_rss_items(client=client)
    html_items = fetch_html_changes(client=client)
    combined = rss_items + html_items
    logging.getLogger(__name__).info(
        "Ingest complete: rss=%d html=%d total=%d",
        len(rss_items),
        len(html_items),
        len(combined),
    )
    return combined


def run_pipeline(
    *,
    dry_run: bool = False,
    skip_telegram: bool = False,
    max_items: int | None = None,
) -> dict:
    logger = logging.getLogger("pipeline")
    ensure_db()

    with httpx.Client(follow_redirects=True, headers={"User-Agent": CONFIG.user_agent}) as client:
        ingested = ingest_all(client)

    unique, dropped = deduplicate_items(ingested)
    logger.info("Dedup: kept=%d dropped=%d", len(unique), len(dropped))
    log_pipeline_event("dedup", f"kept={len(unique)} dropped={len(dropped)}")

    new_items: list[IngestItem] = []
    for item in unique:
        inserted = upsert_ingest_item(item.model_dump(mode="json"))
        if inserted:
            new_items.append(item)

    logger.info("New items after DB hash dedup: %d", len(new_items))

    if max_items is not None:
        new_items = new_items[:max_items]

    processed = 0
    drafted = 0
    gated = 0
    results: list[dict] = []

    existing_titles = [item.title for item in unique]

    for item in new_items:
        if processed >= CONFIG.daily_news_limit:
            logger.warning(
                "Daily processing limit reached (%d) – stopping",
                CONFIG.daily_news_limit,
            )
            break

        enrich = evaluate_enrichment(item)
        log_pipeline_event(
            "enrich",
            f"passed={enrich.passed} signals={enrich.signal_count}",
            item_id=item.id,
        )

        if not enrich.passed:
            results.append(
                {
                    "item_id": item.id,
                    "title": item.title,
                    "stage": "enrich",
                    "passed": False,
                }
            )
            continue

        draft = generate_draft(item, enrich)
        score = score_draft(draft, enrich, existing_titles=existing_titles)
        drafted += 1

        entry = {
            "item_id": item.id,
            "slug": draft.slug,
            "title": draft.title,
            "enrich_passed": True,
            "gate_passed": score.passed,
            "scores": score.model_dump(),
            "is_stub": draft.is_stub,
        }
        results.append(entry)

        if not dry_run:
            try:
                if not skip_telegram:
                    send_draft_for_review(draft, score)
                gated += 1
                log_pipeline_event(
                    "gate",
                    f"telegram_sent={not skip_telegram} passed={score.passed}",
                    item_id=item.id,
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Telegram gate failed for %s: %s", draft.slug, exc)
                entry["telegram_error"] = str(exc)

        processed += 1
        existing_titles.append(draft.title)

    summary = {
        "ingested": len(ingested),
        "unique": len(unique),
        "new": len(new_items),
        "drafted": drafted,
        "sent_to_telegram": gated,
        "dry_run": dry_run,
        "results": results,
    }

    logger.info("Pipeline finished: %s", json.dumps(summary, ensure_ascii=False))
    log_pipeline_event("pipeline", json.dumps(summary, ensure_ascii=False))
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="idrivecars.pl news agent pipeline")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    parser.add_argument("--dry-run", action="store_true", help="Skip Telegram gate sends")
    parser.add_argument("--skip-telegram", action="store_true", help="Do not send Telegram messages")
    parser.add_argument("--max-items", type=int, default=None, help="Cap items processed this run")
    parser.add_argument(
        "--refresh-tests",
        action="store_true",
        help="Run Phase 2 test refresh wave (independent of news pipeline)",
    )
    parser.add_argument(
        "--publish",
        metavar="SLUG",
        help="Publish an approved draft by slug (manual override)",
    )

    args = parser.parse_args(argv)
    setup_logging(verbose=args.verbose)
    load_config()

    if args.publish:
        from publish.publish import publish_from_slug

        result = publish_from_slug(args.publish)
        print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
        return 0 if result.mdx_path else 1

    if args.refresh_tests:
        refreshed = refresh_tests_wave()
        print(json.dumps({"refreshed": len(refreshed), "items": refreshed}, ensure_ascii=False, indent=2))
        return 0

    summary = run_pipeline(
        dry_run=args.dry_run,
        skip_telegram=args.skip_telegram,
        max_items=args.max_items,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

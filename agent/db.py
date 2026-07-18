"""SQLite helpers for enrichment and pipeline state."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from config import CONFIG


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS ingest_items (
    id TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    brand TEXT,
    payload_json TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    UNIQUE(content_hash)
);

CREATE TABLE IF NOT EXISTS enrichment (
    item_id TEXT PRIMARY KEY,
    pl_price_pln REAL,
    pl_premiere_date TEXT,
    lease_rent_from_finance REAL,
    segment_comparison_table INTEGER DEFAULT 0,
    archive_test_link TEXT,
    metadata_json TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT NOT NULL,
    stage TEXT NOT NULL,
    item_id TEXT,
    message TEXT
);

CREATE TABLE IF NOT EXISTS daily_publish_count (
    day TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wave_refresh_count (
    week_start TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS drafts (
    item_id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
);
"""


def ensure_db(db_path: Path | None = None) -> Path:
    path = db_path or CONFIG.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA_SQL)
    return path


@contextmanager
def connect(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    path = ensure_db(db_path)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def log_pipeline_event(
    stage: str,
    message: str,
    *,
    item_id: str | None = None,
    db_path: Path | None = None,
) -> None:
    with connect(db_path) as conn:
        conn.execute(
            "INSERT INTO pipeline_runs (run_at, stage, item_id, message) VALUES (?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), stage, item_id, message),
        )


def upsert_ingest_item(item: dict[str, Any], db_path: Path | None = None) -> bool:
    """Insert item if content_hash is new. Returns True when inserted."""

    with connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO ingest_items
            (id, content_hash, source_id, title, url, brand, payload_json, first_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["content_hash"],
                item["source_id"],
                item["title"],
                item["url"],
                item.get("brand"),
                json.dumps(item, ensure_ascii=False, default=str),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        return cur.rowcount > 0


def fetch_enrichment(item_id: str, db_path: Path | None = None) -> dict[str, Any] | None:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM enrichment WHERE item_id = ?",
            (item_id,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)


def get_daily_publish_count(day: str, db_path: Path | None = None) -> int:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT count FROM daily_publish_count WHERE day = ?",
            (day,),
        ).fetchone()
        return int(row["count"]) if row else 0


def increment_daily_publish_count(day: str, db_path: Path | None = None) -> int:
    with connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO daily_publish_count (day, count) VALUES (?, 1)
            ON CONFLICT(day) DO UPDATE SET count = count + 1
            """,
            (day,),
        )
        row = conn.execute(
            "SELECT count FROM daily_publish_count WHERE day = ?",
            (day,),
        ).fetchone()
        return int(row["count"])


def get_wave_refresh_count(week_start: str, db_path: Path | None = None) -> int:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT count FROM wave_refresh_count WHERE week_start = ?",
            (week_start,),
        ).fetchone()
        return int(row["count"]) if row else 0


def increment_wave_refresh_count(week_start: str, db_path: Path | None = None) -> int:
    with connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO wave_refresh_count (week_start, count) VALUES (?, 1)
            ON CONFLICT(week_start) DO UPDATE SET count = count + 1
            """,
            (week_start,),
        )
        row = conn.execute(
            "SELECT count FROM wave_refresh_count WHERE week_start = ?",
            (week_start,),
        ).fetchone()
        return int(row["count"])

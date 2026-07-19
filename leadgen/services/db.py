"""SQLite database helpers."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

from leadgen.config import settings


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    salt = settings.dashboard_token
    return hashlib.sha256(f"{ip}:{salt}".encode()).hexdigest()


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    db_path = Path(settings.database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def insert_lead(
    *,
    source_article_slug: str | None,
    source_type: str | None,
    funnel: str,
    name: str,
    phone: str,
    nip: str | None,
    model: str | None,
    price_pln: int | None,
    partner: str | None,
    consent_text: str,
    consent_at: str,
    ip_hash: str | None,
    calc_snapshot: dict[str, Any] | None,
    status: str = "sent",
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO leads (
                source_article_slug, source_type, funnel, name, phone, nip,
                model, price_pln, status, partner, consent_text, consent_at,
                ip_hash, calc_snapshot_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                source_article_slug,
                source_type,
                funnel,
                name,
                phone,
                nip,
                model,
                price_pln,
                status,
                partner,
                consent_text,
                consent_at,
                ip_hash,
                json.dumps(calc_snapshot, ensure_ascii=False) if calc_snapshot else None,
            ),
        )
        return int(cur.lastrowid)


def insert_consent_log(
    *,
    lead_id: int,
    consent_text: str,
    consent_at: str,
    ip_hash: str | None,
    user_agent: str | None,
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO consent_log (lead_id, consent_text, consent_at, ip_hash, user_agent)
            VALUES (?, ?, ?, ?, ?)
            """,
            (lead_id, consent_text, consent_at, ip_hash, user_agent),
        )
        return int(cur.lastrowid)


def soft_delete_lead_by_phone(phone: str) -> list[int]:
    """RODO erasure: anonymize PII, mark status deleted."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id FROM leads WHERE phone = ? AND status != 'deleted'",
            (phone,),
        ).fetchall()
        ids = [int(r["id"]) for r in rows]
        for lead_id in ids:
            conn.execute(
                """
                UPDATE leads SET
                    name = '[usunięto]',
                    phone = '[usunięto]',
                    nip = NULL,
                    status = 'deleted',
                    calc_snapshot_json = NULL
                WHERE id = ?
                """,
                (lead_id,),
            )
        return ids


def soft_delete_lead_by_id(lead_id: int) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM leads WHERE id = ? AND status != 'deleted'",
            (lead_id,),
        ).fetchone()
        if not row:
            return False
        conn.execute(
            """
            UPDATE leads SET
                name = '[usunięto]',
                phone = '[usunięto]',
                nip = NULL,
                status = 'deleted',
                calc_snapshot_json = NULL
            WHERE id = ?
            """,
            (lead_id,),
        )
        return True


def get_funnel_stats() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                COALESCE(source_article_slug, '(brak)') AS source_article_slug,
                funnel,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) AS qualified,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted,
                SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) AS deleted
            FROM leads
            GROUP BY source_article_slug, funnel
            ORDER BY total DESC
            """
        ).fetchall()
        return [dict(r) for r in rows]


def get_commissions_summary() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                partner,
                settlement,
                status,
                COUNT(*) AS count,
                COALESCE(SUM(amount_pln), 0) AS total_pln
            FROM commissions
            GROUP BY partner, settlement, status
            ORDER BY partner, settlement
            """
        ).fetchall()
        return [dict(r) for r in rows]


def get_models() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM models ORDER BY brand, model"
        ).fetchall()
        return [dict(r) for r in rows]


def get_financing_rates() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM financing_rates ORDER BY product_type"
        ).fetchall()
        return [dict(r) for r in rows]

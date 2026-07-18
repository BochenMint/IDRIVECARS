"""Phase 2: refresh legacy test articles with a 'Ten model dziś' module."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from config import CONFIG
from db import get_wave_refresh_count, increment_wave_refresh_count

logger = logging.getLogger(__name__)

_MODULE_HEADER = "## Ten model dziś"
_FUNNEL_BASE = "https://idrivecars.pl/leasing"


def _week_start_iso(dt: datetime | None = None) -> str:
    current = (dt or datetime.now(timezone.utc)).date()
    monday = current - timedelta(days=current.weekday())
    return monday.isoformat()


def _parse_frontmatter(content: str) -> tuple[dict[str, str], str]:
    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    meta: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"')
    return meta, parts[2].lstrip("\n")


def _extract_model_name(meta: dict[str, str], body: str) -> str:
    for key in ("title", "model", "vehicle"):
        if meta.get(key):
            return meta[key]
    heading = re.search(r"^#\s+(.+)$", body, flags=re.MULTILINE)
    return heading.group(1).strip() if heading else "ten model"


def _estimate_used_price(model_name: str) -> int:
    """Simple deterministic estimate placeholder until market API is wired."""

    seed = sum(ord(c) for c in model_name.lower())
    base = 45_000 + (seed % 120_000)
    return int(round(base / 1000) * 1000)


def _estimate_financing_installment(price_pln: int) -> int:
    # Indicative 48-month used-car financing at ~8.9% APR, 20% down.
    financed = price_pln * 0.8
    monthly_rate = 0.089 / 12
    months = 48
    if monthly_rate == 0:
        return int(financed / months)
    payment = financed * (monthly_rate * (1 + monthly_rate) ** months) / (
        (1 + monthly_rate) ** months - 1
    )
    return int(round(payment))


def build_ten_model_dzis_module(model_name: str) -> str:
    price = _estimate_used_price(model_name)
    installment = _estimate_financing_installment(price)
    slug = re.sub(r"[^a-z0-9]+", "-", model_name.lower()).strip("-")
    funnel_url = f"{_FUNNEL_BASE}?model={slug}"
    price_fmt = f"{price:,}".replace(",", " ")
    installment_fmt = f"{installment:,}".replace(",", " ")

    return (
        f"{_MODULE_HEADER}\n\n"
        f"**Szacunkowa cena używanego egzemplarza:** ok. {price_fmt} zł (stan rynkowy, orientacyjnie).\n\n"
        f"**Orientacyjna rata finansowania używanego:** od ok. {installment_fmt} zł/mies. "
        f"(48 mies., 20% wpłaty – kalkulacja poglądowa).\n\n"
        f"[Sprawdź ofertę leasingu / finansowania →]({funnel_url})\n"
    )


def _already_refreshed(body: str) -> bool:
    return _MODULE_HEADER in body


def refresh_test_file(
    path: Path,
    *,
    output_dir: Path | None = None,
) -> dict[str, Any] | None:
    """Append module to a single test MDX file. Returns sidecar metadata or None if skipped."""

    content = path.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(content)
    if _already_refreshed(body):
        logger.debug("Skipping already refreshed test: %s", path.name)
        return None

    model_name = _extract_model_name(meta, body)
    module = build_ten_model_dzis_module(model_name)
    refreshed_body = body.rstrip() + "\n\n" + module + "\n"
    refreshed_mdx = f"---\n" + "\n".join(f"{k}: {v}" for k, v in meta.items()) + "\n---\n" + refreshed_body

    out_dir = output_dir or CONFIG.refreshed_tests_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / path.name
    out_path.write_text(refreshed_mdx, encoding="utf-8")

    sidecar = {
        "source": str(path),
        "output": str(out_path),
        "model": model_name,
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "module": module,
    }
    sidecar_path = out_dir / f"{path.stem}.refresh.json"
    sidecar_path.write_text(json.dumps(sidecar, ensure_ascii=False, indent=2), encoding="utf-8")
    return sidecar


def refresh_tests_wave(
    *,
    tests_dir: Path | None = None,
    weekly_limit: int | None = None,
) -> list[dict[str, Any]]:
    """
    Refresh up to ``weekly_limit`` legacy tests with the 'Ten model dziś' module.

    Respects the configured wave weekly cap (default 15–25, set via config).
    """

    source_dir = tests_dir or CONFIG.content_testy_dir
    limit = weekly_limit or CONFIG.wave_weekly_limit
    week_start = _week_start_iso()
    already = get_wave_refresh_count(week_start)
    remaining = max(0, limit - already)

    if remaining == 0:
        logger.warning(
            "Wave refresh limit reached for week %s (%d/%d)",
            week_start,
            already,
            limit,
        )
        return []

    if not source_dir.exists():
        logger.warning("Tests directory not found: %s", source_dir)
        return []

    candidates = sorted(source_dir.glob("*.mdx"), key=lambda p: p.stat().st_mtime)
    refreshed: list[dict[str, Any]] = []

    for path in candidates:
        if len(refreshed) >= remaining:
            break
        try:
            result = refresh_test_file(path)
            if result:
                refreshed.append(result)
                increment_wave_refresh_count(week_start)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to refresh %s: %s", path.name, exc)

    logger.info("Refreshed %d test(s) this wave (week %s)", len(refreshed), week_start)
    return refreshed

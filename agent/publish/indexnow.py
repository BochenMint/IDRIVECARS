"""IndexNow ping helper."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Sequence

import httpx

from config import CONFIG

logger = logging.getLogger(__name__)

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"


def resolve_key_file(key_location: str | None = None) -> Path | None:
    """
    Resolve IndexNow key file path.

    Priority: explicit arg → INDEXNOW_KEY_LOCATION env → repo public key file.
    """

    if key_location:
        return Path(key_location)

    if CONFIG.indexnow_key_location:
        return Path(CONFIG.indexnow_key_location)

    candidate = CONFIG.db_path.parent.parent / "public" / f"{CONFIG.indexnow_key}.txt"
    if CONFIG.indexnow_key and candidate.exists():
        return candidate

    return None


def ping_indexnow(
    urls: Sequence[str],
    *,
    host: str | None = None,
    key: str | None = None,
    key_location: str | None = None,
) -> bool:
    """Submit URL list to IndexNow. Returns True on HTTP 200/202."""

    api_key = key or CONFIG.indexnow_key
    if not api_key:
        logger.warning("INDEXNOW_KEY not configured – skipping ping")
        return False

    key_file = resolve_key_file(key_location)
    if key_file is None:
        logger.warning("IndexNow key file not found – skipping ping")
        return False

    payload = {
        "host": host or CONFIG.indexnow_host,
        "key": api_key,
        "keyLocation": f"https://{host or CONFIG.indexnow_host}/{key_file.name}",
        "urlList": list(urls),
    }

    try:
        with httpx.Client(timeout=CONFIG.http_timeout_seconds) as client:
            response = client.post(INDEXNOW_ENDPOINT, json=payload)
            ok = response.status_code in {200, 202}
            if ok:
                logger.info("IndexNow ping OK for %d URL(s)", len(urls))
            else:
                logger.warning(
                    "IndexNow ping failed status=%s body=%s",
                    response.status_code,
                    response.text[:300],
                )
            return ok
    except Exception as exc:  # noqa: BLE001
        logger.exception("IndexNow ping error: %s", exc)
        return False


def _urls_from_sitemap(sitemap_url: str) -> list[str]:
    """Fetch sitemap XML and extract <loc> URLs (best-effort)."""

    try:
        with httpx.Client(timeout=CONFIG.http_timeout_seconds) as client:
            response = client.get(sitemap_url)
            response.raise_for_status()
        return re.findall(r"<loc>([^<]+)</loc>", response.text)
    except Exception:
        logger.exception("Failed to read sitemap: %s", sitemap_url)
        return []


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Ping IndexNow with URL list or sitemap")
    parser.add_argument("--url", action="append", dest="urls", help="URL to submit (repeatable)")
    parser.add_argument(
        "--sitemap",
        help="Sitemap URL to expand (e.g. https://idrivecars.pl/sitemap-index.xml)",
    )
    args = parser.parse_args()

    urls: list[str] = list(args.urls or [])
    if args.sitemap:
        urls.extend(_urls_from_sitemap(args.sitemap))

    if not urls:
        logger.warning("No URLs provided — use --url or --sitemap")
        return 1

    ok = ping_indexnow(urls[:10000])
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

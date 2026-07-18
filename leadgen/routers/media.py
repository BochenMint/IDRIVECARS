"""Article media assets for Shorts/Reels pipeline (hero, gallery, video URLs)."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["media"])

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTENT_ROOT = REPO_ROOT / "site" / "src" / "content"
COLLECTIONS = ("tests", "news", "models")
SITE_ORIGIN = "https://idrivecars.pl"

_YOUTUBE_RE = re.compile(
    r"(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([\w-]{11})"
)


def _parse_frontmatter(content: str) -> dict[str, str]:
    if not content.startswith("---"):
        return {}

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}

    meta: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"').strip("'")
    return meta


def _absolute_asset(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{SITE_ORIGIN}/{path.lstrip('/')}"


def _gallery_images(gallery_dir: str | None) -> list[str]:
    if not gallery_dir:
        return []

    gallery_path = REPO_ROOT / "site" / "public" / gallery_dir.lstrip("/")
    if not gallery_path.is_dir():
        hero = _absolute_asset(f"{gallery_dir.rstrip('/')}/hero.webp")
        return [hero] if hero else []

    images: list[str] = []
    for pattern in ("*.webp", "*.jpg", "*.jpeg", "*.png"):
        for file_path in sorted(gallery_path.glob(pattern)):
            rel = file_path.relative_to(REPO_ROOT / "site" / "public")
            url = _absolute_asset(str(rel))
            if url:
                images.append(url)
    return images


def _extract_video_urls(meta: dict[str, str], body: str, sidecar: dict[str, Any]) -> list[str]:
    videos: list[str] = []

    for key in ("videoUrl", "video", "youtube", "shortsUrl", "reelsUrl"):
        raw = meta.get(key) or sidecar.get(key)
        if isinstance(raw, str) and raw.strip():
            videos.append(raw.strip())
        elif isinstance(raw, list):
            videos.extend(str(item).strip() for item in raw if str(item).strip())

    for match in _YOUTUBE_RE.finditer(body):
        videos.append(f"https://www.youtube.com/watch?v={match.group(1)}")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for url in videos:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def _find_article_file(slug: str) -> Path | None:
    for collection in COLLECTIONS:
        collection_dir = CONTENT_ROOT / collection
        if not collection_dir.is_dir():
            continue
        for ext in (".md", ".mdx"):
            candidate = collection_dir / f"{slug}{ext}"
            if candidate.is_file():
                return candidate
        for path in collection_dir.rglob(f"*{slug}*"):
            if path.suffix in {".md", ".mdx"} and path.stem == slug:
                return path
    return None


def _load_sidecar(article_path: Path, slug: str) -> dict[str, Any]:
    for name in (f"{slug}.assets.json", f"{article_path.stem}.assets.json"):
        sidecar_path = article_path.parent / name
        if sidecar_path.is_file():
            try:
                return json.loads(sidecar_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                logger.warning("Invalid sidecar JSON: %s", sidecar_path)
    return {}


def resolve_article_assets(slug: str) -> dict[str, Any]:
    article_path = _find_article_file(slug)
    if article_path is None:
        raise HTTPException(status_code=404, detail=f"Article not found: {slug}")

    raw = article_path.read_text(encoding="utf-8")
    meta = _parse_frontmatter(raw)
    body = raw.split("---", 2)[-1] if raw.startswith("---") else raw
    sidecar = _load_sidecar(article_path, slug)

    hero_image = meta.get("heroImage") or sidecar.get("heroImage")
    gallery_dir = meta.get("galleryDir") or sidecar.get("galleryDir")
    gallery = sidecar.get("gallery")
    if not gallery:
        gallery = _gallery_images(gallery_dir)

    videos = _extract_video_urls(meta, body, sidecar)

    return {
        "slug": slug,
        "collection": article_path.parent.name,
        "title": meta.get("title"),
        "hero": _absolute_asset(hero_image),
        "gallery": gallery,
        "galleryDir": gallery_dir,
        "videos": videos,
        "shorts": [v for v in videos if "shorts" in v],
        "source": str(article_path.relative_to(REPO_ROOT)),
    }


@router.get("/article-assets")
async def article_assets(slug: str = Query(..., min_length=1)) -> dict[str, Any]:
    """Return hero, gallery, and video URLs for a content slug (Shorts/Reels pipeline)."""
    return resolve_article_assets(slug.strip())

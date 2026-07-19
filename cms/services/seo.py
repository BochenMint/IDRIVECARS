"""Auto-SEO enrichment — users never fill meta tags manually."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from cms.config import SITE_URL
from cms.services.slugify import slugify

_LEAD_MAX = 160
_LEAD_MIN = 155


def _strip_markdown(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`[^`]+`", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_~]+", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_lead(body: str, *, max_len: int = _LEAD_MAX) -> str:
    """First meaningful paragraph, trimmed to ~155–160 chars."""
    if not body or not body.strip():
        return ""

    plain = _strip_markdown(body)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]

    candidate = ""
    for para in paragraphs:
        cleaned = _strip_markdown(para)
        if len(cleaned) >= 20:
            candidate = cleaned
            break

    if not candidate:
        candidate = plain

    if len(candidate) <= max_len:
        return candidate

    # Prefer cut near 155–160 at word boundary
    target = max(_LEAD_MIN, max_len)
    cut = candidate[:target]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    if cut.endswith((".", "!", "?", "…")):
        return cut
    return cut.rstrip(".,;:") + "…"


def plain_text_to_markdown(body: str) -> str:
    """Convert plain text (no markdown markers) to paragraph markdown."""
    if not body.strip():
        return ""

    has_md = bool(
        re.search(r"^#{1,6}\s", body, re.MULTILINE)
        or re.search(r"\*\*|__|\[.+\]\(.+\)", body)
    )
    if has_md:
        return body.strip()

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    if not paragraphs:
        lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
        if len(lines) <= 1:
            return body.strip()
        paragraphs = lines

    return "\n\n".join(paragraphs)


def _default_tags(content_type: str, brand: str | None, model: str | None) -> list[str]:
    tags: list[str] = []
    if brand:
        tags.append(brand.strip())
    if model:
        tags.append(model.strip())
    if content_type == "tests":
        tags.append("test")
    elif content_type == "news":
        tags.append("news")
    # dedupe preserving order
    seen: set[str] = set()
    result: list[str] = []
    for t in tags:
        key = t.lower()
        if key not in seen and t:
            seen.add(key)
            result.append(t)
    return result


def enrich(
    data: dict[str, Any],
    *,
    content_type: str,
    existing_slug: str | None = None,
    image_paths: list[str] | None = None,
) -> dict[str, Any]:
    """
    Compute all SEO/frontmatter fields from user input.
    Returns enriched dict with frontmatter keys + body + seo_preview.
    """
    title = (data.get("title") or "").strip()
    if not title:
        raise ValueError("Tytuł jest wymagany")

    body_raw = data.get("body") or ""
    body = plain_text_to_markdown(body_raw)

    slug = (existing_slug or data.get("slug") or "").strip()
    if not slug:
        slug = slugify(title)

    lead = extract_lead(body)
    published_at = data.get("publishedAt") or data.get("published_at")
    if not published_at:
        published_at = date.today().isoformat()

    gallery_dir = f"galleries/{slug}"
    hero_image: str | None = data.get("heroImage") or data.get("hero_image")
    paths = image_paths or data.get("image_paths") or []
    if not hero_image and paths:
        hero_image = paths[0].lstrip("/")
        if hero_image.startswith("galleries/"):
            pass
        elif "/galleries/" in hero_image:
            hero_image = hero_image.split("/galleries/", 1)[1]
            hero_image = f"galleries/{hero_image}"
        else:
            hero_image = f"galleries/{slug}/{hero_image.split('/')[-1]}"

    brand = (data.get("brand") or "").strip() or None
    model = (data.get("model") or "").strip() or None

    frontmatter: dict[str, Any] = {
        "slug": slug,
        "title": title,
        "publishedAt": published_at,
        "lead": lead,
    }

    if content_type == "tests":
        if not brand:
            raise ValueError("Marka jest wymagana dla testu")
        if not model:
            raise ValueError("Model jest wymagany dla testu")
        frontmatter["brand"] = brand
        frontmatter["model"] = model
        if data.get("year"):
            frontmatter["year"] = int(data["year"])
        for key in ("engine", "power", "gearbox", "drivetrain", "bodyType", "torque"):
            val = data.get(key)
            if val:
                frontmatter[key] = str(val).strip()
        if data.get("rating"):
            frontmatter["rating"] = float(data["rating"])
        if data.get("originalUrl"):
            frontmatter["originalUrl"] = data["originalUrl"]
        frontmatter["tags"] = _default_tags("tests", brand, model)
    elif content_type == "news":
        if brand:
            frontmatter["brand"] = brand
        if model:
            frontmatter["model"] = model
        if data.get("sourceName"):
            frontmatter["sourceName"] = data["sourceName"]
        if data.get("sourceUrl"):
            frontmatter["sourceUrl"] = data["sourceUrl"]
        frontmatter["enriched"] = True
        ai = data.get("aiAssisted")
        frontmatter["aiAssisted"] = True if ai is None else bool(ai)
        frontmatter["tags"] = _default_tags("news", brand, model)
    else:
        raise ValueError(f"Nieobsługiwany typ treści: {content_type}")

    if hero_image:
        frontmatter["heroImage"] = hero_image
    if paths or hero_image:
        frontmatter["galleryDir"] = gallery_dir

    url_prefix = "/testy" if content_type == "tests" else "/news"
    canonical = f"{SITE_URL.rstrip('/')}{url_prefix}/{slug}"
    og_image = None
    if hero_image:
        og_image = f"/{hero_image.lstrip('/')}"

    seo_preview = {
        "title": title,
        "description": lead,
        "canonical": canonical,
        "og_image": og_image,
        "slug": slug,
    }

    return {
        "slug": slug,
        "body": body,
        "frontmatter": frontmatter,
        "seo_preview": seo_preview,
    }

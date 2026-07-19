"""Read/write markdown content with YAML frontmatter."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from cms.config import CONTENT_TESTY, CONTENT_TYPES

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?", re.DOTALL)


def content_dir(content_type: str) -> Path:
    if content_type not in CONTENT_TYPES:
        raise ValueError(f"Nieznany typ: {content_type}")
    return CONTENT_TYPES[content_type]["dir"]


def content_path(content_type: str, slug: str) -> Path:
    return content_dir(content_type) / f"{slug}.md"


def parse_markdown(text: str) -> tuple[dict[str, Any], str]:
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return {}, text.strip()
    fm = yaml.safe_load(match.group(1)) or {}
    body = text[match.end() :].strip()
    return fm, body


def serialize_markdown(frontmatter: dict[str, Any], body: str) -> str:
    fm_yaml = yaml.dump(
        frontmatter,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
    ).rstrip()
    return f"---\n{fm_yaml}\n---\n\n{body.strip()}\n"


def read_content(content_type: str, slug: str) -> dict[str, Any] | None:
    path = content_path(content_type, slug)
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    fm, body = parse_markdown(text)
    return {"slug": slug, "frontmatter": fm, "body": body, "path": str(path)}


def write_content(
    content_type: str,
    slug: str,
    frontmatter: dict[str, Any],
    body: str,
) -> Path:
    directory = content_dir(content_type)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{slug}.md"
    path.write_text(serialize_markdown(frontmatter, body), encoding="utf-8")

    if content_type == "tests":
        sync_testy_mdx(slug, frontmatter, body)

    return path


def sync_testy_mdx(slug: str, frontmatter: dict[str, Any], body: str) -> Path:
    """Sync copy to content/testy/<slug>.mdx (source of truth for legacy pipeline)."""
    CONTENT_TESTY.mkdir(parents=True, exist_ok=True)
    mdx_path = CONTENT_TESTY / f"{slug}.mdx"
    mdx_path.write_text(serialize_markdown(frontmatter, body), encoding="utf-8")
    return mdx_path


def delete_content(content_type: str, slug: str, *, delete_gallery: bool = False) -> bool:
    path = content_path(content_type, slug)
    deleted = False
    if path.exists():
        path.unlink()
        deleted = True

    if content_type == "tests":
        mdx = CONTENT_TESTY / f"{slug}.mdx"
        if mdx.exists():
            mdx.unlink()
            deleted = True

    if delete_gallery:
        from cms.services.images import delete_gallery

        delete_gallery(slug)

    return deleted


def list_content(content_type: str) -> list[dict[str, Any]]:
    directory = content_dir(content_type)
    if not directory.exists():
        return []

    items: list[dict[str, Any]] = []
    for path in sorted(directory.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True):
        slug = path.stem
        try:
            fm, _ = parse_markdown(path.read_text(encoding="utf-8"))
        except Exception:
            fm = {}
        stat = path.stat()
        items.append(
            {
                "slug": slug,
                "title": fm.get("title", slug),
                "brand": fm.get("brand"),
                "model": fm.get("model"),
                "publishedAt": fm.get("publishedAt"),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            }
        )
    return items


def count_content() -> dict[str, int]:
    return {ctype: len(list_content(ctype)) for ctype in CONTENT_TYPES}

"""Image upload handling and gallery manifest updates."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any

from cms.config import CONVERT_WEBP, MANIFEST, MAX_UPLOAD_BYTES, PUBLIC_GALLERIES

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # type: ignore[assignment,misc]

_SAFE_NAME_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def sanitize_filename(name: str) -> str:
    base = Path(name).name
    base = _SAFE_NAME_RE.sub("-", base).strip(".-")
    return base or "image.jpg"


def gallery_dir(slug: str) -> Path:
    return PUBLIC_GALLERIES / slug


def list_gallery_images(slug: str) -> list[str]:
    """Return relative paths like galleries/<slug>/hero.webp."""
    directory = gallery_dir(slug)
    if not directory.exists():
        return []

    paths: list[str] = []
    for path in sorted(directory.iterdir()):
        if path.is_file() and path.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png", ".gif"}:
            paths.append(f"galleries/{slug}/{path.name}")
    return paths


def _maybe_convert_webp(src: Path, dest: Path) -> Path:
    if not CONVERT_WEBP or Image is None:
        shutil.copy2(src, dest)
        return dest

    try:
        with Image.open(src) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            webp_dest = dest.with_suffix(".webp")
            img.save(webp_dest, "WEBP", quality=85)
            if dest != webp_dest and dest.exists():
                dest.unlink()
            return webp_dest
    except Exception:
        shutil.copy2(src, dest)
        return dest


def save_upload(slug: str, filename: str, data: bytes) -> str:
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError(f"Plik za duży (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)")

    safe_name = sanitize_filename(filename)
    directory = gallery_dir(slug)
    directory.mkdir(parents=True, exist_ok=True)

    dest = directory / safe_name
    dest.write_bytes(data)
    final = _maybe_convert_webp(dest, dest)
    return f"galleries/{slug}/{final.name}"


def save_uploads(slug: str, files: list[tuple[str, bytes]]) -> list[str]:
    paths: list[str] = []
    for name, data in files:
        paths.append(save_upload(slug, name, data))
    return paths


def delete_gallery(slug: str) -> None:
    directory = gallery_dir(slug)
    if directory.exists():
        shutil.rmtree(directory)
    update_manifest_remove(slug)


def update_manifest_entry(slug: str) -> dict[str, Any]:
    """Append or update galleries-manifest.json for slug."""
    images = list_gallery_images(slug)
    manifest: dict[str, list[dict[str, str]]] = {}
    if MANIFEST.exists():
        try:
            manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = {}

    if images:
        manifest[slug] = [
            {
                "src": f"/{p}",
                "alt": f"{slug} – {Path(p).name}",
            }
            for p in images
        ]
    elif slug in manifest:
        del manifest[slug]

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return manifest.get(slug, [])


def update_manifest_remove(slug: str) -> None:
    if not MANIFEST.exists():
        return
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return
    if slug in manifest:
        del manifest[slug]
        MANIFEST.write_text(
            json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

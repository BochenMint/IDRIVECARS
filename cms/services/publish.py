"""Publish orchestration: validate → write → deploy → IndexNow."""

from __future__ import annotations

import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cms.config import (
    AUDIT_LOG,
    CONTENT_TYPES,
    DEPLOY_PATH,
    DEPLOY_SCRIPT,
    DEPLOY_TIMEOUT_SECONDS,
    REPO_ROOT,
    SITE_URL,
)
from cms.services import content, images, seo

logger = logging.getLogger(__name__)


def _audit_log(action: str, content_type: str, slug: str, detail: str = "") -> None:
    AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    line = f"{ts}\t{action}\t{content_type}\t{slug}\t{detail}\n"
    with AUDIT_LOG.open("a", encoding="utf-8") as f:
        f.write(line)


def validate_payload(data: dict[str, Any], content_type: str) -> None:
    if content_type not in CONTENT_TYPES:
        raise ValueError(f"Nieznany typ: {content_type}")
    if not (data.get("title") or "").strip():
        raise ValueError("Tytuł jest wymagany")
    if not (data.get("body") or "").strip():
        raise ValueError("Treść jest wymagana")
    if content_type == "tests":
        if not (data.get("brand") or "").strip():
            raise ValueError("Marka jest wymagana")
        if not (data.get("model") or "").strip():
            raise ValueError("Model jest wymagany")


def save_draft(
    data: dict[str, Any],
    *,
    content_type: str,
    existing_slug: str | None = None,
    image_paths: list[str] | None = None,
) -> dict[str, Any]:
    """Write markdown without deploying."""
    validate_payload(data, content_type)
    enriched = seo.enrich(
        data,
        content_type=content_type,
        existing_slug=existing_slug,
        image_paths=image_paths,
    )
    slug = enriched["slug"]
    content.write_content(content_type, slug, enriched["frontmatter"], enriched["body"])

    if image_paths:
        images.update_manifest_entry(slug)

    _audit_log("save", content_type, slug)
    return {
        "ok": True,
        "slug": slug,
        "seo": enriched["seo_preview"],
        "url": enriched["seo_preview"]["canonical"],
    }


def _run_build_only() -> tuple[bool, str]:
    log_lines: list[str] = []
    try:
        result = subprocess.run(
            ["npm", "run", "build", "--prefix", "site"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=DEPLOY_TIMEOUT_SECONDS,
        )
        log_lines.append(result.stdout)
        if result.stderr:
            log_lines.append(result.stderr)
        return result.returncode == 0, "\n".join(log_lines)
    except subprocess.TimeoutExpired:
        return False, "Build timeout"
    except Exception as exc:
        return False, str(exc)


def _run_deploy() -> tuple[bool, str]:
    if not DEPLOY_PATH:
        ok, log = _run_build_only()
        note = "DEPLOY_PATH not set — built only, no copy to serve path.\n"
        return ok, note + log

    if not DEPLOY_SCRIPT.exists():
        return False, f"Deploy script not found: {DEPLOY_SCRIPT}"

    env = os.environ.copy()
    env["DEPLOY_PATH"] = DEPLOY_PATH
    try:
        result = subprocess.run(
            ["bash", str(DEPLOY_SCRIPT)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=DEPLOY_TIMEOUT_SECONDS,
            env=env,
        )
        log = (result.stdout or "") + (result.stderr or "")
        return result.returncode == 0, log
    except subprocess.TimeoutExpired:
        return False, f"Deploy timeout after {DEPLOY_TIMEOUT_SECONDS}s"
    except Exception as exc:
        return False, str(exc)


def _ping_indexnow(url: str) -> bool:
    indexnow_path = REPO_ROOT / "agent" / "publish" / "indexnow.py"
    if not indexnow_path.exists():
        logger.info("IndexNow script not found — skipping")
        return False

    agent_dir = str(REPO_ROOT / "agent")
    if agent_dir not in sys.path:
        sys.path.insert(0, agent_dir)

    try:
        from publish.indexnow import ping_indexnow  # type: ignore[import-untyped]

        return ping_indexnow([url])
    except Exception as exc:
        logger.warning("IndexNow ping failed: %s", exc)
        return False


def publish(
    data: dict[str, Any],
    *,
    content_type: str,
    existing_slug: str | None = None,
    image_paths: list[str] | None = None,
    skip_deploy: bool = False,
) -> dict[str, Any]:
    """Full publish pipeline."""
    result = save_draft(
        data,
        content_type=content_type,
        existing_slug=existing_slug,
        image_paths=image_paths,
    )
    slug = result["slug"]
    url = result["url"]

    if image_paths is None:
        image_paths = images.list_gallery_images(slug)
    if image_paths:
        images.update_manifest_entry(slug)

    deploy_ok = True
    deploy_log = "Deploy skipped (dry-run)"
    if not skip_deploy:
        deploy_ok, deploy_log = _run_deploy()
        _audit_log("publish", content_type, slug, f"deploy_ok={deploy_ok}")

        if deploy_ok:
            _ping_indexnow(url)
    else:
        _audit_log("publish_dry", content_type, slug)

    return {
        "ok": deploy_ok,
        "slug": slug,
        "url": url,
        "seo": result["seo"],
        "deploy_log": deploy_log,
    }

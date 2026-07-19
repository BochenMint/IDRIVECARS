"""Publish approved drafts to site content with safety limits."""

from __future__ import annotations

import logging
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import httpx

from config import CONFIG
from db import get_daily_publish_count, increment_daily_publish_count, log_pipeline_event
from models import DraftDocument, PublishResult
from publish.indexnow import ping_indexnow

logger = logging.getLogger(__name__)


def _escape_yaml(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def render_mdx(draft: DraftDocument) -> str:
    published_at = datetime.now(timezone.utc).isoformat()
    frontmatter = {
        "title": draft.title,
        "lead": draft.lead,
        "sourceUrl": draft.source_url,
        "sourceName": draft.source_name,
        "publishedAt": published_at,
        "status": "published",
        "sourceType": "press_portal",
        "styleReference": "testy",
    }

    lines = ["---"]
    for key, value in frontmatter.items():
        if isinstance(value, str):
            lines.append(f"{key}: {_escape_yaml(value)}")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    lines.append("")
    lines.append(draft.body_markdown)
    lines.append("")
    return "\n".join(lines)


def _git_commit(file_path: Path, message: str) -> bool:
    repo_root = CONFIG.db_path.parent.parent
    try:
        subprocess.run(["git", "add", str(file_path)], cwd=repo_root, check=True)
        subprocess.run(["git", "commit", "-m", message], cwd=repo_root, check=True)
        return True
    except subprocess.CalledProcessError as exc:
        logger.warning("Git commit skipped/failed: %s", exc)
        return False


def _trigger_build_hook() -> bool:
    if not CONFIG.build_hook_url:
        logger.info("BUILD_HOOK_URL not set – skipping deploy hook")
        return False

    try:
        with httpx.Client(timeout=CONFIG.http_timeout_seconds) as client:
            response = client.post(CONFIG.build_hook_url, json={"source": "idrive-agent"})
            response.raise_for_status()
        logger.info("Build hook triggered")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Build hook failed: %s", exc)
        return False


def publish_draft(
    draft: DraftDocument,
    *,
    force: bool = False,
) -> PublishResult:
    """
    Write MDX to content/news, commit, trigger build hook, and ping IndexNow.

    Enforces daily hard limit (8–10 by config, default 10).
    """

    if not CONFIG.auto_publish and not force:
        return PublishResult(
            slug=draft.slug,
            mdx_path="",
            git_committed=False,
            build_hook_triggered=False,
            indexnow_pinged=False,
            message="AUTO_PUBLISH is disabled – manual approval required",
        )

    day = datetime.now(timezone.utc).date().isoformat()
    count = get_daily_publish_count(day)
    if count >= CONFIG.daily_news_limit:
        msg = f"Daily publish limit reached ({count}/{CONFIG.daily_news_limit})"
        logger.warning(msg)
        return PublishResult(
            slug=draft.slug,
            mdx_path="",
            git_committed=False,
            build_hook_triggered=False,
            indexnow_pinged=False,
            message=msg,
        )

    out_dir = CONFIG.content_news_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    mdx_path = out_dir / f"{draft.slug}.mdx"
    mdx_path.write_text(render_mdx(draft), encoding="utf-8")

    commit_msg = f"news: {draft.title} ({draft.brand})"
    git_ok = _git_commit(mdx_path, commit_msg)
    build_ok = _trigger_build_hook()

    public_url = f"https://{CONFIG.indexnow_host}/news/{draft.slug}"
    index_ok = ping_indexnow([public_url])

    increment_daily_publish_count(day)
    log_pipeline_event("publish", f"Published {draft.slug}", item_id=draft.item_id)

    return PublishResult(
        slug=draft.slug,
        mdx_path=str(mdx_path),
        git_committed=git_ok,
        build_hook_triggered=build_ok,
        indexnow_pinged=index_ok,
        message="Published successfully",
    )


def publish_from_slug(slug: str) -> PublishResult:
    path = CONFIG.drafts_dir / f"{slug}.json"
    if not path.exists():
        raise FileNotFoundError(f"Draft not found: {slug}")
    draft = DraftDocument.model_validate_json(path.read_text(encoding="utf-8"))
    return publish_draft(draft, force=True)

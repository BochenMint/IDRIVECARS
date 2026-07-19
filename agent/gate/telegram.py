"""Telegram approval gate – human-in-the-loop before publish."""

from __future__ import annotations

import logging
from typing import Literal

import httpx

from config import CONFIG
from models import DraftDocument, GateScore

logger = logging.getLogger(__name__)

# Hardcoded default: no auto-publish during first 90 days.
AUTO_PUBLISH = False


def _telegram_api(method: str) -> str:
    if not CONFIG.telegram_bot_token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is not set. "
            "# TODO(Mac): export bot token from 1Password / Keychain before running gate."
        )
    return f"https://api.telegram.org/bot{CONFIG.telegram_bot_token}/{method}"


def format_review_message(draft: DraftDocument, score: GateScore) -> str:
    status = "✅ PASS" if score.passed else "⚠️ REVIEW"
    stub = " (stub)" if draft.is_stub else ""
    return (
        f"{status} *idrivecars news draft*{stub}\n"
        f"*Tytuł:* {draft.title}\n"
        f"*Marka:* {draft.brand}\n"
        f"*Slug:* `{draft.slug}`\n"
        f"*Źródło:* [{draft.source_name}]({draft.source_url})\n"
        f"*Wynik:* info {score.information_gain:.2f} | liczby {score.number_accuracy:.2f} | "
        f"unikalność {score.uniqueness:.2f}\n\n"
        f"*Lead:* {draft.lead[:500]}\n\n"
        f"Odpowiedz: /approve {draft.slug} | /reject {draft.slug} | /edit {draft.slug}"
    )


def send_draft_for_review(draft: DraftDocument, score: GateScore) -> dict:
    """
    Send draft summary to Telegram chat for manual approve/reject/edit.

    Returns Telegram API response payload.
    """

    if AUTO_PUBLISH or CONFIG.auto_publish:
        logger.warning("AUTO_PUBLISH is disabled by policy; sending to Telegram for review")

    if not CONFIG.telegram_chat_id:
        raise RuntimeError(
            "TELEGRAM_CHAT_ID is not set. "
            "# TODO(Mac): set chat id of editorial channel."
        )

    message = format_review_message(draft, score)
    payload = {
        "chat_id": CONFIG.telegram_chat_id,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }

    with httpx.Client(timeout=CONFIG.http_timeout_seconds) as client:
        response = client.post(_telegram_api("sendMessage"), json=payload)
        response.raise_for_status()
        data = response.json()

    logger.info("Sent draft %s to Telegram chat %s", draft.slug, CONFIG.telegram_chat_id)
    return data


def parse_decision(text: str) -> tuple[Literal["approve", "reject", "edit"] | None, str | None]:
    """Parse `/approve slug`, `/reject slug`, `/edit slug` commands."""

    text = text.strip()
    for command in ("approve", "reject", "edit"):
        prefix = f"/{command}"
        if text.startswith(prefix):
            slug = text[len(prefix) :].strip()
            return command, slug or None
    return None, None


def load_pending_draft(slug: str) -> DraftDocument | None:
    path = CONFIG.drafts_dir / f"{slug}.json"
    if not path.exists():
        return None
    return DraftDocument.model_validate_json(path.read_text(encoding="utf-8"))

"""Shared configuration for the idrivecars.pl news agent pipeline."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

AGENT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = AGENT_ROOT.parent


@dataclass(frozen=True)
class AgentConfig:
    """Runtime configuration loaded from environment with safe defaults."""

    daily_news_limit: int = 10
    wave_weekly_limit: int = 20
    auto_publish: bool = False

    db_path: Path = REPO_ROOT / "data" / "idrive.db"
    snapshots_dir: Path = AGENT_ROOT / "data" / "snapshots"
    drafts_dir: Path = AGENT_ROOT / "data" / "drafts"
    pipeline_log_dir: Path = AGENT_ROOT / "data" / "logs"
    registry_path: Path = AGENT_ROOT / "ingest" / "registry.yaml"
    content_news_dir: Path = REPO_ROOT / "content" / "news"
    content_testy_dir: Path = REPO_ROOT / "content" / "testy"
    refreshed_tests_dir: Path = AGENT_ROOT / "data" / "refreshed_tests"

    local_llm_url: str = "http://127.0.0.1:8080"
    voice_lora: str = "idrive_voice_v1"
    llm_timeout_seconds: float = 120.0

    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None

    indexnow_key: str | None = None
    indexnow_key_location: str | None = None
    indexnow_host: str = "idrivecars.pl"
    build_hook_url: str | None = None

    # Similarity threshold for near-duplicate titles (0–1, higher = stricter).
    dedup_similarity_threshold: float = 0.85
    http_timeout_seconds: float = 30.0
    user_agent: str = "idrivecars-agent/1.0 (+https://idrivecars.pl)"


def load_config() -> AgentConfig:
    """Build config from environment variables."""

    def _int(name: str, default: int) -> int:
        raw = os.getenv(name)
        return int(raw) if raw else default

    def _path(name: str, default: Path) -> Path:
        raw = os.getenv(name)
        return Path(raw).expanduser() if raw else default

    return AgentConfig(
        daily_news_limit=_int("DAILY_NEWS_LIMIT", 10),
        wave_weekly_limit=_int("WAVE_WEEKLY_LIMIT", 20),
        auto_publish=os.getenv("AUTO_PUBLISH", "false").lower() in {"1", "true", "yes"},
        db_path=_path("IDRIVE_DB_PATH", REPO_ROOT / "data" / "idrive.db"),
        snapshots_dir=_path("SNAPSHOTS_DIR", AGENT_ROOT / "data" / "snapshots"),
        drafts_dir=_path("DRAFTS_DIR", AGENT_ROOT / "data" / "drafts"),
        pipeline_log_dir=_path("PIPELINE_LOG_DIR", AGENT_ROOT / "data" / "logs"),
        registry_path=_path("REGISTRY_PATH", AGENT_ROOT / "ingest" / "registry.yaml"),
        content_news_dir=_path("CONTENT_NEWS_DIR", REPO_ROOT / "content" / "news"),
        content_testy_dir=_path("CONTENT_TESTY_DIR", REPO_ROOT / "content" / "testy"),
        refreshed_tests_dir=_path(
            "REFRESHED_TESTS_DIR", AGENT_ROOT / "data" / "refreshed_tests"
        ),
        local_llm_url=os.getenv("LOCAL_LLM_URL", "http://127.0.0.1:8080"),
        voice_lora=os.getenv("VOICE_LORA", "idrive_voice_v1"),
        llm_timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "120")),
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN"),
        telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID"),
        indexnow_key=os.getenv("INDEXNOW_KEY"),
        indexnow_key_location=os.getenv("INDEXNOW_KEY_LOCATION"),
        indexnow_host=os.getenv("INDEXNOW_HOST", "idrivecars.pl"),
        build_hook_url=os.getenv("BUILD_HOOK_URL"),
        dedup_similarity_threshold=float(os.getenv("DEDUP_SIMILARITY_THRESHOLD", "0.85")),
        http_timeout_seconds=float(os.getenv("HTTP_TIMEOUT_SECONDS", "30")),
        user_agent=os.getenv("HTTP_USER_AGENT", "idrivecars-agent/1.0 (+https://idrivecars.pl)"),
    )


# Module-level singleton for convenience.
CONFIG = load_config()

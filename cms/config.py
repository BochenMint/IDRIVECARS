"""CMS configuration loaded from environment."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

CMS_ROOT = Path(__file__).resolve().parent
REPO_ROOT = CMS_ROOT.parent

SITE_CONTENT = REPO_ROOT / "site" / "src" / "content"
PUBLIC_GALLERIES = REPO_ROOT / "public" / "galleries"
MANIFEST = REPO_ROOT / "site" / "src" / "data" / "galleries-manifest.json"
DEPLOY_SCRIPT = REPO_ROOT / "scripts" / "deploy-site.sh"
CONTENT_TESTY = REPO_ROOT / "content" / "testy"
AUDIT_LOG = REPO_ROOT / "data" / "cms_audit.log"

SITE_URL = os.getenv("SITE_URL", "https://idrivecars.pl")
DEPLOY_PATH = os.getenv("DEPLOY_PATH", "")
CMS_PASSWORD = os.getenv("CMS_PASSWORD", "changeme")
CMS_SECRET = os.getenv("CMS_SECRET", "dev-secret-change-me")
CMS_HOST = os.getenv("CMS_HOST", "127.0.0.1")
CMS_PORT = int(os.getenv("CMS_PORT", "8001"))

MAX_UPLOAD_BYTES = int(os.getenv("CMS_MAX_UPLOAD_MB", "15")) * 1024 * 1024
CONVERT_WEBP = os.getenv("CMS_CONVERT_WEBP", "true").lower() in {"1", "true", "yes"}
DEPLOY_TIMEOUT_SECONDS = int(os.getenv("CMS_DEPLOY_TIMEOUT", "120"))

SESSION_COOKIE = "cms_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 days

CONTENT_TYPES = {
    "tests": {
        "dir": SITE_CONTENT / "tests",
        "url_prefix": "/testy",
        "label": "Test",
        "label_plural": "Testy",
    },
    "news": {
        "dir": SITE_CONTENT / "news",
        "url_prefix": "/news",
        "label": "News",
        "label_plural": "Newsy",
    },
}

logger = logging.getLogger(__name__)

if CMS_PASSWORD == "changeme":
    logger.warning(
        "CMS_PASSWORD is set to default 'changeme' — change CMS_PASSWORD in cms/.env before production!"
    )

if CMS_SECRET == "dev-secret-change-me":
    logger.warning(
        "CMS_SECRET is using default value — set CMS_SECRET in cms/.env for production!"
    )

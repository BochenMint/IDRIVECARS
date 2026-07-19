"""Tests for markdown content read/write."""

import tempfile
from pathlib import Path
from unittest.mock import patch

from cms.services.content import parse_markdown, write_content


def test_write_and_read_frontmatter():
    with tempfile.TemporaryDirectory() as tmp:
        tests_dir = Path(tmp) / "tests"
        tests_dir.mkdir()
        with patch("cms.services.content.CONTENT_TYPES", {
            "tests": {"dir": tests_dir, "url_prefix": "/testy", "label": "Test", "label_plural": "Testy"},
        }), patch("cms.services.content.CONTENT_TESTY", Path(tmp) / "testy"):
            fm = {
                "slug": "test-artykul",
                "title": "Test tytułu",
                "brand": "Skoda",
                "model": "Octavia",
                "publishedAt": "2026-07-19",
                "lead": "Krótki lead testowy.",
            }
            body = "Treść artykułu testowego."
            path = write_content("tests", "test-artykul", fm, body)
            assert path.exists()
            text = path.read_text(encoding="utf-8")
            parsed_fm, parsed_body = parse_markdown(text)
            assert parsed_fm["title"] == "Test tytułu"
            assert parsed_fm["brand"] == "Skoda"
            assert parsed_body == body

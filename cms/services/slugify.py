"""Polish-aware slug generation."""

from __future__ import annotations

import re
import unicodedata

_PL_MAP = str.maketrans(
    {
        "ą": "a",
        "ć": "c",
        "ę": "e",
        "ł": "l",
        "ń": "n",
        "ó": "o",
        "ś": "s",
        "ź": "z",
        "ż": "z",
        "Ą": "a",
        "Ć": "c",
        "Ę": "e",
        "Ł": "l",
        "Ń": "n",
        "Ó": "o",
        "Ś": "s",
        "Ź": "z",
        "Ż": "z",
    }
)


def slugify(text: str, *, max_length: int = 80) -> str:
    """Convert title to URL slug with Polish diacritics folded."""
    if not text:
        return "artykul"

    value = text.strip().translate(_PL_MAP)
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")

    if not value:
        return "artykul"

    if len(value) > max_length:
        value = value[:max_length].rstrip("-")

    return value or "artykul"

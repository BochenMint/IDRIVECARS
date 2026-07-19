"""Load source registry from YAML."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field

from config import CONFIG


class SourceEntry(BaseModel):
    id: str
    name: str
    brand: str
    type: Literal["rss", "html"]
    url: str
    license: str = "official-newsroom"
    embargo_until: datetime | None = None


class Registry(BaseModel):
    sources: list[SourceEntry] = Field(default_factory=list)


def load_registry(path: Path | None = None) -> Registry:
    """Parse registry.yaml into validated models."""

    registry_path = path or CONFIG.registry_path
    raw = yaml.safe_load(registry_path.read_text(encoding="utf-8")) or {}
    sources: list[dict[str, Any]] = raw.get("sources", [])
    return Registry(sources=[SourceEntry.model_validate(s) for s in sources])


def iter_active_sources(registry: Registry) -> list[SourceEntry]:
    """Return sources not under embargo."""

    now = datetime.now().astimezone()
    active: list[SourceEntry] = []
    for source in registry.sources:
        if source.embargo_until is None:
            active.append(source)
            continue
        embargo = source.embargo_until
        if embargo.tzinfo is None:
            embargo = embargo.replace(tzinfo=now.tzinfo)
        if embargo <= now:
            active.append(source)
    return active

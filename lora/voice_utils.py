"""Shared helpers for idrivecars.pl voice LoRA pipeline."""

from __future__ import annotations

import hashlib
import importlib.util
import re
import sys
from pathlib import Path
from typing import Iterable

LORA_ROOT = Path(__file__).resolve().parent
REPO_ROOT = LORA_ROOT.parent

# Dates: ISO, dotted PL, month names (common in archive footers).
DATE_PATTERNS = [
  re.compile(r"\b\d{4}-\d{2}-\d{2}\b"),
  re.compile(r"\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b"),
  re.compile(
    r"\b\d{1,2}\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|"
    r"lipca|sierpnia|września|października|listopada|grudnia)\s+\d{4}\b",
    re.IGNORECASE,
  ),
  re.compile(r"\b(?:styczeń|luty|marzec|kwiecień|maj|czerwiec|"
             r"lipiec|sierpień|wrzesień|październik|listopad|grudzień)\s+\d{4}\b",
             re.IGNORECASE),
]

# Prices: 151 790 zł, 151790 PLN, od 120 tys. zł, etc.
PRICE_PATTERNS = [
  re.compile(
    r"\b(?:od\s+)?\d{1,3}(?:[ \u00a0]\d{3})+(?:[,.]\d{2})?\s*(?:zł|pln)\b",
    re.IGNORECASE,
  ),
  re.compile(
    r"\b(?:od\s+)?\d+(?:[,.]\d+)?\s*(?:tys\.?|tysięcy)\s*(?:zł|pln)\b",
    re.IGNORECASE,
  ),
  re.compile(r"\b\d+(?:[,.]\d+)?\s*(?:zł|pln)\b", re.IGNORECASE),
]

YEAR_PATTERN = re.compile(r"\b(19|20)\d{2}\b")


def scrub_stale_numbers(text: str) -> str:
  """Replace dates/prices/years so the model learns style, not memorized figures."""
  out = text
  for pattern in DATE_PATTERNS:
    out = pattern.sub("{{DATE}}", out)
  for pattern in PRICE_PATTERNS:
    out = pattern.sub("{{PRICE}}", out)
  out = YEAR_PATTERN.sub("{{YEAR}}", out)
  return out


def normalize_for_dedup(text: str) -> str:
  collapsed = re.sub(r"\s+", " ", text.strip().lower())
  return collapsed


def dedup_key(instruction: str, output: str) -> str:
  payload = f"{normalize_for_dedup(instruction)}|||{normalize_for_dedup(output)}"
  return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_banned_phrases(extra_paths: Iterable[Path] | None = None) -> list[str]:
  """Load banned phrases from txt file and optional agent/draft module."""
  phrases: list[str] = []
  seen: set[str] = set()

  def add(phrase: str) -> None:
    key = phrase.strip().lower()
    if key and key not in seen:
      seen.add(key)
      phrases.append(key)

  txt_path = LORA_ROOT / "banned_phrases.txt"
  if txt_path.exists():
    for line in txt_path.read_text(encoding="utf-8").splitlines():
      line = line.strip()
      if line and not line.startswith("#"):
        add(line)

  agent_module = REPO_ROOT / "agent" / "draft" / "banned_phrases.py"
  if agent_module.exists():
    spec = importlib.util.spec_from_file_location("idrive_banned_phrases", agent_module)
    if spec and spec.loader:
      mod = importlib.util.module_from_spec(spec)
      sys.modules[spec.name] = mod
      spec.loader.exec_module(mod)
      for attr in ("BANNED_PHRASES", "banned_phrases"):
        if hasattr(mod, attr):
          for phrase in getattr(mod, attr):
            add(str(phrase))

  if extra_paths:
    for path in extra_paths:
      if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
          line = line.strip()
          if line and not line.startswith("#"):
            add(line)

  return phrases


def find_banned_hits(text: str, phrases: list[str]) -> list[str]:
  lowered = text.lower()
  return [p for p in phrases if p in lowered]


def resolve_content_dir(candidates: list[str | Path]) -> Path | None:
  for candidate in candidates:
    path = Path(candidate)
    if not path.is_absolute():
      path = (LORA_ROOT / path).resolve()
    if path.is_dir() and (any(path.glob("*.mdx")) or any(path.glob("*.md"))):
      return path
  return None

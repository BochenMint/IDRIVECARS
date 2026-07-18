#!/usr/bin/env python3
"""
Build instruction→text JSONL for idrivecars.pl author voice LoRA.

Parses MDX/MD test articles from the archive and emits two training types:
  (a) facts / press-release bullets → news paragraph in author style
  (b) section outline → test paragraph(s)

Dates, prices, and years are scrubbed to placeholders so the model learns
voice and structure, not stale numbers.
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from voice_utils import LORA_ROOT, REPO_ROOT, dedup_key, resolve_content_dir, scrub_stale_numbers
DEFAULT_OUTPUT = LORA_ROOT / "datasets" / "idrive_voice_v1.jsonl"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
SECTION_RE = re.compile(r"^##\s+(.+)$", re.MULTILINE)
SENTENCE_SPLIT = re.compile(r"(?<=[.!?…])\s+")
SPEC_KEYS = (
  "brand", "model", "year", "engine", "power", "torque", "gearbox",
  "drivetrain", "bodyType", "lead", "title",
)


@dataclass
class Article:
  slug: str
  meta: dict[str, Any]
  body: str
  sections: list[tuple[str, str]]  # (heading, content)


def parse_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
  match = FRONTMATTER_RE.match(raw)
  if not match:
    return {}, raw.strip()

  meta: dict[str, Any] = {}
  for line in match.group(1).splitlines():
    if ":" not in line:
      continue
    key, value = line.split(":", 1)
    key = key.strip()
    value = value.strip().strip('"').strip("'")
    if value.startswith("[") and value.endswith("]"):
      inner = value[1:-1].strip()
      meta[key] = [v.strip().strip('"').strip("'") for v in inner.split(",") if v.strip()]
    else:
      meta[key] = value

  body = raw[match.end():].strip()
  return meta, body


def split_sections(body: str) -> list[tuple[str, str]]:
  parts = SECTION_RE.split(body)
  if len(parts) <= 1:
    intro = body.strip()
    return [("", intro)] if intro else []

  sections: list[tuple[str, str]] = []
  preamble = parts[0].strip()
  if preamble:
    sections.append(("", preamble))

  for i in range(1, len(parts), 2):
    heading = parts[i].strip()
    content = parts[i + 1].strip() if i + 1 < len(parts) else ""
    if content:
      sections.append((heading, content))
  return sections


def load_article(path: Path) -> Article | None:
  raw = path.read_text(encoding="utf-8")
  meta, body = parse_frontmatter(raw)
  body = re.sub(r"\*Tekst pierwotnie opublikowany.*\*", "", body, flags=re.IGNORECASE | re.DOTALL)
  body = re.sub(r"\n{3,}", "\n\n", body).strip()
  if len(body) < 120:
    return None

  slug = meta.get("slug") or path.stem
  sections = split_sections(body)
  if not sections:
    return None
  return Article(slug=slug, meta=meta, body=body, sections=sections)


def facts_from_meta(meta: dict[str, Any], section_text: str) -> str:
  lines: list[str] = []
  for key in SPEC_KEYS:
    value = meta.get(key)
    if value:
      lines.append(f"- {key}: {value}")

  numbers = re.findall(
    r"\b\d+(?:[,.]\d+)?\s*(?:KM|kW|Nm|l/100\s*km|km/h|s\b|km\b|cm³|ccm)\b",
    section_text,
    flags=re.IGNORECASE,
  )
  for item in numbers[:8]:
    lines.append(f"- spec: {item}")

  sentences = [s.strip() for s in SENTENCE_SPLIT.split(section_text) if len(s.strip()) > 20]
  for sentence in sentences[:4]:
    if re.search(r"\d", sentence):
      lines.append(f"- fact: {sentence}")

  return "\n".join(lines)


def outline_from_heading(heading: str, meta: dict[str, Any]) -> str:
  brand = meta.get("brand", "")
  model = meta.get("model", meta.get("title", ""))
  bits = [f"Napisz akapit testu {brand} {model}".strip()]
  if heading:
    bits.append(f"Sekcja: {heading}")
  bits.append("Styl: pierwsza osoba, konkret, krótkie zdania, bez frazesów AI.")
  return "\n".join(bits)


def make_facts_pair(article: Article, heading: str, section_text: str) -> dict[str, str] | None:
  facts = facts_from_meta(article.meta, section_text)
  if len(facts) < 40:
    return None

  instruction = (
    "Na podstawie suchych faktów z komunikatu prasowego / specyfikacji napisz "
    f"krótki fragment newsa lub testu w stylu idrivecars.pl.\n\n{facts}"
  )
  output = section_text
  if len(output) < 80:
    return None

  return {
    "type": "facts_to_style",
    "slug": article.slug,
    "heading": heading,
    "instruction": scrub_stale_numbers(instruction),
    "text": scrub_stale_numbers(output),
  }


def make_outline_pair(article: Article, heading: str, section_text: str) -> dict[str, str] | None:
  if len(section_text) < 80:
    return None

  instruction = outline_from_heading(heading, article.meta)
  return {
    "type": "outline_to_paragraph",
    "slug": article.slug,
    "heading": heading,
    "instruction": scrub_stale_numbers(instruction),
    "text": scrub_stale_numbers(section_text),
  }


def chunk_paragraphs(text: str, max_paragraphs: int = 2) -> list[str]:
  paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
  if not paragraphs:
    return []
  if len(paragraphs) <= max_paragraphs:
    return [text.strip()]

  chunks: list[str] = []
  for i in range(0, len(paragraphs), max_paragraphs):
    chunk = "\n\n".join(paragraphs[i : i + max_paragraphs])
    if len(chunk) >= 80:
      chunks.append(chunk)
  return chunks


def build_examples(articles: list[Article], seed: int) -> list[dict[str, str]]:
  rng = random.Random(seed)
  examples: list[dict[str, str]] = []
  seen: set[str] = set()

  def add(example: dict[str, str] | None) -> None:
    if not example:
      return
    key = dedup_key(example["instruction"], example["text"])
    if key in seen:
      return
    seen.add(key)
    examples.append(example)

  for article in articles:
    for heading, section_text in article.sections:
      for chunk in chunk_paragraphs(section_text):
        add(make_facts_pair(article, heading, chunk))
        add(make_outline_pair(article, heading, chunk))

    # Extra outline pairs: heading only → first paragraph under it.
    for heading, section_text in article.sections:
      if not heading:
        continue
      first_para = chunk_paragraphs(section_text, max_paragraphs=1)
      if first_para:
        add(make_outline_pair(article, heading, first_para[0]))

  rng.shuffle(examples)
  return examples


def augment_to_target(
  examples: list[dict[str, str]],
  target_min: int,
  target_max: int,
  seed: int,
) -> list[dict[str, str]]:
  """Light duplication with truncated instructions if archive is small."""
  if len(examples) >= target_min:
    return examples[:target_max]

  rng = random.Random(seed + 1)
  augmented = list(examples)
  seen = {dedup_key(e["instruction"], e["text"]) for e in examples}
  variants = list(examples)

  while len(augmented) < target_min and variants:
    base = rng.choice(variants)
    short_instruction = base["instruction"][: max(120, len(base["instruction"]) // 2)].rstrip()
    if not short_instruction.endswith("."):
      short_instruction += "…"
    variant = dict(base)
    variant["instruction"] = short_instruction
    variant["augmented"] = True
    key = dedup_key(variant["instruction"], variant["text"])
    if key not in seen:
      seen.add(key)
      augmented.append(variant)

  return augmented[:target_max]


def discover_articles(input_dir: Path) -> list[Article]:
  articles: list[Article] = []
  paths = sorted(list(input_dir.glob("*.mdx")) + list(input_dir.glob("*.md")))
  for path in paths:
    article = load_article(path)
    if article:
      articles.append(article)
  return articles


def main() -> int:
  parser = argparse.ArgumentParser(description="Prepare idrive voice LoRA dataset (JSONL).")
  parser.add_argument(
    "--input",
    type=Path,
    default=None,
    help="Directory with MDX/MD articles (default: auto-detect testy content)",
  )
  parser.add_argument(
    "--output",
    type=Path,
    default=DEFAULT_OUTPUT,
    help=f"Output JSONL path (default: {DEFAULT_OUTPUT})",
  )
  parser.add_argument("--seed", type=int, default=42)
  parser.add_argument("--target-min", type=int, default=500)
  parser.add_argument("--target-max", type=int, default=2000)
  parser.add_argument("--no-augment", action="store_true", help="Skip augmentation to target_min")
  args = parser.parse_args()

  if args.input:
    input_dir = args.input.resolve()
    if not input_dir.is_dir():
      print(f"ERROR: input directory not found: {input_dir}", file=sys.stderr)
      return 1
  else:
    input_dir = resolve_content_dir([
      "../content/testy",
      "../site/src/content/tests",
      REPO_ROOT / "content" / "testy",
    ])
    if not input_dir:
      print(
        "ERROR: could not find article archive. Pass --input PATH "
        "(e.g. ../content/testy).",
        file=sys.stderr,
      )
      return 1

  articles = discover_articles(input_dir)
  if not articles:
    print(f"ERROR: no parseable articles in {input_dir}", file=sys.stderr)
    return 1

  examples = build_examples(articles, seed=args.seed)
  if not args.no_augment:
    examples = augment_to_target(examples, args.target_min, args.target_max, args.seed)

  args.output.parent.mkdir(parents=True, exist_ok=True)
  with args.output.open("w", encoding="utf-8") as fh:
    for row in examples:
      fh.write(json.dumps(row, ensure_ascii=False) + "\n")

  type_counts: dict[str, int] = {}
  for row in examples:
    type_counts[row["type"]] = type_counts.get(row["type"], 0) + 1

  print(f"Input:    {input_dir} ({len(articles)} articles)")
  print(f"Output:   {args.output}")
  print(f"Examples: {len(examples)}")
  print(f"Types:    {type_counts}")
  if len(examples) < args.target_min:
    print(
      f"WARNING: {len(examples)} < target_min {args.target_min}. "
      "Add gate-accepted texts or more archive content.",
      file=sys.stderr,
    )
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

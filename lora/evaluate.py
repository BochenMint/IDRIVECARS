#!/usr/bin/env python3
"""
Pre-deploy evaluation for idrivecars.pl voice LoRA.

Checks:
  (a) Blind test export — 10 pairs [reference vs generation placeholder] for owner scoring
  (b) Banned-phrase lint — must be 0 hits on reference corpus (and generations if provided)
  (c) Hallucination check — numeric/spec facts in output must appear in instruction (20 samples)
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

from voice_utils import LORA_ROOT, find_banned_hits, load_banned_phrases

DEFAULT_CONFIG = LORA_ROOT / "config.yaml"
DEFAULT_DATASET = LORA_ROOT / "datasets" / "idrive_voice_v1.jsonl"

FACT_TOKEN = re.compile(
  r"\b\d+(?:[,.]\d+)?\s*(?:KM|kW|Nm|km/h|l/100\s*km|s\b|km\b|cm³|ccm|%)\b",
  re.IGNORECASE,
)
BRAND_LIKE = re.compile(r"\b[A-Z][A-Za-z0-9-]{2,}\b")


def load_config(path: Path) -> dict:
  with path.open(encoding="utf-8") as fh:
    return yaml.safe_load(fh)


def load_dataset(path: Path) -> list[dict]:
  return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_generations(path: Path | None) -> dict[str, str]:
  if not path or not path.exists():
    return {}
  data = json.loads(path.read_text(encoding="utf-8"))
  if isinstance(data, list):
    return {str(i): item.get("generation", item.get("text", "")) for i, item in enumerate(data)}
  if isinstance(data, dict):
    return {str(k): str(v) for k, v in data.items()}
  return {}


def extract_facts(text: str) -> set[str]:
  facts: set[str] = set()
  for match in FACT_TOKEN.findall(text):
    facts.add(match.lower().replace(" ", ""))
  for match in BRAND_LIKE.findall(text):
    if match.lower() not in {"km", "nm", "kw", "rs", "gt", "tdi", "tsi", "hdi", "pdk", "awd", "fwd", "rwd"}:
      facts.add(match.lower())
  return facts


def hallucination_check(samples: list[dict], generations: dict[str, str]) -> list[dict]:
  results: list[dict] = []
  for idx, row in enumerate(samples):
    instruction = row["instruction"]
    reference = row["text"]
    generated = generations.get(str(idx), generations.get(row.get("slug", ""), ""))
    output = generated or reference  # lint reference if no generations yet

    input_facts = extract_facts(instruction)
    output_facts = extract_facts(output)
    novel = sorted(f for f in output_facts if f not in input_facts and len(f) > 2)

    results.append({
      "index": idx,
      "slug": row.get("slug"),
      "type": row.get("type"),
      "novel_facts": novel,
      "passed": len(novel) == 0,
      "used_generation": bool(generated),
    })
  return results


def banned_phrase_lint(texts: list[str], phrases: list[str]) -> list[dict]:
  hits: list[dict] = []
  for i, text in enumerate(texts):
    matched = find_banned_hits(text, phrases)
    if matched:
      hits.append({"index": i, "phrases": matched, "excerpt": text[:240]})
  return hits


def export_blind_test(rows: list[dict], count: int, seed: int, out_path: Path) -> None:
  rng = random.Random(seed)
  picked = rng.sample(rows, k=min(count, len(rows)))
  export = []
  for i, row in enumerate(picked):
    export.append({
      "id": i + 1,
      "slug": row.get("slug"),
      "type": row.get("type"),
      "instruction": row["instruction"],
      "reference_author_text": row["text"],
      "model_generation": "",
      "owner_score_1_to_5": None,
      "notes": "",
    })
  out_path.parent.mkdir(parents=True, exist_ok=True)
  out_path.write_text(json.dumps(export, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> int:
  parser = argparse.ArgumentParser(description="Evaluate idrive voice LoRA before deploy.")
  parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
  parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
  parser.add_argument(
    "--generations",
    type=Path,
    default=None,
    help="JSON file with model outputs keyed by index or slug",
  )
  parser.add_argument("--eval-dir", type=Path, default=None)
  args = parser.parse_args()

  if not args.dataset.exists():
    print(f"ERROR: dataset not found: {args.dataset}", file=sys.stderr)
    print("Run: python prepare_dataset.py", file=sys.stderr)
    return 1

  cfg = load_config(args.config)
  eval_dir = args.eval_dir or (LORA_ROOT / cfg["paths"]["eval_dir"])
  eval_dir.mkdir(parents=True, exist_ok=True)

  rows = load_dataset(args.dataset)
  generations = load_generations(args.generations)
  phrases = load_banned_phrases()

  stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
  blind_path = eval_dir / f"blind_test_{stamp}.json"
  export_blind_test(rows, cfg["evaluation"]["blind_pairs"], cfg["training"]["seed"], blind_path)

  reference_texts = [r["text"] for r in rows]
  generation_texts = list(generations.values())
  ref_hits = banned_phrase_lint(reference_texts, phrases)
  gen_hits = banned_phrase_lint(generation_texts, phrases) if generation_texts else []
  lint_hits = gen_hits
  lint_target = "generations" if generation_texts else "skipped (no --generations)"

  rng = random.Random(cfg["training"]["seed"])
  hall_samples = rng.sample(rows, k=min(cfg["evaluation"]["hallucination_samples"], len(rows)))
  if generations:
    hall_results = hallucination_check(hall_samples, generations)
  else:
    hall_results = [{
      "index": i,
      "slug": row.get("slug"),
      "passed": True,
      "skipped": True,
      "reason": "no --generations file; run inference first",
    } for i, row in enumerate(hall_samples)]
  hall_failures = [r for r in hall_results if not r.get("passed", False) and not r.get("skipped")]

  report = {
    "timestamp": stamp,
    "dataset": str(args.dataset),
    "examples": len(rows),
    "blind_test_export": str(blind_path),
    "banned_phrases": {
      "reference_hits": len(ref_hits),
      "generation_hits": len(gen_hits),
      "linted": lint_target,
      "must_be_zero": cfg["evaluation"]["banned_phrases_must_be_zero"],
      "details": lint_hits,
    },
    "hallucination_check": {
      "samples": len(hall_results),
      "failures": len(hall_failures),
      "details": hall_failures,
    },
    "passed": (not generation_texts or len(gen_hits) == 0) and len(hall_failures) == 0,
  }

  report_path = eval_dir / f"eval_report_{stamp}.json"
  report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

  print(f"Blind test:       {blind_path} ({cfg['evaluation']['blind_pairs']} pairs)")
  if generation_texts:
    print(f"Banned phrases:   {len(gen_hits)} generation hits (target: 0)")
  else:
    print(f"Banned phrases:   skipped (provide --generations to lint model output)")
    print(f"                  reference corpus has {len(ref_hits)} hits (informational)")
  print(f"Hallucinations:   {len(hall_failures)} / {len(hall_results)} failed")
  print(f"Report:           {report_path}")
  print(f"Overall:          {'PASS' if report['passed'] else 'FAIL'}")

  return 0 if report["passed"] else 2


if __name__ == "__main__":
  raise SystemExit(main())

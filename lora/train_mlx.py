#!/usr/bin/env python3
"""
QLoRA / LoRA training for idrivecars.pl author voice — MLX on Apple Silicon.

Runs on the owner's Mac (48 GB unified memory recommended). Uses mlx-lm's
built-in LoRA trainer with a quantized Qwen instruct model as orchestrator base.

If mlx / mlx-lm is not installed, prints setup instructions and exits.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

LORA_ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = LORA_ROOT / "config.yaml"


def load_config(path: Path) -> dict:
  with path.open(encoding="utf-8") as fh:
    return yaml.safe_load(fh)


def check_mlx() -> tuple[bool, str]:
  try:
    import mlx.core  # noqa: F401
    import mlx_lm  # noqa: F401
    return True, ""
  except ImportError as exc:
    return False, str(exc)


def print_mlx_install_help() -> None:
  print(
    """
MLX is not installed. This script is intended for the owner's Mac with Apple Silicon.

Install steps (on macOS):
  1. python3 -m venv .venv && source .venv/bin/activate
  2. pip install -U mlx mlx-lm pyyaml tqdm
  3. Download a quantized Qwen instruct model, e.g.:
       huggingface-cli download mlx-community/Qwen2.5-7B-Instruct-4bit \\
         --local-dir ~/models/Qwen2.5-7B-Instruct-4bit
  4. Re-run:
       python train_mlx.py --config config.yaml

Docs: https://github.com/ml-explore/mlx-examples/tree/main/lora
""".strip()
  )


def split_dataset(
  rows: list[dict],
  holdout_ratio: float,
  seed: int,
) -> tuple[list[dict], list[dict]]:
  rng = random.Random(seed)
  shuffled = list(rows)
  rng.shuffle(shuffled)
  holdout_n = max(1, int(len(shuffled) * holdout_ratio))
  val = shuffled[:holdout_n]
  train = shuffled[holdout_n:]
  return train, val


def to_mlx_jsonl(rows: list[dict], prompt_template: str, path: Path) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as fh:
    for row in rows:
      prompt = prompt_template.format(instruction=row["instruction"]).strip()
      text = row["text"].strip()
      record = {"text": f"{prompt}{text}"}
      fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def run_mlx_lora(
  model_path: str,
  train_path: Path,
  val_path: Path,
  adapter_dir: Path,
  cfg: dict,
) -> None:
  """Invoke mlx_lm.lora via subprocess (stable CLI entrypoint)."""
  train_cfg = cfg["training"]
  cmd = [
    sys.executable, "-m", "mlx_lm", "lora",
    "--model", str(Path(model_path).expanduser()),
    "--train",
    "--data", str(train_path.parent),
    "--adapter-path", str(adapter_dir),
    "--batch-size", str(train_cfg["batch_size"]),
    "--iters", str(iters_from_epochs(train_path, train_cfg)),
    "--learning-rate", str(train_cfg["learning_rate"]),
    "--lora-layers", str(train_cfg.get("lora_layers", 16)),
    "--val-batches", "25",
    "--steps-per-report", "10",
    "--steps-per-eval", "50",
    "--seed", str(train_cfg.get("seed", 42)),
  ]

  # mlx-lm expects train.jsonl + valid.jsonl in data dir
  (train_path.parent / "train.jsonl").write_text(train_path.read_text(encoding="utf-8"), encoding="utf-8")
  (train_path.parent / "valid.jsonl").write_text(val_path.read_text(encoding="utf-8"), encoding="utf-8")

  print("Running:", " ".join(cmd))
  subprocess.run(cmd, check=True)


def iters_from_epochs(train_file: Path, train_cfg: dict) -> int:
  lines = sum(1 for _ in train_file.open(encoding="utf-8"))
  batch = train_cfg["batch_size"]
  accum = train_cfg.get("gradient_accumulation_steps", 1)
  steps_per_epoch = max(1, lines // max(1, batch * accum))
  return steps_per_epoch * int(train_cfg.get("epochs", 2))


def main() -> int:
  parser = argparse.ArgumentParser(description="Train idrive voice LoRA with MLX (Mac).")
  parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
  parser.add_argument("--dataset", type=Path, default=None, help="Override dataset JSONL")
  parser.add_argument("--dry-run", action="store_true", help="Prepare splits only")
  args = parser.parse_args()

  ok, err = check_mlx()
  if not ok and not args.dry_run:
    print(f"MLX import failed: {err}\n")
    print_mlx_install_help()
    return 1

  cfg = load_config(args.config)
  dataset_path = args.dataset or (LORA_ROOT / cfg["dataset"]["path"])
  if not dataset_path.exists():
    print(f"ERROR: dataset not found: {dataset_path}", file=sys.stderr)
    print("Run: python prepare_dataset.py", file=sys.stderr)
    return 1

  rows = [json.loads(line) for line in dataset_path.read_text(encoding="utf-8").splitlines() if line.strip()]
  train_rows, val_rows = split_dataset(rows, cfg["dataset"]["holdout_ratio"], cfg["training"]["seed"])

  work_dir = LORA_ROOT / "datasets" / "_mlx_splits"
  if work_dir.exists():
    shutil.rmtree(work_dir)
  work_dir.mkdir(parents=True)

  prompt_template = cfg.get("prompt_template", "{instruction}\n")
  train_file = work_dir / "train.jsonl"
  val_file = work_dir / "valid.jsonl"
  to_mlx_jsonl(train_rows, prompt_template, train_file)
  to_mlx_jsonl(val_rows, prompt_template, val_file)

  adapter_name = cfg["adapter"]["name"]
  adapter_dir = LORA_ROOT / cfg["paths"]["adapters_dir"] / adapter_name
  adapter_dir.mkdir(parents=True, exist_ok=True)

  print(f"Train examples: {len(train_rows)}")
  print(f"Val examples:   {len(val_rows)}")
  print(f"Adapter:        {adapter_dir}")
  print(f"LoRA rank:      {cfg['training']['lora_rank']} (set via mlx_lm config / env)")
  print(f"Epochs:         {cfg['training']['epochs']}")

  if args.dry_run:
    print("Dry run complete — MLX splits written, training skipped.")
    return 0

  model_path = cfg["model"]["mlx_path"]
  try:
    run_mlx_lora(model_path, train_file, val_file, adapter_dir, cfg)
  except FileNotFoundError:
    print_mlx_install_help()
    return 1
  except subprocess.CalledProcessError as exc:
    print(f"mlx_lm training failed with exit code {exc.returncode}", file=sys.stderr)
    return exc.returncode or 1

  # Save training metadata next to adapter
  meta = {
    "adapter": adapter_name,
    "base_model": model_path,
    "train_examples": len(train_rows),
    "val_examples": len(val_rows),
    "training": cfg["training"],
  }
  (adapter_dir / "idrive_training_meta.json").write_text(
    json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
  )
  print(f"Done. Adapter saved to {adapter_dir}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

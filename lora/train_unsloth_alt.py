#!/usr/bin/env python3
"""
Alternative LoRA training for idrivecars.pl author voice — Unsloth on CUDA.

Targets an RTX 5080 (or similar) worker when the base model fits in VRAM.
Hyperparameters mirror train_mlx.py / config.yaml.

Install Unsloth on the GPU machine:
  pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
  pip install torch transformers datasets trl peft bitsandbytes pyyaml
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import yaml

LORA_ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = LORA_ROOT / "config.yaml"


def load_config(path: Path) -> dict:
  with path.open(encoding="utf-8") as fh:
    return yaml.safe_load(fh)


def check_unsloth() -> tuple[bool, str]:
  try:
    import unsloth  # noqa: F401
    import torch  # noqa: F401
    return True, ""
  except ImportError as exc:
    return False, str(exc)


def print_unsloth_install_help() -> None:
  print(
    """
Unsloth / PyTorch not available in this environment.

On a CUDA GPU machine (e.g. RTX 5080):
  1. python3 -m venv .venv && source .venv/bin/activate
  2. pip install torch --index-url https://download.pytorch.org/whl/cu124
  3. pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
  4. pip install transformers datasets trl peft bitsandbytes accelerate pyyaml
  5. python train_unsloth_alt.py --config config.yaml

See: https://github.com/unslothai/unsloth
""".strip()
  )


def format_sample(row: dict, prompt_template: str) -> dict:
  prompt = prompt_template.format(instruction=row["instruction"]).strip()
  return {
    "instruction": row["instruction"],
    "input": "",
    "output": row["text"],
    "text": f"{prompt}{row['text']}",
  }


def split_dataset(rows: list[dict], holdout_ratio: float, seed: int) -> tuple[list[dict], list[dict]]:
  rng = random.Random(seed)
  shuffled = list(rows)
  rng.shuffle(shuffled)
  holdout_n = max(1, int(len(shuffled) * holdout_ratio))
  return shuffled[holdout_n:], shuffled[:holdout_n]


def train_unsloth(cfg: dict, train_rows: list[dict], val_rows: list[dict], adapter_dir: Path) -> None:
  from datasets import Dataset
  from trl import SFTTrainer
  from transformers import TrainingArguments
  from unsloth import FastLanguageModel

  train_cfg = cfg["training"]
  model_id = cfg["model"]["unsloth_id"]
  max_seq_length = cfg["model"].get("max_seq_length", 4096)
  rank = train_cfg["lora_rank"]
  alpha = train_cfg.get("lora_alpha", rank * 2)

  model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=model_id,
    max_seq_length=max_seq_length,
    dtype=None,
    load_in_4bit=True,
  )

  model = FastLanguageModel.get_peft_model(
    model,
    r=rank,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=alpha,
    lora_dropout=train_cfg.get("lora_dropout", 0.05),
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=train_cfg.get("seed", 42),
  )

  prompt_template = cfg.get("prompt_template", "{instruction}\n")
  train_ds = Dataset.from_list([format_sample(r, prompt_template) for r in train_rows])
  val_ds = Dataset.from_list([format_sample(r, prompt_template) for r in val_rows])

  adapter_dir.mkdir(parents=True, exist_ok=True)
  args = TrainingArguments(
    output_dir=str(adapter_dir),
    per_device_train_batch_size=train_cfg["batch_size"],
    gradient_accumulation_steps=train_cfg.get("gradient_accumulation_steps", 4),
    num_train_epochs=train_cfg["epochs"],
    learning_rate=train_cfg["learning_rate"],
    warmup_steps=train_cfg.get("warmup_steps", 50),
    weight_decay=train_cfg.get("weight_decay", 0.01),
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    seed=train_cfg.get("seed", 42),
    fp16=False,
    bf16=True,
    report_to="none",
  )

  trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    dataset_text_field="text",
    max_seq_length=max_seq_length,
    args=args,
  )
  trainer.train()
  model.save_pretrained(str(adapter_dir))
  tokenizer.save_pretrained(str(adapter_dir))


def main() -> int:
  parser = argparse.ArgumentParser(description="Train idrive voice LoRA with Unsloth (CUDA).")
  parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
  parser.add_argument("--dataset", type=Path, default=None)
  parser.add_argument("--dry-run", action="store_true")
  args = parser.parse_args()

  ok, err = check_unsloth()
  if not ok and not args.dry_run:
    print(f"Unsloth import failed: {err}\n")
    print_unsloth_install_help()
    return 1

  cfg = load_config(args.config)
  dataset_path = args.dataset or (LORA_ROOT / cfg["dataset"]["path"])
  if not dataset_path.exists():
    print(f"ERROR: dataset not found: {dataset_path}", file=sys.stderr)
    print("Run: python prepare_dataset.py", file=sys.stderr)
    return 1

  rows = [json.loads(line) for line in dataset_path.read_text(encoding="utf-8").splitlines() if line.strip()]
  train_rows, val_rows = split_dataset(rows, cfg["dataset"]["holdout_ratio"], cfg["training"]["seed"])

  adapter_dir = LORA_ROOT / cfg["paths"]["adapters_dir"] / cfg["adapter"]["name"]
  print(f"Train examples: {len(train_rows)}")
  print(f"Val examples:   {len(val_rows)}")
  print(f"Adapter:        {adapter_dir}")
  print(f"LoRA rank:      {cfg['training']['lora_rank']}")
  print(f"Epochs:         {cfg['training']['epochs']}")

  if args.dry_run:
    print("Dry run complete — training skipped.")
    return 0

  train_unsloth(cfg, train_rows, val_rows, adapter_dir)

  meta = {
    "adapter": cfg["adapter"]["name"],
    "base_model": cfg["model"]["unsloth_id"],
    "train_examples": len(train_rows),
    "val_examples": len(val_rows),
    "training": cfg["training"],
    "backend": "unsloth",
  }
  adapter_dir.mkdir(parents=True, exist_ok=True)
  (adapter_dir / "idrive_training_meta.json").write_text(
    json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
  )
  print(f"Done. Adapter saved to {adapter_dir}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

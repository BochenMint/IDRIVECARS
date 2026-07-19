#!/usr/bin/env python3
"""Initialize idrivecars.pl SQLite database from schema and seed files."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent
DEFAULT_DB = DATA_DIR / "idrive.db"
SCHEMA = DATA_DIR / "schema.sql"
SEED = DATA_DIR / "seed.sql"


def init_db(db_path: Path = DEFAULT_DB, force: bool = False) -> Path:
    if db_path.exists():
        if not force:
            raise FileExistsError(
                f"Database already exists: {db_path}. Use --force to recreate."
            )
        db_path.unlink()

    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(SCHEMA.read_text(encoding="utf-8"))
        conn.executescript(SEED.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()

    return db_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Create idrivecars.pl SQLite database")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB,
        help=f"Output database path (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing database",
    )
    args = parser.parse_args()

    path = init_db(args.db, force=args.force)
    print(f"Database created: {path}")


if __name__ == "__main__":
    main()

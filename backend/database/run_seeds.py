"""Run SQL seed files in backend/database/seeds."""
from __future__ import annotations

import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
import os


def _project_backend_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_database_url() -> str:
    env_path = _project_backend_dir() / ".env"
    load_dotenv(dotenv_path=env_path)
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("Missing DATABASE_URL in backend/.env")
    return database_url


def _discover_seed_files(seed_dir: Path) -> list[Path]:
    return sorted(path for path in seed_dir.glob("*.sql") if path.is_file())


def run() -> int:
    seed_dir = Path(__file__).resolve().parent / "seeds"
    seed_files = _discover_seed_files(seed_dir)

    if not seed_files:
        print(f"No seed files found in {seed_dir}")
        return 0

    database_url = _load_database_url()

    try:
        conn = psycopg2.connect(database_url)
    except Exception as exc:
        print(f"Seed failed: cannot connect database ({exc!r})", file=sys.stderr)
        return 1

    try:
        for seed_file in seed_files:
            print(f"Running seed: {seed_file.name}")
            sql = seed_file.read_text(encoding="utf-8")

            try:
                with conn:
                    with conn.cursor() as cursor:
                        cursor.execute(sql)
                print(f"Done seed: {seed_file.name}")
            except Exception as exc:
                print(f"Seed failed: {seed_file.name} ({exc!r})", file=sys.stderr)
                return 1

        print("All seeds completed successfully.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(run())

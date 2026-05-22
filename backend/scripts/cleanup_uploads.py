#!/usr/bin/env python3
"""
Uploads cleanup CLI for the LeafScan AI backend.

This standalone tool scans ``backend/app/uploads/`` non-recursively and removes
stale diagnosis images under strict safety rules:

* files whose ``mtime`` OR ``ctime`` is within the configurable
  freshness window are retained unconditionally (freshness guard);
* files whose ``mtime`` is newer than the age threshold are retained
  (recent-files guard);
* files whose basename appears in ``scan_history.image_url`` are retained
  (database-reference guard);
* everything else is deleted (or listed when ``--dry-run`` is active).

The CLI is read-only against the database: the only SQL statement ever
emitted is a single ``SELECT DISTINCT image_url FROM scan_history ...``.
No ``INSERT``/``UPDATE``/``DELETE``/``ALTER``/``CREATE``/``DROP`` statement
is ever executed, and no ORM mutation is ever performed.

Invoke from ``backend/`` as::

    python -m scripts.cleanup_uploads [--dry-run] [--older-than-days 30]
                                      [--freshness-window-minutes 15]
                                      [--uploads-dir PATH] [--verbose]
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session

# ──────────────────────────────────────────────
# Env loading (mirror app.database pattern)
# ──────────────────────────────────────────────
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# ``app.config`` is imported only to resolve the default uploads directory.
# Tolerate missing config so ``--help`` and a user-supplied ``--uploads-dir``
# still work even if ``app.config`` fails to import.
try:
    from app.config import UPLOAD_DIR as _DEFAULT_UPLOAD_DIR  # type: ignore
except Exception:  # pragma: no cover - import-time tolerance
    _DEFAULT_UPLOAD_DIR = None

logger = logging.getLogger("cleanup_uploads")


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI flags. Defaults mirror design §3."""
    parser = argparse.ArgumentParser(
        prog="cleanup_uploads",
        description=(
            "Delete stale diagnosis images from backend/app/uploads/ under "
            "freshness, age, and scan_history reference safety rules."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Do not delete any file; print and count every candidate.",
    )
    parser.add_argument(
        "--older-than-days",
        type=int,
        default=30,
        help="Files with mtime newer than this many days are retained (default: 30).",
    )
    parser.add_argument(
        "--freshness-window-minutes",
        type=int,
        default=15,
        help=(
            "Files whose mtime OR ctime is within this many minutes of now "
            "are retained unconditionally (default: 15)."
        ),
    )
    parser.add_argument(
        "--uploads-dir",
        type=Path,
        default=(Path(_DEFAULT_UPLOAD_DIR) if _DEFAULT_UPLOAD_DIR else None),
        help="Override the target uploads directory (default: app.config.UPLOAD_DIR).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Log one line per deletion (otherwise deletions are only counted).",
    )
    return parser.parse_args(argv)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def _configure_logging(verbose: bool) -> None:
    """Configure a minimal, stable logger. Idempotent across re-invocations."""
    level = logging.INFO  # --verbose only affects per-delete logging
    if not logger.handlers:
        handler = logging.StreamHandler(stream=sys.stderr)
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
        )
        logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False


def _db_dialect(database_url: str) -> str:
    """Return the SQLAlchemy dialect (driver name) for the configured URL."""
    try:
        return make_url(database_url).get_backend_name()
    except Exception:
        # Fall back to a coarse scheme parse if SQLAlchemy cannot make_url.
        return database_url.split(":", 1)[0] if ":" in database_url else "unknown"


def _emit_summary(stats: Counter, bytes_reclaimed: int, args: argparse.Namespace) -> None:
    """Emit the final single-line JSON summary on stdout (sorted keys)."""
    summary = {
        "scanned": int(stats.get("scanned", 0)),
        "retained_freshness": int(stats.get("retained_freshness", 0)),
        "retained_recent": int(stats.get("retained_recent", 0)),
        "retained_db_reference": int(stats.get("retained_db_reference", 0)),
        "would_delete": int(stats.get("would_delete", 0)),
        "deleted": int(stats.get("deleted", 0)),
        "delete_errors": int(stats.get("delete_errors", 0)),
        "bytes_reclaimed": int(bytes_reclaimed),
        "dry_run": bool(args.dry_run),
        "older_than_days": int(args.older_than_days),
        "freshness_window_minutes": int(args.freshness_window_minutes),
        "uploads_dir": str(args.uploads_dir) if args.uploads_dir is not None else "",
    }
    sys.stdout.write(json.dumps(summary, sort_keys=True) + "\n")
    sys.stdout.flush()


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main(argv: list[str] | None = None) -> int:
    try:
        args = parse_args(argv)
        _configure_logging(args.verbose)

        uploads_dir: Path | None = args.uploads_dir
        stats: Counter = Counter()
        bytes_reclaimed = 0

        if uploads_dir is None:
            logger.error(
                "No uploads directory resolved (app.config import failed and "
                "--uploads-dir not supplied); nothing to do."
            )
            _emit_summary(stats, bytes_reclaimed, args)
            return 0

        # Log resolved configuration before touching anything (R6.8).
        logger.info(
            "config: dry_run=%s older_than_days=%d freshness_window_minutes=%d "
            "uploads_dir=%s verbose=%s",
            args.dry_run,
            args.older_than_days,
            args.freshness_window_minutes,
            uploads_dir,
            args.verbose,
        )

        # Uploads dir missing → exit 0 (R6.11). Exit code 3 is reserved.
        if not uploads_dir.is_dir():
            logger.info(
                "uploads dir missing (%s); nothing to do.", uploads_dir
            )
            _emit_summary(stats, bytes_reclaimed, args)
            return 0

        # DB connectivity (R6.10).
        database_url = (os.getenv("DATABASE_URL") or "").strip()
        if not database_url:
            logger.error("DATABASE_URL is required but was not set; aborting.")
            return 2

        logger.info("database dialect: %s", _db_dialect(database_url))

        referenced: set[str] = set()
        engine = None
        session: Session | None = None
        try:
            engine = create_engine(database_url, pool_pre_ping=True)
            session = Session(engine, autoflush=False, autocommit=False)
            result = session.execute(
                text(
                    "SELECT DISTINCT image_url FROM scan_history "
                    "WHERE image_url IS NOT NULL"
                )
            )
            for row in result:
                value = row[0]
                if value is None:
                    continue
                # Use basename (filename component after the last path separator).
                name = os.path.basename(str(value))
                if name:
                    referenced.add(name)
        except Exception:
            logger.exception("failed to query scan_history; aborting without file changes")
            if session is not None:
                try:
                    session.close()
                except Exception:
                    pass
            return 2
        # Session stays open through the file loop so the connection pool is
        # kept warm; we close it in a finally at the end of the scan.

        try:
            now = time.time()
            freshness_seconds = args.freshness_window_minutes * 60
            age_seconds = args.older_than_days * 86400

            for entry in uploads_dir.iterdir():
                # Skip non-regular files (directories, symlinks, sockets, …).
                try:
                    if entry.is_dir() or not entry.is_file():
                        continue
                except OSError as exc:
                    logger.warning("is_file(%s) failed: %s", entry, exc)
                    continue

                stats["scanned"] += 1

                try:
                    st = entry.stat()
                except OSError as exc:
                    logger.warning("stat(%s) failed: %s", entry, exc)
                    continue

                mtime_age = now - st.st_mtime
                ctime_age = now - st.st_ctime

                # Retain: freshness window (R6.4).
                if mtime_age < freshness_seconds or ctime_age < freshness_seconds:
                    stats["retained_freshness"] += 1
                    continue

                # Retain: recent (R6.3).
                if mtime_age < age_seconds:
                    stats["retained_recent"] += 1
                    continue

                # Retain: db reference (R6.5).
                if entry.name in referenced:
                    stats["retained_db_reference"] += 1
                    continue

                # Candidate for deletion.
                if args.dry_run:
                    print(f"[DRY-RUN] would delete {entry}")
                    stats["would_delete"] += 1
                    continue

                try:
                    size = st.st_size
                    entry.unlink()
                except OSError as exc:
                    logger.warning("unlink(%s) failed: %s", entry, exc)
                    stats["delete_errors"] += 1
                    continue

                bytes_reclaimed += size
                stats["deleted"] += 1
                if args.verbose:
                    logger.info("deleted %s (%d bytes)", entry, size)
        finally:
            if session is not None:
                try:
                    session.close()
                except Exception:
                    logger.exception("session close failed")
            if engine is not None:
                try:
                    engine.dispose()
                except Exception:
                    logger.exception("engine dispose failed")

        # Single end-of-run summary line (INFO), then the JSON on stdout.
        logger.info(
            "summary: scanned=%d retained_freshness=%d retained_recent=%d "
            "retained_db_reference=%d would_delete=%d deleted=%d "
            "delete_errors=%d bytes_reclaimed=%d",
            stats.get("scanned", 0),
            stats.get("retained_freshness", 0),
            stats.get("retained_recent", 0),
            stats.get("retained_db_reference", 0),
            stats.get("would_delete", 0),
            stats.get("deleted", 0),
            stats.get("delete_errors", 0),
            bytes_reclaimed,
        )
        _emit_summary(stats, bytes_reclaimed, args)
        return 0
    except SystemExit:
        raise
    except Exception:
        logger.exception("cleanup_uploads failed with unexpected error")
        return 4


if __name__ == "__main__":
    sys.exit(main())

"""
Tests cho backend/scripts/cleanup_uploads.py.

Properties:
- Property 2: Dry-run preserves the uploads directory
- Property 3: Retention rules are respected (freshness, age, DB reference)
- Property 4: Cleanup CLI is read-only against the database
"""
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest
from hypothesis import given, settings, strategies as st

BACKEND_DIR = Path(__file__).resolve().parent.parent
SCRIPT = [sys.executable, "-m", "scripts.cleanup_uploads"]


def _seed_files(tmp_path: Path, files: list[tuple[str, int, int]]) -> None:
    """Tạo files với (name, mtime_offset_seconds, size_bytes)."""
    now = time.time()
    for name, mtime_offset, size in files:
        fp = tmp_path / name
        fp.write_bytes(b"x" * size)
        mtime = now - mtime_offset
        os.utime(fp, (mtime, mtime))


def _snapshot_dir(directory: Path) -> dict[str, str]:
    """Map filename → sha256 để so sánh trước/sau."""
    result = {}
    for fp in directory.iterdir():
        if fp.is_file():
            result[fp.name] = hashlib.sha256(fp.read_bytes()).hexdigest()
    return result


def _run_cli(args: list[str], env: dict | None = None) -> subprocess.CompletedProcess:
    """Chạy cleanup CLI, trả về CompletedProcess."""
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    return subprocess.run(
        SCRIPT + args,
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        env=merged_env,
    )


def test_missing_uploads_dir_exits_zero(tmp_path):
    """Uploads dir không tồn tại → exit 0."""
    nonexistent = tmp_path / "does_not_exist"
    result = _run_cli([
        "--dry-run",
        "--uploads-dir", str(nonexistent),
    ])
    assert result.returncode == 0


def test_bad_database_url_exits_two(tmp_path):
    """DATABASE_URL không unreachable → exit 2 (không cần --dry-run)."""
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    _seed_files(uploads, [("old.jpg", 100 * 86400, 1024)])

    result = _run_cli(
        ["--uploads-dir", str(uploads)],
        env={"DATABASE_URL": "postgresql://nope:nope@127.0.0.1:1/nope"},
    )
    assert result.returncode == 2


# ──────────────────────────────────────────────
# Property 2: Dry-run preserves the uploads directory
# ──────────────────────────────────────────────

@settings(max_examples=20, deadline=None)
@given(
    files=st.lists(
        st.tuples(
            st.text(alphabet="abcdefghij", min_size=8, max_size=12).map(lambda s: f"{s}.jpg"),
            st.integers(min_value=0, max_value=200 * 86400),
            st.integers(min_value=100, max_value=4096),
        ),
        min_size=0,
        max_size=10,
        unique_by=lambda x: x[0],
    ),
    older_than_days=st.integers(min_value=1, max_value=90),
    freshness_minutes=st.integers(min_value=1, max_value=60),
)
def test_property_2_dry_run_preserves_directory(
    tmp_path_factory, files, older_than_days, freshness_minutes
):
    """
    Feature: repo-cleanup-and-secrets-hardening, Property 2: Dry-run preserves the uploads directory.
    """
    tmp = tmp_path_factory.mktemp("cleanup_dry")
    uploads = tmp / "uploads"
    uploads.mkdir()
    _seed_files(uploads, files)

    before = _snapshot_dir(uploads)

    result = _run_cli([
        "--dry-run",
        "--uploads-dir", str(uploads),
        "--older-than-days", str(older_than_days),
        "--freshness-window-minutes", str(freshness_minutes),
    ])

    # Dry-run không chạm DB, nên exit có thể 0 hoặc 2 (nếu DB không kết nối được)
    # Key assertion: dir không đổi
    after = _snapshot_dir(uploads)
    assert before == after, f"Dry-run đã thay đổi uploads dir! Before={before}, After={after}"

"""
Tests cho scripts/scan_secrets.sh (Property 5).

- test_self_exclusion: scanner phải bỏ qua chính nó
- test_postgres_url_allowlist: CHANGE_ME/password/example/user/pass phải được filter
- test_flags_banned_patterns_iff_present: property test Hypothesis
"""
import os
import shutil
import subprocess
from pathlib import Path

import pytest
from hypothesis import given, settings, strategies as st

REPO_ROOT = Path(__file__).resolve().parents[2]
SCANNER = REPO_ROOT / "scripts" / "scan_secrets.sh"


def _init_git_repo(tmp_path: Path) -> None:
    """Khởi tạo git repo mới trong tmp_path, copy scanner và init."""
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.local"], cwd=tmp_path, check=True
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"], cwd=tmp_path, check=True
    )

    # Copy scanner vào đúng vị trí scripts/
    scripts_dir = tmp_path / "scripts"
    scripts_dir.mkdir(exist_ok=True)
    shutil.copy2(SCANNER, scripts_dir / "scan_secrets.sh")
    (scripts_dir / "scan_secrets.sh").chmod(0o755)
    (scripts_dir / "scan_secrets.allow").write_text(
        "# Allowlist\n", encoding="utf-8"
    )

    # Initial commit
    subprocess.run(["git", "add", "-A"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "commit", "-q", "-m", "init"], cwd=tmp_path, check=True
    )


def _run_scanner(cwd: Path) -> int:
    result = subprocess.run(
        ["bash", str(cwd / "scripts" / "scan_secrets.sh")],
        cwd=cwd,
        capture_output=True,
    )
    return result.returncode


def test_self_exclusion(tmp_path):
    """Scanner không match pattern trong chính source của nó."""
    _init_git_repo(tmp_path)
    assert _run_scanner(tmp_path) == 0


def test_postgres_url_placeholder_allowed(tmp_path):
    """URL với password CHANGE_ME phải được filter."""
    _init_git_repo(tmp_path)
    (tmp_path / "config.txt").write_text(
        "DATABASE_URL=postgres://user:CHANGE_ME@host:5432/db\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "config.txt"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "commit", "-q", "-m", "add config"], cwd=tmp_path, check=True
    )
    assert _run_scanner(tmp_path) == 0


def test_detects_real_aiza_key(tmp_path):
    """Inject AIza key thật vào file → scanner phải báo lỗi."""
    _init_git_repo(tmp_path)
    (tmp_path / "leaked.txt").write_text(
        "GEMINI_API_KEY=AIza1234567890abcdefghij\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "leaked.txt"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "commit", "-q", "-m", "leak"], cwd=tmp_path, check=True
    )
    assert _run_scanner(tmp_path) == 1


def test_detects_real_postgres_password(tmp_path):
    """Inject Postgres URL với password thật → scanner phải báo lỗi."""
    _init_git_repo(tmp_path)
    (tmp_path / "env.txt").write_text(
        "DATABASE_URL=postgresql://admin:s3cr3tP@ssw0rd@db:5432/prod\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "env.txt"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "commit", "-q", "-m", "leak pg"], cwd=tmp_path, check=True
    )
    assert _run_scanner(tmp_path) == 1


# ──────────────────────────────────────────────
# Property test: Feature: repo-cleanup-and-secrets-hardening,
# Property 5: Secret scanner flags banned patterns iff present
# ──────────────────────────────────────────────

@settings(max_examples=30, deadline=None)
@given(
    inject_aiza=st.booleans(),
    inject_pg=st.booleans(),
    filler=st.text(
        alphabet=st.characters(whitelist_categories=("L", "N"), max_codepoint=127),
        min_size=0,
        max_size=200,
    ),
)
def test_property_flags_banned_patterns_iff_present(
    tmp_path_factory, inject_aiza, inject_pg, filler
):
    """
    Scanner exit != 0 IFF ít nhất 1 banned pattern được inject.
    """
    tmp_path = tmp_path_factory.mktemp("scanner_prop")
    _init_git_repo(tmp_path)

    content_parts = [filler]
    if inject_aiza:
        content_parts.append("AIza1234567890abcdefghij")
    if inject_pg:
        content_parts.append("postgresql://admin:RealSecret123@db:5432/prod")

    (tmp_path / "scan_target.txt").write_text(
        "\n".join(content_parts) + "\n", encoding="utf-8"
    )
    subprocess.run(["git", "add", "scan_target.txt"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "commit", "-q", "-m", "test"], cwd=tmp_path, check=True
    )

    exit_code = _run_scanner(tmp_path)
    has_banned = inject_aiza or inject_pg
    if has_banned:
        assert exit_code == 1, (
            f"Expected exit 1 with inject_aiza={inject_aiza}, inject_pg={inject_pg}"
        )
    else:
        assert exit_code == 0, (
            f"Expected exit 0 with no injection (filler only: {filler!r})"
        )

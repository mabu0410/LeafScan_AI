# Implementation Plan: Repo Cleanup And Secrets Hardening

## Overview

This plan operationalizes `requirements.md` and `design.md` into an ordered, file-level
task list. Phases 0 through 6 MUST produce exactly one cleanup commit (finalized in
task 6.4). Phase 7 (`PROJECT.md` refresh) is an independent follow-up commit per
AC8 of Requirement 8. Do not reorder phases. Each leaf task is scoped to a single
subagent run and names the exact files it touches.

## Execution Rules (read before starting any task)

- Do **NOT** run destructive Git operations in automation. `git filter-repo`, BFG
  Repo-Cleaner, `git push --force`, `git push --force-with-lease`, and
  history-rewriting rebases are out of scope for this workflow. Surface
  `docs/history-rewrite.md` to the operator instead (R2.4, R2.5).
- Do **NOT** delete `backend/.env` from the local filesystem. Only stop tracking
  it via `git rm --cached backend/.env`. The file's contents MUST remain on the
  operator's disk (R1.2).
- Do **NOT** touch files under `backend/app/routers/`, `backend/app/services/`,
  `backend/app/schemas/`, `backend/app/dependencies/`, or
  `backend/app/models/domain.py` (R9.1). The only permitted edit to these paths
  is the removal of import references to files deleted under R5 — and R5.8's
  audit step (task 4.7) is expected to find zero such imports today, which
  means no file under those paths should be modified. Any find from the audit
  MUST fail the commit until resolved.
- Do **NOT** run `python -m scripts.cleanup_uploads` without `--dry-run` against
  the real `backend/app/uploads/` directory during development. Tests MUST use
  `tmp_path`-backed temporary directories only. The only non-test invocation
  against the real directory allowed by this plan is the `--dry-run` smoke in
  task 6.2.
- `PROJECT.md` refresh (Phase 7) is **NOT BLOCKING** the cleanup commit
  (R8.8). It MAY land after 6.4 as its own commit.
- Use only the Python interpreter already provisioned in `backend/.venv`. Do
  not introduce `poetry`, `uv`, `pipenv`, or any other package manager.
- Every task must leave the working tree in a compilable, runnable state. If a
  task fails, stop and surface the failure rather than leaving partial edits.

## Tasks

- [x] 0. Phase 0 — Preflight and safety nets

  - [x] 0.1 Confirm working tree is clean before starting
    - Run `git status --porcelain` from the repo root. If output is non-empty,
      stop and surface the finding to the operator; do not proceed with any
      later task.
    - _Requirements: supports atomicity of the single cleanup commit in 6.4._
    - **Target paths (read-only):** repo root
    - **Definition of Done:** `git status --porcelain` returns an empty string.
      Finding recorded in the run log.

  - [x] 0.2 Verify local backups exist before any destructive tracking change
    - Check for `~/leafscan-backup.db` and `~/uploads-backup.tar.gz` via
      `test -f`. If either is missing, surface a warning to the operator and
      ASK (via user_input) whether to proceed. Do NOT auto-create backups
      inside `~` — the operator owns that step.
    - Document the exact manual backup commands for the operator:
      `cp backend/leafscan.db ~/leafscan-backup.db` and
      `tar -czf ~/uploads-backup.tar.gz -C backend/app uploads`.
    - _Requirements: risk mitigation for R5.1, R5.2 per design §Risks and Mitigations._
    - **Target paths (read-only):** `~/leafscan-backup.db`, `~/uploads-backup.tar.gz`
    - **Definition of Done:** Either both backups exist, or the operator has
      explicitly acknowledged the warning and chosen to proceed.

  - [x] 0.3 Note dependency on `docs/history-rewrite.md` for automation guard
    - No file writes in this task. Record that R2.5 requires
      `docs/history-rewrite.md` to exist before cleanup finalizes. That file
      is produced by task 3.1; verification is folded into 6.1 via
      `scripts/scan_secrets.sh` exit-0 assertion plus a direct `test -f`
      check against `docs/history-rewrite.md`.
    - _Requirements: R2.4, R2.5_
    - **Target paths:** none (planning note only).
    - **Definition of Done:** Run log records the dependency on task 3.1.

  - [x] 0.4 Install hypothesis as a dev-only dependency
    - Create `backend/requirements-dev.txt` containing exactly two pinned
      lines (order as written below; one trailing newline):
      ```
      pytest==8.3.4
      hypothesis>=6.92.0
      ```
      Do **not** remove `pytest` from `backend/requirements.txt`; the dev file
      is purely additive.
    - Append an `install-dev` target to `backend/Makefile` that runs
      `pip install -r requirements-dev.txt` inside the active venv. Preserve
      all existing Makefile targets; append the new target at the end of the
      file with a blank line separator.
    - _Requirements: supports Properties 2, 3, 5 test infrastructure (design §Testing Strategy / Property-based testing framework)._
    - **Target paths:** `backend/requirements-dev.txt` (create),
      `backend/Makefile` (append-only).
    - **Definition of Done:** `backend/requirements-dev.txt` exists with the
      two pinned lines. `backend/Makefile` has a new `install-dev:` target;
      `make -n install-dev` from `backend/` prints a non-empty command.

- [x] 1. Phase 1 — Gitignore and env templates

  - [x] 1.1 Rewrite root `.gitignore` per design §1
    - Replace the entire contents of `/.gitignore` with the grouped block
      specified in design §"Components and Interfaces / 1. Root .gitignore".
      Preserve the Vietnamese-friendly comment headers from the prior file
      where applicable.
    - MUST include the explicit re-inclusions:
      `!backend/.env.example`, `!leafscan-ai/.env.example`,
      `!backend/app/uploads/.gitkeep`,
      and the defensive retain line `!backend/app/data/disease_db.json`.
    - MUST include the upload glob `backend/app/uploads/*` (and the
      re-inclusion above) so untracking in task 4.3 leaves only `.gitkeep`
      visible.
    - _Requirements: R3.1, R3.2, R3.3, R3.4, R3.5, R3.6_
    - **Target paths:** `.gitignore` (overwrite).
    - **Definition of Done:** `.gitignore` matches design §1 verbatim in
      structure. `grep -q '^!backend/app/data/disease_db.json$' .gitignore`
      succeeds. `grep -q '^!backend/app/uploads/.gitkeep$' .gitignore`
      succeeds.

  - [x] 1.2 Remove `backend/.gitignore`
    - Delete `backend/.gitignore` from the working tree (plain `rm`); the
      staged removal lands in the cleanup commit. Every rule it contained is
      migrated to the root gitignore in task 1.1.
    - _Requirements: R3.7, R3.8_
    - **Target paths:** `backend/.gitignore` (delete).
    - **Definition of Done:** `backend/.gitignore` no longer exists on disk.
      `git status` shows `deleted: backend/.gitignore`.

  - [x] 1.3 Create `backend/.env.example` per design §2
    - Populate `backend/.env.example` with every variable listed in the
      design §2 table, in the listed order. Group with `#`-prefixed comment
      headers matching the group column (`# ── Auth ──`, `# ── Database ──`,
      `# ── AI model ──`, `# ── CORS ──`, `# ── Leaf validation thresholds ──`,
      `# ── Plant scope thresholds ──`, `# ── Stage thresholds ──`,
      `# ── Gemini ──`).
    - Placeholder rules (MUST hold):
      - `GEMINI_API_KEY=your-gemini-api-key-here` (MUST NOT start with `AIza`).
      - `DATABASE_URL=postgresql://postgres:CHANGE_ME@localhost:5432/leafscan?sslmode=disable`.
      - `SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_STRING`.
      - `MODEL_PATH=` (blank; a comment explains override path).
      - Every other variable mirrors its in-code literal default from
        `backend/app/config.py`, `backend/app/database.py`, and
        `backend/app/utils/security.py` verbatim as a string (R4.5).
    - _Requirements: R4.1, R4.2, R4.3, R4.4, R4.5_; _Validates: Property 1._
    - **Target paths:** `backend/.env.example` (create).
    - **Definition of Done:** File exists. `grep -c '^AIza' backend/.env.example`
      returns `0`. `grep -q '^DATABASE_URL=postgresql://postgres:CHANGE_ME@'
      backend/.env.example` succeeds. Every variable listed in design §2 table
      appears exactly once.

  - [x] 1.4 Audit and additively update `leafscan-ai/.env.example`
    - Run `grep -RhoE 'EXPO_PUBLIC_[A-Z0-9_]+' leafscan-ai/src || true` and
      `grep -RhoE 'process\.env\.[A-Z0-9_]+' leafscan-ai/src || true` to
      enumerate every variable the mobile code reads.
    - Parse the current `leafscan-ai/.env.example` into a set of keys. If the
      audit surfaces any key not present in the current file, append it with
      a safe placeholder to the end of `leafscan-ai/.env.example`, preserving
      existing entries and ordering. If no gap exists, leave the file
      untouched and record "no gap" in the run log.
    - _Requirements: R4.6_
    - **Target paths:** `leafscan-ai/.env.example` (append-only if needed).
    - **Definition of Done:** Every variable found by the audit is present as
      a key in `leafscan-ai/.env.example`. If no changes were needed, the
      run log explicitly states "no gap".

- [x] 2. Phase 2 — Committed tooling

  - [x] 2.1 Create `backend/scripts/__init__.py`
    - Create a one-line file containing only a module docstring such as
      `"""Backend operational scripts package."""`. This enables
      `python -m scripts.cleanup_uploads` resolution from `backend/`.
    - _Requirements: R6.1_
    - **Target paths:** `backend/scripts/__init__.py` (create).
    - **Definition of Done:** File exists, is a single line, and
      `python -c 'import scripts'` succeeds when run from `backend/` with
      the venv active.

  - [x] 2.2 Create `backend/scripts/cleanup_uploads.py` per design §3
    - Implement the full CLI per the pseudocode in design §3. The code MUST
      satisfy every bullet below; each bullet is independently verifiable.
    - Flags with exact defaults: `--dry-run` (bool flag, default off);
      `--older-than-days` (int, default `30`); `--freshness-window-minutes`
      (int, default `15`); `--uploads-dir` (path, default resolves from
      `app.config.UPLOAD_DIR`); `--verbose` (bool flag, default off).
    - Env loading: reuse the `dotenv.load_dotenv(dotenv_path=...)` pattern
      used by `backend/app/database.py`. MUST NOT `import app.main`. May
      `import app.config` only to read `UPLOAD_DIR`.
    - Engine: `sqlalchemy.create_engine(DATABASE_URL, pool_pre_ping=True)`.
      Session: `Session(engine, autoflush=False, autocommit=False)`, closed
      in a `finally` block.
    - The only SQL the module emits against the database is a single
      `text("SELECT DISTINCT image_url FROM scan_history WHERE image_url IS NOT NULL")`.
      No `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, or `DROP` anywhere
      in the module's source.
    - Per-file filesystem operations (`stat`, `unlink`) wrapped in
      `try/except OSError`; failures log a warning and continue the loop.
    - Summary: on normal completion the final line written to stdout is a
      single-line JSON object with keys exactly:
      `scanned`, `retained_freshness`, `retained_recent`,
      `retained_db_reference`, `would_delete`, `deleted`, `delete_errors`,
      `bytes_reclaimed`, `dry_run`, `older_than_days`,
      `freshness_window_minutes`, `uploads_dir`.
    - Exit codes: `0` on normal completion or missing uploads dir; `2` on
      missing/unreachable `DATABASE_URL`; `4` on uncaught exception.
      Exit code `3` is reserved (uploads-dir-missing is explicitly `0` per
      R6.11) and MUST NOT be used.
    - _Requirements: R6.1, R6.2, R6.3, R6.4, R6.5, R6.6, R6.7, R6.8, R6.9, R6.10, R6.11, R6.12_;
      _Validates: Properties 2, 3, 4._
    - **Target paths:** `backend/scripts/cleanup_uploads.py` (create).
    - **Definition of Done:** Module imports cleanly under the backend venv.
      `python -m scripts.cleanup_uploads --help` from `backend/` prints all
      five flags with their documented defaults.
      `grep -Eni '\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b'
      backend/scripts/cleanup_uploads.py` returns zero matches (excluding
      the word "DELETE" inside string literals used for docstrings or log
      messages — verify manually if any hit, see task 5.4 Property 4 for
      runtime guarantee).

  - [x] 2.3 Create `scripts/scan_secrets.sh` per design §4
    - Implement the scanner per design §4. Every bullet below is independently
      verifiable.
    - First line: `#!/usr/bin/env bash`. Second line: `set -euo pipefail`.
    - Tracked-file enumeration uses the `git ls-files -z | xargs -0` pipeline.
    - Patterns: Google API key shape `AIza[0-9A-Za-z_-]{10,}`; Postgres URL
      `postgres(ql)?://[^[:space:]]*:[^@[:space:]/]+@` followed by the
      secondary pass `grep -Ev ':(CHANGE_ME|password|example|user)@'` and
      the allowlist filter from `scripts/scan_secrets.allow`.
    - Self-exclusion inside the pipeline before `xargs` (e.g.
      `grep -zv -- 'scripts/scan_secrets.sh'`).
    - File attributes: executable bit set via `chmod +x
      scripts/scan_secrets.sh` after creation.
    - Exit codes: `0` clean; `1` on match; `2` if not in a git worktree.
    - _Requirements: R7.1, R7.2, R7.3, R7.4, R7.5_; _Validates: Property 5._
    - **Target paths:** `scripts/scan_secrets.sh` (create, chmod +x).
    - **Definition of Done:** `bash scripts/scan_secrets.sh` runs; file is
      executable (`test -x scripts/scan_secrets.sh` succeeds); shebang line
      matches exactly.

  - [x] 2.4 Create `scripts/scan_secrets.allow`
    - Create an empty tracked file with a single `#`-prefixed comment line
      explaining its purpose, e.g.
      `# One literal string per line; the secret scanner drops matches that equal any line below.`
      No entries on first commit.
    - _Requirements: R7.5 (allowlist support referenced in design §4)_
    - **Target paths:** `scripts/scan_secrets.allow` (create).
    - **Definition of Done:** File exists with exactly one comment line and
      no other non-blank content.

  - [x] 2.5 Create `backend/app/uploads/.gitkeep`
    - Create an empty tracked file so the upload directory survives the
      untracking step in task 4.3. The root gitignore already negates this
      file via `!backend/app/uploads/.gitkeep` (see task 1.1).
    - _Requirements: R5.2_
    - **Target paths:** `backend/app/uploads/.gitkeep` (create).
    - **Definition of Done:** File exists, is zero bytes, and
      `git check-ignore -v backend/app/uploads/.gitkeep` reports the
      negation rule.

- [x] 3. Phase 3 — Documentation

  - [x] 3.1 Create `docs/history-rewrite.md` per design §5
    - Create the `docs/` directory if absent and author `history-rewrite.md`
      using the document shape from design §5: ordered Preconditions; Primary
      recipe (`git filter-repo` with a `replacements.txt` placeholder,
      leaving leaked values for the owner to paste); Alternative recipe
      (BFG Repo-Cleaner); Post-steps (force-push with lease, re-clone
      advisory, rerun `bash scripts/scan_secrets.sh`); and the
      **automation-guard callout** boxed at the top — a literal block that
      instructs an automation tool to stop and surface this document rather
      than execute any step.
    - Do NOT embed any real leaked secret value in this document.
    - _Requirements: R2.1, R2.2, R2.3, R2.4, R2.5_
    - **Target paths:** `docs/history-rewrite.md` (create).
    - **Definition of Done:** File exists. Contains a literal string such as
      `"If you are an automation tool, STOP"` near the top. Cross-references
      `scripts/scan_secrets.sh` for post-rewrite verification.

  - [x] 3.2 Update `backend/README.md` per design §6
    - Add/refresh the following sections in order:
      - **Local setup** — explicit `cp .env.example .env` plus an edit list
        covering `SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY` (R8.3).
      - **Folder layout** — list `routers/`, `schemas/`, `services/`,
        `dependencies/`, `models/`, `data/`, with every file currently in
        `backend/app/routers/` enumerated (R8.1).
      - **Legacy schemas note** — document that `backend/app/models/schemas.py`
        remains for backward compatibility but new Pydantic schemas live in
        `backend/app/schemas/` (R8.2).
      - **Cleanup CLI** — concrete example:
        `python -m scripts.cleanup_uploads --dry-run --older-than-days 30 --freshness-window-minutes 15`
        with flag documentation (R8.4).
      - **Secret scanner** — `bash scripts/scan_secrets.sh` invocation (R8.5).
      - **Backup before destructive actions** — callout linking to
        `docs/history-rewrite.md`.
      - **Verification** — the shell smoke one-liner from design
        §"Testing Strategy / Shell-level acceptance smoke":
        ```bash
        bash scripts/scan_secrets.sh && \
          python -m scripts.cleanup_uploads --dry-run
        ```
    - _Requirements: R8.1, R8.2, R8.3, R8.4, R8.5, R7.6_
    - **Target paths:** `backend/README.md` (update).
    - **Definition of Done:** All six sections present in the listed order.
      `grep -q 'scan_secrets.sh' backend/README.md` and
      `grep -q 'cleanup_uploads --dry-run' backend/README.md` both succeed.

  - [x] 3.3 Additively update `leafscan-ai/README.md`
    - If the mobile README lacks a copy-and-fill section describing the
      `.env.example` → `.env` flow, append one. Otherwise leave the file
      untouched and record "no gap" in the run log. Additive-only; no
      rewrites.
    - _Requirements: R8.6_
    - **Target paths:** `leafscan-ai/README.md` (append-only if needed).
    - **Definition of Done:** File contains a section pointing at
      `cp .env.example .env`, or the run log states "no gap".

- [ ] 4. Phase 4 — Untrack and relocate files

  - [ ] 4.1 Untrack `backend/.env`
    - Execute `git rm --cached backend/.env` from the repo root. Do NOT
      delete the file from disk; R1.2 requires the local file to survive.
    - _Requirements: R1.1, R1.2, R1.3_
    - **Target paths:** `backend/.env` (tracking removal only).
    - **Definition of Done:** `git ls-files backend/.env` returns empty.
      `test -f backend/.env` still succeeds.

  - [ ] 4.2 Untrack `backend/leafscan.db`
    - Execute `git rm --cached backend/leafscan.db`. The local file survives
      (the operator's backup from task 0.2 is in `~`).
    - _Requirements: R5.1_
    - **Target paths:** `backend/leafscan.db` (tracking removal only).
    - **Definition of Done:** `git ls-files backend/leafscan.db` returns empty.

  - [ ] 4.3 Untrack `backend/app/uploads/` contents and re-add `.gitkeep`
    - Execute a single `git rm -r --cached backend/app/uploads` to efficiently
      stage the removal of all ~21,710 tracked JPGs. Then
      `git add backend/app/uploads/.gitkeep` to restore only the keep file.
      Do NOT iterate per-file.
    - _Requirements: R5.2_
    - **Target paths:** `backend/app/uploads/` (tracking removal of
      contents); `backend/app/uploads/.gitkeep` (re-staged).
    - **Definition of Done:**
      `git ls-files backend/app/uploads | wc -l` returns `1`.
      `git ls-files backend/app/uploads` equals
      `backend/app/uploads/.gitkeep`.

  - [ ] 4.4 Untrack `leafscan-ai/dist/`
    - Execute `git rm -r --cached leafscan-ai/dist`.
    - _Requirements: R5.3_
    - **Target paths:** `leafscan-ai/dist/` (tracking removal only).
    - **Definition of Done:** `git ls-files leafscan-ai/dist | wc -l`
      returns `0`.

  - [ ] 4.5 Relocate non-source binaries from `backend/app/models/` into `docs/`
    - `git mv backend/app/models/Mau-Bao-cao-Hoc-phan.pdf
      docs/Mau-Bao-cao-Hoc-phan.pdf`.
    - `git mv backend/app/models/gemini.docx docs/gemini.docx`.
    - If either `git mv` fails (destination already exists, permission
      error, etc.), fall back per R5.6: `git rm backend/app/models/<file>`
      and append a single line to a run-log file surfaced to the operator.
    - _Requirements: R5.4, R5.5, R5.6_
    - **Target paths:** `backend/app/models/Mau-Bao-cao-Hoc-phan.pdf`,
      `backend/app/models/gemini.docx` (source); `docs/Mau-Bao-cao-Hoc-phan.pdf`,
      `docs/gemini.docx` (destination).
    - **Definition of Done:**
      `git ls-files backend/app/models/Mau-Bao-cao-Hoc-phan.pdf` and
      `git ls-files backend/app/models/gemini.docx` both return empty. If
      the move succeeded, `git ls-files docs/Mau-Bao-cao-Hoc-phan.pdf` and
      `git ls-files docs/gemini.docx` both return non-empty.

  - [ ] 4.6 Untrack repo-root scratch files
    - Execute `git rm --cached lenh.md` and `git rm --cached .codex`.
    - _Requirements: R5.7_
    - **Target paths:** `lenh.md`, `.codex` (tracking removal only).
    - **Definition of Done:** `git ls-files lenh.md` and
      `git ls-files .codex` both return empty.

  - [ ] 4.7 Audit code for imports of removed files
    - Run `grep -Rn -E
      'leafscan\.db|Mau-Bao-cao-Hoc-phan\.pdf|gemini\.docx|lenh\.md|\.codex'
      backend/app backend/scripts leafscan-ai/src`. Expect zero matches.
    - If any match is found, fail the commit and surface the finding. The
      only permitted remediation is a pure import-removal edit under the
      R9.1 carve-out, and that remediation MUST be explicitly authorized
      by the operator before proceeding.
    - _Requirements: R5.8, R9.1_
    - **Target paths:** `backend/app/`, `backend/scripts/`,
      `leafscan-ai/src/` (read-only audit).
    - **Definition of Done:** `grep` returns zero matches, recorded in the
      run log.

- [ ] 5. Phase 5 — Tests

  - [ ] 5.1 Create `backend/conftest.py`
    - Create `backend/conftest.py` that inserts `Path(__file__).parent` onto
      `sys.path[0]` so pytest discovery resolves `app.*` and `scripts.*`
      modules the same way `python -m scripts.cleanup_uploads` does. Keep
      the file under 10 lines.
    - _Requirements: supports design §Testing Strategy / Test layout._
    - **Target paths:** `backend/conftest.py` (create).
    - **Definition of Done:** File exists.
      `pytest --collect-only backend/tests/` from the repo root discovers
      tests without import errors once 5.3–5.5 are in place.

  - [ ] 5.2 Create `backend/tests/__init__.py`
    - Create an empty `__init__.py` so the test package is importable.
    - _Requirements: supports design §Testing Strategy / Test layout._
    - **Target paths:** `backend/tests/__init__.py` (create).
    - **Definition of Done:** File exists and is zero bytes.

  - [ ] 5.3 Write `backend/tests/test_env_template.py` for Property 1
    - Implement the AST-walk test described in design §"Env template test":
      - Parse `backend/app/config.py`, `backend/app/database.py`, and
        `backend/app/utils/security.py` with `ast`.
      - Collect every `os.getenv(var, default?)` call and record
        `(var_name, literal_default_or_None)`.
      - Parse `backend/.env.example` into a `dict[str, str]` honoring blank
        lines and `#` comments.
      - Assert every collected `var_name` is present as a key in the dict.
      - Assert `dict[var_name] == default` for every var with a literal
        default, excluding the contract exemption set
        `{"GEMINI_API_KEY", "DATABASE_URL", "SECRET_KEY"}`.
      - Assert `dict["GEMINI_API_KEY"]` does NOT start with `AIza`.
      - Assert `dict["DATABASE_URL"]` matches
        `^postgres(ql)?://[^:@]+:(CHANGE_ME|password|example|user)@`.
    - No hypothesis required for this test (deterministic per design).
    - _Requirements: R4.2, R4.5_; _Validates: Property 1._
    - **Target paths:** `backend/tests/test_env_template.py` (create).
    - **Definition of Done:** `pytest backend/tests/test_env_template.py`
      passes against the file shipped in task 1.3.

  - [ ] 5.4 Write `backend/tests/test_cleanup_cli.py`
    - Include example-based tests (each its own `def test_*`):
      - `test_missing_uploads_dir_exits_zero` — pass a non-existent
        `--uploads-dir`; assert exit `0` and no error on stdout/stderr.
      - `test_bad_database_url_exits_two` — set `DATABASE_URL` to a
        closed-TCP URL; assert exit `2` and no filesystem mutations.
      - `test_unreadable_file_continues_loop` — patch `Path.unlink` to
        raise `PermissionError` on one file; assert loop continues and
        summary records `delete_errors >= 1`.
      - `test_dry_run_is_byte_identical` — seed `tmp_path` with known
        files; run `--dry-run`; assert snapshot (name → sha256) unchanged.
    - Hypothesis tests (each MUST use `@settings(max_examples=100)`):
      - `test_property_2_dry_run_preserves_directory` —
        `# Feature: repo-cleanup-and-secrets-hardening, Property 2: Dry-run preserves the uploads directory`
        Generator: lists of `(filename, mtime_offset_seconds, size_bytes)`
        triples; materialize into `tmp_path`; invoke CLI with `--dry-run`
        and random thresholds; assert directory snapshot unchanged.
        _Validates: R6.2, R9.4._
      - `test_property_3_retention_rules_respected` —
        `# Feature: repo-cleanup-and-secrets-hardening, Property 3: Retention rules are respected`
        Same generator plus a `lists(text())` strategy for the reference
        subset; invoke without `--dry-run` against a SQLAlchemy in-memory
        SQLite engine that carries a minimal `scan_history` table;
        assert the three retention conjuncts hold for every retained and
        every deleted file.
        _Validates: R6.3, R6.4, R6.5, R6.12._
      - `test_property_4_read_only_db` —
        `# Feature: repo-cleanup-and-secrets-hardening, Property 4: Cleanup CLI is read-only against the database`
        Register a SQLAlchemy `before_cursor_execute` listener that asserts
        every emitted `statement` satisfies
        `statement.lstrip().upper().startswith("SELECT")`; run the CLI
        under several flag combinations (dry-run, non-dry-run, empty dir,
        populated dir) and assert the listener fires without raising.
        _Validates: R6.6._
    - _Requirements: R6.2, R6.3, R6.4, R6.5, R6.6, R6.9, R6.10, R6.11, R6.12, R9.4_
    - **Target paths:** `backend/tests/test_cleanup_cli.py` (create).
    - **Definition of Done:**
      `pytest backend/tests/test_cleanup_cli.py -p hypothesis` passes.
      Every property test includes its tagged comment.

  - [ ] 5.5 Write `backend/tests/test_secret_scanner.py`
    - Example tests:
      - `test_self_exclusion` — run the scanner against a fresh temp git
        repo that contains only a copy of `scripts/scan_secrets.sh`
        itself; assert exit `0`.
      - `test_postgres_url_allowlist` — write a file containing the string
        `postgres://user:CHANGE_ME@host:5432/db`, commit it in a temp
        repo, run the scanner; assert exit `0`.
    - Hypothesis test:
      - `test_property_5_flags_banned_patterns_iff_present` —
        `# Feature: repo-cleanup-and-secrets-hardening, Property 5: Secret scanner flags banned patterns iff present`
        `@settings(max_examples=100)`. Generator emits a list of
        `(filename, content, inject_flag)` triples drawn from a random
        ASCII distribution plus an injection choice from
        `{"AIza" + random 15-char suffix, "postgres://u:REAL_SECRET@h/d",
        none}`. Initialize a git repo via `subprocess.run(["git", "init"])`
        in `tmp_path`, add files, and run
        `subprocess.run(["bash", "<repo-root>/scripts/scan_secrets.sh"])`
        from inside the tmp dir. Assert
        `(exit_code != 0) == any_injected_banned_present`.
        _Validates: R7.2, R7.3, R7.4, R7.5._
    - _Requirements: R7.2, R7.3, R7.4, R7.5_
    - **Target paths:** `backend/tests/test_secret_scanner.py` (create).
    - **Definition of Done:**
      `pytest backend/tests/test_secret_scanner.py -p hypothesis` passes.

  - [ ] 5.6 Confirm property-test tagging convention
    - Verify every `@given`-decorated test in `test_cleanup_cli.py` and
      `test_secret_scanner.py` carries a comment of the form
      `# Feature: repo-cleanup-and-secrets-hardening, Property N: <title>`
      per design §"Testing Strategy / Property-based testing framework".
    - Verify every `@given`-decorated test also carries
      `@settings(max_examples=100)` (or a strictly higher number).
    - If any tagging is missing, amend in place and rerun the tests.
    - _Requirements: supports design §Testing Strategy / Property-based testing framework._
    - **Target paths:** `backend/tests/test_cleanup_cli.py`,
      `backend/tests/test_secret_scanner.py` (amend-in-place only if gaps
      are found).
    - **Definition of Done:**
      `grep -E 'Feature: repo-cleanup-and-secrets-hardening, Property [0-9]+'
      backend/tests/*.py | wc -l` is at least 4 (Properties 2, 3, 4, 5).
      No `@given` decorator appears without an adjacent `@settings` on a
      nearby line.

- [ ] 6. Phase 6 — Final verification and single cleanup commit

  - [ ] 6.1 Run the secret scanner against the post-cleanup working tree
    - Execute `bash scripts/scan_secrets.sh` from the repo root.
    - Also assert `test -f docs/history-rewrite.md` succeeds (covers R2.5).
    - _Requirements: R7.4, R2.5_
    - **Target paths:** none (read-only verification).
    - **Definition of Done:** Scanner exits `0`. `docs/history-rewrite.md`
      exists.

  - [ ] 6.2 Dry-run the cleanup CLI against the real uploads directory
    - From `backend/` with the venv active, run
      `python -m scripts.cleanup_uploads --dry-run --older-than-days 30
      --freshness-window-minutes 15`. Do NOT drop `--dry-run`.
    - _Requirements: R6.2, R9.4_; _Validates: Property 2 end-to-end on the
      real tree._
    - **Target paths:** none (read-only verification; `--dry-run` guarantees
      no mutation).
    - **Definition of Done:** Exit `0`. Final line on stdout parses as JSON
      with `dry_run: true` and `deleted: 0`. No new/removed files reported
      by `git status` against `backend/app/uploads/`.

  - [ ] 6.3 Run the full pytest suite
    - Execute `pytest backend/tests/` from the repo root with the venv
      active. Hypothesis settings MUST honor 100 iterations per property.
    - _Requirements: Validates Properties 1–5._
    - **Target paths:** none (read-only verification).
    - **Definition of Done:** All tests pass; summary line reports zero
      failures and zero errors.

  - [ ] 6.4 Create the single cleanup commit
    - Stage every change produced by Phases 1 through 5 (every new file,
      every tracking removal, every move) and create ONE commit. Do NOT
      run `git push --force` or any history-rewriting operation.
    - Commit message MUST reference this spec by name, e.g.
      `chore(hygiene): repo cleanup and secrets hardening`.
    - `PROJECT.md` is explicitly excluded from this commit per R8.8 and is
      handled in task 7.1.
    - _Requirements: atomicity constraint per design §Overview._
    - **Target paths:** working-tree state from Phases 1–5.
    - **Definition of Done:** Exactly one new commit exists on the current
      branch. `git show --stat HEAD` includes every file produced or
      removed by Phases 1–5 and excludes `PROJECT.md`. No push performed.

- [ ] 7. Phase 7 — PROJECT.md refresh (separate commit)

  - [ ] 7.1 Update `PROJECT.md` folder-structure and configuration sections
    - Edit the following `PROJECT.md` sections per design §6:
      - **"Cấu trúc thư mục"** — reflect the post-cleanup layout: add
        `docs/`, add `backend/.env.example`, add `backend/scripts/`
        (with `cleanup_uploads.py`), add `scripts/` (with
        `scan_secrets.sh` and `scan_secrets.allow`), and remove
        `backend/leafscan.db`, `leafscan-ai/dist/`, `lenh.md`, `.codex`,
        `backend/app/models/Mau-Bao-cao-Hoc-phan.pdf`,
        `backend/app/models/gemini.docx`.
      - **"Cấu hình & biến môi trường"** — document the copy-and-fill
        flow for `backend/.env.example` and (if updated) the mobile
        template.
      - **"Điểm cần cải thiện"** — remove items addressed by this spec
        and add any remaining residuals explicitly marked as out of scope
        in design §"Out of Scope".
    - Create this as its own commit, e.g.
      `docs(project): refresh layout and env notes post-hygiene`.
    - _Requirements: R8.7, R8.8_
    - **Target paths:** `PROJECT.md` (update).
    - **Definition of Done:** A second commit exists on the current branch
      whose diff is limited to `PROJECT.md`. No additional files are
      staged or committed in this task.

## Notes

- Optional test tasks are not used in this plan; every test task listed is
  mandatory because Properties 1–5 are explicitly tied to the acceptance
  criteria of R4, R6, R7, and R9.
- Phase 6 represents the single cleanup commit (task 6.4). Phase 7 is the
  separate follow-up commit permitted by R8.8.
- Every property-based test MUST use `hypothesis` with
  `@settings(max_examples=100)` per design §"Testing Strategy /
  Property-based testing framework".
- No task modifies files under `backend/app/routers/`, `backend/app/services/`,
  `backend/app/schemas/`, `backend/app/dependencies/`, or
  `backend/app/models/domain.py`. The audit in task 4.7 enforces this.
- No task deletes `backend/.env` from the filesystem; R1.2 is honored by
  using `git rm --cached` only (task 4.1).
- No task runs `python -m scripts.cleanup_uploads` without `--dry-run`
  outside of hypothesis-driven tests against `tmp_path`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "0.2", "0.3", "0.4"] },
    { "id": 1, "tasks": ["1.1", "1.2", "1.3", "1.4", "2.1", "2.4", "2.5", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 5, "tasks": ["5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["5.6"] },
    { "id": 8, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 9, "tasks": ["6.4"] },
    { "id": 10, "tasks": ["7.1"] }
  ]
}
```

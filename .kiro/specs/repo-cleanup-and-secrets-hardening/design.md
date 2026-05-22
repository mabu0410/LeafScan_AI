# Design Document

## Overview

This spec is a single hygiene and security pass over the LeafScan AI monorepo. The strategy splits the work into four cooperating streams executed in one cleanup commit (except for the `PROJECT.md` refresh which AC8 of Requirement 8 explicitly allows to land separately): (a) **working-tree scrubbing plus `.gitignore` hardening** untracks secrets and runtime artifacts and prevents them from re-entering the repo; (b) **env template creation** produces `backend/.env.example` mirroring every variable the backend reads at runtime, plus an additive update to the existing mobile template if needed; (c) **committed tooling** adds a safe uploads cleanup CLI (`backend/scripts/cleanup_uploads.py`) and a grep-based secret scanner (`scripts/scan_secrets.sh`) so operators can bound disk growth and catch regressions without new infrastructure; (d) **documentation refresh** updates `backend/README.md`, `leafscan-ai/README.md`, and `PROJECT.md` to match the post-cleanup layout. The `History_Rewrite_Procedure` is strictly documentation — it lives at `docs/history-rewrite.md` and is executed manually by the repository owner after rotating the leaked Gemini key and Postgres password. No automated step in this spec ever rewrites Git history.

## Architecture

The design has no runtime architecture change. It reshapes tracked files, adds two standalone tools, and adds three documentation files. The cleanup commit affects only:

- `.gitignore` (root)
- `backend/.gitignore` (removed, see §Root Gitignore)
- `backend/.env.example` (new)
- `backend/app/uploads/.gitkeep` (new)
- `backend/scripts/cleanup_uploads.py` (new)
- `scripts/scan_secrets.sh` (new, executable)
- `scripts/scan_secrets.allow` (new, empty allowlist)
- `docs/history-rewrite.md` (new)
- `docs/Mau-Bao-cao-Hoc-phan.pdf`, `docs/gemini.docx` (relocated from `backend/app/models/`)
- `backend/README.md`, `leafscan-ai/README.md`, `PROJECT.md` (updated)
- Tracking removal only (no source edits): `backend/.env`, `backend/leafscan.db`, `backend/app/uploads/*`, `leafscan-ai/dist/*`, `backend/app/models/{Mau-Bao-cao-Hoc-phan.pdf,gemini.docx}`, `lenh.md`, `.codex`.

The cleanup CLI and the secret scanner are both **standalone processes** — they do not import `app.main`, do not mount any router, and do not start the FastAPI app. The cleanup CLI does open a read-only SQLAlchemy session reusing `app.database`'s dotenv-loading pattern, but opens its own `Session` and never calls `init_db()`.

### Cleanup CLI decision flow

```mermaid
flowchart TD
    A[Start: parse args, log config] --> B{Uploads dir exists?}
    B -- No --> Z0[Log, exit 0]
    B -- Yes --> C[Open read-only DB session]
    C -- error --> Z1[Log, exit 2]
    C -- ok --> D[Query distinct scan_history.image_url basenames]
    D --> E[Enumerate files non-recursively]
    E --> F{For each file}
    F --> G{mtime or ctime within freshness window?}
    G -- yes --> R1[Retain: freshness]
    G -- no --> H{mtime older than older_than_days?}
    H -- no --> R2[Retain: recent]
    H -- yes --> I{basename in referenced_set?}
    I -- yes --> R3[Retain: db-referenced]
    I -- no --> J{dry-run?}
    J -- yes --> R4[Record candidate, do not delete]
    J -- no --> K[Delete file]
    K -- OSError --> R5[Log warning, continue]
    R1 --> F
    R2 --> F
    R3 --> F
    R4 --> F
    R5 --> F
    K --> F
    F -- done --> Y[Emit summary JSON line, exit 0]
```

## Components and Interfaces

### 1. Root `.gitignore` (Requirement 3)

**Sole canonical ignore file.** Reconciliation decision: `backend/.gitignore` is **removed entirely**, not reduced to a stub. Justification:

- The existing `backend/.gitignore` ignores `uploads/`, `app/uploads/`, `.env`, `*.db`, `*.sqlite3`, `*.log` — every one of these moves to the root where AC1–AC5 of Requirement 3 require them anyway.
- It also negates `!app/data/disease_db.json`; because the root file will never ignore `backend/app/data/disease_db.json` in the first place (AC6), the negation is redundant.
- It ignores `backend/training/train_plantvillage.ipynb` and `backend/app/models/efficientnetv2s_plantvillage.onnx`. Both of these are already ignored by the root gitignore today and remain ignored at the root after this spec. Nothing is lost.
- Keeping two files invites the contradictory-rule hazard called out in AC7 of Requirement 3. A single root file is simpler and safer.

Content shape (grouped sections with Vietnamese-friendly comments preserved from the existing file):

```gitignore
# ── OS files ──
.DS_Store
Thumbs.db
...

# ── Editors / IDEs ──
.idea/
.vscode/
*.swp
*.bak

# ── Archives ──
*.zip
*.tar
*.gz
...

# ── Python ──
__pycache__/
*.py[cod]
*.pyc
.venv/
venv/
env/
build/
dist/
*.egg-info/
.pytest_cache/
.coverage
htmlcov/

# ── Node / Expo ──
node_modules/
leafscan-ai/dist/
leafscan-ai/.expo/
leafscan-ai/web-build/

# ── Secrets / env ──
backend/.env
backend/.env.*
!backend/.env.example
leafscan-ai/.env
leafscan-ai/.env.*
!leafscan-ai/.env.example

# ── Runtime artifacts ──
backend/leafscan.db
backend/*.db
backend/*.sqlite3
backend/*.log
backend/app/uploads/*
!backend/app/uploads/.gitkeep

# ── Heavy model weights / personal files ──
backend/app/models/efficientnetv2s_plantvillage.onnx
backend/training/train_plantvillage.ipynb
lenh.md
.codex

# ── Retain explicitly (defensive) ──
!backend/app/data/disease_db.json
```

**Files that MUST remain tracked** (defensive negations or simply not matched):

- `backend/app/data/disease_db.json` (AC6 of R3; backend seeds from this at startup).
- `backend/app/models/*.onnx` is intentionally a single pinned path ignored; any other `*.onnx` under `backend/app/models/` that is not the big EfficientNetV2-S weights remains tracked if added in future.
- `backend/app/models/best_model.pth`, `backend/app/models/class_names.json`, `backend/app/models/domain.py`, `backend/app/models/schemas.py`, `backend/app/models/__init__.py` (AC9 of R5).
- `backend/.env.example`, `leafscan-ai/.env.example` (AC1 of R4 and AC6 of R3 via `!` re-inclusion).
- `backend/app/uploads/.gitkeep` (AC2 of R5 and re-inclusion above).

### 2. `backend/.env.example` (Requirement 4)

**Contract.** The template declares every variable the backend reads at runtime, grouped by subsystem in the same order used by `backend/app/config.py`, `backend/app/database.py`, and `backend/app/utils/security.py`. Every variable that has a default literal in code is mirrored **verbatim** as its placeholder — so copying `.env.example` to `.env` and editing only the true secrets yields the same behavior as the in-code defaults.

Groups and variables:

| Group | Variables | Default in code (mirrored as placeholder) |
| --- | --- | --- |
| **Auth** | `SECRET_KEY` | `CHANGE_ME_TO_A_LONG_RANDOM_STRING` (no real default; code generates ephemeral) |
| | `ALGORITHM` | `HS256` |
| | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
| **Database** | `DATABASE_URL` | `postgresql://postgres:CHANGE_ME@localhost:5432/leafscan?sslmode=disable` |
| **AI model** | `MODEL_PATH` | empty (resolves to `backend/app/models/efficientnetv2s_plantvillage.onnx`) |
| | `MIN_DIAGNOSIS_CONFIDENCE` | `70.0` |
| | `MIN_HEALTHY_CLASS_CONFIDENCE` | `80.0` |
| | `MIN_TOP1_MARGIN` | `8.0` |
| **CORS** | `CORS_ORIGINS` | `*` |
| **Leaf validation thresholds** | `LEAF_MIN_GREEN_RATIO` | `0.05` |
| | `LEAF_MIN_CENTER_GREEN_RATIO` | `0.04` |
| | `LEAF_MIN_BRIGHTNESS` | `55.0` |
| | `LEAF_MIN_BRIGHTNESS_P10` | `35.0` |
| | `LEAF_MAX_DARK_PIXEL_RATIO` | `0.60` |
| | `LEAF_MIN_BLUR_SCORE` | `90.0` |
| | `LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO` | `0.01` |
| | `LEAF_MIN_GREEN_COMPONENT_DENSITY` | `0.25` |
| **Plant scope thresholds** | `PLANT_SCOPE_MIN_TOP1_CONFIDENCE` | `0.75` |
| | `PLANT_SCOPE_MIN_MARGIN` | `0.20` |
| | `PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT` | `2` |
| **Stage thresholds** | (none are env-driven today, but the group is reserved for `STAGE_EARLY_MAX`, `STAGE_MIDDLE_MAX` if promoted to env in future) | — |
| **Gemini** | `GEMINI_API_KEY` | `your-gemini-api-key-here` (MUST NOT begin with `AIza`) |
| | `GEMINI_MODEL` | `gemini-2.0-flash` |

**Placeholder rules:**

- `GEMINI_API_KEY` placeholder is `your-gemini-api-key-here`; the string MUST NOT start with `AIza` (AC3 of R4, and the secret scanner would otherwise flag it).
- `DATABASE_URL` placeholder embeds the literal token `CHANGE_ME` as the password (AC4 of R4). The secret scanner's allowlist explicitly whitelists `CHANGE_ME`, `password`, `example`, `user` as non-real passwords.
- `SECRET_KEY` has no safe default in code (it synthesizes a random key at startup and logs a warning). The template uses a loud placeholder `CHANGE_ME_TO_A_LONG_RANDOM_STRING`; this is not a defaulted value in code so AC5 of R4 ("reproduce that default verbatim") does not apply.
- `MODEL_PATH` defaults to a computed absolute path inside the repo; the template leaves the value blank so the computed default kicks in, and a comment explains how to override.

**Mobile template** (`leafscan-ai/.env.example`) already contains `EXPO_PUBLIC_API_BASE_URL=auto`. We audit the mobile code for any additional `EXPO_PUBLIC_*` or `process.env.*` reads and, if any are missing, append them to the existing file with placeholder values. No full rewrite is needed; this is an additive change (AC6 of R4).

### 3. Uploads Cleanup CLI (Requirement 6)

**Location and invocation.** `backend/scripts/cleanup_uploads.py`. Invoked from `backend/` as `python -m scripts.cleanup_uploads` (AC1 of R6). A `backend/scripts/__init__.py` is added if not present so `-m` resolution works.

**Flags and defaults (exactly mirroring AC2–AC4 of R6 plus two operator ergonomics flags):**

| Flag | Type | Default | Meaning |
| --- | --- | --- | --- |
| `--dry-run` | bool flag | off | Do not delete; print every candidate. AC2. |
| `--older-than-days` | int | `30` | Files with mtime newer than this are retained. AC3. |
| `--freshness-window-minutes` | int | `15` | Files whose mtime OR ctime is within this window of now are retained. AC4. |
| `--uploads-dir` | path | resolves from `app.config.UPLOAD_DIR` | Override the target directory for tests and operators. |
| `--verbose` | bool flag | off | Log one line per delete; otherwise deletes are counted only. |

**Env loading.** The module imports and reuses the dotenv-loading pattern from `app.database` — specifically it re-runs `load_dotenv(dotenv_path=<backend/.env>)` before reading `DATABASE_URL`. It does **not** import `app.main` (to avoid the FastAPI startup side effects: model loading, table creation, seed runs). It does import `app.config` purely to read `UPLOAD_DIR` as a default for `--uploads-dir`. It does import `app.models.domain.ScanHistory` only to reference its table name; the read uses raw `SELECT DISTINCT image_url FROM scan_history` via a SQLAlchemy `text()` call so the CLI stays resilient to ORM drift.

**Session shape.** The CLI constructs a SQLAlchemy engine using `DATABASE_URL` with `pool_pre_ping=True` and opens a `Session(autoflush=False, autocommit=False)` — no ORM mutations are ever performed. The session is closed in a `finally`. Read-only safety is enforced by not issuing any `INSERT/UPDATE/DELETE` statement (AC6 of R6); this is verified by tests that assert the session's dirty/new/deleted sets are empty at close time.

**Algorithm (pseudocode).**

```
args = parse_argv()
log_config(args)

uploads_dir = Path(args.uploads_dir)
if not uploads_dir.is_dir():
    log_info("uploads dir missing; nothing to do")
    exit(0)                                           # AC11

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    session = Session(engine, autoflush=False, autocommit=False)
    referenced = {
        basename(row[0]) for row in session.execute(
            text("SELECT DISTINCT image_url FROM scan_history "
                 "WHERE image_url IS NOT NULL")
        )
    }
except Exception as exc:
    log_error("DB unreachable", exc)
    exit(2)                                           # AC10

now = time.time()
stats = Counter()
bytes_reclaimed = 0

for entry in uploads_dir.iterdir():                   # non-recursive
    if not entry.is_file():
        continue
    stats["scanned"] += 1
    try:
        st = entry.stat()
    except OSError as e:
        log_warn(f"stat {entry}: {e}"); continue

    mtime_age = now - st.st_mtime
    ctime_age = now - st.st_ctime

    # retain if within freshness window (AC4)
    if mtime_age < args.freshness_window_minutes*60 \
       or ctime_age < args.freshness_window_minutes*60:
        stats["retained_freshness"] += 1
        continue

    # retain if newer than older_than_days threshold (AC3)
    if mtime_age < args.older_than_days*86400:
        stats["retained_recent"] += 1
        continue

    # retain if referenced by DB (AC5)
    if entry.name in referenced:
        stats["retained_db_reference"] += 1
        continue

    # delete (or record) candidate
    if args.dry_run:
        print(f"[DRY-RUN] would delete {entry}")
        stats["would_delete"] += 1
    else:
        try:
            size = st.st_size
            entry.unlink()
            bytes_reclaimed += size
            stats["deleted"] += 1
            if args.verbose: log_info(f"deleted {entry}")
        except OSError as e:
            log_warn(f"delete {entry}: {e}")
            stats["delete_errors"] += 1              # AC9

session.close()
emit_summary_json(stats, bytes_reclaimed)             # AC7
exit(0)
```

**Summary payload (single JSON line on stdout, AC7).** Fields: `scanned`, `retained_freshness`, `retained_recent`, `retained_db_reference`, `would_delete` (dry-run only), `deleted`, `delete_errors`, `bytes_reclaimed`, `dry_run`, `older_than_days`, `freshness_window_minutes`, `uploads_dir`.

**Exit-code table.**

| Code | Meaning |
| --- | --- |
| 0 | Normal completion (including: uploads dir missing per AC11; dry-run; successful cleanup with or without `delete_errors`). |
| 2 | `DATABASE_URL` missing or database unreachable (AC10). |
| 3 | Reserved: uploads dir missing **is not** a failure in this spec (AC11 says exit 0). Kept in the table as an explicit non-use to prevent accidental reuse. |
| 4 | Unexpected fatal error (uncaught exception outside the per-file try/except). |

**Logging style.**

- `INFO` at start: resolved config (all flags, resolved uploads dir, DB dialect only — not the full URL).
- `INFO` per retention reason tally (single summary at end, not per-file).
- `INFO` per delete **only when `--verbose`**.
- `WARNING` on per-file `stat`, `unlink`, or DB errors that the loop continues past.
- Final `INFO` line is the structured summary JSON on stdout (machine-parseable).

**Safety properties (enforced by code shape, verified by tests).**

- No `INSERT/UPDATE/DELETE` statement in the module. The only DB call is a `SELECT`.
- Session is `autoflush=False, autocommit=False` and closed in `finally`.
- Every filesystem op (`stat`, `unlink`, `is_file`) is wrapped in `try/except OSError` so a single bad file never aborts the run.
- `--dry-run` branch never calls `unlink`.

**Interaction with a running backend.** The cleanup CLI and the FastAPI app race on the uploads directory, but the Freshness_Window of 15 minutes is far larger than any realistic write-to-DB-row window inside a diagnosis request (image saved → scan row inserted typically takes <1s). Two guards eliminate the race:

1. **Freshness window** — any file whose mtime OR ctime is within the window is retained unconditionally. A freshly written upload whose DB row hasn't been committed yet still survives.
2. **DB-reference filter** — after the DB row is committed, the file's basename appears in `scan_history.image_url`, so even after the freshness window elapses the file is retained.

Together these two filters form overlapping safety nets. File-level locks (`flock`, `O_EXCL`) are **not** needed — they would require changes to `app/routers/diagnosis.py` and violate AC1 of Requirement 9 (do not modify routers). The CLI is explicitly designed to be safe during concurrent backend writes (AC12 of R6).

### 4. Secret Scanner (Requirement 7)

**Location.** `scripts/scan_secrets.sh`, executable (`chmod +x`), with shebang `#!/usr/bin/env bash` and `set -euo pipefail`.

**Tracked-file enumeration.** Uses `git ls-files -z | xargs -0 grep -En -- <pattern>`. `-z`/`-0` handles spaces and unusual filenames. Untracked files are out of scope (AC2 of R7 says "search tracked files").

**Self-exclusion.** The script excludes its own path via a literal comparison inside the pipeline (e.g. `grep -v -z -- 'scripts/scan_secrets.sh'` before the `xargs`). This covers the content-of-own-patterns problem flagged by AC5 of R7.

**Allowlist.** Adjacent file `scripts/scan_secrets.allow` (tracked, empty by default). Each non-empty, non-`#` line is a literal string to exclude from the final match set. This is used for intentional test fixtures if any are added later, and gives the owner a clear place to pin known-safe occurrences.

**Patterns.**

1. `AIza[0-9A-Za-z_-]{10,}` — Google API key shape (matches Gemini keys).
2. `postgres(ql)?://[^[:space:]]*:[^@[:space:]/]+@` — Postgres URL with a password. Filtered by a secondary pass that drops matches whose password token equals any of `CHANGE_ME`, `password`, `example`, `user`. Implementation detail: after the grep, pipe through `grep -Ev ':(CHANGE_ME|password|example|user)@'` and the allowlist filter.
3. Known literal Leaked_Secrets values loaded from `scripts/scan_secrets.allow`'s sibling file `scripts/scan_secrets.leaked` if present; defaulted to a hardcoded two-entry array inside the script containing exactly the two values currently in `backend/.env` (the real Postgres password and the real `AIza...` key) so the scanner catches them even after pattern rules change. This is acceptable: the script excludes itself, so the literals being in the script don't cause a self-match.

**Output.** On match: one line per hit, `path:line:content`, grouped by path (simple `sort` by the first field suffices). Exit code `1`. On clean: no output, exit code `0` (AC3, AC4 of R7).

**Documentation.** The invocation `bash scripts/scan_secrets.sh` is documented in `backend/README.md` (AC6 of R7) and cross-referenced from `docs/history-rewrite.md`.

### 5. History Rewrite Procedure Doc (Requirement 2)

**Location.** `docs/history-rewrite.md`. Documentation-only. No script automates it.

**Document shape:**

1. **Preconditions (ordered, required):**
   - Rotate the `GEMINI_API_KEY` at Google AI Studio.
   - Rotate the Postgres password for the `postgres` user in the local DB.
   - Back up `backend/leafscan.db` and any other local-only files you want to keep (see Risks §).
   - Confirm no unpushed commits on any branch and all collaborators are paused.
2. **Primary recipe — `git filter-repo`:** a recipe that (a) removes `backend/.env` from all history and (b) replaces the literal leaked values listed in a `replacements.txt` file. The document shows the `replacements.txt` format but leaves the values for the owner to paste in, so the doc itself does not ship the leaked values.
3. **Alternative recipe — BFG Repo-Cleaner:** equivalent steps using `bfg --delete-files .env` and `bfg --replace-text replacements.txt`.
4. **Post-steps:**
   - `git push --force-with-lease` on every branch and tag.
   - Notify collaborators to **re-clone** (not `git pull`).
   - Run `bash scripts/scan_secrets.sh` against the new history; confirm exit 0.
   - Revoke any remaining caches on hosted forks (GitHub "contact support" link template).
5. **Automated-run guard (AC4/AC5 of R2):** a boxed "If you are an automation tool, STOP and surface this document to the owner" callout. This is the textual guard that the automated cleanup run checks for (see §Testing Strategy for how it is verified).

### 6. Documentation Updates (Requirement 8)

- **`backend/README.md`** gains:
  - A **Local setup** section: `cp .env.example .env` → edit `SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`.
  - An updated folder layout listing `routers/`, `schemas/`, `services/`, `dependencies/`, `models/`, `data/`.
  - A **Legacy data layout** note: `backend/app/models/schemas.py` still exists for backwards compatibility, but new Pydantic schemas live under `backend/app/schemas/` (AC2 of R8).
  - A **Cleanup CLI** section with at least one concrete example: `python -m scripts.cleanup_uploads --dry-run --older-than-days 30 --freshness-window-minutes 15`.
  - A **Secret scanner** section: `bash scripts/scan_secrets.sh`.
  - A **Backup before destructive actions** callout pointing at `docs/history-rewrite.md`.
- **`leafscan-ai/README.md`** gains a short copy-and-fill section for `.env.example` → `.env`.
- **`PROJECT.md`** gets its *Folder Structure*, *Configuration*, and *Improvements* sections updated; per AC8 of R8, this update MAY land in a separate commit and does not block the cleanup commit.

## Data Models

This spec does not introduce new persistent data. The only external shape it consumes is the existing `scan_history` table:

| Column | Type | Usage in this spec |
| --- | --- | --- |
| `image_url` | string | Read by the cleanup CLI; its basename (the filename component after the last `/`) is the key against filenames in `backend/app/uploads/`. |

Logical shapes internal to the cleanup CLI:

- `ReferencedSet`: `set[str]` of basenames from `scan_history.image_url`.
- `FileCandidate`: `{path: Path, size: int, mtime: float, ctime: float}`.
- `RetentionReason`: one of `freshness`, `recent`, `db_reference`, or `none` (→ candidate for deletion).
- `CleanupSummary`: the JSON object documented in §3.

No migrations. No schema changes. AC2 of R9 prohibits it.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This spec is mostly hygiene work (ignore rules, documentation, file relocations) which is best verified with example-based tests and smoke checks. The two committed tools — the uploads cleanup CLI and the secret scanner — and the env template have universally quantified behaviors that are worth pinning as properties.

### Property 1: Env template completeness and fidelity

*For any* environment variable name `V` that appears as the first argument of an `os.getenv(V, ...)` call in `backend/app/config.py`, `backend/app/database.py`, or `backend/app/utils/security.py`, `V` SHALL appear as a key in `backend/.env.example`; and *for any* such variable that has a literal default `D` in its `os.getenv(V, D)` call, the value assigned to `V` in `backend/.env.example` SHALL equal `D` as a string, except for `GEMINI_API_KEY` and `DATABASE_URL` whose placeholders are non-secret by contract.

**Validates: Requirements 4.2, 4.5**

### Property 2: Dry-run preserves the uploads directory

*For any* uploads directory `U` with arbitrary files (any names, any mtimes, any ctimes, any sizes), *for any* backing `scan_history` reference set, and *for any* choice of `--older-than-days` and `--freshness-window-minutes`, invoking the Uploads_Cleanup_CLI with `--dry-run` SHALL leave the contents of `U` byte-for-byte identical to their pre-invocation state.

**Validates: Requirements 6.2, 9.4**

### Property 3: Retention rules are respected

*For any* uploads directory `U`, any backing reference set `R`, any choice of thresholds `older_than_days = D` and `freshness_window_minutes = W`, and any file `f` in `U` with `mtime` and `ctime`, after a non-dry-run invocation of the Uploads_Cleanup_CLI:

- if `now - f.mtime < W*60` OR `now - f.ctime < W*60`, then `f` is retained (freshness rule); AND
- if `now - f.mtime < D*86400`, then `f` is retained (age rule); AND
- if `basename(f) ∈ R`, then `f` is retained (reference rule).

Equivalently, a file is deleted only if all three retention clauses fail simultaneously.

**Validates: Requirements 6.3, 6.4, 6.5, 6.12**

### Property 4: Cleanup CLI is read-only against the database

*For any* invocation of the Uploads_Cleanup_CLI, regardless of flags, uploads directory contents, or reference set, every SQL statement emitted by the CLI's SQLAlchemy engine SHALL begin (after whitespace normalization) with `SELECT`. No `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, or `DROP` statement SHALL ever be issued.

**Validates: Requirements 6.6**

### Property 5: Secret scanner flags banned patterns iff present

*For any* working tree `T` of tracked files with arbitrary ASCII content, the exit code of `scripts/scan_secrets.sh` SHALL be non-zero if and only if at least one file in `T` (other than `scripts/scan_secrets.sh` itself and entries listed in `scripts/scan_secrets.allow`) contains a substring matching one of the banned patterns: `AIza[0-9A-Za-z_-]{10,}`, or a `postgres(ql)?://` URL whose password token is not in the allowlist (`CHANGE_ME`, `password`, `example`, `user`).

**Validates: Requirements 7.2, 7.3, 7.4, 7.5**

## Error Handling

All error handling is local to the two committed tools; nothing in this spec touches the FastAPI request/response pipeline.

**Uploads Cleanup CLI.**

| Condition | Handling | Exit code |
| --- | --- | --- |
| `--uploads-dir` does not exist | Log info "uploads dir missing; nothing to do"; skip DB query. | `0` (AC11 of R6) |
| `DATABASE_URL` unset | Log error "DATABASE_URL is required"; do not touch files. | `2` (AC10 of R6) |
| DB connection refused / timeout / auth failure | Log error with exception class and message (not credentials); do not touch files. | `2` |
| `stat(file)` raises `OSError` | Log warning; skip that file; continue loop. | summary still `0` (AC9 of R6) |
| `unlink(file)` raises `PermissionError` / `OSError` | Log warning; increment `delete_errors`; continue loop. | summary still `0` (AC9 of R6) |
| Uncaught exception outside per-file try/except | Print traceback to stderr. | `4` |

**Secret Scanner.**

| Condition | Handling | Exit code |
| --- | --- | --- |
| Not run from inside a git worktree | Print "not a git repository" to stderr; exit non-zero. | `2` |
| `git ls-files` produces zero files | Exit `0` (nothing to check is trivially clean). | `0` |
| Any banned pattern found | Print `path:line:content` lines grouped by path to stdout. | `1` |
| No banned pattern found | No output. | `0` |

**History Rewrite Doc.** No runtime errors — it is documentation. The only failure mode relevant to this spec is "the doc is missing"; AC5 of R2 requires any automated cleanup run to fail non-zero in that case, which is surfaced as a preflight check in the testing strategy below.

**Env Template Generation.** Done by hand from the code audit; no runtime error handling applies. The completeness-and-fidelity property (Property 1) fails the test suite if a new `os.getenv` is added without a corresponding template entry — this is the enforcement mechanism.

## Testing Strategy

This is hygiene work, so the test footprint is deliberately small. We cover the property cards above with a lightweight pytest layout under `backend/tests/` and add a small shell-level acceptance smoke at the repo root.

### Test layout

```
backend/
  conftest.py              # discovery root for pytest; inserts backend/ onto sys.path
  tests/
    __init__.py
    test_cleanup_cli.py    # CLI unit + property tests
    test_env_template.py   # Property 1 + env placeholder rules
    test_secret_scanner.py # Property 5 + scanner smoke
```

If `backend/tests/` does not exist yet, the spec creates it. We pick the same `pytest` already present in `backend/.pytest_cache/` — no new test framework is introduced.

### Property-based testing framework

**Hypothesis** (Python PBT library) is used for Properties 2, 3, and 5. All property tests are configured for a minimum of **100 iterations** (`@settings(max_examples=100)`). Each test is tagged with a comment in the form:

```python
# Feature: repo-cleanup-and-secrets-hardening, Property 3: Retention rules are respected
```

For Property 1, Hypothesis is unnecessary — the test enumerates the getenv calls once by AST-walking the three source files and asserts coverage. This is deterministic and cheaper.

For Property 4, the test installs a SQLAlchemy `before_cursor_execute` event listener against the CLI's engine, runs the CLI across a few fixture directories, and asserts the listener never sees a non-SELECT statement.

### Unit tests for the cleanup CLI (`test_cleanup_cli.py`)

Example-based tests (one-liners around edge cases):

- `--dry-run` exits 0 and leaves the directory byte-identical (also contributes a property run for P2).
- Files strictly within freshness window are retained (seed with `os.utime(path, (recent, recent))`).
- Files whose basename is in `scan_history.image_url` are retained (seed via monkeypatched `DATABASE_URL` pointing at an in-memory SQLite engine with a minimal `scan_history` table).
- Stale, unreferenced files beyond `older_than_days` are deleted.
- Missing `--uploads-dir` → exit code `0`.
- Bad `DATABASE_URL` (closed TCP port) → exit code `2` even without `--dry-run`.
- Unreadable file (permission error mocked on `stat` or `unlink`) does not abort the loop; a warning is logged.

Property-based tests:

- **Property 2 (dry-run preservation):** Hypothesis generates lists of `(filename, mtime_offset_seconds, size_bytes)` triples, materializes them into a `tmp_path` directory, runs the CLI with `--dry-run` and random threshold values, asserts the directory snapshot (map of name→sha256) is unchanged.
- **Property 3 (retention rules):** Same generator plus a `Hypothesis.lists(strategies.text())` for the reference-set subset of basenames. After a non-dry-run invocation with randomly chosen thresholds, assert the three retention conjuncts hold for every retained and every deleted file.
- **Property 4 (read-only DB):** Parameterized invocations (dry-run, non-dry-run, empty dir, populated dir) all driven through a SQLAlchemy engine with a `before_cursor_execute` hook that asserts `statement.lstrip().upper().startswith("SELECT")`.

### Env template test (`test_env_template.py`)

**Property 1:**

- AST-parse `backend/app/config.py`, `backend/app/database.py`, `backend/app/utils/security.py`.
- Collect every `Call` whose `func` resolves to `os.getenv` with a string first arg; record `(var_name, literal_default_or_None)`.
- Parse `backend/.env.example` into a `dict[str, str]` (simple `KEY=value` split, honoring blank lines and `#` comments).
- Assert `var_name ∈ dict` for every captured var.
- Assert `dict[var_name] == default` for every var with a non-None literal default, except for an explicit exemption list: `{"GEMINI_API_KEY", "DATABASE_URL", "SECRET_KEY"}` (placeholders by contract).
- Assert `dict["GEMINI_API_KEY"]` does not start with `AIza`.
- Assert `dict["DATABASE_URL"]` matches the regex `postgres(ql)?://[^:@]+:(CHANGE_ME|password|example|user)@`.

### Secret scanner test (`test_secret_scanner.py`)

- Smoke: run `scripts/scan_secrets.sh` against the post-cleanup working tree; assert exit `0`. This is the acceptance smoke for the whole spec.
- **Property 5:** Hypothesis generator emits a temp git repo with a random number of files whose contents are random ASCII plus zero-or-more injected banned patterns chosen from a small catalog. Initialize a git repo in the tmp dir, add the files, run the scanner (via `subprocess.run`), assert `exit_code != 0 ⇔ any_injected_banned_present`.
- Edge: scanner run against a tree containing only itself → exit `0` (self-exclusion).
- Edge: scanner run against a tree containing a `postgres://user:CHANGE_ME@host/db` URL → exit `0` (allowlist).

### Shell-level acceptance smoke

A committed shell one-liner in `backend/README.md`'s **Verification** section:

```bash
bash scripts/scan_secrets.sh && \
  python -m scripts.cleanup_uploads --dry-run
```

Both commands must exit `0` on a clean tree. This is what an owner runs by hand before committing.

### Out-of-scope testing concerns

- **CI pipelines are explicitly NOT added in this spec.** The tests above run on demand via `pytest` from `backend/`, and the smoke runs via `bash`. Wiring them into GitHub Actions or any other CI is separate work.
- **Load/performance testing** on the cleanup CLI against a 21k-file uploads directory is manual — the owner runs it once with `--dry-run` against the real directory as part of rollout.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend is running while the cleanup CLI executes; a file is written between directory scan and DB query, and the DB row lands after the query | File could be deleted despite being valid | Freshness_Window of 15 minutes retains any file whose mtime OR ctime is within the window — far larger than the save-to-commit interval of a diagnosis request. Overlapping DB-reference filter closes the remaining window. |
| Owner wants to keep `backend/leafscan.db` (real test users) or specific upload files that are no longer DB-referenced | Data loss on cleanup | `docs/history-rewrite.md` and `backend/README.md` both include a **Backup before destructive actions** step listing: (a) copy `backend/leafscan.db` to `~/leafscan-backup.db`, (b) tar `backend/app/uploads/` to `~/uploads-backup.tar`, before the cleanup commit and before any history rewrite. `--dry-run` is the default mode recommended in the docs for the first run. |
| Secret scanner false-positive flags a fixture password token or test string | Developer friction | `scripts/scan_secrets.allow` (committed, empty by default) lets the owner whitelist specific literal strings. The scanner also ignores its own file. The Postgres password allowlist (`CHANGE_ME`, `password`, `example`, `user`) covers the common cases. |
| Expo/Metro tooling (`.env.local`, `.env.development`, `dist/`) re-lands in a future commit | Secrets and build artifacts reintroduced | Root `.gitignore` matches `leafscan-ai/.env.*` (with explicit `!leafscan-ai/.env.example` re-inclusion), `leafscan-ai/dist/`, `leafscan-ai/.expo/`, and `leafscan-ai/web-build/`. Any future re-landing requires an explicit `git add -f` override. |
| Collaborators `git pull` after the history rewrite instead of re-cloning | Stale refs, merge catastrophes | `docs/history-rewrite.md` explicitly instructs re-clone and provides a template message to send to collaborators. This risk is out of the automated scope and lands on the owner. |
| Removing `backend/.gitignore` silently drops a rule that was only there | Ignored path leaks back | §Root Gitignore explicitly lists every rule migrated from `backend/.gitignore`. Reviewer checklist in the cleanup commit message confirms parity. |

## Out of Scope

The following are explicitly **not** part of this spec and must not be introduced by the cleanup commit:

- Refresh tokens or any change to the auth token lifecycle.
- Role-based access control, admin roles, or permission models.
- Alembic migrations, schema changes, or any `ALTER TABLE` authored outside the existing `_ensure_*_columns` helpers.
- Dockerfiles, `docker-compose.yml`, container registries.
- CI/CD pipelines (GitHub Actions, GitLab CI, etc.).
- Redis-based or distributed rate limiting (the existing in-process rate limiter stays as-is).
- New HTTP endpoints, changes to request/response shapes, or router additions.
- Frontend behavior changes in `leafscan-ai/` beyond README updates and (if needed) an additive `.env.example` edit.
- Automated Git-history rewriting — this is strictly a manual procedure per Requirement 2.


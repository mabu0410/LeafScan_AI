# Requirements Document

## Introduction

An audit of the LeafScan AI monorepo (FastAPI backend + Expo mobile) has surfaced hygiene and security problems: real secrets are tracked in Git (`backend/.env` contains a real Postgres password and a real Google Gemini API key), runtime artifacts are committed (a SQLite dev DB, ~21,710 upload JPGs under `backend/app/uploads/`, an Expo web build in `leafscan-ai/dist/`), non-source binaries are mixed into the ONNX model folder (a `.pdf` report and `.docx` note), personal scratch files (`lenh.md`, `.codex`) are tracked at the repo root, there is no cleanup policy for the upload directory, and backend documentation is out of date.

This spec defines the hygiene and security work needed to:

- Remove committed secrets from the working tree and define a safe path to scrub them from Git history.
- Harden the root `.gitignore` so runtime artifacts cannot re-enter the repo.
- Establish a `backend/.env.example` template that mirrors real variables with placeholder values.
- Relocate or delete non-source files that bloat the repo.
- Provide a safe, reproducible uploads cleanup CLI with dry-run, age, and database-reference guards.
- Update backend documentation to reflect the current code layout.
- Add a simple, committed secret-scan step so regressions are easy to catch.

This is explicitly a hygiene and security spec. It MUST NOT change application behavior, public API surface, or database schema.

## Glossary

- **Repository**: The Git repository rooted at `DO_AN_VMB/`, containing `backend/`, `leafscan-ai/`, and top-level project files.
- **Root_Gitignore**: The file `.gitignore` at the repository root.
- **Backend_Gitignore**: The file `backend/.gitignore`.
- **Backend_Env_File**: The file `backend/.env`, which holds real secrets for local development and MUST remain local-only.
- **Backend_Env_Template**: The file `backend/.env.example`, a committed template listing every variable used by the backend with placeholder (non-secret) values.
- **Leaked_Secrets**: Any real credential value currently present in tracked files, specifically the Postgres password embedded in `DATABASE_URL` and the `GEMINI_API_KEY` value in `backend/.env`.
- **Runtime_Artifacts**: Files produced at runtime or by local tooling that MUST NOT be tracked. For this repository they include, at minimum: `backend/.env`, `backend/leafscan.db`, any `*.db` / `*.sqlite3` under `backend/`, `backend/app/uploads/` contents, `leafscan-ai/dist/`, `leafscan-ai/.expo/`, `node_modules/`, `__pycache__/`, and `.pytest_cache/`.
- **Non_Source_Assets**: Files tracked under `backend/app/models/` that are not AI model artifacts or loader code, specifically `Mau-Bao-cao-Hoc-phan.pdf` and `gemini.docx`.
- **Scratch_Files**: Ad-hoc personal files tracked at the repository root, specifically `lenh.md` and `.codex`.
- **Uploads_Directory**: The filesystem directory `backend/app/uploads/` where diagnosis images are written by the backend at runtime.
- **Scan_History_Table**: The SQLAlchemy-mapped table `scan_history` in the backend database, whose `image_url` column holds references to files under the Uploads_Directory.
- **Uploads_Cleanup_CLI**: The Python command-line tool introduced by this spec to delete stale files from the Uploads_Directory under explicit safety rules.
- **Freshness_Window**: A configurable duration, expressed in minutes, during which a newly created or recently modified upload file is considered in-use and MUST NOT be deleted by the Uploads_Cleanup_CLI.
- **Age_Threshold**: A configurable duration, expressed in days, below which a file is considered recent enough to retain regardless of database references.
- **Secret_Scanner**: A committed shell script (grep-based) that fails with a non-zero exit code if known secret patterns appear in tracked files.
- **Backend_Documentation**: The file `backend/README.md`.
- **Mobile_Documentation**: The file `leafscan-ai/README.md`.
- **Project_Documentation**: The file `PROJECT.md` at the repository root.
- **History_Rewrite_Procedure**: A documented, manual, destructive procedure (using `git filter-repo` or BFG Repo-Cleaner) that the repository owner runs locally to purge Leaked_Secrets from past Git history.

## Requirements

### Requirement 1: Remove Secrets From The Working Tree

**User Story:** As the repository owner, I want `backend/.env` and all other files containing real secrets to be untracked by Git, so that a fresh clone never exposes my Postgres password or Gemini API key.

#### Acceptance Criteria

1. THE Repository SHALL stop tracking `backend/.env` such that `git ls-files backend/.env` returns an empty result after the cleanup commit.
2. WHILE `backend/.env` exists on the owner's local filesystem, THE Repository SHALL preserve the local file contents and SHALL NOT delete it from disk.
3. THE Repository SHALL stop tracking any file matching the patterns `*.env`, `.env`, or `.env.*` anywhere under `backend/`, excluding `backend/.env.example`.
4. IF a tracked file other than `backend/.env.example` contains a value matching a known Leaked_Secrets pattern (a non-placeholder Postgres password or a `GEMINI_API_KEY` value starting with `AIza`), THEN THE Repository SHALL have that file removed from tracking or have the offending value replaced with a placeholder before the cleanup commit is finalized.

### Requirement 2: Document And Gate The History Rewrite

**User Story:** As the repository owner, I want a clearly documented, manual procedure to scrub Leaked_Secrets from Git history, so that I can perform the destructive step myself with full awareness of the consequences.

#### Acceptance Criteria

1. THE Repository SHALL contain a documented History_Rewrite_Procedure, stored under `backend/docs/` or an equivalent location referenced from Backend_Documentation, that describes how to purge `backend/.env` and the known Leaked_Secrets values from Git history using `git filter-repo` or BFG Repo-Cleaner.
2. THE History_Rewrite_Procedure SHALL state that the step is destructive, rewrites commit SHAs, and requires a coordinated force-push.
3. THE History_Rewrite_Procedure SHALL require that the `GEMINI_API_KEY` and any exposed database password be rotated at their respective providers before or at the time of the rewrite.
4. IF the cleanup work is executed by an automated agent, THEN THE automation SHALL NOT run the History_Rewrite_Procedure and SHALL instead surface the documented procedure for the owner to run manually.
5. IF an automated cleanup run cannot surface the History_Rewrite_Procedure to the owner (for example because the documentation file is missing or unwritable), THEN THE automation SHALL fail the entire cleanup run with a non-zero exit status and SHALL NOT proceed with any other cleanup step.

### Requirement 3: Harden The Root Gitignore

**User Story:** As a developer on this repository, I want a single canonical `.gitignore` at the root that prevents Runtime_Artifacts from being committed, so that re-introducing the audited problems requires an explicit override.

#### Acceptance Criteria

1. THE Root_Gitignore SHALL ignore `backend/.env` and any file matching `backend/.env.*` except `backend/.env.example`.
2. THE Root_Gitignore SHALL ignore `backend/leafscan.db` and any file matching `backend/*.db` or `backend/*.sqlite3`.
3. THE Root_Gitignore SHALL ignore `backend/app/uploads/` and all of its contents.
4. THE Root_Gitignore SHALL ignore `leafscan-ai/dist/` and `leafscan-ai/.expo/`.
5. THE Root_Gitignore SHALL ignore `node_modules/`, `__pycache__/`, `.pytest_cache/`, and `*.pyc` under any path.
6. THE Root_Gitignore SHALL retain `backend/app/data/disease_db.json` as tracked content and SHALL NOT introduce any pattern that would cause it to be ignored.
7. WHERE `backend/.gitignore` exists, THE Backend_Gitignore SHALL be either removed or reduced to patterns that do not conflict with the Root_Gitignore, and the two files combined SHALL NOT produce contradictory ignore rules for any Runtime_Artifacts listed above.
8. WHERE `backend/.gitignore` does not exist, THE Repository SHALL treat AC7 as already satisfied and SHALL NOT create a Backend_Gitignore solely to comply with this requirement.

### Requirement 4: Provide A Backend Environment Template

**User Story:** As a new developer setting up the backend, I want a committed `backend/.env.example` that lists every environment variable the backend reads, so that I can create my own `.env` without guessing.

#### Acceptance Criteria

1. THE Repository SHALL contain a tracked file `backend/.env.example`.
2. THE Backend_Env_Template SHALL declare every environment variable that `backend/app/config.py`, `backend/app/database.py`, and `backend/app/utils/security.py` read at runtime, including at least `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `MODEL_PATH`, `CORS_ORIGINS`, `GEMINI_API_KEY`, and `GEMINI_MODEL`.
3. THE Backend_Env_Template SHALL use placeholder values that are not real credentials, and THE `GEMINI_API_KEY` placeholder SHALL NOT begin with `AIza`.
4. THE Backend_Env_Template SHALL use a placeholder for `DATABASE_URL` that references `postgres`-style syntax with a non-secret password token such as `CHANGE_ME`.
5. WHERE a variable has a safe default in code, THE Backend_Env_Template SHALL reproduce that default verbatim as its placeholder value.
6. IF the backend's `leafscan-ai/.env.example` is missing any variable consumed by the Expo app (for example `EXPO_PUBLIC_API_BASE_URL`), THEN THE Repository SHALL update `leafscan-ai/.env.example` so that it covers every variable the mobile app reads.

### Requirement 5: Relocate Or Delete Non-Source Files

**User Story:** As a maintainer, I want the repository to contain only source code, configuration, and essential assets, so that clone size and cognitive load stay low.

#### Acceptance Criteria

1. THE Repository SHALL stop tracking `backend/leafscan.db` and SHALL NOT restore it in the cleanup commit.
2. THE Repository SHALL stop tracking every file under `backend/app/uploads/` and SHALL preserve the directory's existence for the running backend by adding a tracked `backend/app/uploads/.gitkeep` file whose only purpose is to keep the directory present.
3. THE Repository SHALL stop tracking `leafscan-ai/dist/` and all of its contents.
4. THE Repository SHALL stop tracking `backend/app/models/Mau-Bao-cao-Hoc-phan.pdf` and `backend/app/models/gemini.docx`.
5. THE Repository SHALL move `backend/app/models/Mau-Bao-cao-Hoc-phan.pdf` and `backend/app/models/gemini.docx` to a `docs/` directory at the repository root before the cleanup commit is finalized, and SHALL NOT leave copies under `backend/app/models/`. The owner MAY subsequently delete the moved files manually if they are not wanted.
6. IF moving a file under AC5 fails (for example due to filesystem permissions or a pre-existing destination), THEN THE Repository SHALL proceed by removing the file from `backend/app/models/` so that cleanup still completes, and SHALL log the failed move for the owner to reconcile manually.
7. THE Repository SHALL stop tracking `lenh.md` and `.codex` at the repository root.
8. IF any of `leafscan.db`, `Mau-Bao-cao-Hoc-phan.pdf`, `gemini.docx`, `lenh.md`, or `.codex` is imported or referenced by application code or scripts, THEN THE Repository SHALL have those references removed or redirected to the new location in the same commit that removes the files from tracking.
9. THE Repository SHALL NOT remove files matching `backend/app/models/*.onnx`, `backend/app/models/*.pth`, `backend/app/models/class_names.json`, `backend/app/models/domain.py`, `backend/app/models/schemas.py`, `backend/app/models/__init__.py`, or `backend/app/data/disease_db.json`.

### Requirement 6: Provide An Uploads Cleanup CLI

**User Story:** As an operator, I want a reproducible CLI that deletes stale diagnosis images from `backend/app/uploads/` under strict safety rules, so that disk use stays bounded without risking loss of images still referenced by the application.

#### Acceptance Criteria

1. THE Repository SHALL contain a tracked Python CLI at `backend/scripts/cleanup_uploads.py`, invocable as `python -m scripts.cleanup_uploads` from the `backend/` directory.
2. THE Uploads_Cleanup_CLI SHALL accept a `--dry-run` flag, and WHEN `--dry-run` is supplied, THE Uploads_Cleanup_CLI SHALL NOT delete any file and SHALL print every candidate file it would delete.
3. THE Uploads_Cleanup_CLI SHALL accept an `--older-than-days` integer option, default value `30`, and SHALL treat only files whose modification time is older than the Age_Threshold as deletion candidates.
4. THE Uploads_Cleanup_CLI SHALL accept a `--freshness-window-minutes` integer option, default value `15`, and SHALL exclude from deletion any file whose modification time or creation time is within the Freshness_Window measured from the current wall-clock time.
5. THE Uploads_Cleanup_CLI SHALL open a read-only SQLAlchemy session against the database configured by `DATABASE_URL` and SHALL exclude from deletion any file whose basename appears in the `image_url` column of the Scan_History_Table.
6. THE Uploads_Cleanup_CLI SHALL NOT issue any `INSERT`, `UPDATE`, or `DELETE` statement against the database, and SHALL NOT mutate the Scan_History_Table in any way.
7. WHEN the Uploads_Cleanup_CLI completes, THE Uploads_Cleanup_CLI SHALL emit a structured summary to standard output that reports, at minimum: total files scanned, files retained due to Freshness_Window, files retained due to database references, files retained due to Age_Threshold, files deleted, and bytes reclaimed.
8. WHEN the Uploads_Cleanup_CLI starts, THE Uploads_Cleanup_CLI SHALL log its resolved configuration values (paths, thresholds, dry-run state) to standard output before scanning any file.
9. IF a candidate file cannot be deleted because the operating system raises a permission or I/O error, THEN THE Uploads_Cleanup_CLI SHALL log the file path and error message and SHALL continue processing remaining files.
10. IF `DATABASE_URL` is unset or the database is unreachable, THEN THE Uploads_Cleanup_CLI SHALL exit with a non-zero exit code and SHALL NOT delete any file, even when `--dry-run` is not supplied.
11. WHERE the Uploads_Directory does not exist at invocation time, THE Uploads_Cleanup_CLI SHALL exit with exit code `0` after logging a message that no cleanup work was required.
12. THE Uploads_Cleanup_CLI SHALL be safe to invoke while the FastAPI backend is running against the same Uploads_Directory, by virtue of the Freshness_Window and database-reference filters defined above.

### Requirement 7: Commit A Secret Scan Step

**User Story:** As a maintainer, I want a committed, grep-based scan that flags obvious secret patterns in tracked files, so that a regression shows up immediately without requiring extra tooling.

#### Acceptance Criteria

1. THE Repository SHALL contain a tracked shell script at `scripts/scan_secrets.sh` that is executable.
2. WHEN the Secret_Scanner runs against the current working tree, THE Secret_Scanner SHALL search tracked files (as reported by `git ls-files`) for patterns that match, at minimum: values beginning with `AIza` (Google API keys), strings matching `postgres(ql)?://[^ ]*:[^@ ]+@` with a non-placeholder password, and literal occurrences of any previously exposed Leaked_Secrets values.
3. IF the Secret_Scanner finds any match, THEN THE Secret_Scanner SHALL print the matching file and line and SHALL exit with a non-zero exit code.
4. WHEN the Secret_Scanner runs against the post-cleanup working tree, THE Secret_Scanner SHALL exit with exit code `0`.
5. THE Secret_Scanner SHALL exclude its own source file from scanning to avoid matching its own pattern definitions.
6. THE Secret_Scanner SHALL be documented in Backend_Documentation with the exact invocation command.

### Requirement 8: Update Backend And Project Documentation

**User Story:** As a new developer, I want the backend README to reflect the actual code layout and the new local setup, so that I can run the backend from a clean clone without tripping over stale instructions.

#### Acceptance Criteria

1. THE Backend_Documentation SHALL describe the current folder layout of `backend/app/`, including the `routers/`, `schemas/`, `services/`, `dependencies/`, `models/`, and `data/` directories, and SHALL list every router file currently present under `backend/app/routers/`.
2. THE Backend_Documentation SHALL NOT claim that Pydantic schemas live under `backend/app/models/schemas.py` as the primary location; it SHALL document that request/response schemas live under `backend/app/schemas/`.
3. THE Backend_Documentation SHALL document the local setup flow using `backend/.env.example`, including the steps to copy it to `backend/.env` and to fill in `DATABASE_URL`, `SECRET_KEY`, and `GEMINI_API_KEY`.
4. THE Backend_Documentation SHALL document how to run the Uploads_Cleanup_CLI, including the `--dry-run`, `--older-than-days`, and `--freshness-window-minutes` options, with at least one example invocation.
5. THE Backend_Documentation SHALL document how to run the Secret_Scanner.
6. WHERE `leafscan-ai/.env.example` is updated under Requirement 4, THE Mobile_Documentation SHALL describe the same copy-and-fill flow for the mobile app.
7. THE Project_Documentation SHALL be updated so that the "Cấu trúc thư mục" and the "Cấu hình & biến môi trường" sections reflect the post-cleanup state, including the new `backend/.env.example`, `backend/scripts/cleanup_uploads.py`, `scripts/scan_secrets.sh`, and the removal of `backend/leafscan.db`, `leafscan-ai/dist/`, `lenh.md`, and `.codex`.
8. THE Project_Documentation update under AC7 MAY occur before, during, or after the cleanup commit, and THE Repository SHALL NOT block the cleanup commit from being finalized on the Project_Documentation update being present in that same commit.

### Requirement 9: Preserve Application Behavior

**User Story:** As the repository owner, I want the cleanup work to leave the running application untouched, so that local development, diagnosis, chat, and scan history continue to work exactly as before.

#### Acceptance Criteria

1. THE Repository SHALL NOT modify any file under `backend/app/routers/`, `backend/app/services/`, `backend/app/schemas/`, `backend/app/dependencies/`, or `backend/app/models/domain.py` as part of the cleanup work, except to remove import references to files deleted under Requirement 5.
2. THE Repository SHALL NOT change the backend's public HTTP API surface, request/response shapes, or database schema.
3. WHEN the backend is started after the cleanup commit with a valid local `backend/.env`, THE backend SHALL start successfully, serve the same endpoints, and write new upload files to `backend/app/uploads/` as before.
4. WHEN the Uploads_Cleanup_CLI is invoked with `--dry-run`, THE Uploads_Directory contents SHALL be byte-for-byte identical before and after the invocation once the command has exited, with the exception of transient temporary files created and removed during the same invocation.

# 🌿 LeafScan AI — Backend API

FastAPI service that detects leaf disease from an image, predicts the disease
stage and 7-day forecast, serves an encyclopedia of curated diseases/tips, and
exposes a RAG+Gemini chat endpoint.

## Folder layout

```
backend/
├── app/
│   ├── main.py                 # FastAPI entrypoint, CORS, request log, uploads mount
│   ├── config.py               # Env-driven thresholds: CORS, AI, leaf validation, plant scope
│   ├── database.py             # SQLAlchemy engine/session, startup schema ensure, seed
│   ├── dependencies/           # Auth (JWT) + in-process rate limit
│   ├── models/                 # SQLAlchemy ORM (domain.py) + legacy Pydantic stub (schemas.py)
│   ├── routers/                # auth / plants / history / diseases / care_tips / home / diagnosis / chat
│   ├── schemas/                # Pydantic request/response schemas (auth, plant, scan, disease, chat, care_tip, home)
│   ├── services/               # model_service, leaf_validator, plant_scope_validator,
│   │                           # treatment_service, stage_service, care_tip_service, rag_service, image_validation, data_preprocessor
│   ├── data/                   # Bundled knowledge base (disease_db.json)
│   ├── uploads/                # Runtime-only; .gitkeep preserves the directory in Git
│   └── utils/                  # security.py (bcrypt + JWT helpers)
├── scripts/                    # Operational CLIs (cleanup_uploads.py, test_* batch runners)
├── database/                   # DB bootstrap helpers (run_seeds.py, seeds/)
├── migrations/                 # Standalone SQL migrations (transitional; Alembic is a future task)
├── tests/                      # pytest suite
├── training/                   # Model training notebook (gitignored)
├── Makefile                    # install / install-dev / run / test / build
├── requirements.txt            # runtime dependencies
├── requirements-dev.txt        # dev-only (pytest, hypothesis)
└── README.md
```

### Legacy schemas note

`backend/app/models/schemas.py` remains in the tree for backwards compatibility,
but **all new Pydantic request/response schemas live under
`backend/app/schemas/`**. Prefer that directory when adding new API contracts.

## Local setup

```bash
cd backend

# 1. Create a virtualenv and install dependencies
python -m venv .venv
source .venv/bin/activate        # on Windows: .venv\Scripts\activate
make install
make install-dev                 # adds pytest + hypothesis

# 2. Copy the env template and fill in the marked secrets
cp .env.example .env
# Edit backend/.env — the following are REQUIRED:
#   SECRET_KEY            → a long random string (e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"`)
#   DATABASE_URL          → your local Postgres connection string
#   GEMINI_API_KEY        → a Google AI Studio key (https://aistudio.google.com/apikey)
#   GEMINI_MODEL          → e.g. gemini-2.5-flash
#
# Optional but recommended:
#   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME
#       → Used by /auth/forgot-password to send OTP emails. For Gmail, enable
#         2FA and create an App Password at https://myaccount.google.com/apppasswords.
#         Without SMTP, the OTP is logged to stdout (dev mode).
#   GOOGLE_CLIENT_ID
#       → Used by /auth/google/* to verify Google ID tokens for "Login with Google"
#         and account linking. Create at https://console.cloud.google.com/apis/credentials
#         (select Web application). Leave empty to disable the Google OAuth routes.

# 3. Run the dev server
make run                         # equivalent to: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open Swagger UI at http://localhost:8000/docs.

For local demo data, run:

```bash
python database/run_seeds.py
```

The demo accounts created by seeds are:

| Role | Login | Password | Email |
| ---- | ----- | -------- | ----- |
| Admin | `admin` | `admin123` | `admin@example.com` |
| Partner | `doitac` | `doitac123` | `doitac@example.com` |

Admin endpoints still require `ADMIN_EMAILS` to include `admin@example.com`.

> **Note — secret file discipline.** `backend/.env` is gitignored. Never commit
> it. If you rotate a key or DB password, update `backend/.env` locally and
> do **not** touch `.env.example`.

## Cloud deploy

### Render

The backend already includes [`render.yaml`](./render.yaml). Create a Render
Blueprint from this repository and use `backend/render.yaml` as the Blueprint
file path. Render will create the web service and Postgres database, then
redeploy automatically when you push to the linked branch.

Set the following secret values in the Render dashboard before using production
flows:

- `PUBLIC_BASE_URL` = your Render backend URL, for example
  `https://leafscan-backend.onrender.com`
- `GEMINI_API_KEY`
- `SMTP_USER`, `SMTP_PASSWORD`
- `GOOGLE_CLIENT_ID`
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`
- `VNPAY_IPN_URL` = `${PUBLIC_BASE_URL}/api/v1/vnpay/ipn`

VNPAY must receive a public IPN URL. Do not use a LAN URL such as
`http://192.168.x.x:8000` for deployed payment callbacks.
The app has separate return URLs for user subscriptions and partner plans, but
both payment flows can share the public IPN URL above.

### Railway

Railway can also deploy this backend from GitHub. Configure the service with:

- Root directory: `backend`
- Dockerfile: `Dockerfile`
- Postgres plugin/database attached to the service
- The same environment variables listed above

After deploy, point the mobile app to the cloud backend by setting
`EXPO_PUBLIC_API_BASE_URL` in `leafscan-ai/.env` to the deployed backend URL,
then restart Expo.

## API endpoints

| Method | Endpoint                              | Purpose                                                  |
| ------ | ------------------------------------- | -------------------------------------------------------- |
| GET    | `/`                                   | API home                                                 |
| GET    | `/api/v1/health`                      | Health check                                             |
| POST   | `/api/v1/auth/register`               | Sign up                                                  |
| POST   | `/api/v1/auth/login`                  | Login, returns JWT                                       |
| GET    | `/api/v1/auth/me`                     | Current user profile                                     |
| GET    | `/api/v1/users/me`                    | Current user profile for mobile profile flows            |
| PUT    | `/api/v1/users/me`                    | Update current user's name, email, phone and avatar      |
| POST   | `/api/v1/auth/change-password`        | Change password (requires current password + JWT)        |
| POST   | `/api/v1/auth/forgot-password`        | Request OTP via email                                    |
| POST   | `/api/v1/auth/reset-password`         | Verify OTP + set new password                            |
| DELETE | `/api/v1/auth/account`                | Permanently delete account (requires password + JWT)     |
| POST   | `/api/v1/auth/google/login`           | Login with Google ID token (creates or links account)    |
| POST   | `/api/v1/auth/google/link`            | Link Google to current account (JWT)                     |
| POST   | `/api/v1/auth/google/unlink`          | Unlink Google from current account (JWT)                 |
| *      | `/api/v1/plants/*`                    | Garden CRUD                                              |
| GET    | `/api/v1/history`                     | User's scan history                                      |
| GET    | `/api/v1/history/plant/{plant_id}`    | History for a specific plant                             |
| GET    | `/api/v1/diseases`                    | Disease encyclopedia (search / filter)                   |
| GET    | `/api/v1/diseases/{disease_key}`      | Disease detail                                           |
| *      | `/api/v1/care-tips/*`                 | Care tips library                                        |
| GET    | `/api/v1/home`                        | Aggregated home feed                                     |
| POST   | `/api/v1/diagnose`                    | AI diagnosis from image + stage/forecast                 |
| POST   | `/api/v1/chat`                        | RAG+Gemini chat (non-stream)                             |
| POST   | `/api/v1/chat/stream`                 | RAG+Gemini chat (SSE stream)                             |
| *      | `/api/v1/admin/care-tips/*`           | Admin-only care tip management                           |

## Uploads cleanup CLI

`backend/scripts/cleanup_uploads.py` removes stale diagnosis images from
`backend/app/uploads/` under strict safety rules. It is **read-only against
the database** (only one `SELECT DISTINCT image_url FROM scan_history` is
emitted) and retains files that are recently modified, inside the freshness
window, or referenced by `scan_history.image_url`.

Always run with `--dry-run` first:

```bash
cd backend
python -m scripts.cleanup_uploads \
    --dry-run \
    --older-than-days 30 \
    --freshness-window-minutes 15
```

The final line on stdout is a single JSON object summarizing the scan.

Flags:

| Flag                          | Default | Effect                                                      |
| ----------------------------- | ------- | ----------------------------------------------------------- |
| `--dry-run`                   | off     | Print candidates, do not delete                             |
| `--older-than-days`           | 30      | Retain files newer than N days                              |
| `--freshness-window-minutes`  | 15      | Retain files whose mtime OR ctime is within the window      |
| `--uploads-dir`               | auto    | Override the target directory (defaults to `app.config.UPLOAD_DIR`) |
| `--verbose`                   | off     | Log one line per deletion                                   |

Exit codes: `0` happy path (including missing uploads dir), `2` DB unreachable
or `DATABASE_URL` unset, `4` unexpected fatal error.

## Secret scanner

`scripts/scan_secrets.sh` (at the repo root) is a grep-based scanner that
flags committed Google API keys and Postgres URLs carrying a real password.
Run it before every push:

```bash
bash scripts/scan_secrets.sh
```

Exit `0` means clean. Exit `1` means at least one match was found — the
file:line:content triples are printed on stdout, grouped by file. Allowlist
extra literal strings by adding them one-per-line to
`scripts/scan_secrets.allow`.

## Verification smoke

Run both tools against a clean working tree; both must exit `0`:

```bash
bash scripts/scan_secrets.sh && \
  python -m scripts.cleanup_uploads --dry-run
```

## Running the tests

```bash
cd backend
source .venv/bin/activate
make install-dev                 # once, to install pytest + hypothesis
pytest tests/
```

The property-based tests use Hypothesis with `@settings(max_examples=100)`
and exercise dry-run preservation, retention rules, read-only DB usage, and
the secret scanner's iff-present property.

## Backup before destructive actions

The audit-cleanup work and the manual history rewrite described in
[`../docs/history-rewrite.md`](../docs/history-rewrite.md) destroy local
state or rewrite Git history. Before any destructive action, back up:

```bash
cp backend/leafscan.db ~/leafscan-backup.db 2>/dev/null || true
tar -czf ~/uploads-backup.tar.gz -C backend/app uploads
git bundle create ~/leafscan-backup.bundle --all
```

Read `docs/history-rewrite.md` end-to-end before attempting any
`git filter-repo` or BFG run. That procedure is **manual**; no automation in
this repo executes a force-push or rewrites history.

## Model scope (PlantVillage 38-class)

- The ONNX model at `app/models/efficientnetv2s_plantvillage.onnx` is gitignored
  (too heavy for Git). Download or train it separately and set `MODEL_PATH` in
  `.env` to override the default resolved path.
- Supported classes are listed in `app/models/class_names.json`.
- If a `diseases.model_class_name` column does not map to a class in that
  file, diagnosis for that record falls back to the treatment service's
  heuristic.

## Tích hợp model AI thật (ONNX/TFLite)

Đặt biến môi trường `MODEL_PATH` trỏ tới file `.onnx` hoặc `.tflite`.
Backend tự load model để suy luận. Nếu chưa có file model, hệ thống dùng
fallback heuristic deterministic để luồng MVP vẫn chạy end-to-end.

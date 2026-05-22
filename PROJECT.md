# PROJECT.md

## 1. Tổng quan dự án

- **Tên dự án:** LeafScan AI (Leaf_AI)
- **Mục đích:** Ứng dụng nhận diện bệnh trên lá cây bằng AI trên điện thoại.
  Người dùng quét ảnh lá → app chẩn đoán bệnh + giai đoạn + phác đồ điều trị +
  tư vấn chat qua Gemini.
- **Stack:**
  - **Backend:** Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, ONNX Runtime
  - **Mobile:** TypeScript, React Native, Expo SDK 54
  - **AI:** EfficientNetV2-S finetune trên PlantVillage (38 class), RAG trên
    disease_db.json + Gemini 2.5 Flash
- **Kiến trúc:** Client–server monorepo, hai ứng dụng độc lập giao tiếp qua REST API.

## 2. Cấu trúc thư mục

```
DO_AN_VMB/
├── backend/
│   ├── app/
│   │   ├── main.py                    # Khởi tạo FastAPI, CORS, middleware, mount uploads
│   │   ├── config.py                  # Cấu hình AI, leaf validation, plant scope, stage
│   │   ├── database.py                # Engine, init DB, auto-migrate, seed từ JSON
│   │   ├── dependencies/
│   │   │   ├── auth.py                # JWT guard
│   │   │   └── rate_limit.py          # Token bucket rate limit
│   │   ├── models/
│   │   │   ├── domain.py              # SQLAlchemy models (User, Plant, Disease, ScanHistory, PasswordResetOTP, CareTip)
│   │   │   └── schemas.py             # Legacy Pydantic (backwards-compat)
│   │   ├── routers/
│   │   │   ├── auth.py                # Register/login/me + change/forgot/reset password + delete + Google OAuth
│   │   │   ├── plants.py              # CRUD vườn cây
│   │   │   ├── diagnosis.py           # POST /diagnose, gating + inference + stage forecast
│   │   │   ├── history.py             # Lịch sử quét
│   │   │   ├── chat.py                # Chat tư vấn bệnh cây (non-stream + SSE stream)
│   │   │   ├── diseases.py            # Tìm kiếm + chi tiết bệnh
│   │   │   ├── care_tips.py           # Mẹo chăm sóc hàng ngày
│   │   │   └── home.py                # Dashboard trang chủ
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── model_service.py       # ONNX inference + TTA flip + center-crop
│   │   │   ├── image_validation.py    # Gating: green_ratio, brightness, blur, component
│   │   │   ├── plant_scope_validator.py  # OOD guard top-1/margin/top-5
│   │   │   ├── stage_service.py       # Rule-based stage + 7-day forecast
│   │   │   ├── treatment_service.py   # Tra cứu phác đồ theo stage
│   │   │   ├── rag_service.py         # RAG: chunking + hashing/Gemini embedding + cosine
│   │   │   ├── care_tip_service.py    # Chọn mẹo chăm sóc theo ngày
│   │   │   ├── email_service.py       # Gửi OTP qua SMTP (template Leaf_AI HTML)
│   │   │   └── data_preprocessor.py   # Image resize/normalize helpers
│   │   ├── utils/
│   │   │   └── security.py            # Password hash (SHA-256 + bcrypt), JWT
│   │   ├── data/
│   │   │   ├── disease_db.json        # Knowledge base 38 bệnh (RAG + seed DB)
│   │   │   └── embedding_cache.json   # Cache vector (git-ignored)
│   │   ├── models/                    # ONNX + PyTorch checkpoint (git-ignored)
│   │   │   ├── efficientnetv2s_plantvillage.onnx
│   │   │   ├── best_model.pth
│   │   │   └── class_names.json
│   │   └── uploads/                   # Ảnh scan upload runtime (git-ignored, chỉ .gitkeep)
│   ├── scripts/
│   │   ├── cleanup_uploads.py         # CLI dọn ảnh cũ theo mtime + DB reference
│   │   ├── update_disease_images.py   # Cập nhật URL ảnh bệnh từ PlantVillage GitHub
│   │   └── test_*.py                  # Evaluation scripts (manual)
│   ├── database/
│   │   ├── seeds/                     # SQL seed care_tips
│   │   └── run_seeds.py               # Runner apply migrations + seeds
│   ├── migrations/                    # SQL migrations thủ công (care_tips)
│   ├── test_images/                   # 4 fixture test gating (non_leaf, laptop, screen, soil)
│   ├── training/
│   │   └── train_plantvillage.ipynb   # Notebook train model (git-ignored, nặng)
│   ├── .env.example                   # Template env backend
│   ├── requirements.txt               # Production deps
│   ├── requirements-dev.txt           # pytest + hypothesis
│   ├── Makefile                       # install/install-dev/build
│   └── README.md
├── leafscan-ai/
│   ├── App.tsx
│   ├── app.json                       # Scheme "leafscan", plugins, permissions
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts              # fetch wrapper + timeout
│   │   │   ├── config.ts              # Infer base URL từ EXPO_PUBLIC_API_BASE_URL
│   │   │   ├── auth.ts                # Login/register/me
│   │   │   ├── account.ts             # Change/forgot/reset password + delete account
│   │   │   ├── google-auth.ts         # Google OAuth hook + link/unlink
│   │   │   ├── chat.ts                # Chat non-stream
│   │   │   ├── diagnosis.ts           # POST /diagnose + parse lỗi
│   │   │   ├── plants.ts / users.ts / history.ts / diseases.ts / home.ts / mappers.ts
│   │   ├── components/
│   │   │   ├── profile/               # SettingsSection, AccountSecurity, AppInfo, DeleteAccountModal
│   │   │   ├── scan/ garden/ home/ history/ edit-profile/ add-plant/
│   │   ├── navigation/                # Stack + BottomTabs
│   │   ├── screens/                   # Onboarding → Login → Main + modals
│   │   ├── stores/                    # Zustand: auth, history, plants, settings
│   │   ├── theme/                     # theme.ts (colors, shadows)
│   │   ├── types/home.ts + types.ts
│   │   └── utils/plantKey.ts          # Canonical plant key + label
│   ├── .env.example
│   └── README.md
├── docs/
│   └── history-rewrite.md             # Hướng dẫn rewrite Git history (manual)
├── scripts/
│   ├── scan_secrets.sh                # Scanner grep-based (pre-commit manual)
│   └── scan_secrets.allow             # Allowlist cho false positive
├── .kiro/specs/repo-cleanup-and-secrets-hardening/
│   ├── requirements.md + design.md + tasks.md
├── PROJECT.md
└── .gitignore
```

## 3. Tính năng đã hoàn thiện ✅

### 3.1 Authentication & Account
- Đăng ký / đăng nhập bằng email-password (JWT)
- **Đổi mật khẩu** khi đang đăng nhập (yêu cầu mật khẩu cũ)
- **Quên mật khẩu** với OTP 6 chữ số gửi qua email (SMTP, template HTML Leaf_AI)
- **Đặt lại mật khẩu** bằng OTP (hết hạn 10 phút, hash bằng bcrypt)
- **Xóa tài khoản** vĩnh viễn (yêu cầu xác nhận mật khẩu, cascade xoá plants + scans)
- **Liên kết/Hủy liên kết Google OAuth** (verify Google ID token bằng `google-auth`)
- **Đăng nhập bằng Google** (tạo account mới nếu chưa có)
- Rate limit trên tất cả endpoint auth (register/login/OTP/reset/delete)

### 3.2 Diagnosis pipeline
- **Upload ảnh** (validate MIME, size ≤ 10 MB, extensions jpg/png/webp)
- **Gating trước inference** (`image_validation.py`):
  - Green ratio, center green ratio
  - Brightness (mean V + percentile 10 + dark pixel ratio)
  - Blur score (Laplacian variance)
  - Largest green component + green density
- **ONNX inference** EfficientNetV2-S + **TTA horizontal flip** (+1–3% accuracy)
- **Center-crop** 224×224 giữ aspect ratio
- **Plant-scope OOD guard** (`plant_scope_validator.py`):
  - Top-1 confidence threshold
  - Top-1/Top-2 margin
  - Top-5 consistency (≥ N class cùng plant với top-1)
- **Stage rule-based + forecast 7 ngày**
- **Treatment plan theo stage** (early/middle/late)
- **Lưu scan history** vào PostgreSQL + mount ảnh qua `/uploads/{name}`

### 3.3 Chatbot RAG + Gemini
- **RAG trên disease_db.json** (38 bệnh, ~200 chunks)
- Chunking theo section: overview, symptoms, treatment, stage_early/middle/late, prevention, general_care
- Hashing embedding 512 chiều (cosine similarity) + infrastructure Gemini `text-embedding-004` sẵn sàng
- Boost +0.18 khi chunk cùng `disease_key` đã chẩn đoán
- **Guardrail khi confidence < 70%**: switch system prompt sang chế độ "tư vấn chung, không khẳng định bệnh"
- **Citations** (`[1]..[n]`) trong reply
- **Streaming SSE** qua `/api/v1/chat/stream`
- Rate limit 20 RPM/user (non-stream), 12 RPM/user (stream)

### 3.4 Mobile UI/UX
- **Onboarding → Login/Register/Forgot password**
- **Bottom tabs**: Home, Garden, Scan, History, Profile
- **ScanScreen**:
  - Camera live preview với frame overlay động (aligning/optimal/out_of_frame)
  - Picker gallery
  - Camera quality map từ `scanQuality` setting (normal/high/ultra)
  - **Auto-save ảnh vào gallery** nếu `autoSaveScanImages` bật
  - Plant scope selector (từ garden + full PlantVillage list)
- **ResultScreen**: stage, forecast, treatment plan, chat button
- **ChatScreen**: tin nhắn + citations
- **ProfileScreen**:
  - Stats grid (ngày hoạt động, tỷ lệ cây khỏe, bệnh thường gặp...)
  - Achievement card (cấp độ theo số scan)
  - **Settings** (thông báo, auto-save, ngôn ngữ, quyền camera, scan quality, clear cache)
  - **Account Security** (đổi mật khẩu, Google link/unlink, xóa tài khoản)
  - **App Info** (trợ giúp = mailto, privacy, terms, version)
  - **Modal xóa tài khoản** cross-platform (iOS + Android)
- **ChangePasswordScreen**: validate + loading state
- **ForgotPasswordScreen**: 2 bước (email → OTP 6 số + mật khẩu mới) + resend
- **PrivacyPolicyScreen + TermsOfUseScreen**: in-app, thay link chết
- **GardenScreen**: CRUD plant + filter
- **HistoryScreen**: grouping theo ngày + filter + search
- **DiseaseDetailScreen**: từ real API (không mock)
- **SearchScreen**: debounce + API thật
- **EditProfileScreen**: update name/phone/avatar
- Xóa cache thật (xóa `FileSystem.cacheDirectory`)

### 3.5 DevOps / Hardening
- Root `.gitignore` tập trung, ignore `.env`, SQLite, uploads, dist, models, checkpoints
- Secret scanner (`scripts/scan_secrets.sh`): AIza, Postgres URL với password thật
- History rewrite doc (`docs/history-rewrite.md`): quy trình thủ công chạy `git filter-repo`
- Uploads cleanup CLI (`scripts/cleanup_uploads.py`): dry-run, age threshold, DB reference, freshness window
- Update disease images script (`scripts/update_disease_images.py`): lấy URL ảnh từ PlantVillage GitHub
- Auto-migrate column mới khi backend khởi động (không cần Alembic thủ công)
- Seed `diseases` + `care_tips` từ JSON/SQL khi init DB

## 4. Tính năng đang dang dở / còn placeholder ⚠️

| Việc | Trạng thái | File |
|---|---|---|
| Push notifications | Chưa có | Cần Expo Notifications + server scheduler |
| Dark mode | Toggle lưu local, theme không reactive | `stores/settingsStore.ts`, `theme/theme.ts` |
| i18n (vi/en) | Toggle local, text hardcode tiếng Việt | Cần `react-i18next` |
| Chat streaming UI | Backend có SSE, mobile dùng non-stream | `screens/ChatScreen.tsx` |
| Deploy backend | Chỉ chạy localhost | Cần Render/Railway/Fly.io |

## 5. Còn thiếu / chưa có ❌

- **Tests tự động** — chưa có `backend/tests/`, chỉ có evaluation scripts manual
- **CI/CD** — không có `.github/workflows/`
- **Docker** — chưa có Dockerfile
- **Refresh token** — JWT 24h cố định, không renew
- **Admin dashboard** — không có trang quản trị xem thống kê
- **Offline mode** — mobile phụ thuộc API hoàn toàn (ngoài AsyncStorage auth/settings)
- **Finetune model ngoài PlantVillage** — accuracy trên ảnh thực địa chưa tối ưu

## 6. Cấu hình & biến môi trường

### 6.1 File cấu hình quan trọng

- `backend/.env` — biến môi trường backend thực
- `backend/app/config.py` — threshold AI, leaf validation, plant scope, stage
- `backend/app/database.py` — engine + auto-migrate + seed
- `backend/app/utils/security.py` — JWT + bcrypt
- `leafscan-ai/.env` — biến env cho Expo app
- `leafscan-ai/app.json` — scheme `leafscan://`, permissions camera/media

### 6.2 Biến môi trường

#### Backend
```bash
# Auth & DB
SECRET_KEY=<random long string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=postgresql://user:pass@host:port/db

# AI model
MODEL_PATH=/path/to/efficientnetv2s_plantvillage.onnx
MIN_DIAGNOSIS_CONFIDENCE=70.0
MIN_HEALTHY_CLASS_CONFIDENCE=80.0
MIN_TOP1_MARGIN=8.0

# Leaf validation (8 thresholds)
LEAF_MIN_GREEN_RATIO=0.05
LEAF_MIN_CENTER_GREEN_RATIO=0.04
LEAF_MIN_BRIGHTNESS=55.0
# ... (xem backend/.env.example)

# Plant scope
PLANT_SCOPE_MIN_TOP1_CONFIDENCE=0.75
PLANT_SCOPE_MIN_MARGIN=0.20
PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT=2

# CORS
CORS_ORIGINS=*

# Gemini (chat + embedding)
GEMINI_API_KEY=<AIza...>
GEMINI_MODEL=gemini-2.5-flash

# SMTP (forgot password email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASSWORD=<gmail-app-password>
SMTP_FROM_NAME=Leaf_AI

# Google OAuth
GOOGLE_CLIENT_ID=<xxx.apps.googleusercontent.com>
```

#### Mobile
```bash
EXPO_PUBLIC_API_BASE_URL=auto  # hoặc http://<LAN_IP>:8000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<xxx.apps.googleusercontent.com>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=  # khi build APK
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=      # khi build IPA
```

### 6.3 Schema CSDL chính

- **users**: id, email, name, password_hash, phone, avatar, **google_id**, created_at
- **plants**: id, user_id, name, latin_name, category, image_url, thumbnail_url, location, notes, health_score, created_at
- **diseases**: id, disease_key, model_class_name, name, severity, description, symptoms[], treatment[], prevention[], affected_area_typical, image_url
- **scan_history**: id, user_id, plant_id, disease_key, image_url, confidence, predicted_stage, forecast_stage_7d, affected_area_snapshot, scan_date
- **care_tips**: id, slug, title, summary, content, category, suitable_plants[], priority, is_active, source_name/url/note, start_date/end_date
- **password_reset_otps**: id, email, otp_hash, expires_at, used, created_at

## 7. Cách chạy dự án

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# (optional) pip install -r requirements-dev.txt

cp .env.example .env
# Sửa: DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, SMTP_*, GOOGLE_CLIENT_ID

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile
```bash
cd leafscan-ai
npm install
cp .env.example .env
./node_modules/.bin/expo start --host lan --clear
# Sửa EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

npx expo start --host lan  # LAN mode, quét QR bằng Expo Go
# hoặc --tunnel nếu wifi có vấn đề
```

### Secret scanner
```bash
bash scripts/scan_secrets.sh  # exit 0 = sạch, exit 1 = có leak
```

### Dọn ảnh cũ
```bash
cd backend
python -m scripts.cleanup_uploads --dry-run --older-than-days 30 --freshness-window-minutes 15
# Bỏ --dry-run để thực sự xóa
```

### Cập nhật URL ảnh bệnh từ PlantVillage
```bash
cd backend
python -m scripts.update_disease_images
# Tùy chọn: set GITHUB_TOKEN trong .env để tăng rate limit 60 → 5000/giờ
```

## 8. Điểm cần cải thiện

1. **Tests tự động** — viết `backend/tests/` với pytest (auth, diagnosis, RAG)
2. **Finetune model** trên PlantDoc để tăng accuracy ngoài lab
3. **Calibration** (temperature scaling) để confidence % có ý nghĩa
4. **Deploy backend** lên cloud với Docker
5. **Push notifications** nhắc tưới cây / cảnh báo bệnh
6. **Chat streaming UI** để typing animation mượt hơn
7. **Dark mode + i18n** cho app production-ready
8. **Refresh token + session management** cho bảo mật cao hơn

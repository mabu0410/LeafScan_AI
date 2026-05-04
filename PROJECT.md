# PROJECT.md

## 1. Tổng quan dự án
- **Tên dự án:** LeafScan AI
- **Mục đích chính:** Nhận diện bệnh trên lá cây bằng AI, trả về kết quả chẩn đoán, giai đoạn bệnh, phác đồ điều trị và hỗ trợ tư vấn chăm sóc cây.
- **Ngôn ngữ & framework chính:**
  - **Backend:** Python + FastAPI + SQLAlchemy + Pydantic
  - **Mobile app:** TypeScript + React Native + Expo
- **Kiến trúc tổng thể:**
  - Dạng **client-server monorepo** với 2 ứng dụng độc lập:
    - `backend/`: API FastAPI dạng **modular monolith**
    - `leafscan-ai/`: Ứng dụng mobile Expo/React Native dạng **SPA trên mobile**
  - Backend cung cấp API auth, quản lý cây trồng, lịch sử quét, chẩn đoán AI và chat tư vấn.
  - Mobile app tiêu thụ API backend, lưu state cục bộ bằng Zustand + AsyncStorage.

## 2. Cấu trúc thư mục
```text
DO_AN_VMB/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Khởi tạo FastAPI app, CORS, middleware, mount uploads
│   │   ├── config.py                # Cấu hình AI, CORS, upload, stage threshold
│   │   ├── database.py             # SQLAlchemy engine/session, init DB, seed disease data
│   │   ├── dependencies/           # Auth + rate limit dependencies
│   │   ├── models/                 # ORM models + schema dùng chung
│   │   ├── routers/                # API routes: auth, plants, history, diagnosis, chat
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # AI model, stage, treatment, RAG, preprocessing
│   │   ├── data/                   # disease_db.json (knowledge base)
│   │   └── utils/                  # Security helpers: password hash, JWT
│   ├── requirements.txt            # Dependencies Python
│   ├── README.md                   # Hướng dẫn chạy backend
│   └── test_api.http               # File test API bằng REST Client
├── leafscan-ai/
│   ├── App.tsx                     # Entry Expo
│   ├── app.json                    # Cấu hình Expo app
│   ├── package.json                # Dependencies / scripts frontend
│   ├── src/
│   │   ├── api/                    # Gọi backend API, mapping dữ liệu
│   │   ├── components/             # UI component tái sử dụng
│   │   ├── constants/              # Hằng số danh mục cây
│   │   ├── data/                   # Mock data demo
│   │   ├── navigation/             # Stack + Bottom Tab navigation
│   │   ├── screens/                # Màn hình chính của app
│   │   ├── stores/                 # Zustand stores
│   │   ├── theme/                  # Theme / màu sắc / shadow
│   │   └── types.ts                # Kiểu dữ liệu dùng chung
│   ├── assets/                     # Icon, splash, image asset
│   └── README.md                   # Hướng dẫn chạy mobile app
└── .gitignore
```

## 3. Công nghệ & thư viện sử dụng

### 3.1 Dependencies (production)

#### Backend / Python
| Tên | Phiên bản | Mục đích sử dụng |
|-----|-----------|-----------------|
| fastapi | 0.109.0 | Framework API chính |
| uvicorn | 0.27.0 | ASGI server chạy backend |
| python-multipart | 0.0.6 | Nhận file upload ảnh |
| Pillow | 10.2.0 | Đọc/xử lý ảnh đầu vào |
| numpy | 1.26.4 | Tính toán số học cho inference/heuristic |
| onnxruntime | 1.20.1 | Chạy model ONNX |
| sqlalchemy | 2.0.25 | ORM kết nối CSDL |
| alembic | 1.13.1 | Hỗ trợ migration CSDL |
| psycopg2-binary | 2.9.9 | Driver PostgreSQL |
| python-jose[cryptography] | 3.3.0 | Ký/giải mã JWT |
| passlib[bcrypt] | 1.7.4 | Hash mật khẩu |
| python-dotenv | 1.0.1 | Load biến môi trường từ .env |
| pydantic[email] | 2.5.3 | Validate request/response |
| httpx | 0.27.0 | Gọi Gemini API cho chat |

#### Mobile / Expo
| Tên | Phiên bản | Mục đích sử dụng |
|-----|-----------|-----------------|
| expo | ~54.0.0 | Nền tảng app Expo |
| react | 19.1.0 | UI framework |
| react-native | 0.81.5 | Native mobile runtime |
| @expo/vector-icons | ^15.0.3 | Icon set |
| @react-native-async-storage/async-storage | 2.2.0 | Lưu state cục bộ |
| @react-navigation/native | ^6.1.18 | Navigation container |
| @react-navigation/stack | ^6.3.29 | Stack navigation |
| @react-navigation/bottom-tabs | ^6.5.20 | Bottom tabs |
| expo-camera | ~17.0.10 | Chụp ảnh lá cây |
| expo-image-picker | ~17.0.10 | Chọn ảnh từ thư viện |
| expo-haptics | ~15.0.8 | Feedback rung/haptic |
| expo-linear-gradient | ~15.0.8 | Hiệu ứng gradient |
| expo-status-bar | ~3.0.9 | Status bar |
| react-native-gesture-handler | ~2.28.0 | Xử lý gesture |
| react-native-reanimated | ~4.1.1 | Animation |
| react-native-safe-area-context | ~5.6.0 | Safe area |
| react-native-screens | ~4.16.0 | Tối ưu screen navigation |
| react-native-svg | 15.12.1 | SVG/UI vector |
| react-native-worklets | 0.5.1 | Hỗ trợ Reanimated |
| zustand | ^5.0.11 | State management |

### 3.2 DevDependencies (development)

#### Backend / Python
| Tên | Phiên bản | Mục đích sử dụng |
|-----|-----------|-----------------|
| pytest | 8.3.4 | Kiểm thử tự động |

> Lưu ý: backend hiện chưa tách riêng file requirements-dev.txt; pytest đang được khai báo chung trong requirements.txt.

#### Mobile / Expo
| Tên | Phiên bản | Mục đích sử dụng |
|-----|-----------|-----------------|
| @babel/core | ^7.25.0 | Babel cho Expo |
| @types/react | ~19.1.10 | TypeScript type cho React |
| typescript | ~5.9.2 | Type checking / build TS |

## 4. Tính năng đã hoàn thiện ✅
- **Đăng ký / đăng nhập / xem profile bằng JWT**
  - Backend: `backend/app/routers/auth.py`, `backend/app/dependencies/auth.py`, `backend/app/utils/security.py`
  - Mobile: `leafscan-ai/src/api/auth.ts`, `leafscan-ai/src/stores/authStore.ts`, `leafscan-ai/src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`, `ProfileScreen.tsx`
- **Quản lý vườn cây cá nhân (CRUD)**
  - Backend: `backend/app/routers/plants.py`, `backend/app/models/domain.py`
  - Mobile: `leafscan-ai/src/api/plants.ts`, `leafscan-ai/src/stores/plantsStore.ts`, `leafscan-ai/src/screens/MyGardenScreen.tsx`, `AddPlantScreen.tsx`, `EditPlantScreen.tsx`, `PlantDetailScreen.tsx`
- **Quét ảnh lá cây và chẩn đoán bệnh**
  - Backend: `backend/app/routers/diagnosis.py`, `backend/app/services/model_service.py`, `backend/app/services/treatment_service.py`, `backend/app/services/stage_service.py`
  - Mobile: `leafscan-ai/src/screens/ScanScreen.tsx`, `leafscan-ai/src/api/diagnosis.ts`, `leafscan-ai/src/screens/ResultScreen.tsx`
- **Suy luận AI có fallback heuristic khi chưa có model thật**
  - Backend tự load ONNX/TFLite nếu có, nếu không sẽ dùng heuristic deterministic để vẫn chạy end-to-end
- **Phác đồ điều trị theo giai đoạn và dự báo 7 ngày**
  - Backend: `backend/app/services/stage_service.py`, `backend/app/models/domain.py`
  - Mobile: hiển thị trong `ResultScreen.tsx`
- **Lưu lịch sử quét và hiển thị lịch sử trên app**
  - Backend: `backend/app/routers/history.py`, `backend/app/models/domain.py`
  - Mobile: `leafscan-ai/src/api/history.ts`, `leafscan-ai/src/stores/historyStore.ts`, `leafscan-ai/src/screens/HistoryScreen.tsx`
- **Chat tư vấn bệnh cây bằng RAG + Gemini**
  - Backend: `backend/app/routers/chat.py`, `backend/app/services/rag_service.py`
  - Mobile: `leafscan-ai/src/api/chat.ts`, `leafscan-ai/src/screens/ChatScreen.tsx`
- **Seed database bệnh từ JSON và đồng bộ bảng diseases khi khởi động**
  - Backend: `backend/app/database.py`, `backend/app/data/disease_db.json`
- **CORS, request logging, rate limit cơ bản, static serve ảnh upload**
  - Backend: `backend/app/main.py`, `backend/app/dependencies/rate_limit.py`, `backend/app/config.py`
- **Điều hướng ứng dụng đầy đủ trên mobile**
  - Backend route-less, Mobile navigation: `leafscan-ai/src/navigation/AppNavigator.tsx`, `BottomTabNavigator.tsx`
- **UI chính đã có cho onboarding, home, scan, result, garden, history, profile, search, disease detail**
  - Mobile: toàn bộ `leafscan-ai/src/screens/*`

## 5. Tính năng đang dang dở / chưa hoàn thiện ⚠️
> Không thấy comment `TODO`, `FIXME`, `HACK` rõ ràng trong source chính. Các mục dưới đây được suy luận từ logic placeholder hoặc luồng chưa nối đủ.

- **Chọn ảnh từ thư viện trên màn hình quét chưa hoạt động**
  - `leafscan-ai/src/screens/ScanScreen.tsx` có nút gallery nhưng chưa gắn `onPress`.
- **Đèn flash / tuỳ chọn camera trên màn hình quét chưa hoạt động đầy đủ**
  - Nút flash đang là UI placeholder.
- **Chat có hỗ trợ streaming ở backend nhưng chưa được dùng trong UI**
  - Backend có `/api/v1/chat/stream`, mobile vẫn dùng `chatApi()` non-streaming.
- **Màn hình chi tiết bệnh và tìm kiếm còn dùng dữ liệu mock**
  - `leafscan-ai/src/screens/DiseaseDetailScreen.tsx`
  - `leafscan-ai/src/screens/SearchScreen.tsx`
  - Dữ liệu lấy từ `leafscan-ai/src/data/mockData.ts` thay vì backend endpoint riêng.
- **Khôi phục mật khẩu chỉ là flow mô phỏng**
  - `leafscan-ai/src/screens/ForgotPasswordScreen.tsx` chưa gọi API reset/OTP thật.
- **Thống kê và huy hiệu trong Profile là số liệu hard-code**
  - `leafscan-ai/src/screens/ProfileScreen.tsx`
- **Một số filter trên History/Garden chưa được nối hoàn chỉnh**
  - Ví dụ filter “Tuần này”, “Tháng này” chưa có logic thời gian đầy đủ.
- **Không có cleanup ảnh upload tạm sau chẩn đoán**
  - Ảnh được lưu vào `backend/app/uploads/` nhưng chưa thấy job dọn file cũ.

## 6. Tính năng còn thiếu / chưa có ❌
- **Bộ test tự động đầy đủ**
  - Hiện chỉ thấy `backend/test_api.http`; chưa có test unit/integration thực sự cho backend hay test UI cho mobile.
- **CI/CD**
  - Không thấy `.github/workflows/`, pipeline, hoặc script deploy tự động.
- **Docker / docker-compose**
  - Không có `Dockerfile` hay `docker-compose.yml`.
- **Quản lý migration chuẩn bằng Alembic**
  - Có dependency `alembic` nhưng không thấy thư mục migration/config Alembic.
- **API backend cho một số luồng UI**
  - Chưa thấy endpoint riêng cho tìm kiếm bệnh/cây, chi tiết bệnh, reset mật khẩu, upload ảnh từ thư viện.
- **Phân quyền nâng cao / refresh token / xác thực 2 lớp**
  - Hiện mới có JWT access token cơ bản.
- **Đồng bộ dữ liệu off-line / cache đồng bộ**
  - Mobile vẫn phụ thuộc API trực tiếp và AsyncStorage chỉ dùng cho auth/settings.
- **Theo dõi sức khỏe cây dựa trên dữ liệu thật**
  - `health_score` hiện chưa thấy pipeline cập nhật tự động từ lịch sử quét.
- **Quản lý model AI bài bản**
  - Chưa thấy CI cho model artifact, versioning model, hoặc cơ chế download model từ storage.

## 7. Cấu hình & biến môi trường

### 7.1 File cấu hình quan trọng
- `backend/.env` — biến môi trường backend thực tế
- `backend/app/config.py` — cấu hình AI, upload, CORS, URL public
- `backend/app/database.py` — cấu hình DB và seed dữ liệu
- `backend/app/utils/security.py` — JWT secret/algorithm/token expiry
- `leafscan-ai/.env.example` — biến môi trường mẫu cho Expo app
- `leafscan-ai/src/api/config.ts` — dựng base URL cho API
- `leafscan-ai/app.json` — cấu hình Expo, permission camera, package/bundle id

### 7.2 Biến môi trường quan trọng
#### Backend
- `DATABASE_URL` — chuỗi kết nối CSDL
- `SECRET_KEY` — khóa ký JWT
- `ALGORITHM` — thuật toán JWT, mặc định `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` — thời gian sống token
- `MODEL_PATH` — đường dẫn model `.onnx` hoặc `.tflite`
- `API_PUBLIC_BASE_URL` — base URL để tạo link ảnh upload
- `CORS_ORIGINS` — danh sách origin được phép gọi API
- `GEMINI_API_KEY` — khóa Gemini cho chat tư vấn
- `GEMINI_MODEL` — tên model Gemini, mặc định `gemini-2.0-flash`

#### Mobile
- `EXPO_PUBLIC_API_BASE_URL` — URL backend mà app Expo gọi tới

### 7.3 Schema CSDL chính
- **users**
  - Thông tin người dùng, email duy nhất, `password_hash`, `phone`, `avatar`, `created_at`
- **plants**
  - Cây thuộc về user, gồm `name`, `latin_name`, `category`, `image_url`, `thumbnail_url`, `location`, `notes`, `health_score`, `created_at`
- **diseases**
  - Bảng bách khoa bệnh, đồng bộ từ `disease_db.json`, có `disease_key` duy nhất, `name`, `severity`, `description`, `symptoms`, `treatment`, `prevention`, `affected_area_typical`, `image_url`
- **scan_history**
  - Lịch sử quét: `user_id`, `plant_id`, `disease_key`, `image_url`, `confidence`, `predicted_stage`, `forecast_stage_7d`, `affected_area_snapshot`, `scan_date`

## 8. Cách chạy dự án
```bash
# Cài dependencies backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Chạy backend dev
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Cài dependencies mobile
cd ../leafscan-ai
npm install

# Chạy mobile dev
npx expo start

# Build production
cd ../backend
make build

cd ../leafscan-ai
npm run build
# hoặc:
# npm run build:web
# npm run build:android
# npm run build:ios

# Chạy test
cd ../backend
python -m pytest

cd ../leafscan-ai
npm run lint
```

## 9. Điểm cần cải thiện (gợi ý)
1. **Thay mock data bằng API thật** cho `DiseaseDetailScreen`, `SearchScreen` và các màn hình đang hard-code dữ liệu.
2. **Bổ sung test tự động** cho backend (pytest) và mobile app để kiểm tra auth, diagnosis, chat, garden CRUD.
3. **Thêm Docker + CI/CD** để chuẩn hóa môi trường chạy và tự động kiểm tra chất lượng mỗi lần push.
4. **Tách migration DB bằng Alembic** thay vì `create_all` + alter thủ công khi startup.
5. **Hoàn thiện luồng camera/chat**: gắn chọn ảnh từ thư viện, bật flash, và dùng streaming chat để UX mượt hơn.

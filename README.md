# LeafScan AI

LeafScan AI là dự án ứng dụng di động hỗ trợ nhận diện bệnh trên lá cây bằng trí tuệ nhân tạo. Ứng dụng cho phép người dùng chụp ảnh hoặc chọn ảnh lá cây từ thư viện, gửi ảnh lên backend để phân tích, sau đó nhận kết quả chẩn đoán gồm tên bệnh, độ tin cậy, giai đoạn bệnh, dự báo diễn tiến và gợi ý cách chăm sóc hoặc điều trị.

Dự án được xây dựng theo mô hình client-server trong cùng một monorepo. Phần mobile app được phát triển bằng React Native và Expo, tập trung vào trải nghiệm quét bệnh, quản lý vườn cây và theo dõi lịch sử chăm sóc. Phần backend được phát triển bằng FastAPI, chịu trách nhiệm xác thực người dùng, lưu trữ dữ liệu, chạy mô hình AI, xử lý ảnh, cung cấp API và hỗ trợ chatbot tư vấn bệnh cây.

## Mục tiêu dự án

LeafScan AI hướng tới việc xây dựng một hệ thống hỗ trợ người trồng cây phát hiện sớm các vấn đề trên lá cây, đặc biệt là các bệnh phổ biến trong bộ dữ liệu PlantVillage. Thay vì chỉ trả về tên bệnh, hệ thống cố gắng cung cấp thêm ngữ cảnh hữu ích như mức độ nghiêm trọng, phác đồ xử lý, lịch sử theo dõi và khả năng hỏi đáp sau chẩn đoán.

Các mục tiêu chính:

- Hỗ trợ người dùng nhận diện bệnh cây từ ảnh lá bằng mô hình AI.
- Giảm chẩn đoán sai bằng các bước kiểm tra ảnh đầu vào và kiểm tra phạm vi loại cây.
- Cung cấp thông tin bệnh cây theo hướng dễ hiểu: triệu chứng, nguyên nhân, điều trị và phòng ngừa.
- Lưu lịch sử quét để người dùng theo dõi sức khỏe cây theo thời gian.
- Kết hợp chatbot RAG để người dùng có thể hỏi thêm về bệnh, cách chăm sóc và xử lý.
- Xây dựng kiến trúc đủ rõ ràng để có thể mở rộng sang marketplace, subscription, notification hoặc dashboard quản trị.

## Đối tượng sử dụng

- Người trồng cây tại nhà cần kiểm tra nhanh tình trạng lá cây.
- Sinh viên hoặc nhóm nghiên cứu muốn tham khảo một hệ thống AI mobile end-to-end.
- Người làm nông nghiệp quy mô nhỏ cần công cụ hỗ trợ nhận biết bệnh phổ biến.
- Nhà phát triển muốn tham khảo cách kết hợp React Native, FastAPI, PostgreSQL, ONNX Runtime và Gemini trong một sản phẩm thực tế.

## Tính năng chính

### Nhận diện bệnh cây

- Chụp ảnh lá cây trực tiếp bằng camera hoặc chọn ảnh từ thư viện.
- Gửi ảnh tới backend qua API `/api/v1/diagnose`.
- Kiểm tra định dạng, dung lượng và chất lượng ảnh trước khi suy luận.
- Chạy mô hình EfficientNetV2-S dạng ONNX để phân loại bệnh.
- Sử dụng top-1 confidence, margin và top-5 consistency để giảm ép nhãn sai.
- Trả về bệnh dự đoán, độ tin cậy, cây liên quan, mức độ nghiêm trọng và thông tin xử lý.

### Phân tích giai đoạn và điều trị

- Ước lượng giai đoạn bệnh theo rule-based stage service.
- Dự báo diễn tiến trong 7 ngày.
- Gợi ý phác đồ điều trị theo từng giai đoạn: sớm, trung bình hoặc nặng.
- Hiển thị thông tin triệu chứng, vùng lá thường bị ảnh hưởng và cách phòng ngừa.

### Quản lý vườn cây

- Thêm, sửa, xóa cây trong vườn cá nhân.
- Lưu thông tin tên cây, tên khoa học, vị trí, ảnh, ghi chú và điểm sức khỏe.
- Gắn kết quả quét với từng cây để theo dõi lịch sử riêng.
- Hỗ trợ màn hình My Garden, Plant Detail, Add Plant và Edit Plant.

### Lịch sử và dashboard

- Lưu lại lịch sử quét của người dùng.
- Nhóm lịch sử theo ngày, hỗ trợ tìm kiếm và lọc.
- Trang Home tổng hợp dữ liệu thật từ backend: thống kê, cây cần chú ý, mẹo chăm sóc và hoạt động gần đây.
- Hỗ trợ các API phục vụ dashboard như `/api/v1/home`, `/api/v1/history` và `/api/v1/plants`.

### Chat tư vấn bệnh cây

- Chatbot sử dụng dữ liệu bệnh cây trong `backend/app/data/disease_db.json`.
- RAG service chia nhỏ dữ liệu bệnh thành các chunk để truy xuất ngữ cảnh.
- Kết hợp Gemini để sinh câu trả lời có liên quan đến bệnh đã chẩn đoán.
- Có cơ chế giảm mức khẳng định khi confidence chẩn đoán thấp.
- Backend hỗ trợ cả chat thường và SSE streaming qua `/api/v1/chat/stream`.

### Tài khoản và bảo mật

- Đăng ký, đăng nhập bằng email và mật khẩu.
- JWT authentication cho các API cần đăng nhập.
- Đổi mật khẩu khi đang đăng nhập.
- Quên mật khẩu bằng OTP gửi qua email.
- Đăng nhập và liên kết tài khoản Google OAuth.
- Xóa tài khoản cùng dữ liệu liên quan.
- Rate limit cho các endpoint nhạy cảm như login, OTP và chat.

### Marketplace và subscription

- Có module đối tác, cửa hàng, sản phẩm và marketplace.
- Có module subscription/user subscription để mở rộng theo gói dịch vụ.
- Các phần này tạo nền tảng cho mô hình sản phẩm có kênh đối tác hoặc gói nâng cấp.

## Luồng hoạt động tổng quát

```text
Người dùng
  |
  | chụp/chọn ảnh lá cây
  v
Mobile app React Native/Expo
  |
  | POST /api/v1/diagnose
  v
Backend FastAPI
  |
  | validate ảnh -> tiền xử lý -> kiểm tra phạm vi cây -> ONNX inference
  v
Diagnosis service
  |
  | stage forecast + treatment + lưu lịch sử
  v
PostgreSQL + uploads
  |
  | JSON response
  v
Mobile app hiển thị kết quả, lịch sử và gợi ý chăm sóc
```

## Kiến trúc hệ thống

Dự án gồm hai ứng dụng chính:

- `leafscan-ai/`: ứng dụng mobile viết bằng React Native, Expo và TypeScript.
- `backend/`: REST API viết bằng Python, FastAPI, SQLAlchemy và ONNX Runtime.

Backend đóng vai trò trung tâm xử lý nghiệp vụ. Mobile app không chạy mô hình trực tiếp mà gửi ảnh tới backend. Cách này giúp kiểm soát model, threshold, logging, dữ liệu lịch sử và các dịch vụ phụ trợ như chatbot, email, Google OAuth và subscription ở một nơi duy nhất.

```text
leafscan-ai/
  screens/       Giao diện chính: Home, Scan, Result, Garden, History, Profile
  components/    UI component tái sử dụng
  api/           Client gọi REST API backend
  stores/        Zustand store cho auth, settings, plants, history
  navigation/    Stack navigator và bottom tabs
  i18n/          Chuẩn bị đa ngôn ngữ

backend/
  app/main.py        FastAPI entrypoint
  app/routers/       Các nhóm API: auth, plants, diagnosis, chat, home...
  app/services/      AI inference, RAG, treatment, stage, weather, email...
  app/models/        SQLAlchemy domain models và model metadata
  app/schemas/       Pydantic request/response schemas
  app/data/          Knowledge base bệnh cây
  migrations/        SQL migration thủ công
  tests/             Pytest suite
```

## Công nghệ sử dụng

### Mobile

- React Native 0.81
- Expo SDK 54
- TypeScript
- React Navigation
- Zustand
- Expo Camera
- Expo Image Picker
- Expo Media Library
- Expo Auth Session
- React Native Reanimated
- i18next/react-i18next

### Backend

- Python 3.12
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL
- Pydantic
- ONNX Runtime
- Pillow và NumPy cho xử lý ảnh
- Gemini API cho chatbot/RAG
- Pytest và Hypothesis cho kiểm thử

### AI và dữ liệu

- Mô hình chính: EfficientNetV2-S finetune trên PlantVillage.
- Dạng triển khai: ONNX.
- Số lớp mục tiêu: PlantVillage 38 class.
- Knowledge base: `backend/app/data/disease_db.json`.
- Cơ chế hỗ trợ: image validation, plant scope validation, stage service, treatment service và RAG service.

## Cấu trúc thư mục

```text
DO_AN_VMB/
├── backend/
│   ├── app/
│   │   ├── main.py                 # Khởi tạo FastAPI app
│   │   ├── config.py               # Cấu hình env, CORS, threshold AI
│   │   ├── database.py             # Kết nối DB, session, init schema
│   │   ├── routers/                # REST API endpoints
│   │   ├── services/               # Business logic và AI services
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── models/                 # ORM models, class_names, model files
│   │   ├── data/                   # Disease knowledge base
│   │   └── uploads/                # Ảnh upload runtime
│   ├── database/                   # Seeds và script seed DB
│   ├── migrations/                 # SQL migrations
│   ├── scripts/                    # Script test model, cleanup uploads
│   ├── tests/                      # Backend tests
│   ├── .env.example                # Template biến môi trường backend
│   └── README.md                   # Tài liệu riêng cho backend
├── leafscan-ai/
│   ├── App.tsx
│   ├── src/
│   │   ├── api/                    # API client và mapper
│   │   ├── components/             # Component UI
│   │   ├── screens/                # Các màn hình ứng dụng
│   │   ├── stores/                 # Zustand stores
│   │   ├── navigation/             # AppNavigator, BottomTabNavigator
│   │   ├── theme/                  # Theme và provider
│   │   ├── i18n/                   # Locale vi/en
│   │   └── types/                  # TypeScript types
│   ├── .env.example                # Template biến môi trường mobile
│   └── README.md                   # Tài liệu riêng cho mobile app
├── docs/                           # Tài liệu kỹ thuật bổ sung
├── scripts/                        # Script vận hành repo
├── PROJECT.md                      # Ghi chú chi tiết về tiến độ và kiến trúc
├── .gitignore
└── README.md
```

## API nổi bật

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Kiểm tra trạng thái backend |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/v1/auth/login` | Đăng nhập và nhận JWT |
| `GET` | `/api/v1/auth/me` | Lấy thông tin người dùng hiện tại |
| `POST` | `/api/v1/auth/forgot-password` | Gửi OTP quên mật khẩu |
| `POST` | `/api/v1/auth/reset-password` | Đặt lại mật khẩu bằng OTP |
| `GET` | `/api/v1/plants` | Lấy danh sách cây của người dùng |
| `POST` | `/api/v1/plants` | Thêm cây mới |
| `GET` | `/api/v1/history` | Lấy lịch sử quét |
| `GET` | `/api/v1/diseases` | Tra cứu danh sách bệnh |
| `GET` | `/api/v1/home` | Dữ liệu dashboard trang chủ |
| `POST` | `/api/v1/diagnose` | Chẩn đoán bệnh từ ảnh lá |
| `POST` | `/api/v1/chat` | Chat tư vấn bệnh cây |
| `POST` | `/api/v1/chat/stream` | Chat tư vấn dạng SSE stream |

## Cơ sở dữ liệu chính

Các bảng quan trọng:

- `users`: thông tin tài khoản, email, mật khẩu hash, Google ID, hồ sơ người dùng.
- `plants`: danh sách cây cá nhân của từng người dùng.
- `diseases`: thông tin bệnh cây, triệu chứng, điều trị, phòng ngừa và mapping với model class.
- `scan_history`: lịch sử quét, ảnh, confidence, stage, forecast và bệnh liên quan.
- `care_tips`: mẹo chăm sóc cây hiển thị ở dashboard.
- `password_reset_otps`: OTP đặt lại mật khẩu.
- `partners`, `partner_products`: dữ liệu marketplace/đối tác.
- `subscription_plans`, `user_subscriptions`: gói dịch vụ và trạng thái đăng ký.

## Cài đặt backend

Yêu cầu:

- Python 3.12
- PostgreSQL
- File model ONNX nếu muốn chạy inference thật
- Gemini API key nếu muốn dùng chatbot

Chạy backend:

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

make install
make install-dev

cp .env.example .env
```

Cập nhật các biến quan trọng trong `backend/.env`:

```bash
SECRET_KEY=<random-long-secret>
DATABASE_URL=postgresql://user:password@localhost:5432/leafscan
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash
MODEL_PATH=/path/to/efficientnetv2s_plantvillage.onnx
```

Khởi chạy:

```bash
make run
```

Mở tài liệu API:

```text
http://localhost:8000/docs
```

## Cài đặt mobile app

Yêu cầu:

- Node.js
- npm
- Expo CLI hoặc dùng `npx expo`
- Điện thoại có Expo Go hoặc emulator/simulator

Chạy mobile app:

```bash
cd leafscan-ai

npm install
cp .env.example .env
```

Cấu hình API trong `leafscan-ai/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=auto
```

Khi chạy trên thiết bị thật cùng mạng LAN với backend, có thể dùng `auto`. Nếu cần cấu hình thủ công:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:8000
```

Khởi chạy Expo:

```bash
npm start
```

Hoặc:

```bash
npx expo start --host lan --clear
```

## Kiểm thử và kiểm tra chất lượng

Chạy test backend:

```bash
cd backend
pytest tests/
```

Kiểm tra TypeScript mobile:

```bash
cd leafscan-ai
npm run lint
```

Quét secret trước khi commit hoặc push:

```bash
bash scripts/scan_secrets.sh
```

Dọn ảnh upload cũ ở backend, nên chạy dry-run trước:

```bash
cd backend
python -m scripts.cleanup_uploads --dry-run --older-than-days 30 --freshness-window-minutes 15
```

## Biến môi trường quan trọng

Backend:

- `SECRET_KEY`: khóa ký JWT.
- `DATABASE_URL`: chuỗi kết nối PostgreSQL.
- `MODEL_PATH`: đường dẫn model ONNX.
- `GEMINI_API_KEY`: key dùng cho Gemini/RAG chatbot.
- `GEMINI_MODEL`: tên model Gemini.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: cấu hình gửi OTP email.
- `GOOGLE_CLIENT_ID`: client ID để xác thực Google OAuth.
- `CORS_ORIGINS`: danh sách origin được phép gọi API.

Mobile:

- `EXPO_PUBLIC_API_BASE_URL`: URL backend.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: Google OAuth web client ID.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: Google OAuth Android client ID khi build Android.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: Google OAuth iOS client ID khi build iOS.

## Ghi chú về model AI

Model nhận diện bệnh được đặt ở backend và không nên commit trực tiếp nếu file có dung lượng lớn. Mặc định hệ thống tìm model trong `backend/app/models/`, nhưng có thể override bằng biến `MODEL_PATH`.

Giới hạn hiện tại:

- Model dựa trên PlantVillage 38 class, nên hiệu quả tốt nhất với các loại cây/bệnh có trong bộ dữ liệu này.
- Ảnh thực tế ngoài môi trường có thể khó hơn ảnh trong dataset do ánh sáng, nền, góc chụp và mức độ bệnh.
- App yêu cầu người dùng chọn loại cây trước khi quét để giảm khả năng model ép nhãn sang cây khác.
- Kết quả AI nên được xem là thông tin hỗ trợ, không thay thế hoàn toàn tư vấn chuyên môn nông nghiệp.

## Ghi chú Git và bảo mật

- Không commit file `.env`, secret key, API key hoặc connection string thật.
- Không commit ảnh upload runtime, cache, build output, virtualenv hoặc `node_modules`.
- Thư mục `.kiro/` là dữ liệu local của công cụ phát triển và đã được ignore khỏi Git.
- Các file model nặng như `.onnx`, `.pth` nên lưu ngoài Git hoặc dùng cơ chế artifact/storage phù hợp.
- Chạy `bash scripts/scan_secrets.sh` trước khi push để giảm rủi ro lộ secret.

## Hướng phát triển tiếp theo

- Hoàn thiện chat streaming UI trên mobile.
- Bổ sung push notification nhắc chăm sóc cây.
- Mở rộng dark mode và i18n toàn bộ màn hình.
- Cải thiện model bằng dữ liệu ảnh thực địa ngoài PlantVillage.
- Thêm calibration để confidence của model phản ánh xác suất thực tế tốt hơn.
- Xây dựng CI/CD cho test, build và deploy.
- Hoàn thiện Docker/deploy backend lên cloud.
- Phát triển admin dashboard để theo dõi người dùng, lượt quét, bệnh phổ biến và marketplace.

## Tài liệu liên quan

- `PROJECT.md`: tài liệu chi tiết về kiến trúc, tính năng đã hoàn thiện và các phần còn dang dở.
- `backend/README.md`: hướng dẫn riêng cho backend API.
- `leafscan-ai/README.md`: hướng dẫn riêng cho mobile app.
- `docs/history-rewrite.md`: hướng dẫn xử lý Git history khi cần làm sạch secret.

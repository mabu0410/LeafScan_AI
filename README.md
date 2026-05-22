# LeafScan AI

LeafScan AI là ứng dụng di động hỗ trợ nhận diện bệnh trên lá cây bằng AI. Người dùng có thể chụp hoặc tải ảnh lá cây lên ứng dụng, hệ thống backend sẽ phân tích hình ảnh, dự đoán bệnh, ước lượng giai đoạn bệnh, gợi ý hướng xử lý và lưu lại lịch sử chăm sóc cây.

Dự án được xây dựng theo mô hình monorepo gồm ứng dụng mobile React Native/Expo và backend FastAPI. Hai phần giao tiếp với nhau qua REST API, dữ liệu được lưu trong PostgreSQL và mô hình AI chạy ở backend bằng ONNX Runtime.

## Tính năng chính

- Quét ảnh lá cây để chẩn đoán bệnh bằng mô hình EfficientNetV2-S huấn luyện trên PlantVillage.
- Kiểm tra chất lượng ảnh trước khi suy luận để giảm kết quả sai từ ảnh không phù hợp.
- Dự đoán giai đoạn bệnh, đưa ra phác đồ xử lý và dự báo diễn tiến trong 7 ngày.
- Quản lý vườn cây cá nhân: thêm, sửa, xóa và theo dõi từng cây.
- Lưu lịch sử quét, tra cứu bệnh, xem chi tiết nguyên nhân, triệu chứng và cách phòng trị.
- Chat tư vấn bệnh cây bằng RAG kết hợp Gemini.
- Đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu bằng OTP và đăng nhập Google.
- Marketplace/partner channel và subscription cho các luồng mở rộng của ứng dụng.

## Công nghệ sử dụng

### Mobile app

- React Native
- Expo SDK 54
- TypeScript
- React Navigation
- Zustand
- Expo Camera, Image Picker, Media Library

### Backend

- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- ONNX Runtime
- Gemini API cho chatbot/RAG
- Pytest cho kiểm thử backend

## Cấu trúc thư mục

```text
DO_AN_VMB/
├── backend/        # FastAPI API, AI inference, database, migrations, tests
├── leafscan-ai/    # Ứng dụng mobile React Native/Expo
├── docs/           # Tài liệu kỹ thuật bổ sung
├── scripts/        # Script hỗ trợ kiểm tra secret và vận hành repo
├── PROJECT.md      # Ghi chú chi tiết về kiến trúc và tiến độ dự án
└── README.md       # Giới thiệu tổng quan dự án
```

## Cài đặt backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
make install
make install-dev

cp .env.example .env
# Cập nhật SECRET_KEY, DATABASE_URL, GEMINI_API_KEY và các biến cần thiết khác

make run
```

Sau khi chạy, Swagger UI có tại:

```text
http://localhost:8000/docs
```

## Cài đặt mobile app

```bash
cd leafscan-ai
npm install

cp .env.example .env
# Có thể dùng EXPO_PUBLIC_API_BASE_URL=auto khi chạy cùng mạng LAN với backend

npm start
```

## Kiểm thử

Backend:

```bash
cd backend
pytest tests/
```

Mobile type check:

```bash
cd leafscan-ai
npm run lint
```

Kiểm tra secret trước khi push:

```bash
bash scripts/scan_secrets.sh
```

## Ghi chú vận hành

- Không commit các file `.env`, model nặng, ảnh upload runtime hoặc cache sinh ra khi chạy ứng dụng.
- Thư mục `.kiro/` là dữ liệu local của công cụ phát triển và đã được ignore khỏi Git.
- Model ONNX không được lưu trực tiếp trong Git nếu có dung lượng lớn; cấu hình đường dẫn model qua biến môi trường `MODEL_PATH` khi cần.
- Tham khảo thêm `backend/README.md`, `leafscan-ai/README.md` và `PROJECT.md` để xem hướng dẫn chi tiết từng phần.

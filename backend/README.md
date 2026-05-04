# 🌿 LeafScan AI - Backend API

API phát hiện bệnh trên lá cây bằng Trí Tuệ Nhân Tạo, có dự đoán giai đoạn và forecast 7 ngày.

## Cấu trúc thư mục

```
backend/
├── app/
│   ├── main.py                 # Entry point (FastAPI app)
│   ├── config.py               # Cấu hình (ngưỡng tin cậy, CORS...)
│   ├── routers/
│   │   └── diagnosis.py        # API endpoints
│   ├── services/
│   │   ├── model_service.py    # AI prediction (Mock / Thật)
│   │   └── treatment_service.py # Tra cứu phác đồ điều trị
│   ├── models/
│   │   └── schemas.py          # Pydantic schemas
│   └── data/
│       └── disease_db.json     # Database bệnh + phác đồ
├── requirements.txt
└── README.md
```

## Cài đặt và Chạy

### 1. Tạo Virtual Environment (khuyến nghị)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc: venv\Scripts\activate  # Windows
```

### 2. Cài dependencies
```bash
pip install -r requirements.txt
```

### 3. Chạy server
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Hoặc dùng script chuẩn qua `Makefile`:
```bash
make run      # chạy backend dev
make test     # chạy pytest
make build    # build Python bytecode cho app
```

### 4. Mở Swagger UI (Test API trực quan)
Truy cập: [http://localhost:8000/docs](http://localhost:8000/docs)

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/` | Trang chủ API |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/diseases` | Danh sách bệnh (hỗ trợ tìm kiếm/lọc) |
| `GET` | `/api/v1/diseases/{disease_key}` | Chi tiết bệnh theo khóa |
| `POST` | `/api/v1/diagnose` | **Chẩn đoán bệnh từ ảnh + dự báo stage** |

## Test nhanh bằng cURL

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Chẩn đoán bệnh (upload ảnh)
curl -X POST http://localhost:8000/api/v1/diagnose \
  -F "file=@path/to/leaf_image.jpg"
```

## Tích hợp Model AI thật (ONNX/TFLite)

Đặt biến môi trường `MODEL_PATH` trỏ tới file `.onnx` hoặc `.tflite`.
Backend sẽ tự load model để suy luận.

Nếu chưa có file model, hệ thống dùng fallback heuristic deterministic để luồng MVP vẫn chạy end-to-end.

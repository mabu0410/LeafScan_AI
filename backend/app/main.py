"""
LeafScan AI Backend - Entrypoint

Server API phát hiện bệnh trên lá cây sử dụng AI.
Chạy lệnh:
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, UPLOAD_DIR
from app.routers import diagnosis, auth, plants, history, chat, diseases, care_tips, home, partners, subscriptions
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("leafscan.api")

# ──────────────────────────────────────────────
# Khởi tạo FastAPI App
# ──────────────────────────────────────────────

app = FastAPI(
    title="LeafScan AI API",
    description=(
        "API phát hiện bệnh trên lá cây bằng AI. "
        "Upload ảnh lá cây và nhận kết quả chẩn đoán cùng phác đồ điều trị."
    ),
    version="1.0.0",
)

# ──────────────────────────────────────────────
# Cấu hình CORS (Cho phép React Native gọi API)
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_log_middleware(request: Request, call_next):
    """Ghi log request cơ bản phục vụ debug/monitoring."""
    request_id = uuid.uuid4().hex[:12]
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "request_failed id=%s method=%s path=%s duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_done id=%s method=%s path=%s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        status_code,
        duration_ms,
    )
    return response

# ──────────────────────────────────────────────
# Đăng ký Routers
# ──────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(plants.router)
app.include_router(history.router)
app.include_router(diseases.router)
app.include_router(care_tips.router)
app.include_router(home.router)
app.include_router(diagnosis.router)
app.include_router(chat.router)
app.include_router(partners.router)
app.include_router(subscriptions.router)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ──────────────────────────────────────────────
# Root Endpoint
# ──────────────────────────────────────────────

@app.get("/")
async def root():
    """Trang chủ API."""
    return {
        "app": "LeafScan AI",
        "version": "1.0.0",
        "docs": "/docs",
        "message": "Chào mừng bạn đến với LeafScan AI API!",
    }


@app.on_event("startup")
def on_startup() -> None:
    """Khởi tạo schema cho môi trường local demo."""
    init_db()

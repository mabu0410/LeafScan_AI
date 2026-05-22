"""
pytest conftest root cho backend.
Đẩy backend/ vào sys.path để các module app.*, scripts.* được resolve
giống như khi chạy `python -m scripts.cleanup_uploads` hay `python -m uvicorn app.main:app`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

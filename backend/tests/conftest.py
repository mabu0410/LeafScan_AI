"""
Fixtures dùng chung cho test suite.
"""
import os
from pathlib import Path
from typing import Iterator

import pytest
from dotenv import load_dotenv

# Load .env từ backend/ trước khi import app
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

# Set DATABASE_URL sang SQLite in-memory nếu chưa có (tránh phụ thuộc Postgres local)
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("NOTIFICATION_SCHEDULER_ENABLED", "false")

from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def app_client() -> Iterator[TestClient]:
    """FastAPI TestClient với SQLite in-memory DB."""
    # Import sau khi set env để config load đúng
    from app.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="function", autouse=True)
def reset_rate_limit():
    """Clear rate limit buckets giữa mỗi test để tránh nhiễu."""
    from app.dependencies.rate_limit import _BUCKETS
    _BUCKETS.clear()
    yield
    _BUCKETS.clear()


@pytest.fixture(scope="function")
def db_session():
    """Session SQLAlchemy độc lập cho mỗi test (rollback sau test)."""
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

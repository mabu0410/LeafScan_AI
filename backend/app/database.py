"""
Database Setup - SQLAlchemy configuration
"""
import json
import logging
import os
from pathlib import Path
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)
logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError("Missing DATABASE_URL in environment (.env).")

engine_kwargs = {"pool_pre_ping": True}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
_db_url = make_url(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    """
    Khởi tạo DB và đảm bảo các cột mới cho MVP tồn tại.
    Dùng cho môi trường local demo, không thay thế migration chuẩn (Alembic).
    """
    logger.info(
        "Database configured: dialect=%s host=%s port=%s database=%s",
        _db_url.drivername,
        _db_url.host,
        _db_url.port,
        _db_url.database,
    )

    # Bảo đảm model classes được import để Base.metadata có đủ table definitions.
    from app.models import domain as _domain_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_scan_history_columns()
    _seed_diseases_from_json()


def _ensure_scan_history_columns() -> None:
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if not inspect(conn).has_table("scan_history"):
            return

        if dialect == "postgresql":
            conn.execute(
                text(
                    "ALTER TABLE scan_history "
                    "ADD COLUMN IF NOT EXISTS predicted_stage VARCHAR NOT NULL DEFAULT 'unknown'"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE scan_history "
                    "ADD COLUMN IF NOT EXISTS forecast_stage_7d VARCHAR NOT NULL DEFAULT 'unknown'"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE scan_history "
                    "ADD COLUMN IF NOT EXISTS affected_area_snapshot DOUBLE PRECISION"
                )
            )
        elif dialect == "sqlite":
            columns = {
                row[1]
                for row in conn.execute(text("PRAGMA table_info('scan_history')")).fetchall()
            }
            if "predicted_stage" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE scan_history "
                        "ADD COLUMN predicted_stage TEXT NOT NULL DEFAULT 'unknown'"
                    )
                )
            if "forecast_stage_7d" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE scan_history "
                        "ADD COLUMN forecast_stage_7d TEXT NOT NULL DEFAULT 'unknown'"
                    )
                )
            if "affected_area_snapshot" not in columns:
                conn.execute(
                    text("ALTER TABLE scan_history ADD COLUMN affected_area_snapshot REAL")
                )


def _seed_diseases_from_json() -> None:
    """
    Đồng bộ bảng diseases từ disease_db.json để đảm bảo FK scan_history luôn hợp lệ.
    """
    db_path = Path(__file__).resolve().parent / "data" / "disease_db.json"
    if not db_path.is_file():
        logger.warning("Skip disease seeding: missing file %s", db_path)
        return

    from app.models.domain import Disease

    payload = json.loads(db_path.read_text(encoding="utf-8"))
    def _safe_int(value) -> int:
        try:
            return int(float(value))
        except Exception:
            return 0

    session = SessionLocal()
    try:
        existing = {
            row.disease_key: row
            for row in session.query(Disease).all()
            if row.disease_key
        }

        for disease_key, disease_data in payload.items():
            mapped_data = {
                "name": str(disease_data.get("name", disease_key)),
                "severity": str(disease_data.get("severity", "unknown")),
                "description": str(disease_data.get("description", "")),
                "symptoms": disease_data.get("symptoms", []),
                "treatment": disease_data.get("treatment", []),
                "prevention": disease_data.get("prevention", []),
                "affected_area_typical": _safe_int(disease_data.get("affected_area", 0)),
                "image_url": str(disease_data.get("image", "")),
            }

            row = existing.get(disease_key)
            if row is None:
                session.add(Disease(disease_key=disease_key, **mapped_data))
                continue

            for field_name, field_value in mapped_data.items():
                setattr(row, field_name, field_value)

        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to seed diseases from %s", db_path)
        raise
    finally:
        session.close()


def get_db():
    """Dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

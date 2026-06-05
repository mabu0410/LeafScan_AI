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
from sqlalchemy.pool import StaticPool
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
    if SQLALCHEMY_DATABASE_URL in {"sqlite:///:memory:", "sqlite://"}:
        engine_kwargs["poolclass"] = StaticPool
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
    _ensure_user_google_id_column()
    _ensure_user_role_column()
    _ensure_user_status_column()
    _ensure_care_tips_columns()
    _ensure_scan_history_columns()
    _ensure_diseases_columns()
    _ensure_partner_marketplace_columns()
    _seed_diseases_from_json()
    _seed_care_tips()


def _table_columns(conn, table_name: str) -> set[str]:
    dialect = engine.dialect.name
    if dialect == "postgresql":
        rows = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = :table_name"
            ),
            {"table_name": table_name},
        ).fetchall()
        return {row[0] for row in rows}
    if dialect == "sqlite":
        return {row[1] for row in conn.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()}
    return set()


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


def _ensure_diseases_columns() -> None:
    """Bảo đảm bảng diseases có cột model_class_name để map đúng class model."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if not inspect(conn).has_table("diseases"):
            return

        if dialect == "postgresql":
            conn.execute(
                text(
                    "ALTER TABLE diseases "
                    "ADD COLUMN IF NOT EXISTS model_class_name VARCHAR"
                )
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_diseases_model_class_name "
                    "ON diseases(model_class_name) "
                    "WHERE model_class_name IS NOT NULL"
                )
            )
        elif dialect == "sqlite":
            columns = {
                row[1]
                for row in conn.execute(text("PRAGMA table_info('diseases')")).fetchall()
            }
            if "model_class_name" not in columns:
                conn.execute(text("ALTER TABLE diseases ADD COLUMN model_class_name TEXT"))
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_diseases_model_class_name "
                    "ON diseases(model_class_name)"
                )
            )


def _ensure_partner_marketplace_columns() -> None:
    """Bảo đảm các cột marketplace/payment mới tồn tại cho DB demo đã có sẵn."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        inspector = inspect(conn)

        if inspector.has_table("partners"):
            columns = _table_columns(conn, "partners")
            if dialect == "postgresql":
                additions = {
                    "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                    "store_name": "VARCHAR(255)",
                    "description": "TEXT",
                    "address": "VARCHAR(500)",
                    "logo_url": "VARCHAR(500)",
                    "cover_url": "VARCHAR(500)",
                    "website_url": "VARCHAR(500)",
                    "contact_url": "VARCHAR(500)",
                    "rejection_reason": "TEXT",
                    "business_license_file_url": "VARCHAR(500)",
                    "representative_name": "VARCHAR(255)",
                    "representative_role": "VARCHAR(100)",
                    "service_area": "VARCHAR(255)",
                    "main_products": "TEXT",
                    "advertising_commitment_accepted": "BOOLEAN NOT NULL DEFAULT FALSE",
                    "advertising_commitment_at": "TIMESTAMP",
                }
                for name, definition in additions.items():
                    if name not in columns:
                        conn.execute(text(f"ALTER TABLE partners ADD COLUMN {name} {definition}"))
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_user_id "
                        "ON partners(user_id) WHERE user_id IS NOT NULL"
                    )
                )
            elif dialect == "sqlite":
                additions = {
                    "user_id": "INTEGER",
                    "store_name": "TEXT",
                    "description": "TEXT",
                    "address": "TEXT",
                    "logo_url": "TEXT",
                    "cover_url": "TEXT",
                    "website_url": "TEXT",
                    "contact_url": "TEXT",
                    "rejection_reason": "TEXT",
                    "business_license_file_url": "TEXT",
                    "representative_name": "TEXT",
                    "representative_role": "TEXT",
                    "service_area": "TEXT",
                    "main_products": "TEXT",
                    "advertising_commitment_accepted": "INTEGER NOT NULL DEFAULT 0",
                    "advertising_commitment_at": "TEXT",
                }
                for name, definition in additions.items():
                    if name not in columns:
                        conn.execute(text(f"ALTER TABLE partners ADD COLUMN {name} {definition}"))
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_user_id "
                        "ON partners(user_id)"
                    )
                )

        if inspector.has_table("partners") and not inspector.has_table("partner_stores"):
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "CREATE TABLE IF NOT EXISTS partner_stores ("
                        "id SERIAL PRIMARY KEY, "
                        "partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE, "
                        "name VARCHAR(255) NOT NULL, "
                        "description TEXT, "
                        "address VARCHAR(500), "
                        "contact_email VARCHAR(255), "
                        "phone VARCHAR(20), "
                        "logo_url VARCHAR(500), "
                        "cover_url VARCHAR(500), "
                        "is_active BOOLEAN NOT NULL DEFAULT TRUE, "
                        "is_primary BOOLEAN NOT NULL DEFAULT FALSE, "
                        "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
                        "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
                        ")"
                    )
                )
            elif dialect == "sqlite":
                conn.execute(
                    text(
                        "CREATE TABLE IF NOT EXISTS partner_stores ("
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                        "partner_id INTEGER NOT NULL, "
                        "name TEXT NOT NULL, "
                        "description TEXT, "
                        "address TEXT, "
                        "contact_email TEXT, "
                        "phone TEXT, "
                        "logo_url TEXT, "
                        "cover_url TEXT, "
                        "is_active INTEGER NOT NULL DEFAULT 1, "
                        "is_primary INTEGER NOT NULL DEFAULT 0, "
                        "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                        "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
                        ")"
                    )
                )
        if inspector.has_table("partner_stores"):
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_partner_stores_partner_active "
                    "ON partner_stores(partner_id, is_active)"
                )
            )

        if inspector.has_table("partner_products"):
            columns = _table_columns(conn, "partner_products")
            if dialect == "postgresql":
                if "store_id" not in columns:
                    conn.execute(
                        text(
                            "ALTER TABLE partner_products "
                            "ADD COLUMN store_id INTEGER REFERENCES partner_stores(id) ON DELETE SET NULL"
                        )
                    )
                if "moderation_status" not in columns:
                    conn.execute(
                        text(
                            "ALTER TABLE partner_products "
                            "ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending_review'"
                        )
                    )
                if "rejection_reason" not in columns:
                    conn.execute(text("ALTER TABLE partner_products ADD COLUMN rejection_reason TEXT"))
            elif dialect == "sqlite":
                if "store_id" not in columns:
                    conn.execute(text("ALTER TABLE partner_products ADD COLUMN store_id INTEGER"))
                if "moderation_status" not in columns:
                    conn.execute(
                        text(
                            "ALTER TABLE partner_products "
                            "ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending_review'"
                        )
                    )
                if "rejection_reason" not in columns:
                    conn.execute(text("ALTER TABLE partner_products ADD COLUMN rejection_reason TEXT"))
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_partner_products_store_id "
                    "ON partner_products(store_id)"
                )
            )

        if inspector.has_table("partners") and inspector.has_table("partner_stores"):
            if dialect == "postgresql":
                conn.execute(
                    text(
                        "INSERT INTO partner_stores ("
                        "partner_id, name, description, address, contact_email, phone, "
                        "logo_url, cover_url, is_active, is_primary, created_at, updated_at"
                        ") "
                        "SELECT p.id, COALESCE(NULLIF(p.store_name, ''), p.company_name), "
                        "p.description, p.address, p.contact_email, p.phone, p.logo_url, p.cover_url, "
                        "TRUE, TRUE, now(), now() "
                        "FROM partners p "
                        "WHERE NOT EXISTS ("
                        "SELECT 1 FROM partner_stores ps WHERE ps.partner_id = p.id"
                        ")"
                    )
                )
            elif dialect == "sqlite":
                conn.execute(
                    text(
                        "INSERT INTO partner_stores ("
                        "partner_id, name, description, address, contact_email, phone, "
                        "logo_url, cover_url, is_active, is_primary, created_at, updated_at"
                        ") "
                        "SELECT p.id, COALESCE(NULLIF(p.store_name, ''), p.company_name), "
                        "p.description, p.address, p.contact_email, p.phone, p.logo_url, p.cover_url, "
                        "1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP "
                        "FROM partners p "
                        "WHERE NOT EXISTS ("
                        "SELECT 1 FROM partner_stores ps WHERE ps.partner_id = p.id"
                        ")"
                    )
                )

        if inspector.has_table("product_impressions"):
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE product_impressions ALTER COLUMN scan_id DROP NOT NULL"))
                conn.execute(text("ALTER TABLE product_impressions ALTER COLUMN user_id DROP NOT NULL"))


def _ensure_user_google_id_column() -> None:
    """Bảo đảm bảng users có cột google_id cho OAuth."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if not inspect(conn).has_table("users"):
            return
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR"))
            conn.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id ON users(google_id) WHERE google_id IS NOT NULL")
            )
        elif dialect == "sqlite":
            columns = {row[1] for row in conn.execute(text("PRAGMA table_info('users')")).fetchall()}
            if "google_id" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN google_id TEXT"))


def _ensure_user_role_column() -> None:
    """Bảo đảm bảng users có cột role để phân luồng farmer/partner."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if not inspect(conn).has_table("users"):
            return
        columns = _table_columns(conn, "users")
        if "role" in columns:
            return
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'farmer'"))
        elif dialect == "sqlite":
            conn.execute(text("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'farmer'"))


def _ensure_user_status_column() -> None:
    """Bảo đảm bảng users có cột status để admin khóa/mở tài khoản."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if not inspect(conn).has_table("users"):
            return
        columns = _table_columns(conn, "users")
        if "status" in columns:
            return
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'"))
        elif dialect == "sqlite":
            conn.execute(text("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"))


def _ensure_care_tips_columns() -> None:
    """Bảo đảm bảng care_tips có các cột mới phục vụ API/seed."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if not inspect(conn).has_table("care_tips"):
            return

        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE care_tips ADD COLUMN IF NOT EXISTS slug VARCHAR(255)"))
            conn.execute(text("ALTER TABLE care_tips ADD COLUMN IF NOT EXISTS source_name VARCHAR(255)"))
            conn.execute(text("ALTER TABLE care_tips ADD COLUMN IF NOT EXISTS source_url TEXT"))
            conn.execute(text("ALTER TABLE care_tips ADD COLUMN IF NOT EXISTS source_note TEXT"))
            conn.execute(
                text(
                    "UPDATE care_tips SET slug = 'tip-' || id "
                    "WHERE slug IS NULL OR btrim(slug) = ''"
                )
            )
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_care_tips_slug ON care_tips(slug)"))
            conn.execute(text("ALTER TABLE care_tips ALTER COLUMN slug SET NOT NULL"))
        elif dialect == "sqlite":
            columns = {
                row[1]
                for row in conn.execute(text("PRAGMA table_info('care_tips')")).fetchall()
            }
            if "slug" not in columns:
                conn.execute(text("ALTER TABLE care_tips ADD COLUMN slug TEXT"))
            if "source_name" not in columns:
                conn.execute(text("ALTER TABLE care_tips ADD COLUMN source_name TEXT"))
            if "source_url" not in columns:
                conn.execute(text("ALTER TABLE care_tips ADD COLUMN source_url TEXT"))
            if "source_note" not in columns:
                conn.execute(text("ALTER TABLE care_tips ADD COLUMN source_note TEXT"))
            conn.execute(
                text(
                    "UPDATE care_tips SET slug = 'tip-' || id "
                    "WHERE slug IS NULL OR trim(slug) = ''"
                )
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
    from app.services.model_service import disease_key_to_class_name

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
            model_class_name = disease_key_to_class_name(disease_key)
            mapped_data = {
                "name": str(disease_data.get("name", disease_key)),
                "severity": str(disease_data.get("severity", "unknown")),
                "description": str(disease_data.get("description", "")),
                "symptoms": disease_data.get("symptoms", []),
                "treatment": disease_data.get("treatment", []),
                "prevention": disease_data.get("prevention", []),
                "affected_area_typical": _safe_int(disease_data.get("affected_area", 0)),
                "image_url": str(disease_data.get("image", "")),
                "model_class_name": model_class_name,
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


def _seed_care_tips() -> None:
    """
    Seed bootstrap tối thiểu cho care_tips (idempotent).
    Seed đầy đủ dùng database/seeds/001_seed_care_tips.sql.
    """
    from app.models.domain import CareTip

    seed_rows = [
        {
            "slug": "tuoi-nuoc-vao-buoi-sang",
            "title": "Tưới nước buổi sáng",
            "summary": "Tưới vào sáng sớm giúp lá khô nhanh và giảm nguy cơ nấm bệnh.",
            "content": (
                "Tưới cây vào khung 6h-8h sáng giúp cây hấp thụ nước tốt hơn, "
                "đồng thời bề mặt lá có thời gian khô trước chiều tối nên hạn chế nấm."
            ),
            "category": "Tưới nước",
            "suitable_plants": ["Cà chua", "Ớt", "Rau lá"],
            "priority": 10,
            "source_name": "University of Minnesota Extension",
            "source_url": "https://extension.umn.edu/disease-management/bacterial-spot-tomato-and-pepper",
            "source_note": "Khuyến nghị tưới buổi sáng và hạn chế để lá ẩm kéo dài.",
        },
        {
            "slug": "khong-de-la-am-qua-dem",
            "title": "Không để lá ẩm qua đêm",
            "summary": "Hạn chế tưới muộn để tránh lá ướt kéo dài gây nấm bệnh.",
            "content": (
                "Khi lá ẩm lâu trong đêm, bào tử nấm phát triển mạnh. "
                "Nên tưới vào buổi sáng và giữ tán lá thông thoáng để giảm độ ẩm."
            ),
            "category": "Phòng bệnh",
            "suitable_plants": ["Dưa leo", "Rau thơm", "Hoa cảnh"],
            "priority": 8,
            "source_name": "University of Minnesota Extension",
            "source_url": "https://extension.umn.edu/planting-and-growing-guides/managing-plant-diseases-home-garden",
            "source_note": "Tập trung giảm thời gian lá bị ướt để hạn chế bùng phát nấm bệnh.",
        },
        {
            "slug": "cat-bo-la-bi-benh-som",
            "title": "Cắt bỏ lá bị bệnh",
            "summary": "Loại bỏ lá nhiễm bệnh sớm giúp giảm lây lan sang lá khỏe.",
            "content": (
                "Dùng kéo sạch cắt bỏ lá có đốm bệnh và tiêu hủy đúng cách. "
                "Khử trùng dụng cụ sau khi cắt để tránh lây nhiễm chéo giữa các cây."
            ),
            "category": "Cắt tỉa",
            "suitable_plants": ["Cà chua", "Khoai tây", "Cây ăn quả"],
            "priority": 9,
            "source_name": "Penn State Extension",
            "source_url": "https://extension.psu.edu/tomato-potato-late-blight-in-the-home-garden/",
            "source_note": "Khuyến nghị vệ sinh và loại bỏ mô bệnh để giảm lây lan trong vườn.",
        },
        {
            "slug": "dat-cay-noi-thong-thoang",
            "title": "Đặt cây nơi thông thoáng",
            "summary": "Lưu thông không khí giúp lá khô đều và giảm mầm bệnh.",
            "content": (
                "Không đặt cây quá sát nhau. Khoảng cách hợp lý giúp ánh sáng và gió đi qua tán lá, "
                "hạn chế môi trường ẩm thấp - điều kiện thuận lợi cho nấm và vi khuẩn."
            ),
            "category": "Môi trường trồng",
            "suitable_plants": ["Rau lá", "Cây gia vị", "Hoa"],
            "priority": 7,
            "source_name": "NC State Extension",
            "source_url": "https://content.ces.ncsu.edu/extension-gardener-handbook/8-integrated-pest-management-ipm",
            "source_note": "IPM ưu tiên giảm ẩm, tăng thông thoáng và theo dõi chủ động.",
        },
        {
            "slug": "kiem-tra-mat-duoi-la-thuong-xuyen",
            "title": "Kiểm tra mặt dưới lá",
            "summary": "Nhiều dấu hiệu bệnh và côn trùng xuất hiện đầu tiên ở mặt dưới lá.",
            "content": (
                "Mỗi ngày quan sát mặt dưới lá để phát hiện sớm rệp, nấm mốc hoặc đốm lạ. "
                "Phát hiện sớm giúp xử lý nhẹ nhàng và giảm chi phí chăm sóc."
            ),
            "category": "Theo dõi cây",
            "suitable_plants": ["Cải xanh", "Ớt", "Cà tím"],
            "priority": 6,
            "source_name": "Clemson Cooperative Extension",
            "source_url": "https://hgic.clemson.edu/factsheet/integrated-pest-management-i-p-m-for-aphids/",
            "source_note": "Rệp thường tập trung ở chồi non và mặt dưới lá nên cần kiểm tra định kỳ.",
        },
    ]

    session = SessionLocal()
    try:
        existing = {
            row.slug: row
            for row in session.query(CareTip).all()
            if getattr(row, "slug", None)
        }
        for seed in seed_rows:
            row = existing.get(seed["slug"])
            if row is None:
                session.add(
                    CareTip(
                        slug=seed["slug"],
                        title=seed["title"],
                        summary=seed["summary"],
                        content=seed["content"],
                        category=seed["category"],
                        suitable_plants=seed["suitable_plants"],
                        related_disease_id=None,
                        priority=seed["priority"],
                        is_active=True,
                        source_name=seed["source_name"],
                        source_url=seed["source_url"],
                        source_note=seed["source_note"],
                    )
                )
                continue

            row.slug = seed["slug"]
            row.summary = seed["summary"]
            row.content = seed["content"]
            row.category = seed["category"]
            row.suitable_plants = seed["suitable_plants"]
            row.priority = seed["priority"]
            row.is_active = True
            row.source_name = seed["source_name"]
            row.source_url = seed["source_url"]
            row.source_note = seed["source_note"]

        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to seed care tips")
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

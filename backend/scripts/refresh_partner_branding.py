"""Refresh partner demo branding with unique names and online images."""
from __future__ import annotations

from datetime import datetime
import unicodedata
from urllib.parse import quote

from app.database import SessionLocal
from app.models.domain import Partner, PartnerOutlet


BRAND_ROOTS = [
    "An Phú Agri",
    "Bình Minh Farm",
    "Cửu Long Supply",
    "Đất Việt Agro",
    "EcoGrow Viet",
    "FamiPlant",
    "GreenLeaf Care",
    "Hoa Đất Sinh Học",
    "Kim Nông Agri",
    "Lá Xanh Bio",
    "Mùa Vàng Vật Tư",
    "Nông Gia Phát",
    "Phú Điền Farmcare",
    "Quê Hương Agro",
    "Song Lam Garden",
    "Tân Lộc Nông",
    "Thiên Phú Bio",
    "VietFarm Supply",
    "Xanh Tốt Agri",
    "Yên Bình Garden",
    "An Nông Việt",
    "Bac Nam Agro",
    "Cánh Đồng Mới",
    "Đại Phát Nông Nghiệp",
]

REGIONS = [
    "Hà Nội",
    "Hưng Yên",
    "Hải Dương",
    "Thai Binh",
    "Thanh Hoa",
    "Nghệ An",
    "Đà Nẵng",
    "Gia Lai",
    "Lâm Đồng",
    "Bình Dương",
    "Đồng Nai",
    "TP HCM",
    "Long An",
    "Tien Giang",
    "Cần Thơ",
    "An Giang",
    "Đồng Tháp",
    "Vĩnh Long",
    "Ben Tre",
    "Sóc Trăng",
]


def _ascii_slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    clean = ascii_value.lower().replace(" ", "-")
    return "".join(char for char in clean if char.isalnum() or char == "-")


def _brand_for_index(index: int) -> tuple[str, str]:
    root = BRAND_ROOTS[index % len(BRAND_ROOTS)]
    region = REGIONS[(index // len(BRAND_ROOTS)) % len(REGIONS)]
    cycle = index // (len(BRAND_ROOTS) * len(REGIONS))
    suffix = f" {cycle + 1}" if cycle else ""
    store_name = f"{root} {region}{suffix}"
    company_name = f"Công ty TNHH {root} {region}{suffix}"
    return company_name, store_name


def _logo_url(store_name: str) -> str:
    seed = quote(store_name)
    return (
        "https://api.dicebear.com/9.x/initials/png"
        f"?seed={seed}&backgroundColor=16a34a,0f766e,2563eb&textColor=ffffff"
    )


def _cover_url(partner_id: int, store_name: str) -> str:
    seed = _ascii_slug(f"leafscan-partner-{partner_id}-{store_name}")
    return f"https://picsum.photos/seed/{seed}/1200/520"


def run() -> int:
    db = SessionLocal()
    try:
        partners = db.query(Partner).order_by(Partner.id).all()
        now = datetime.utcnow()
        for index, partner in enumerate(partners):
            company_name, store_name = _brand_for_index(index)
            logo_url = _logo_url(store_name)
            cover_url = _cover_url(int(partner.id), store_name)
            description = (
                f"{store_name} cung cấp phân bón, chế phẩm sinh học và vật tư "
                "chăm sóc cây trồng cho người dùng LeafScan."
            )

            partner.company_name = company_name
            partner.store_name = store_name
            partner.description = description
            partner.logo_url = logo_url
            partner.cover_url = cover_url
            partner.updated_at = now

            stores = (
                db.query(PartnerOutlet)
                .filter(PartnerOutlet.partner_id == partner.id)
                .order_by(PartnerOutlet.is_primary.desc(), PartnerOutlet.id.asc())
                .all()
            )
            for store_index, store in enumerate(stores):
                store.name = store_name if store_index == 0 else f"{store_name} - Chi nhanh {store_index + 1}"
                store.description = description
                store.logo_url = logo_url
                store.cover_url = cover_url
                store.updated_at = now

        db.commit()
        print(f"Updated partner branding: {len(partners)} partners")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(run())

"""
Script cập nhật URL ảnh bệnh trong disease_db.json.

Nguồn: PlantVillage Dataset gốc trên GitHub
https://github.com/spMohanty/PlantVillage-Dataset

Script dùng GitHub Git Trees API (1 request duy nhất lấy toàn bộ file list)
để tránh rate limit, sau đó map mỗi class với file đầu tiên tìm được.

Nếu có GITHUB_TOKEN trong env, dùng token để tăng rate limit 60→5000/giờ.

Cách chạy:
    cd backend
    source .venv/bin/activate
    python -m scripts.update_disease_images
"""
import json
import os
import sys
import urllib.parse
from pathlib import Path

import requests
from dotenv import load_dotenv

# Load .env từ backend/ để đọc GITHUB_TOKEN
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Mapping disease_key (VN) → folder name trong PlantVillage dataset
DISEASE_KEY_TO_CLASS_FOLDER = {
    "apple_scab": "Apple___Apple_scab",
    "apple_black_rot": "Apple___Black_rot",
    "apple_cedar_rust": "Apple___Cedar_apple_rust",
    "apple_healthy": "Apple___healthy",
    "blueberry_healthy": "Blueberry___healthy",
    "cherry_powdery_mildew": "Cherry_(including_sour)___Powdery_mildew",
    "cherry_healthy": "Cherry_(including_sour)___healthy",
    "corn_gray_leaf_spot": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "corn_common_rust": "Corn_(maize)___Common_rust_",
    "corn_northern_leaf_blight": "Corn_(maize)___Northern_Leaf_Blight",
    "corn_healthy": "Corn_(maize)___healthy",
    "grape_black_rot": "Grape___Black_rot",
    "grape_esca": "Grape___Esca_(Black_Measles)",
    "grape_leaf_blight": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "grape_healthy": "Grape___healthy",
    "orange_huanglongbing": "Orange___Haunglongbing_(Citrus_greening)",
    "peach_bacterial_spot": "Peach___Bacterial_spot",
    "peach_healthy": "Peach___healthy",
    "pepper_bacterial_spot": "Pepper,_bell___Bacterial_spot",
    "pepper_healthy": "Pepper,_bell___healthy",
    "potato_early_blight": "Potato___Early_blight",
    "potato_late_blight": "Potato___Late_blight",
    "potato_healthy": "Potato___healthy",
    "raspberry_healthy": "Raspberry___healthy",
    "soybean_healthy": "Soybean___healthy",
    "squash_powdery_mildew": "Squash___Powdery_mildew",
    "strawberry_leaf_scorch": "Strawberry___Leaf_scorch",
    "strawberry_healthy": "Strawberry___healthy",
    "tomato_bacterial_spot": "Tomato___Bacterial_spot",
    "tomato_early_blight": "Tomato___Early_blight",
    "tomato_late_blight": "Tomato___Late_blight",
    "tomato_leaf_mold": "Tomato___Leaf_Mold",
    "tomato_septoria_leaf_spot": "Tomato___Septoria_leaf_spot",
    "tomato_spider_mites": "Tomato___Spider_mites Two-spotted_spider_mite",
    "tomato_target_spot": "Tomato___Target_Spot",
    "tomato_yellow_leaf_curl_virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "tomato_mosaic_virus": "Tomato___Tomato_mosaic_virus",
    "tomato_healthy": "Tomato___healthy",
}

GITHUB_TREE_API = "https://api.github.com/repos/spMohanty/PlantVillage-Dataset/git/trees/master?recursive=1"
RAW_BASE = "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master"


def fetch_all_tree_files() -> list[dict]:
    """Lấy toàn bộ file tree của repo bằng 1 request duy nhất."""
    print("📥 Đang tải file tree từ GitHub (1 request duy nhất)...")
    headers = {}
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
        print("   🔑 Dùng GITHUB_TOKEN (rate limit 5000/giờ)")
    else:
        print("   ⚠️  Không có GITHUB_TOKEN, dùng rate limit mặc định 60/giờ")

    try:
        resp = requests.get(GITHUB_TREE_API, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        tree = data.get("tree", [])
        if data.get("truncated"):
            print("⚠️  File tree bị truncate (repo quá lớn), sẽ fetch các folder còn thiếu riêng.")
        print(f"✅ Đã tải {len(tree)} entries.\n")
        return tree
    except Exception as exc:
        print(f"❌ Lỗi khi tải file tree: {exc}", file=sys.stderr)
        return []


def fetch_folder_first_image(class_folder: str, headers: dict) -> str | None:
    """Fallback: gọi Contents API cho folder cụ thể để lấy ảnh đầu tiên."""
    encoded = urllib.parse.quote(class_folder, safe="")
    url = f"https://api.github.com/repos/spMohanty/PlantVillage-Dataset/contents/raw/color/{encoded}"
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        items = resp.json()
        if not isinstance(items, list):
            return None
        for item in items:
            if item.get("type") == "file" and item.get("name", "").lower().endswith((".jpg", ".jpeg", ".png")):
                return item.get("download_url")
        return None
    except Exception as exc:
        print(f"     ❌ Fallback fetch failed for {class_folder}: {exc}", file=sys.stderr)
        return None


def build_class_to_first_image(tree: list[dict]) -> dict[str, str]:
    """
    Quét tree, với mỗi folder raw/color/<class>/ lấy file .JPG đầu tiên.
    Trả về dict: {class_folder_name: download_url}.
    """
    # Gom file theo class folder
    class_files: dict[str, list[str]] = {}

    for item in tree:
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        # raw/color/<class>/<filename>
        if not path.startswith("raw/color/"):
            continue
        parts = path.split("/", 3)  # ['raw', 'color', '<class>', '<filename>']
        if len(parts) < 4:
            continue
        class_name = parts[2]
        filename = parts[3]
        if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        class_files.setdefault(class_name, []).append(filename)

    # Chọn file đầu tiên (sorted để stable)
    result: dict[str, str] = {}
    for class_name, files in class_files.items():
        first = sorted(files)[0]
        # URL-encode path
        encoded_class = urllib.parse.quote(class_name)
        encoded_file = urllib.parse.quote(first)
        result[class_name] = f"{RAW_BASE}/raw/color/{encoded_class}/{encoded_file}"

    return result


def update_disease_images(db_path: Path) -> None:
    """Cập nhật trường 'image' trong disease_db.json."""
    tree = fetch_all_tree_files()
    if not tree:
        return

    class_to_url = build_class_to_first_image(tree)
    print(f"📊 Tìm được ảnh cho {len(class_to_url)} class.\n")

    # Token để dùng cho fallback calls
    headers = {}
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = json.loads(db_path.read_text(encoding="utf-8"))

    updated = 0
    failed = []

    for disease_key, disease in data.items():
        class_folder = DISEASE_KEY_TO_CLASS_FOLDER.get(disease_key)
        if not class_folder:
            print(f"  ⚠️  Không có mapping: {disease_key}")
            failed.append(disease_key)
            continue

        img_url = class_to_url.get(class_folder)

        # Fallback: nếu tree bị truncate, fetch folder cụ thể
        if not img_url:
            print(f"  🔄 Fallback fetch cho {disease_key}...", end=" ", flush=True)
            img_url = fetch_folder_first_image(class_folder, headers)

        if img_url:
            disease["image"] = img_url
            updated += 1
            print(f"  ✅ {disease_key}")
        else:
            failed.append(disease_key)
            print(f"  ❌ {disease_key} (không tìm thấy folder {class_folder!r})")

    db_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\n{'='*60}")
    print(f"✅ Đã cập nhật {updated}/{len(data)} URL ảnh bệnh.")
    if failed:
        print(f"❌ Thất bại {len(failed)}: {failed}")


if __name__ == "__main__":
    db_path = Path(__file__).resolve().parent.parent / "app" / "data" / "disease_db.json"
    update_disease_images(db_path)

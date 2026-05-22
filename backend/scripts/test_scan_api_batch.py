#!/usr/bin/env python3
"""
Batch test backend /diagnose API with local images.

For each image this script prints:
- selectedPlant
- predictedLabel
- predictedPlant
- confidence
- raw response

Usage:
  python scripts/test_scan_api_batch.py \
    --base-url http://localhost:8000/api/v1 \
    --token <JWT_TOKEN> \
    --selected-plant-key potato

Or auto-login:
  python scripts/test_scan_api_batch.py \
    --email nongdana@example.com \
    --password password123
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import httpx

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent

DEFAULT_IMAGE_DIR = BACKEND_ROOT / "test_images" / "plantvillage_test_0"
DEFAULT_BASE_URL = "http://localhost:8000/api/v1"


def extract_plant(class_name: str | None) -> str | None:
    if not class_name:
        return None
    prefix = class_name.split("___", 1)[0]
    prefix = re.sub(r"\([^)]*\)", " ", prefix)
    prefix = prefix.replace("_", " ").replace(",", " ")
    prefix = re.sub(r"\s+", " ", prefix).strip()
    return prefix


def obtain_token(
    client: httpx.Client,
    *,
    base_url: str,
    token: str | None,
    email: str | None,
    password: str | None,
) -> str | None:
    if token:
        return token
    if email and password:
        resp = client.post(
            f"{base_url}/auth/login",
            json={"email": email, "password": password},
            timeout=30.0,
        )
        resp.raise_for_status()
        payload = resp.json()
        return (
            payload.get("data", {}).get("access_token")
            if isinstance(payload, dict)
            else None
        )
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch test /diagnose API with image folder.")
    parser.add_argument("--image-dir", default=str(DEFAULT_IMAGE_DIR), help="Input images folder")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--token", default=None, help="Bearer token")
    parser.add_argument("--email", default=None, help="Login email to fetch token")
    parser.add_argument("--password", default=None, help="Login password to fetch token")
    parser.add_argument("--selected-plant-key", default=None, help="selected_plant_key form field")
    parser.add_argument("--plant-id", default=None, help="plant_id form field")
    parser.add_argument("--timeout", type=float, default=60.0, help="Request timeout seconds")
    parser.add_argument("--max-images", type=int, default=None, help="Only test first N images")
    args = parser.parse_args()

    image_dir = Path(args.image_dir).resolve()
    if not image_dir.is_dir():
        raise FileNotFoundError(f"image directory not found: {image_dir}")

    image_paths = sorted(
        p
        for p in image_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if args.max_images is not None and args.max_images >= 0:
        image_paths = image_paths[:args.max_images]

    if not image_paths:
        raise RuntimeError(f"no images found in: {image_dir}")

    base_url = args.base_url.rstrip("/")
    print(f"base_url: {base_url}")
    print(f"image_dir: {image_dir}")
    print(f"total_images: {len(image_paths)}")
    print(f"selected_plant_key: {args.selected_plant_key}")
    print(f"plant_id: {args.plant_id}")

    status_counter: Counter[int] = Counter()
    error_code_counter: Counter[str] = Counter()
    success_counter = 0

    with httpx.Client(timeout=args.timeout) as client:
        auth_token = obtain_token(
            client,
            base_url=base_url,
            token=args.token,
            email=args.email,
            password=args.password,
        )

        headers: dict[str, str] = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        else:
            print("warning: no token provided; /diagnose may return 401.")

        for image_path in image_paths:
            files = {"file": (image_path.name, image_path.read_bytes(), "image/jpeg")}
            data: dict[str, str] = {}
            if args.selected_plant_key:
                data["selected_plant_key"] = args.selected_plant_key
            if args.plant_id:
                data["plant_id"] = str(args.plant_id)

            try:
                response = client.post(
                    f"{base_url}/diagnose",
                    headers=headers,
                    files=files,
                    data=data,
                )
            except Exception as exc:
                print(f"[{image_path.name}] request_error={exc}")
                error_code_counter["REQUEST_ERROR"] += 1
                continue

            raw_text = response.text
            try:
                payload = response.json()
            except Exception:
                payload = {"non_json_response": raw_text}

            prediction = payload.get("prediction") if isinstance(payload, dict) else None
            debug = payload.get("debug") if isinstance(payload, dict) else None

            predicted_label = None
            confidence = None
            if isinstance(prediction, dict):
                predicted_label = prediction.get("class_name")
                confidence = prediction.get("confidence")

            if not predicted_label and isinstance(debug, dict):
                top_predictions = debug.get("top_predictions")
                if isinstance(top_predictions, list) and top_predictions:
                    first = top_predictions[0]
                    if isinstance(first, dict):
                        predicted_label = first.get("class_name")
                        confidence = first.get("confidence")

            predicted_plant = extract_plant(predicted_label)

            status_counter[response.status_code] += 1
            if isinstance(payload, dict):
                if payload.get("success") is True:
                    success_counter += 1
                error_code = payload.get("error_code")
                if isinstance(error_code, str) and error_code:
                    error_code_counter[error_code] += 1

            print(f"[{image_path.name}] status_code={response.status_code}")
            print(f"  selectedPlant={args.selected_plant_key}")
            print(f"  predictedLabel={predicted_label}")
            print(f"  predictedPlant={predicted_plant}")
            print(f"  confidence={confidence}")
            print(f"  raw_response={json.dumps(payload, ensure_ascii=False)}")

    print("summary:")
    print(f"  total_requests={len(image_paths)}")
    print(f"  success_true={success_counter}")
    print(f"  status_counts={json.dumps(dict(status_counter), ensure_ascii=False)}")
    print(f"  error_code_counts={json.dumps(dict(error_code_counter), ensure_ascii=False)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

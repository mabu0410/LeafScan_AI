#!/usr/bin/env python3
"""
Run backend API tests for all PlantVillage SVM test classes.

For each class this script sends every image twice:
- correct selected_plant_key derived from expected class label
- wrong selected_plant_key to verify PLANT_MISMATCH

Usage:
  python3 backend/scripts/test_all_plantvillage_api.py \
    --base-url http://127.0.0.1:8001/api/v1 \
    --email user@example.com \
    --password password123
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import time
from collections import Counter
from pathlib import Path
from typing import Any

import httpx

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
MODELS_DIR = BACKEND_ROOT / "app" / "models"

DEFAULT_REPO_URL = "https://github.com/spMohanty/PlantVillage-Dataset.git"
DEFAULT_CLONE_DIR = BACKEND_ROOT / ".cache" / "PlantVillage-Dataset"
TMP_CLONE_DIR = Path("/tmp/PlantVillage-Dataset-sparse2")
DEFAULT_CLASS_NAMES = MODELS_DIR / "class_names.json"
DEFAULT_CORRECT_REPORT = BACKEND_ROOT / "test_results" / "full_api_correct_selected_summary.csv"
DEFAULT_WRONG_REPORT = BACKEND_ROOT / "test_results" / "full_api_wrong_selected_summary.csv"
DEFAULT_BASE_URL = "http://127.0.0.1:8001/api/v1"

SUPPORTED_PLANT_KEYS = [
    "apple",
    "blueberry",
    "cherry",
    "corn",
    "grape",
    "orange",
    "peach",
    "pepper",
    "potato",
    "raspberry",
    "soybean",
    "squash",
    "strawberry",
    "tomato",
]
UNCLEAR_IMAGE_CODES = {"NO_LEAF_DETECTED", "IMAGE_TOO_DARK", "IMAGE_TOO_BLURRY", "UNCLEAR_IMAGE"}


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def ensure_dataset_root(repo_url: str, clone_dir: Path) -> Path:
    if (TMP_CLONE_DIR / "data_distribution_for_SVM" / "test").is_dir():
        return TMP_CLONE_DIR

    if not (clone_dir / ".git").is_dir():
        clone_dir.parent.mkdir(parents=True, exist_ok=True)
        run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--filter=blob:none",
                "--sparse",
                repo_url,
                str(clone_dir),
            ]
        )

    run(["git", "-C", str(clone_dir), "sparse-checkout", "set", "data_distribution_for_SVM"])
    return clone_dir


def load_class_names(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or len(data) != 38:
        raise ValueError(f"expected 38 class names in {path}, got {len(data) if isinstance(data, list) else 'invalid'}")
    return [str(item) for item in data]


def extract_plant(class_name: str) -> str:
    prefix = class_name.split("___", 1)[0]
    prefix = re.sub(r"\([^)]*\)", " ", prefix)
    prefix = prefix.replace("_", " ").replace(",", " ")
    return re.sub(r"\s+", " ", prefix).strip()


def selected_key_for_plant(plant_name: str) -> str:
    raw = plant_name.lower().replace("_", " ").replace(",", " ")
    raw = re.sub(r"\([^)]*\)", " ", raw)
    raw = re.sub(r"\s+", " ", raw).strip()
    rules = [
        ("apple", "apple"),
        ("blueberry", "blueberry"),
        ("cherry", "cherry"),
        ("corn", "corn"),
        ("maize", "corn"),
        ("grape", "grape"),
        ("orange", "orange"),
        ("peach", "peach"),
        ("pepper", "pepper"),
        ("potato", "potato"),
        ("raspberry", "raspberry"),
        ("soybean", "soybean"),
        ("squash", "squash"),
        ("strawberry", "strawberry"),
        ("tomato", "tomato"),
    ]
    for needle, key in rules:
        if needle in raw:
            return key
    raise ValueError(f"cannot map plant to selected key: {plant_name}")


def wrong_selected_key(correct_key: str) -> str:
    for key in SUPPORTED_PLANT_KEYS:
        if key != correct_key:
            return key
    raise ValueError(f"cannot choose wrong selected key for {correct_key}")


def image_paths_for_class(test_root: Path, class_index: int) -> list[Path]:
    class_dir = test_root / str(class_index)
    if not class_dir.is_dir():
        raise FileNotFoundError(f"class test folder not found: {class_dir}")
    return sorted(
        p for p in class_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )


def obtain_token(client: httpx.Client, base_url: str, email: str, password: str) -> str:
    response = client.post(
        f"{base_url}/auth/login",
        json={"email": email, "password": password},
        timeout=30.0,
    )
    if response.status_code == 401:
        register = client.post(
            f"{base_url}/auth/register",
            json={"name": "PlantVillage API Test", "email": email, "password": password},
            timeout=30.0,
        )
        register.raise_for_status()
        payload = register.json()
        return str(payload["data"]["access_token"])

    response.raise_for_status()
    payload = response.json()
    return str(payload["data"]["access_token"])


def post_diagnose(
    client: httpx.Client,
    *,
    base_url: str,
    token: str,
    image_path: Path,
    selected_plant_key: str,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": (image_path.name, image_path.read_bytes(), "image/jpeg")}
    data = {"selected_plant_key": selected_plant_key}
    try:
        response = client.post(
            f"{base_url}/diagnose",
            headers=headers,
            files=files,
            data=data,
        )
    except Exception as exc:
        return {"success": False, "error_code": "REQUEST_ERROR", "request_error": str(exc)}

    try:
        payload = response.json()
    except Exception:
        return {
            "success": False,
            "error_code": "NON_JSON_RESPONSE",
            "status_code": response.status_code,
            "raw_response": response.text[:500],
        }
    payload["_status_code"] = response.status_code
    return payload


def payload_confidence(payload: dict[str, Any]) -> float | None:
    prediction = payload.get("prediction")
    if isinstance(prediction, dict) and isinstance(prediction.get("confidence"), (int, float)):
        return float(prediction["confidence"])

    debug = payload.get("debug")
    if isinstance(debug, dict) and isinstance(debug.get("confidence"), (int, float)):
        return float(debug["confidence"])
    return None


def count_error(code: str | None, counter: Counter[str]) -> None:
    if code:
        counter[code] += 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Full API test for PlantVillage SVM test classes.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--repo-url", default=DEFAULT_REPO_URL)
    parser.add_argument("--clone-dir", default=str(DEFAULT_CLONE_DIR))
    parser.add_argument("--class-names", default=str(DEFAULT_CLASS_NAMES))
    parser.add_argument("--correct-report", default=str(DEFAULT_CORRECT_REPORT))
    parser.add_argument("--wrong-report", default=str(DEFAULT_WRONG_REPORT))
    parser.add_argument("--timeout", type=float, default=60.0)
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    dataset_root = ensure_dataset_root(args.repo_url, Path(args.clone_dir).resolve())
    test_root = dataset_root / "data_distribution_for_SVM" / "test"
    class_names = load_class_names(Path(args.class_names).resolve())

    correct_report = Path(args.correct_report).resolve()
    wrong_report = Path(args.wrong_report).resolve()
    correct_report.parent.mkdir(parents=True, exist_ok=True)
    wrong_report.parent.mkdir(parents=True, exist_ok=True)

    correct_rows: list[dict[str, object]] = []
    wrong_rows: list[dict[str, object]] = []
    global_error_counter: Counter[str] = Counter()
    total_images = 0
    total_success = 0

    started = time.perf_counter()
    with httpx.Client(timeout=args.timeout) as client:
        token = obtain_token(client, base_url, args.email, args.password)

        for class_index, expected_label in enumerate(class_names):
            expected_plant = extract_plant(expected_label)
            selected_key = selected_key_for_plant(expected_plant)
            wrong_key = wrong_selected_key(selected_key)
            paths = image_paths_for_class(test_root, class_index)
            if not paths:
                raise RuntimeError(f"no images for class {class_index}: {expected_label}")

            correct_error_counter: Counter[str] = Counter()
            wrong_error_counter: Counter[str] = Counter()
            correct_success = 0
            correct_confidences: list[float] = []
            wrong_mismatch = 0
            wrong_unexpected_success = 0

            for image_path in paths:
                correct_payload = post_diagnose(
                    client,
                    base_url=base_url,
                    token=token,
                    image_path=image_path,
                    selected_plant_key=selected_key,
                )
                correct_code = correct_payload.get("error_code")
                if correct_payload.get("success") is True:
                    correct_success += 1
                else:
                    count_error(str(correct_code) if correct_code else None, correct_error_counter)
                    count_error(str(correct_code) if correct_code else None, global_error_counter)

                confidence = payload_confidence(correct_payload)
                if confidence is not None:
                    correct_confidences.append(confidence)

                wrong_payload = post_diagnose(
                    client,
                    base_url=base_url,
                    token=token,
                    image_path=image_path,
                    selected_plant_key=wrong_key,
                )
                wrong_code = wrong_payload.get("error_code")
                if wrong_payload.get("success") is True:
                    wrong_unexpected_success += 1
                elif wrong_code == "PLANT_MISMATCH":
                    wrong_mismatch += 1
                    global_error_counter["PLANT_MISMATCH"] += 1
                else:
                    count_error(str(wrong_code) if wrong_code else None, wrong_error_counter)
                    count_error(str(wrong_code) if wrong_code else None, global_error_counter)

            total = len(paths)
            total_images += total
            total_success += correct_success

            correct_row = {
                "class_index": class_index,
                "expected_label": expected_label,
                "expected_plant": expected_plant,
                "selected_plant_key": selected_key,
                "total_images": total,
                "success_count": correct_success,
                "success_rate": round(correct_success / total, 6),
                "plant_mismatch_count": correct_error_counter["PLANT_MISMATCH"],
                "unsupported_plant_count": correct_error_counter["UNSUPPORTED_PLANT"],
                "low_confidence_count": correct_error_counter["LOW_CONFIDENCE"],
                "unclear_image_count": sum(correct_error_counter[code] for code in UNCLEAR_IMAGE_CODES),
                "other_error_count": sum(
                    count
                    for code, count in correct_error_counter.items()
                    if code not in {"PLANT_MISMATCH", "UNSUPPORTED_PLANT", "LOW_CONFIDENCE", *UNCLEAR_IMAGE_CODES}
                ),
                "avg_confidence": round(sum(correct_confidences) / len(correct_confidences), 6)
                if correct_confidences else "",
            }
            wrong_row = {
                "class_index": class_index,
                "expected_label": expected_label,
                "expected_plant": expected_plant,
                "wrong_selected_plant_key": wrong_key,
                "total_images": total,
                "plant_mismatch_count": wrong_mismatch,
                "plant_mismatch_rate": round(wrong_mismatch / total, 6),
                "unexpected_success_count": wrong_unexpected_success,
                "unsupported_plant_count": wrong_error_counter["UNSUPPORTED_PLANT"],
                "low_confidence_count": wrong_error_counter["LOW_CONFIDENCE"],
                "other_error_count": sum(
                    count
                    for code, count in wrong_error_counter.items()
                    if code not in {"UNSUPPORTED_PLANT", "LOW_CONFIDENCE"}
                ),
            }
            correct_rows.append(correct_row)
            wrong_rows.append(wrong_row)
            print(
                f"class={class_index:02d} label={expected_label} images={total} "
                f"correct_success={correct_success}/{total} wrong_mismatch={wrong_mismatch}/{total}"
            )

    with correct_report.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "class_index",
                "expected_label",
                "expected_plant",
                "selected_plant_key",
                "total_images",
                "success_count",
                "success_rate",
                "plant_mismatch_count",
                "unsupported_plant_count",
                "low_confidence_count",
                "unclear_image_count",
                "other_error_count",
                "avg_confidence",
            ],
        )
        writer.writeheader()
        writer.writerows(correct_rows)

    with wrong_report.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "class_index",
                "expected_label",
                "expected_plant",
                "wrong_selected_plant_key",
                "total_images",
                "plant_mismatch_count",
                "plant_mismatch_rate",
                "unexpected_success_count",
                "unsupported_plant_count",
                "low_confidence_count",
                "other_error_count",
            ],
        )
        writer.writeheader()
        writer.writerows(wrong_rows)

    most_rejected = min(correct_rows, key=lambda row: float(row["success_rate"]))
    most_common_error = global_error_counter.most_common(1)
    duration_s = time.perf_counter() - started

    print("summary:")
    print(f"  total_images={total_images}")
    print(f"  overall_api_success_rate={total_success / total_images:.6f}")
    print(
        "  api_reject_heaviest_class="
        f"{most_rejected['class_index']} {most_rejected['expected_label']} success_rate={most_rejected['success_rate']}"
    )
    print(f"  most_common_error_code={most_common_error[0][0] if most_common_error else ''}")
    print(f"  most_common_error_count={most_common_error[0][1] if most_common_error else 0}")
    print(f"  correct_report_saved={correct_report}")
    print(f"  wrong_report_saved={wrong_report}")
    print(f"  duration_seconds={duration_s:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

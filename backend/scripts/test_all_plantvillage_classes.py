#!/usr/bin/env python3
"""
Run ONNX inference for all PlantVillage SVM test classes (0..37).

Usage:
  python3 backend/scripts/test_all_plantvillage_classes.py
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

import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except Exception as exc:  # pragma: no cover
    raise SystemExit(f"error: cannot import onnxruntime: {exc}") from exc

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
REPO_ROOT = BACKEND_ROOT.parent
MODELS_DIR = BACKEND_ROOT / "app" / "models"

DEFAULT_REPO_URL = "https://github.com/spMohanty/PlantVillage-Dataset.git"
DEFAULT_CLONE_DIR = BACKEND_ROOT / ".cache" / "PlantVillage-Dataset"
TMP_CLONE_DIR = Path("/tmp/PlantVillage-Dataset-sparse2")
DEFAULT_CLASS_NAMES = MODELS_DIR / "class_names.json"
DEFAULT_MODEL_PATH = MODELS_DIR / "efficientnetv2s_plantvillage.onnx"
DEFAULT_REPORT_PATH = BACKEND_ROOT / "test_results" / "full_onnx_summary.csv"

INPUT_SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape((1, 3, 1, 1))
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape((1, 3, 1, 1))


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


def preprocess_image(image_path: Path) -> np.ndarray:
    img = Image.open(image_path).convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0).astype(np.float32)
    arr = (arr - MEAN) / STD
    return arr.astype(np.float32, copy=False)


def softmax(logits: np.ndarray) -> np.ndarray:
    logits = np.asarray(logits, dtype=np.float32)
    logits = logits - np.max(logits)
    exp = np.exp(logits)
    return (exp / np.sum(exp)).astype(np.float32)


def normalize_output(raw_output: np.ndarray, num_classes: int) -> np.ndarray:
    arr = np.asarray(raw_output, dtype=np.float32).squeeze()
    if arr.ndim != 1:
        arr = arr.reshape(-1)
    if len(arr) != num_classes:
        raise ValueError(f"output class mismatch: model={len(arr)} expected={num_classes}")
    if np.all(arr >= 0) and 0.98 <= float(arr.sum()) <= 1.02:
        arr = np.clip(arr, 1e-6, 1.0)
        arr /= np.sum(arr)
        return arr
    return softmax(arr)


def image_paths_for_class(test_root: Path, class_index: int) -> list[Path]:
    class_dir = test_root / str(class_index)
    if not class_dir.is_dir():
        raise FileNotFoundError(f"class test folder not found: {class_dir}")
    return sorted(
        p for p in class_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )


def format_wrong_labels(counter: Counter[str]) -> str:
    return "; ".join(f"{label}:{count}" for label, count in counter.most_common(5))


def main() -> int:
    parser = argparse.ArgumentParser(description="Full ONNX test for PlantVillage SVM test classes.")
    parser.add_argument("--repo-url", default=DEFAULT_REPO_URL)
    parser.add_argument("--clone-dir", default=str(DEFAULT_CLONE_DIR))
    parser.add_argument("--model-path", default=str(DEFAULT_MODEL_PATH))
    parser.add_argument("--class-names", default=str(DEFAULT_CLASS_NAMES))
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH))
    args = parser.parse_args()

    dataset_root = ensure_dataset_root(args.repo_url, Path(args.clone_dir).resolve())
    test_root = dataset_root / "data_distribution_for_SVM" / "test"
    class_names = load_class_names(Path(args.class_names).resolve())

    session = ort.InferenceSession(str(Path(args.model_path).resolve()), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    report_path = Path(args.report_path).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, object]] = []
    total_images = 0
    total_correct_label = 0
    total_correct_plant = 0

    started = time.perf_counter()
    for class_index, expected_label in enumerate(class_names):
        expected_plant = extract_plant(expected_label)
        paths = image_paths_for_class(test_root, class_index)
        if not paths:
            raise RuntimeError(f"no images for class {class_index}: {expected_label}")

        correct_label = 0
        correct_plant = 0
        confidences: list[float] = []
        wrong_labels: Counter[str] = Counter()

        for image_path in paths:
            tensor = preprocess_image(image_path)
            raw_output = session.run([output_name], {input_name: tensor})[0]
            probs = normalize_output(raw_output, len(class_names))
            pred_idx = int(np.argmax(probs))
            predicted_label = class_names[pred_idx]
            predicted_plant = extract_plant(predicted_label)
            confidence = float(probs[pred_idx])

            confidences.append(confidence)
            if predicted_label == expected_label:
                correct_label += 1
            else:
                wrong_labels[predicted_label] += 1

            if predicted_plant.lower() == expected_plant.lower():
                correct_plant += 1

        total = len(paths)
        total_images += total
        total_correct_label += correct_label
        total_correct_plant += correct_plant

        row = {
            "class_index": class_index,
            "expected_label": expected_label,
            "expected_plant": expected_plant,
            "total_images": total,
            "correct_label_count": correct_label,
            "label_accuracy": round(correct_label / total, 6),
            "correct_plant_count": correct_plant,
            "plant_accuracy": round(correct_plant / total, 6),
            "avg_confidence": round(float(np.mean(confidences)), 6),
            "min_confidence": round(float(np.min(confidences)), 6),
            "max_confidence": round(float(np.max(confidences)), 6),
            "most_common_wrong_labels": format_wrong_labels(wrong_labels),
        }
        rows.append(row)
        print(
            f"class={class_index:02d} label={expected_label} "
            f"images={total} label_acc={row['label_accuracy']:.4f} plant_acc={row['plant_accuracy']:.4f}"
        )

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "class_index",
                "expected_label",
                "expected_plant",
                "total_images",
                "correct_label_count",
                "label_accuracy",
                "correct_plant_count",
                "plant_accuracy",
                "avg_confidence",
                "min_confidence",
                "max_confidence",
                "most_common_wrong_labels",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    lowest_label = min(rows, key=lambda item: float(item["label_accuracy"]))
    lowest_plant = min(rows, key=lambda item: float(item["plant_accuracy"]))
    duration_s = time.perf_counter() - started

    print("summary:")
    print(f"  total_images={total_images}")
    print(f"  overall_label_accuracy={total_correct_label / total_images:.6f}")
    print(f"  overall_plant_accuracy={total_correct_plant / total_images:.6f}")
    print(
        "  lowest_label_accuracy_class="
        f"{lowest_label['class_index']} {lowest_label['expected_label']} {lowest_label['label_accuracy']}"
    )
    print(
        "  lowest_plant_accuracy_class="
        f"{lowest_plant['class_index']} {lowest_plant['expected_label']} {lowest_plant['plant_accuracy']}"
    )
    print(f"  report_saved={report_path}")
    print(f"  duration_seconds={duration_s:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

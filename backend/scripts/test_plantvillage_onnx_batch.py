#!/usr/bin/env python3
"""
Batch-test ONNX model on PlantVillage test images and export CSV report.

Required output fields per image:
- file name
- predicted label
- predicted plant
- disease
- confidence
- top-5 predictions
- inference time

Usage:
  python scripts/test_plantvillage_onnx_batch.py
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import time
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except Exception as exc:  # pragma: no cover
    raise SystemExit(f"error: cannot import onnxruntime: {exc}") from exc


SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
MODELS_DIR = BACKEND_ROOT / "app" / "models"

DEFAULT_IMAGE_DIR = BACKEND_ROOT / "test_images" / "plantvillage_test_0"
DEFAULT_MODEL_PATH = MODELS_DIR / "efficientnetv2s_plantvillage.onnx"
DEFAULT_CLASS_NAMES = MODELS_DIR / "class_names.json"
DEFAULT_REPORT_PATH = BACKEND_ROOT / "test_results" / "plantvillage_test_0_report.csv"

INPUT_SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape((1, 3, 1, 1))
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape((1, 3, 1, 1))


def extract_plant(class_name: str) -> str:
    prefix = (class_name or "").split("___", 1)[0]
    prefix = re.sub(r"\([^)]*\)", " ", prefix)
    prefix = prefix.replace("_", " ").replace(",", " ")
    prefix = re.sub(r"\s+", " ", prefix).strip()
    return prefix


def extract_disease(class_name: str) -> str:
    if "___" not in class_name:
        return class_name
    disease = class_name.split("___", 1)[1]
    return disease.replace("_", " ").strip()


def load_class_names(path: Path) -> list[str]:
    if not path.is_file():
        raise FileNotFoundError(f"class names file not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("class names must be a non-empty list")
    return [str(item) for item in data]


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


def find_expected_label(image_dir: Path, fallback: str | None) -> str:
    metadata_path = image_dir / "plantvillage_metadata.json"
    if metadata_path.is_file():
        try:
            data = json.loads(metadata_path.read_text(encoding="utf-8"))
            value = str(data.get("expected_label", "")).strip()
            if value:
                return value
        except Exception:
            pass
    if fallback:
        return fallback
    return "unknown"


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch ONNX test for PlantVillage class folder.")
    parser.add_argument("--image-dir", default=str(DEFAULT_IMAGE_DIR), help="Input image directory")
    parser.add_argument("--model-path", default=str(DEFAULT_MODEL_PATH), help="ONNX model path")
    parser.add_argument("--class-names", default=str(DEFAULT_CLASS_NAMES), help="class_names.json path")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="Output CSV report path")
    parser.add_argument("--expected-class-index", type=int, default=0, help="Expected dataset class index")
    parser.add_argument(
        "--expected-label",
        default=None,
        help="Expected label for this class folder (auto-read from metadata if omitted)",
    )
    args = parser.parse_args()

    image_dir = Path(args.image_dir).resolve()
    model_path = Path(args.model_path).resolve()
    class_names_path = Path(args.class_names).resolve()
    report_path = Path(args.report_path).resolve()

    if not image_dir.is_dir():
        raise FileNotFoundError(f"image directory not found: {image_dir}")
    if not model_path.is_file():
        raise FileNotFoundError(f"model not found: {model_path}")

    class_names = load_class_names(class_names_path)
    expected_label = find_expected_label(image_dir, args.expected_label)
    expected_plant = extract_plant(expected_label)

    image_paths = sorted(
        p
        for p in image_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if not image_paths:
        raise RuntimeError(f"no images found in: {image_dir}")

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = session.get_outputs()
    if not inputs or not outputs:
        raise RuntimeError("ONNX model has no input/output nodes")

    input_info = inputs[0]
    output_info = outputs[0]
    input_name = input_info.name
    output_name = output_info.name
    output_shape = output_info.shape

    print(f"image_dir: {image_dir}")
    print(f"model_path: {model_path}")
    print(f"class_names_path: {class_names_path}")
    print(f"report_path: {report_path}")
    print(f"total_images: {len(image_paths)}")
    print(f"expected_class_index: {args.expected_class_index}")
    print(f"expected_label: {expected_label}")
    print(f"expected_plant: {expected_plant}")
    print("preprocess_pipeline: RGB -> resize(224x224) -> /255 -> normalize(ImageNet mean/std) -> NCHW float32")
    print(f"onnx_input_name: {input_name}")
    print(f"onnx_input_shape: {input_info.shape}")
    print(f"onnx_input_type: {input_info.type}")
    print(f"onnx_output_name: {output_name}")
    print(f"onnx_output_shape: {output_shape}")
    print(f"class_names_count: {len(class_names)}")
    print(f"class_index_0_from_model_labels: {class_names[0]}")

    # Diagnostic checks requested by user.
    checks = {
        "labels_count_matches_output": (
            len(class_names) == output_shape[-1] if isinstance(output_shape, list) and output_shape else True
        ),
        "resize_size": INPUT_SIZE,
        "normalize_mean": [0.485, 0.456, 0.406],
        "normalize_std": [0.229, 0.224, 0.225],
        "channel_order": "RGB",
        "tensor_layout": "NCHW",
    }
    print("diagnostic_checks:", json.dumps(checks, ensure_ascii=False))

    rows: list[dict[str, str | int | float | bool]] = []
    correct_label = 0
    correct_plant = 0

    for image_path in image_paths:
        tensor = preprocess_image(image_path)

        start = time.perf_counter()
        raw_output = session.run([output_name], {input_name: tensor})[0]
        infer_ms = (time.perf_counter() - start) * 1000.0

        probs = normalize_output(raw_output, len(class_names))
        top_indices = np.argsort(probs)[::-1][:5]

        pred_idx = int(top_indices[0])
        predicted_label = class_names[pred_idx]
        predicted_plant = extract_plant(predicted_label)
        disease = extract_disease(predicted_label)
        confidence = float(probs[pred_idx])

        top5 = []
        for idx in top_indices:
            class_name = class_names[int(idx)]
            top5.append(
                {
                    "class_index": int(idx),
                    "class_name": class_name,
                    "plant": extract_plant(class_name),
                    "confidence": round(float(probs[int(idx)]), 6),
                }
            )

        is_correct_label = predicted_label == expected_label
        is_correct_plant = predicted_plant.lower() == expected_plant.lower()
        if is_correct_label:
            correct_label += 1
        if is_correct_plant:
            correct_plant += 1

        top5_json = json.dumps(top5, ensure_ascii=False)

        print(
            f"[{image_path.name}] "
            f"predicted_label={predicted_label} "
            f"predicted_plant={predicted_plant} "
            f"disease={disease} "
            f"confidence={confidence:.6f} "
            f"inference_time_ms={infer_ms:.3f}"
        )
        print(f"  top5={top5_json}")

        rows.append(
            {
                "image_name": image_path.name,
                "expected_class_index": args.expected_class_index,
                "expected_label": expected_label,
                "predicted_label": predicted_label,
                "predicted_plant": predicted_plant,
                "confidence": round(confidence, 6),
                "is_correct_label": is_correct_label,
                "is_correct_plant": is_correct_plant,
                "top5_predictions": top5_json,
                "inference_time_ms": round(infer_ms, 3),
            }
        )

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "image_name",
                "expected_class_index",
                "expected_label",
                "predicted_label",
                "predicted_plant",
                "confidence",
                "is_correct_label",
                "is_correct_plant",
                "top5_predictions",
                "inference_time_ms",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    total = len(rows)
    print("summary:")
    print(f"  total_images={total}")
    print(f"  correct_label={correct_label}/{total} ({(correct_label / total) * 100:.2f}%)")
    print(f"  correct_plant={correct_plant}/{total} ({(correct_plant / total) * 100:.2f}%)")
    print(f"  report_saved={report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

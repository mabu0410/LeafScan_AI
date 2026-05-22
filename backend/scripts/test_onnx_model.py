#!/usr/bin/env python3
"""
Test ONNX model prediction cho 1 ảnh.

Usage:
    python scripts/test_onnx_model.py /path/to/test.jpg
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except Exception as exc:  # pragma: no cover
    print(f"error: cannot import onnxruntime: {exc}")
    sys.exit(2)

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
MODELS_DIR = BACKEND_ROOT / "app" / "models"

DEFAULT_MODEL_PATH = MODELS_DIR / "efficientnetv2s_plantvillage.onnx"
DEFAULT_CLASS_NAMES_PATH = MODELS_DIR / "class_names.json"

INPUT_SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape((1, 3, 1, 1))
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape((1, 3, 1, 1))


def load_class_names(path: Path) -> list[str]:
    if not path.is_file():
        raise FileNotFoundError(f"class_names file not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("class_names must be a non-empty list")
    return [str(item) for item in data]


def preprocess_image(image_path: Path) -> np.ndarray:
    img = Image.open(image_path).convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0).astype(np.float32)
    arr = (arr - MEAN) / STD
    return arr.astype(np.float32, copy=False)


def softmax(logits: np.ndarray) -> np.ndarray:
    logits = logits.astype(np.float32)
    logits = logits - np.max(logits)
    exp = np.exp(logits)
    return (exp / np.sum(exp)).astype(np.float32)


def normalize_output(raw_output: np.ndarray, num_classes: int) -> np.ndarray:
    arr = np.array(raw_output, dtype=np.float32).squeeze()
    if arr.ndim != 1:
        arr = arr.reshape(-1)

    if len(arr) != num_classes:
        raise ValueError(f"output class mismatch: model={len(arr)} expected={num_classes}")

    if np.all(arr >= 0) and 0.98 <= float(arr.sum()) <= 1.02:
        arr = np.clip(arr, 1e-6, 1.0)
        arr /= arr.sum()
        return arr

    return softmax(arr)


def main() -> int:
    parser = argparse.ArgumentParser(description="Test ONNX model inference.")
    parser.add_argument("image_path", help="Đường dẫn ảnh test")
    parser.add_argument("--model-path", default=str(DEFAULT_MODEL_PATH), help="Đường dẫn ONNX model")
    parser.add_argument("--class-names", default=str(DEFAULT_CLASS_NAMES_PATH), help="Đường dẫn class_names.json")
    args = parser.parse_args()

    image_path = Path(args.image_path).resolve()
    model_path = Path(args.model_path).resolve()
    class_names_path = Path(args.class_names).resolve()

    if not image_path.is_file():
        print(f"error: image not found: {image_path}")
        return 1
    if not model_path.is_file():
        print(f"error: model not found: {model_path}")
        return 1

    class_names = load_class_names(class_names_path)
    tensor = preprocess_image(image_path)

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    raw_output = session.run([output_name], {input_name: tensor})[0]
    probs = normalize_output(raw_output, len(class_names))

    top_k = min(5, len(class_names))
    top_indices = np.argsort(probs)[::-1][:top_k]

    print(f"input_image_path: {image_path}")
    print(f"model_path: {model_path}")
    print(f"input_shape: {list(tensor.shape)}")
    print(
        "preprocessing: "
        "RGB -> resize(224x224) -> /255.0 -> normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]) -> NCHW float32"
    )
    print("top_5_predictions:")

    for rank, idx in enumerate(top_indices, start=1):
        class_name = class_names[int(idx)]
        conf = float(probs[int(idx)])
        print(f"  {rank}. class_index={int(idx)} class_name={class_name} confidence={conf:.6f}")

    best_idx = int(top_indices[0])
    print(f"predicted_class: {class_names[best_idx]}")
    print(f"class_index: {best_idx}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

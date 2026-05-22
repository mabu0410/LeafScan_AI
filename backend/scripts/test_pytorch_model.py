#!/usr/bin/env python3
"""
Test PyTorch model prediction cho 1 ảnh.

Usage:
    python scripts/test_pytorch_model.py /path/to/test.jpg
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
MODELS_DIR = BACKEND_ROOT / "app" / "models"

DEFAULT_MODEL_PATH = MODELS_DIR / "best_model.pth"
DEFAULT_CLASS_NAMES_PATH = MODELS_DIR / "class_names.json"

INPUT_SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape((1, 3, 1, 1))
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape((1, 3, 1, 1))


def load_class_names(path: Path, checkpoint: dict | None) -> list[str]:
    if path.is_file():
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list) and data:
            return [str(item) for item in data]

    if isinstance(checkpoint, dict):
        value = checkpoint.get("class_names")
        if isinstance(value, list) and value:
            return [str(item) for item in value]

    raise ValueError(
        "Không tìm thấy class_names. Cần class_names.json hoặc metadata class_names trong checkpoint."
    )


def preprocess_image(image_path: Path) -> np.ndarray:
    img = Image.open(image_path).convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0).astype(np.float32)
    arr = (arr - MEAN) / STD
    return arr.astype(np.float32, copy=False)


def _extract_state_dict(checkpoint: object) -> dict:
    if isinstance(checkpoint, dict):
        if isinstance(checkpoint.get("model_state_dict"), dict):
            state_dict = checkpoint["model_state_dict"]
        elif isinstance(checkpoint.get("state_dict"), dict):
            state_dict = checkpoint["state_dict"]
        elif all(isinstance(k, str) for k in checkpoint.keys()):
            state_dict = checkpoint
        else:
            raise ValueError("checkpoint không chứa state_dict hợp lệ")
    else:
        raise ValueError("checkpoint phải là dict")

    keys = list(state_dict.keys())
    if keys and all(key.startswith("module.") for key in keys):
        state_dict = {key[len("module."):]: value for key, value in state_dict.items()}

    return state_dict


def main() -> int:
    try:
        import torch
        import torch.nn as nn
        from torchvision import models
    except Exception as exc:  # pragma: no cover
        print(f"error: cannot import torch/torchvision: {exc}")
        print("hint: cài torch + torchvision để chạy script PyTorch.")
        return 2

    parser = argparse.ArgumentParser(description="Test PyTorch model inference.")
    parser.add_argument("image_path", help="Đường dẫn ảnh test")
    parser.add_argument("--model-path", default=str(DEFAULT_MODEL_PATH), help="Đường dẫn checkpoint .pth")
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

    checkpoint = torch.load(str(model_path), map_location="cpu")
    class_names = load_class_names(class_names_path, checkpoint if isinstance(checkpoint, dict) else None)
    num_classes = len(class_names)

    state_dict = _extract_state_dict(checkpoint)

    model = models.efficientnet_v2_s(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )

    load_result = model.load_state_dict(state_dict, strict=False)
    if load_result.missing_keys:
        print(f"warning: missing_keys={len(load_result.missing_keys)}")
    if load_result.unexpected_keys:
        print(f"warning: unexpected_keys={len(load_result.unexpected_keys)}")

    model.eval()

    tensor_np = preprocess_image(image_path)
    tensor = torch.from_numpy(tensor_np)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1).cpu().numpy().reshape(-1)

    top_k = min(5, num_classes)
    top_indices = np.argsort(probs)[::-1][:top_k]

    print(f"input_image_path: {image_path}")
    print(f"model_path: {model_path}")
    print(f"input_shape: {list(tensor_np.shape)}")
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

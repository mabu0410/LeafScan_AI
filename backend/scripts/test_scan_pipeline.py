#!/usr/bin/env python3
"""
Test full scan pipeline: leaf validation -> model prediction.

Usage:
    python scripts/test_scan_pipeline.py test_images/non_leaf_laptop.jpg
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.leaf_validator import validate_leaf_image
from app.services.model_service import ModelService
from app.services.plant_scope_validator import build_supported_plants, validate_plant_scope


def main() -> int:
    parser = argparse.ArgumentParser(description="Test scan pipeline on one image.")
    parser.add_argument("image_path", help="Đường dẫn ảnh test")
    parser.add_argument("--selected-plant-key", default=None, help="Plant key user selected trước khi quét")
    args = parser.parse_args()

    image_path = Path(args.image_path).resolve()
    if not image_path.is_file():
        print(f"error: file not found: {image_path}")
        return 1

    with Image.open(image_path) as img:
        validation = validate_leaf_image(img)

    print(f"input_image_path: {image_path}")
    print("validation_metrics:")
    for k, v in validation.get("metrics", {}).items():
        print(f"  {k}: {v}")

    print(f"validation_result: {validation.get('is_valid')}")

    if not validation.get("is_valid", False):
        print(f"error_code: {validation.get('error_code')}")
        print(f"message: {validation.get('message')}")
        return 0

    model_service = ModelService()
    predictions = model_service.predict(str(image_path))
    top_5 = predictions[:5]
    supported_plants = build_supported_plants(model_service.DISEASE_CLASSES)
    scope = validate_plant_scope(
        predictions=top_5,
        supported_plants=supported_plants,
        selected_plant_key=args.selected_plant_key,
        min_top1_confidence=0.75,
        min_margin=0.20,
        min_top5_same_plant_count=2,
    )

    print("plant_scope_debug:")
    debug = scope.get("debug", {})
    for k, v in debug.items():
        if k == "top_predictions":
            continue
        print(f"  {k}: {v}")

    if not scope.get("is_valid", False):
        print(f"error_code: {scope.get('error_code')}")
        print(f"message: {scope.get('message')}")
        print("top_5_predictions:")
        for rank, pred in enumerate(top_5, start=1):
            print(
                "  "
                f"{rank}. class_index={pred.class_index} "
                f"class_name={pred.class_name} disease_key={pred.disease_key} "
                f"confidence={pred.confidence:.6f}"
            )
        return 0

    print("top_5_predictions:")
    for rank, pred in enumerate(top_5, start=1):
        print(
            "  "
            f"{rank}. class_index={pred.class_index} "
            f"class_name={pred.class_name} disease_key={pred.disease_key} "
            f"confidence={pred.confidence:.6f}"
        )

    if top_5:
        best = top_5[0]
        print(f"predicted_class: {best.class_name}")
        print(f"class_index: {best.class_index}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

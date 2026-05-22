#!/usr/bin/env python3
"""
Quick tester cho heuristic validate_leaf_image.

Usage:
    python scripts/test_leaf_validation.py /path/to/image.jpg
"""
from __future__ import annotations

import argparse
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from PIL import Image

from app.services.leaf_validator import validate_leaf_image


def main() -> int:
    parser = argparse.ArgumentParser(description="Test leaf image validation metrics.")
    parser.add_argument("image_path", help="Đường dẫn ảnh cần kiểm tra.")
    args = parser.parse_args()

    image_path = args.image_path
    if not os.path.isfile(image_path):
        print(f"error: file not found: {image_path}")
        return 1

    try:
        with Image.open(image_path) as img:
            result = validate_leaf_image(img)
    except Exception as exc:
        print(f"error: cannot validate image: {exc}")
        return 1

    metrics = result.get("metrics", {})
    print(f"green_ratio: {metrics.get('green_ratio', 0.0):.4f}")
    print(f"largest_green_area_ratio: {metrics.get('largest_green_area_ratio', 0.0):.4f}")
    print(f"brightness: {metrics.get('brightness', 0.0):.2f}")
    print(f"blur_score: {metrics.get('blur_score', 0.0):.2f}")
    print(f"is_valid_leaf: {result.get('is_valid')}")
    if result.get("error_code"):
        print(f"reason: {result.get('error_code')} - {result.get('message')}")
        print(f"debug_reason: {metrics.get('reason')}")
    else:
        print("reason: VALID_LEAF")
    return 0


if __name__ == "__main__":
    sys.exit(main())

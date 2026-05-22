#!/usr/bin/env python3
"""
Kiểm tra class labels của dataset HuggingFace và so sánh với class_names.json local.

Usage:
    python scripts/check_hf_dataset_classes.py TEN_DATASET_HF

Ví dụ:
    python scripts/check_hf_dataset_classes.py ai-lab-Makerere/plantvillage
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
CLASS_NAMES_PATH = BACKEND_ROOT / "app" / "models" / "class_names.json"


def _normalize_text(value: str) -> str:
    text = value.strip().lower()
    text = text.replace("___", " ")
    text = text.replace("_", " ")
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _looks_like_strawberry_leaf_spot(class_name: str) -> bool:
    norm = _normalize_text(class_name)
    has_strawberry = "strawberry" in norm
    has_leaf_spot = "leaf spot" in norm or "leafspot" in norm
    return has_strawberry and has_leaf_spot


def _load_local_class_names(path: Path) -> list[str]:
    if not path.is_file():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError(f"Invalid class_names.json format: {path}")
    return [str(item) for item in raw]


def _as_split_items(dataset_obj: Any) -> list[tuple[str, Any]]:
    if hasattr(dataset_obj, "items"):
        return list(dataset_obj.items())
    return [("dataset", dataset_obj)]


def _extract_label_names(dataset_obj: Any, dataset_name: str) -> list[str]:
    # Ưu tiên tìm field `label` có metadata names.
    for split_name, split_ds in _as_split_items(dataset_obj):
        features = getattr(split_ds, "features", None)
        if not features:
            continue

        if "label" in features and getattr(features["label"], "names", None):
            return list(features["label"].names)

        # Fallback: field kiểu ClassLabel bất kỳ.
        for field_name, feature in features.items():
            if getattr(feature, "names", None):
                print(f"info: using ClassLabel field '{field_name}' from split '{split_name}'")
                return list(feature.names)

    # Fallback cuối: nếu có cột chuỗi class_name / disease.
    candidate_cols = [
        "class_name",
        "label_name",
        "disease",
        "disease_name",
        "category",
    ]
    for split_name, split_ds in _as_split_items(dataset_obj):
        col_names = set(getattr(split_ds, "column_names", []) or [])
        for col in candidate_cols:
            if col in col_names:
                values = split_ds.unique(col)
                return sorted(str(v) for v in values)

    raise RuntimeError(
        "Không tìm thấy metadata label classes trong dataset. "
        f"Hãy kiểm tra schema dataset '{dataset_name}'."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Check HF dataset classes and compare with local class_names.json")
    parser.add_argument("dataset_name", help="Tên dataset HuggingFace (vd: namespace/name)")
    parser.add_argument("--class-file", default=str(CLASS_NAMES_PATH), help="Path class_names.json local")
    parser.add_argument(
        "--config",
        default=None,
        help="Tên config HF (optional). Nếu bỏ trống, script tự chọn config phù hợp.",
    )
    args = parser.parse_args()

    default_hf_cache = Path.home() / ".cache" / "huggingface"
    if (
        "HF_HOME" not in os.environ
        and default_hf_cache.exists()
        and not os.access(default_hf_cache, os.W_OK)
    ):
        os.environ["HF_HOME"] = "/tmp/huggingface"
        os.environ["HF_DATASETS_CACHE"] = "/tmp/huggingface/datasets"
        print("info: HF cache mặc định chỉ đọc, chuyển sang /tmp/huggingface")

    try:
        from datasets import get_dataset_config_names, load_dataset  # type: ignore
    except Exception as exc:
        print(f"error: không import được thư viện 'datasets': {exc}")
        print("hint: pip install datasets")
        return 2

    dataset_name = args.dataset_name.strip()
    class_file = Path(args.class_file).resolve()

    print(f"dataset_name: {dataset_name}")
    print(f"local_class_file: {class_file}")

    dataset_obj = None
    tried: list[str] = []
    load_errors: list[str] = []

    config_candidates: list[str | None]
    if args.config:
        config_candidates = [args.config]
    else:
        try:
            cfgs = list(get_dataset_config_names(dataset_name))
            config_candidates = cfgs if cfgs else [None]
        except Exception:
            config_candidates = [None]

    for cfg in config_candidates:
        try:
            if cfg is None:
                dataset_obj = load_dataset(dataset_name)
                tried.append("<default>")
            else:
                dataset_obj = load_dataset(dataset_name, cfg)
                tried.append(cfg)
            if dataset_obj is not None:
                break
        except Exception as exc:
            tried.append(cfg or "<default>")
            load_errors.append(f"{cfg or '<default>'}: {exc}")

    if dataset_obj is None:
        print(f"error: không load được dataset '{dataset_name}'")
        print("tried_configs:", ", ".join(tried))
        for err in load_errors:
            print("  -", err)
        return 1

    label_names = _extract_label_names(dataset_obj, dataset_name)
    total_classes = len(label_names)

    print(f"total_classes: {total_classes}")
    print("label_index_to_class_name:")
    for idx, name in enumerate(label_names):
        print(f"  {idx:>3}: {name}")

    has_strawberry_leaf_spot = any(_looks_like_strawberry_leaf_spot(name) for name in label_names)
    print(f"has_strawberry_leaf_spot: {has_strawberry_leaf_spot}")

    if total_classes == 38:
        print("dataset_variant: 38-class PlantVillage")
    else:
        print(f"dataset_variant: extended/non-38 (class_count={total_classes})")

    local_classes = _load_local_class_names(class_file)
    if not local_classes:
        print("warning: không đọc được class_names.json local để so sánh.")
        return 0

    dataset_set = set(label_names)
    local_set = set(local_classes)

    in_dataset_not_in_local = sorted(dataset_set - local_set)
    in_local_not_in_dataset = sorted(local_set - dataset_set)

    print(f"dataset_but_missing_in_class_names_json_count: {len(in_dataset_not_in_local)}")
    for name in in_dataset_not_in_local:
        print(f"  + {name}")

    print(f"class_names_json_but_missing_in_dataset_count: {len(in_local_not_in_dataset)}")
    for name in in_local_not_in_dataset:
        print(f"  - {name}")

    if not has_strawberry_leaf_spot:
        print(
            "Model hiện tại không hỗ trợ nhận diện riêng Đốm lá dâu tây, "
            "chỉ có Strawberry___Leaf_scorch và Strawberry___healthy."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

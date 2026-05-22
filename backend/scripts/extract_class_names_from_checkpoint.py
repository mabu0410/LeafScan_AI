#!/usr/bin/env python3
"""
Trích class order từ checkpoint .pth (không cần torch).

Usage:
    python scripts/extract_class_names_from_checkpoint.py
    python scripts/extract_class_names_from_checkpoint.py --checkpoint app/models/best_model.pth --output app/models/class_names.json
"""
from __future__ import annotations

import argparse
import json
import pickletools
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
DEFAULT_CHECKPOINT = BACKEND_ROOT / "app" / "models" / "best_model.pth"
DEFAULT_OUTPUT = BACKEND_ROOT / "app" / "models" / "class_names.json"


def load_pickle_payload(checkpoint_path: Path) -> bytes:
    with zipfile.ZipFile(checkpoint_path, "r") as archive:
        data_name = next((name for name in archive.namelist() if name.endswith("data.pkl")), None)
        if not data_name:
            raise ValueError("checkpoint không chứa data.pkl")
        return archive.read(data_name)


def extract_class_names(payload: bytes) -> list[str]:
    ops = list(pickletools.genops(payload))
    string_ops = {"UNICODE", "BINUNICODE", "SHORT_BINUNICODE"}

    for idx, (op, arg, _) in enumerate(ops):
        if op.name not in string_ops or arg != "class_names":
            continue

        class_names: list[str] = []
        collecting = False
        for op2, arg2, _ in ops[idx + 1:]:
            if not collecting:
                if op2.name == "MARK":
                    collecting = True
                continue

            if op2.name == "APPENDS":
                break

            if op2.name in string_ops and isinstance(arg2, str):
                class_names.append(arg2)

        filtered = [name for name in class_names if "___" in name]
        if filtered:
            return filtered

    return []


def has_class_to_idx_marker(payload: bytes) -> bool:
    ops = list(pickletools.genops(payload))
    for op, arg, _ in ops:
        if op.name in {"UNICODE", "BINUNICODE", "SHORT_BINUNICODE"} and arg == "class_to_idx":
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract class names from PyTorch checkpoint metadata.")
    parser.add_argument("--checkpoint", default=str(DEFAULT_CHECKPOINT), help="Đường dẫn checkpoint .pth")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Đường dẫn file class_names.json output")
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint).resolve()
    output_path = Path(args.output).resolve()

    if not checkpoint_path.is_file():
        print(f"error: checkpoint not found: {checkpoint_path}")
        return 1

    payload = load_pickle_payload(checkpoint_path)
    class_names = extract_class_names(payload)
    marker = has_class_to_idx_marker(payload)

    print(f"checkpoint: {checkpoint_path}")
    print(f"class_to_idx_marker_found: {marker}")

    if not class_names:
        print("error: không tìm thấy class_names trong checkpoint metadata.")
        print("Cần lấy class order từ thư mục train dataset gốc.")
        return 2

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(class_names, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"class_names_count: {len(class_names)}")
    print(f"saved_to: {output_path}")
    print(f"first_class: {class_names[0]}")
    print(f"last_class: {class_names[-1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

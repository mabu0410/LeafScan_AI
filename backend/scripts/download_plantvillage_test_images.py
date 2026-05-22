#!/usr/bin/env python3
"""
Download PlantVillage test images by sparse-cloning the official GitHub repository.

This script avoids downloading GitHub HTML pages by using `git clone` directly.

Usage:
  python scripts/download_plantvillage_test_images.py
  python scripts/download_plantvillage_test_images.py --class-index 0 --split test
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent

DEFAULT_REPO_URL = "https://github.com/spMohanty/PlantVillage-Dataset.git"
DEFAULT_CLONE_DIR = BACKEND_ROOT / ".cache" / "PlantVillage-Dataset"
DEFAULT_SPLIT = "test"
DEFAULT_CLASS_INDEX = 0
DEFAULT_OUTPUT_DIR = BACKEND_ROOT / "test_images" / "plantvillage_test_0"


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def ensure_repo(repo_url: str, clone_dir: Path) -> None:
    clone_dir.parent.mkdir(parents=True, exist_ok=True)

    if (clone_dir / ".git").is_dir():
        print(f"info: reusing existing repo at {clone_dir}")
    else:
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

    # Keep checkout minimal: only SVM distribution folder.
    run(["git", "-C", str(clone_dir), "sparse-checkout", "set", "data_distribution_for_SVM"])


def parse_mapping(mapping_path: Path, split: str) -> dict[str, dict]:
    if not mapping_path.is_file():
        raise FileNotFoundError(f"mapping file not found: {mapping_path}")

    result: dict[str, dict] = {}
    with mapping_path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) != 2:
                continue

            raw_path, svm_path = parts
            svm_parts = PurePosixPath(svm_path).parts
            if len(svm_parts) < 4:
                continue
            if svm_parts[0] != "SVM" or svm_parts[1] != split:
                continue

            class_idx = int(svm_parts[2])
            filename = svm_parts[3]

            raw_parts = PurePosixPath(raw_path).parts
            # raw/color/<Label>/<filename>.JPG
            label = raw_parts[2] if len(raw_parts) >= 4 else "unknown"

            result[filename] = {
                "raw_path": raw_path,
                "svm_path": svm_path,
                "class_index": class_idx,
                "label": label,
            }

    return result


def copy_class_images(
    source_dir: Path,
    output_dir: Path,
    *,
    clear_output: bool,
) -> list[Path]:
    if clear_output and output_dir.exists():
        for child in output_dir.iterdir():
            if child.is_file():
                child.unlink()
            elif child.is_dir():
                shutil.rmtree(child)

    output_dir.mkdir(parents=True, exist_ok=True)

    copied: list[Path] = []
    for image_path in sorted(source_dir.iterdir()):
        if not image_path.is_file():
            continue
        if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        destination = output_dir / image_path.name
        shutil.copy2(image_path, destination)
        copied.append(destination)
    return copied


def main() -> int:
    parser = argparse.ArgumentParser(description="Download PlantVillage SVM split images via git clone.")
    parser.add_argument("--repo-url", default=DEFAULT_REPO_URL, help="PlantVillage repository URL")
    parser.add_argument("--clone-dir", default=str(DEFAULT_CLONE_DIR), help="Local clone directory")
    parser.add_argument("--split", default=DEFAULT_SPLIT, choices=["train", "test"], help="Dataset split")
    parser.add_argument("--class-index", type=int, default=DEFAULT_CLASS_INDEX, help="Numeric class index folder")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output image directory")
    parser.add_argument(
        "--clear-output",
        action="store_true",
        help="Delete existing files inside output directory before copy",
    )
    args = parser.parse_args()

    clone_dir = Path(args.clone_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    ensure_repo(args.repo_url, clone_dir)

    source_dir = clone_dir / "data_distribution_for_SVM" / args.split / str(args.class_index)
    if not source_dir.is_dir():
        raise FileNotFoundError(f"class folder not found: {source_dir}")

    mapping_path = clone_dir / "data_distribution_for_SVM" / f"{args.split}_mapping.txt"
    mapping = parse_mapping(mapping_path, args.split)

    copied = copy_class_images(source_dir, output_dir, clear_output=args.clear_output)
    if not copied:
        raise RuntimeError(f"no images copied from {source_dir}")

    per_class_records = [
        mapping[p.name] for p in copied if p.name in mapping and mapping[p.name]["class_index"] == args.class_index
    ]
    labels = sorted({item["label"] for item in per_class_records})
    expected_label = labels[0] if len(labels) == 1 else "AMBIGUOUS"

    metadata = {
        "downloaded_at_utc": datetime.now(timezone.utc).isoformat(),
        "repo_url": args.repo_url,
        "clone_dir": str(clone_dir),
        "split": args.split,
        "class_index": args.class_index,
        "expected_label": expected_label,
        "image_count": len(copied),
        "source_dir": str(source_dir),
        "mapping_file": str(mapping_path),
        "notes": "Images are copied from git checkout (raw binary files), not GitHub HTML pages.",
    }
    metadata_path = output_dir / "plantvillage_metadata.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"source_dir: {source_dir}")
    print(f"output_dir: {output_dir}")
    print(f"copied_images: {len(copied)}")
    print(f"expected_label_for_class_{args.class_index}: {expected_label}")
    print(f"metadata_file: {metadata_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

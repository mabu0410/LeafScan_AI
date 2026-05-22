"""
Temperature scaling calibration cho ONNX model.

Calibration tối ưu T sao cho softmax(logits / T) có xác suất tương ứng với
accuracy thật — confidence 70% thật sự nghĩa là 70% khả năng đúng.

Cách chạy:
    cd backend
    source .venv/bin/activate
    python -m scripts.calibrate_model --val-dir /path/to/plantvillage/val

Val dir format:
    val/
    ├── Apple___Apple_scab/
    │   ├── image1.jpg
    │   └── image2.jpg
    ├── Tomato___Early_blight/
    │   └── ...

Output:
    - Log: T tối ưu, NLL trước/sau calibration, ECE trước/sau
    - File: backend/app/models/calibration.json {"temperature": 1.23}

Model inference sẽ đọc file này và chia logits cho T trước khi softmax.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent
CLASS_NAMES_PATH = BACKEND_DIR / "app" / "models" / "class_names.json"
CALIBRATION_OUTPUT = BACKEND_DIR / "app" / "models" / "calibration.json"

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape((1, 3, 1, 1))
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape((1, 3, 1, 1))


def preprocess(image_path: str) -> np.ndarray:
    """Giống model_service._preprocess_image: center-crop 224, ImageNet normalize."""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    if w < h:
        new_w = 256
        new_h = int(h * 256 / w)
    else:
        new_h = 256
        new_w = int(w * 256 / h)
    img = img.resize((new_w, new_h), Image.BILINEAR)
    left = (new_w - 224) // 2
    top = (new_h - 224) // 2
    img = img.crop((left, top, left + 224, top + 224))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0).astype(np.float32)
    return (arr - IMAGENET_MEAN) / IMAGENET_STD


def collect_logits(model_path: Path, val_dir: Path, class_names: list[str]) -> tuple[np.ndarray, np.ndarray]:
    """Chạy ONNX model trên toàn bộ val set, trả về (logits, labels)."""
    import onnxruntime as ort

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    class_to_idx = {name: i for i, name in enumerate(class_names)}

    all_logits: list[np.ndarray] = []
    all_labels: list[int] = []

    for class_dir in sorted(val_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        class_name = class_dir.name
        if class_name not in class_to_idx:
            print(f"⚠️  Class không có trong class_names: {class_name}", file=sys.stderr)
            continue
        label = class_to_idx[class_name]

        img_files = sorted(class_dir.glob("*.JPG")) + sorted(class_dir.glob("*.jpg"))
        print(f"  {class_name}: {len(img_files)} ảnh")

        for img_path in img_files:
            try:
                x = preprocess(str(img_path))
                logits = session.run([output_name], {input_name: x})[0].squeeze()
                all_logits.append(logits)
                all_labels.append(label)
            except Exception as exc:
                print(f"    ❌ {img_path.name}: {exc}", file=sys.stderr)

    return np.array(all_logits), np.array(all_labels)


def nll_loss(logits: np.ndarray, labels: np.ndarray, T: float) -> float:
    """Negative log-likelihood với temperature T."""
    scaled = logits / T
    scaled = scaled - scaled.max(axis=1, keepdims=True)
    exp = np.exp(scaled)
    probs = exp / exp.sum(axis=1, keepdims=True)
    probs = np.clip(probs, 1e-8, 1.0)
    return -np.log(probs[np.arange(len(labels)), labels]).mean()


def expected_calibration_error(logits: np.ndarray, labels: np.ndarray, T: float, n_bins: int = 15) -> float:
    """ECE: trung bình |confidence - accuracy| across bins."""
    scaled = logits / T
    scaled = scaled - scaled.max(axis=1, keepdims=True)
    exp = np.exp(scaled)
    probs = exp / exp.sum(axis=1, keepdims=True)
    confidences = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    accuracies = (predictions == labels).astype(np.float32)

    ece = 0.0
    bin_edges = np.linspace(0, 1, n_bins + 1)
    for i in range(n_bins):
        mask = (confidences > bin_edges[i]) & (confidences <= bin_edges[i + 1])
        if mask.sum() > 0:
            avg_conf = confidences[mask].mean()
            avg_acc = accuracies[mask].mean()
            ece += (mask.sum() / len(confidences)) * abs(avg_conf - avg_acc)
    return ece


def find_optimal_temperature(logits: np.ndarray, labels: np.ndarray) -> float:
    """Minimize NLL bằng golden-section search trên [0.5, 5.0]."""
    from scipy.optimize import minimize_scalar

    result = minimize_scalar(
        lambda T: nll_loss(logits, labels, T),
        bounds=(0.5, 5.0),
        method="bounded",
    )
    return float(result.x)


def main():
    parser = argparse.ArgumentParser(description="Temperature scaling calibration")
    parser.add_argument(
        "--val-dir",
        type=str,
        required=True,
        help="Path tới val set (folder chứa subfolder mỗi class)",
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=str(BACKEND_DIR / "app" / "models" / "efficientnetv2s_plantvillage.onnx"),
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(CALIBRATION_OUTPUT),
    )
    args = parser.parse_args()

    val_dir = Path(args.val_dir)
    if not val_dir.is_dir():
        print(f"❌ Val dir không tồn tại: {val_dir}", file=sys.stderr)
        sys.exit(1)

    model_path = Path(args.model_path)
    if not model_path.is_file():
        print(f"❌ Model file không tồn tại: {model_path}", file=sys.stderr)
        sys.exit(1)

    class_names = json.loads(CLASS_NAMES_PATH.read_text(encoding="utf-8"))
    print(f"📊 {len(class_names)} class từ {CLASS_NAMES_PATH.name}")

    print(f"\n📥 Đang chạy model trên val set: {val_dir}")
    logits, labels = collect_logits(model_path, val_dir, class_names)

    if len(logits) == 0:
        print("❌ Không có ảnh nào được xử lý.", file=sys.stderr)
        sys.exit(1)

    print(f"\n📊 Total samples: {len(logits)}")

    # Trước calibration (T=1.0)
    nll_before = nll_loss(logits, labels, 1.0)
    ece_before = expected_calibration_error(logits, labels, 1.0)
    preds = logits.argmax(axis=1)
    acc = (preds == labels).mean()

    print(f"\n🔍 Trước calibration:")
    print(f"   Accuracy: {acc:.4f}")
    print(f"   NLL: {nll_before:.4f}")
    print(f"   ECE: {ece_before:.4f}")

    # Find optimal T
    print(f"\n🔧 Đang tìm temperature tối ưu...")
    T = find_optimal_temperature(logits, labels)

    nll_after = nll_loss(logits, labels, T)
    ece_after = expected_calibration_error(logits, labels, T)

    print(f"\n✅ Sau calibration (T={T:.4f}):")
    print(f"   NLL: {nll_after:.4f} (giảm {nll_before - nll_after:.4f})")
    print(f"   ECE: {ece_after:.4f} (giảm {ece_before - ece_after:.4f})")

    # Ghi ra file
    output_data = {
        "temperature": T,
        "nll_before": float(nll_before),
        "nll_after": float(nll_after),
        "ece_before": float(ece_before),
        "ece_after": float(ece_after),
        "accuracy": float(acc),
        "num_samples": int(len(logits)),
    }
    Path(args.output).write_text(
        json.dumps(output_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n💾 Đã lưu: {args.output}")


if __name__ == "__main__":
    main()

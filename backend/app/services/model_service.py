"""
Model Service - Suy luận bệnh từ ảnh.

Sử dụng model EfficientNetV2-S (ONNX) huấn luyện trên PlantVillage dataset.
Class order được lấy từ class_names.json hoặc metadata trong best_model.pth,
không dùng fallback đoán thứ tự lớp.
"""
from __future__ import annotations

import json
import logging
import os
import pickletools
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from app.config import MODEL_PATH
from app.schemas.disease import PredictionItem

logger = logging.getLogger("leafscan.model")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"
CHECKPOINT_PATH = MODEL_DIR / "best_model.pth"
CALIBRATION_PATH = MODEL_DIR / "calibration.json"
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape((1, 3, 1, 1))
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape((1, 3, 1, 1))


def _load_calibration_temperature() -> float:
    """Đọc T tối ưu từ calibration.json, fallback T=1.0 (no-op)."""
    if not CALIBRATION_PATH.is_file():
        return 1.0
    try:
        data = json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))
        T = float(data.get("temperature", 1.0))
        if 0.1 <= T <= 10.0:
            return T
        return 1.0
    except Exception:
        return 1.0


CALIBRATION_T = _load_calibration_temperature()


@dataclass
class _BackendState:
    kind: str
    session: object | None
    input_name: str | None = None
    output_name: str | None = None


def normalize_disease_key(value: str) -> str:
    """
    Chuẩn hoá disease key để match DB:
    - lowercase
    - thay khoảng trắng bằng "_"
    - bỏ ký tự thừa
    """
    normalized = value.strip().lower()
    normalized = normalized.replace("___", "_")
    normalized = normalized.replace(" ", "_")
    normalized = re.sub(r"[^a-z0-9_]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized


def _extract_class_names_from_checkpoint(checkpoint_path: Path) -> list[str]:
    """
    Trích class_names trực tiếp từ metadata checkpoint mà không cần torch.
    Hỗ trợ file `.pth` dạng zip archive do `torch.save` tạo ra.
    """
    if not checkpoint_path.is_file():
        return []

    try:
        with zipfile.ZipFile(checkpoint_path, "r") as archive:
            data_name = next((name for name in archive.namelist() if name.endswith("data.pkl")), None)
            if not data_name:
                return []
            payload = archive.read(data_name)
    except Exception:
        logger.exception("Failed to open checkpoint file: %s", checkpoint_path)
        return []

    try:
        ops = list(pickletools.genops(payload))
    except Exception:
        logger.exception("Failed to parse checkpoint pickle ops: %s", checkpoint_path)
        return []

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


def _validate_class_names(raw: object) -> list[str]:
    if not isinstance(raw, list):
        raise ValueError("class_names must be a list.")
    names = [str(item).strip() for item in raw if str(item).strip()]
    if not names:
        raise ValueError("class_names is empty.")
    return names


def _load_class_names() -> list[str]:
    """Load class names đúng thứ tự train từ file hoặc checkpoint metadata."""
    if CLASS_NAMES_PATH.is_file():
        data = json.loads(CLASS_NAMES_PATH.read_text(encoding="utf-8"))
        return _validate_class_names(data)

    extracted = _extract_class_names_from_checkpoint(CHECKPOINT_PATH)
    if extracted:
        CLASS_NAMES_PATH.write_text(
            json.dumps(extracted, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info(
            "Generated class_names.json from checkpoint metadata at %s",
            CLASS_NAMES_PATH,
        )
        return extracted

    raise RuntimeError(
        "Không tìm thấy class order gốc. Hãy cung cấp class_names.json đúng thứ tự "
        "train hoặc checkpoint có metadata class_names/class_to_idx; nếu không có, "
        "cần lấy lại class order từ thư mục train dataset."
    )


# Mapping từ class PlantVillage sang disease_key trong disease_db / bảng diseases
CLASS_TO_DISEASE_KEY: dict[str, str] = {
    "Apple___Apple_scab": "apple_scab",
    "Apple___Black_rot": "apple_black_rot",
    "Apple___Cedar_apple_rust": "apple_cedar_rust",
    "Apple___healthy": "apple_healthy",
    "Blueberry___healthy": "blueberry_healthy",
    "Cherry_(including_sour)___Powdery_mildew": "cherry_powdery_mildew",
    "Cherry_(including_sour)___healthy": "cherry_healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": "corn_gray_leaf_spot",
    "Corn_(maize)___Common_rust_": "corn_common_rust",
    "Corn_(maize)___Northern_Leaf_Blight": "corn_northern_leaf_blight",
    "Corn_(maize)___healthy": "corn_healthy",
    "Grape___Black_rot": "grape_black_rot",
    "Grape___Esca_(Black_Measles)": "grape_esca",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": "grape_leaf_blight",
    "Grape___healthy": "grape_healthy",
    "Orange___Haunglongbing_(Citrus_greening)": "orange_huanglongbing",
    "Peach___Bacterial_spot": "peach_bacterial_spot",
    "Peach___healthy": "peach_healthy",
    "Pepper,_bell___Bacterial_spot": "pepper_bacterial_spot",
    "Pepper,_bell___healthy": "pepper_healthy",
    "Potato___Early_blight": "potato_early_blight",
    "Potato___Late_blight": "potato_late_blight",
    "Potato___healthy": "potato_healthy",
    "Raspberry___healthy": "raspberry_healthy",
    "Soybean___healthy": "soybean_healthy",
    "Squash___Powdery_mildew": "squash_powdery_mildew",
    "Strawberry___Leaf_scorch": "strawberry_leaf_scorch",
    "Strawberry___healthy": "strawberry_healthy",
    "Tomato___Bacterial_spot": "tomato_bacterial_spot",
    "Tomato___Early_blight": "tomato_early_blight",
    "Tomato___Late_blight": "tomato_late_blight",
    "Tomato___Leaf_Mold": "tomato_leaf_mold",
    "Tomato___Septoria_leaf_spot": "tomato_septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite": "tomato_spider_mites",
    "Tomato___Target_Spot": "tomato_target_spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "tomato_yellow_leaf_curl_virus",
    "Tomato___Tomato_mosaic_virus": "tomato_mosaic_virus",
    "Tomato___healthy": "tomato_healthy",
}


def class_name_to_disease_key(class_name: str) -> str:
    explicit = CLASS_TO_DISEASE_KEY.get(class_name)
    if explicit:
        return explicit
    return normalize_disease_key(class_name)


def disease_key_to_class_name(disease_key: str) -> str | None:
    normalized = normalize_disease_key(disease_key)
    for class_name, mapped_key in CLASS_TO_DISEASE_KEY.items():
        if normalize_disease_key(mapped_key) == normalized:
            return class_name
    return None


class ModelService:
    """Service gọi mô hình EfficientNetV2-S để dự đoán bệnh từ ảnh."""

    DISEASE_CLASSES: list[str] = _load_class_names()
    INPUT_SIZE: int = 224

    def __init__(self):
        self.model_path = MODEL_PATH.strip()
        self.backend = self._load_backend()
        logger.info(
            "model_backend_ready kind=%s model_path=%s num_classes=%d",
            self.backend.kind,
            self.model_path,
            len(self.DISEASE_CLASSES),
        )

    def predict(self, image_path: str) -> list[PredictionItem]:
        """
        Trả về phân bố confidence theo các lớp bệnh.
        confidence dùng thang [0..1].
        """
        probs = self._run_inference(image_path)
        predictions = [
            PredictionItem(
                class_index=index,
                class_name=label,
                disease_key=class_name_to_disease_key(label),
                confidence=round(float(prob), 6),
            )
            for index, (label, prob) in enumerate(zip(self.DISEASE_CLASSES, probs))
        ]
        predictions.sort(key=lambda item: item.confidence, reverse=True)
        return predictions

    def _load_backend(self) -> _BackendState:
        """Load ONNX/TFLite backend nếu file model tồn tại."""
        if not self.model_path or not os.path.isfile(self.model_path):
            logger.warning(
                "model_backend_fallback reason=MODEL_PATH_MISSING_OR_NOT_FOUND path=%s",
                self.model_path,
            )
            return _BackendState(kind="heuristic", session=None)

        lower_path = self.model_path.lower()

        if lower_path.endswith(".onnx"):
            try:
                import onnxruntime as ort  # type: ignore
            except Exception:
                logger.warning("model_backend_fallback reason=ONNXRUNTIME_IMPORT_FAILED")
                return _BackendState(kind="heuristic", session=None)

            session = ort.InferenceSession(self.model_path, providers=["CPUExecutionProvider"])
            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name
            return _BackendState(
                kind="onnx",
                session=session,
                input_name=input_name,
                output_name=output_name,
            )

        if lower_path.endswith(".tflite"):
            interpreter = self._load_tflite_interpreter(self.model_path)
            if interpreter is None:
                logger.warning("model_backend_fallback reason=TFLITE_INTERPRETER_LOAD_FAILED")
                return _BackendState(kind="heuristic", session=None)

            interpreter.allocate_tensors()
            return _BackendState(kind="tflite", session=interpreter)

        logger.warning("model_backend_fallback reason=UNSUPPORTED_EXTENSION path=%s", self.model_path)
        return _BackendState(kind="heuristic", session=None)

    @staticmethod
    def _load_tflite_interpreter(model_path: str):
        try:
            from tflite_runtime.interpreter import Interpreter  # type: ignore

            return Interpreter(model_path=model_path)
        except Exception:
            pass

        try:
            import tensorflow as tf  # type: ignore

            return tf.lite.Interpreter(model_path=model_path)
        except Exception:
            return None

    def _run_inference(self, image_path: str) -> np.ndarray:
        x_nchw = self._preprocess_image(image_path)

        if self.backend.kind == "onnx" and self.backend.session is not None:
            session = self.backend.session
            # TTA: original + horizontal flip, average probabilities
            logits_orig = session.run(
                [self.backend.output_name],
                {self.backend.input_name: x_nchw},
            )[0]
            x_flip = x_nchw[:, :, :, ::-1].copy()
            logits_flip = session.run(
                [self.backend.output_name],
                {self.backend.input_name: x_flip},
            )[0]
            probs_orig = self._normalize_output(logits_orig)
            probs_flip = self._normalize_output(logits_flip)
            probs_avg = (probs_orig + probs_flip) / 2.0
            probs_avg /= probs_avg.sum()
            return probs_avg

        if self.backend.kind == "tflite" and self.backend.session is not None:
            interpreter = self.backend.session
            input_details = interpreter.get_input_details()[0]
            output_details = interpreter.get_output_details()[0]

            tensor = x_nchw
            if len(input_details["shape"]) == 4 and int(input_details["shape"][-1]) == 3:
                tensor = np.transpose(x_nchw, (0, 2, 3, 1))

            expected_dtype = input_details["dtype"]
            tensor = tensor.astype(expected_dtype, copy=False)
            interpreter.set_tensor(input_details["index"], tensor)
            interpreter.invoke()
            logits = interpreter.get_tensor(output_details["index"])
            return self._normalize_output(logits)

        return self._heuristic_predict(x_nchw)

    def _preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Tiền xử lý ảnh đúng chuẩn train:
        - convert RGB
        - resize cạnh ngắn về 256, center-crop 224x224 (giữ aspect ratio)
        - scale [0..1]
        - normalize mean/std ImageNet
        - NCHW float32: [1, 3, 224, 224]
        """
        img = Image.open(image_path).convert("RGB")

        # Resize cạnh ngắn về 256, giữ aspect ratio
        w, h = img.size
        if w < h:
            new_w = 256
            new_h = int(h * 256 / w)
        else:
            new_h = 256
            new_w = int(w * 256 / h)
        img = img.resize((new_w, new_h), Image.BILINEAR)

        # Center-crop 224x224
        left = (new_w - self.INPUT_SIZE) // 2
        top = (new_h - self.INPUT_SIZE) // 2
        img = img.crop((left, top, left + self.INPUT_SIZE, top + self.INPUT_SIZE))

        arr_hwc = np.asarray(img, dtype=np.float32) / 255.0
        arr_chw = np.transpose(arr_hwc, (2, 0, 1))
        arr_nchw = np.expand_dims(arr_chw, axis=0).astype(np.float32)
        normalized = (arr_nchw - IMAGENET_MEAN) / IMAGENET_STD
        return normalized.astype(np.float32, copy=False)

    def _heuristic_predict(self, x_nchw: np.ndarray) -> np.ndarray:
        """
        Heuristic deterministic khi không load được model thật.
        Input `x_nchw` đã normalize ImageNet.
        """
        img_chw = x_nchw[0] * IMAGENET_STD[0] + IMAGENET_MEAN[0]
        img = np.transpose(np.clip(img_chw, 0.0, 1.0), (1, 2, 0))

        mean_rgb = img.mean(axis=(0, 1))
        brightness = float(mean_rgb.mean())
        red, green, blue = [float(v) for v in mean_rgb]
        color_variance = float(img.var())
        redness = red - green
        yellowness = (red + green) / 2 - blue

        n_classes = len(self.DISEASE_CLASSES)
        scores = np.full(n_classes, 0.05, dtype=np.float32)
        idx = {name: i for i, name in enumerate(self.DISEASE_CLASSES)}

        healthy_score = max(0.05, 0.75 * green + 0.35 * brightness - 1.2 * color_variance)
        for name, i in idx.items():
            if "healthy" in name.lower():
                scores[i] += healthy_score
                if green > red and green > blue:
                    scores[i] += 0.15

        for name in [
            "Tomato___Early_blight",
            "Potato___Early_blight",
            "Apple___Apple_scab",
            "Apple___Black_rot",
        ]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.40 * redness + 0.20 * color_variance)

        for name in [
            "Grape___Black_rot",
            "Grape___Esca_(Black_Measles)",
            "Tomato___Late_blight",
            "Potato___Late_blight",
        ]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.45 * (1.0 - brightness) + 0.30 * color_variance)

        for name in [
            "Cherry_(including_sour)___Powdery_mildew",
            "Squash___Powdery_mildew",
        ]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.40 * brightness + 0.15 * (1.0 - color_variance))

        for name in [
            "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
            "Corn_(maize)___Northern_Leaf_Blight",
        ]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.30 * brightness + 0.35 * color_variance)

        for name in [
            "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
            "Orange___Haunglongbing_(Citrus_greening)",
        ]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.35 * yellowness + 0.20 * color_variance)

        return self._softmax(scores)

    @staticmethod
    def _normalize_output(raw_output: np.ndarray) -> np.ndarray:
        """
        Normalize logits → probabilities.
        Áp dụng temperature scaling nếu CALIBRATION_T != 1.0.
        """
        arr = np.array(raw_output, dtype=np.float32).squeeze()
        if arr.ndim != 1:
            arr = arr.reshape(-1)

        expected = len(ModelService.DISEASE_CLASSES)
        if len(arr) != expected:
            if len(arr) > expected:
                arr = arr[:expected]
            else:
                arr = np.pad(arr, (0, expected - len(arr)))

        # Check if input đã là probabilities (sum~1, all non-negative)
        if np.all(arr >= 0) and 0.98 <= float(arr.sum()) <= 1.02:
            arr = np.clip(arr, 1e-6, 1.0)
            arr /= arr.sum()
            return arr

        # Apply temperature scaling trước softmax
        if CALIBRATION_T != 1.0:
            arr = arr / CALIBRATION_T

        return ModelService._softmax(arr)

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        logits = np.array(logits, dtype=np.float32)
        logits = logits - np.max(logits)
        exp = np.exp(logits)
        probs = exp / np.sum(exp)
        return probs.astype(np.float32)

"""
Model Service - Suy luận bệnh từ ảnh.

Sử dụng model EfficientNetV2-S (ONNX) huấn luyện trên PlantVillage dataset
với 38 lớp bệnh cây trồng. Nếu chưa có model artifact, fallback sang
heuristic deterministic từ ảnh để đảm bảo luồng E2E hoạt động ổn định.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass

import numpy as np
from PIL import Image

from app.config import MODEL_PATH
from app.schemas.disease import PredictionItem


@dataclass
class _BackendState:
    kind: str
    session: object | None
    input_name: str | None = None
    output_name: str | None = None


def _load_class_names() -> list[str]:
    """Load danh sách nhãn lớp từ class_names.json."""
    class_file = os.path.join(
        os.path.dirname(__file__), "..", "..", "models", "class_names.json"
    )
    if os.path.isfile(class_file):
        with open(class_file, "r", encoding="utf-8") as f:
            return json.load(f)
    # Fallback: 38 lớp PlantVillage mặc định
    return [
        "Apple___Apple_scab",
        "Apple___Black_rot",
        "Apple___Cedar_apple_rust",
        "Apple___healthy",
        "Blueberry___healthy",
        "Cherry_(including_sour)___Powdery_mildew",
        "Cherry_(including_sour)___healthy",
        "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
        "Corn_(maize)___Common_rust_",
        "Corn_(maize)___Northern_Leaf_Blight",
        "Corn_(maize)___healthy",
        "Grape___Black_rot",
        "Grape___Esca_(Black_Measles)",
        "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
        "Grape___healthy",
        "Orange___Haunglongbing_(Citrus_greening)",
        "Peach___Bacterial_spot",
        "Peach___healthy",
        "Pepper,_bell___Bacterial_spot",
        "Pepper,_bell___healthy",
        "Potato___Early_blight",
        "Potato___Late_blight",
        "Potato___healthy",
        "Raspberry___healthy",
        "Soybean___healthy",
        "Squash___Powdery_mildew",
        "Strawberry___Leaf_scorch",
        "Strawberry___healthy",
        "Tomato___Bacterial_spot",
        "Tomato___Early_blight",
        "Tomato___Late_blight",
        "Tomato___Leaf_Mold",
        "Tomato___Septoria_leaf_spot",
        "Tomato___Spider_mites Two-spotted_spider_mite",
        "Tomato___Target_Spot",
        "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
        "Tomato___Tomato_mosaic_virus",
        "Tomato___healthy",
    ]


# Mapping từ tên lớp PlantVillage sang disease_key dùng trong disease_db.json
_CLASS_TO_KEY: dict[str, str] = {
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


class ModelService:
    """Service gọi mô hình EfficientNetV2-S để dự đoán bệnh từ ảnh."""

    DISEASE_CLASSES: list[str] = _load_class_names()

    # Input size cho EfficientNetV2-S
    INPUT_SIZE: int = 224

    def __init__(self):
        self.model_path = MODEL_PATH.strip()
        self.backend = self._load_backend()

    def predict(self, image_path: str) -> list[PredictionItem]:
        """
        Trả về phân bố confidence theo các lớp bệnh.
        Ưu tiên inference thật nếu backend model khả dụng.
        """
        probs = self._run_inference(image_path)
        predictions = [
            PredictionItem(
                disease_key=_CLASS_TO_KEY.get(label, label),
                confidence=round(float(prob) * 100, 2),
            )
            for label, prob in zip(self.DISEASE_CLASSES, probs)
        ]
        predictions.sort(key=lambda p: p.confidence, reverse=True)
        return predictions

    def _load_backend(self) -> _BackendState:
        """Load ONNX/TFLite backend nếu file model tồn tại."""
        if not self.model_path or not os.path.isfile(self.model_path):
            return _BackendState(kind="heuristic", session=None)

        lower_path = self.model_path.lower()

        if lower_path.endswith(".onnx"):
            try:
                import onnxruntime as ort  # type: ignore
            except Exception:
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
                return _BackendState(kind="heuristic", session=None)

            interpreter.allocate_tensors()
            return _BackendState(kind="tflite", session=interpreter)

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
        x = self._preprocess_image(image_path)

        if self.backend.kind == "onnx" and self.backend.session is not None:
            # ONNX model expects NCHW format: [batch, 3, 224, 224]
            x_chw = np.transpose(x, (0, 3, 1, 2))
            session = self.backend.session
            logits = session.run(
                [self.backend.output_name],
                {self.backend.input_name: x_chw},
            )[0]
            return self._normalize_output(logits)

        if self.backend.kind == "tflite" and self.backend.session is not None:
            interpreter = self.backend.session
            input_details = interpreter.get_input_details()[0]
            output_details = interpreter.get_output_details()[0]

            expected_dtype = input_details["dtype"]
            tensor = x.astype(expected_dtype, copy=False)
            interpreter.set_tensor(input_details["index"], tensor)
            interpreter.invoke()
            logits = interpreter.get_tensor(output_details["index"])
            return self._normalize_output(logits)

        return self._heuristic_predict(x)

    def _preprocess_image(self, image_path: str) -> np.ndarray:
        """Tiền xử lý ảnh: resize, normalize. Trả về NHWC [1, H, W, 3]."""
        img = Image.open(image_path).convert("RGB").resize(
            (self.INPUT_SIZE, self.INPUT_SIZE)
        )
        arr = np.asarray(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, axis=0)

    def _heuristic_predict(self, x: np.ndarray) -> np.ndarray:
        """
        Heuristic deterministic từ ảnh khi chưa có model ONNX.
        Phân tích màu sắc ảnh để ước lượng bệnh.
        """
        img = x[0]  # NHWC -> HWC
        mean_rgb = img.mean(axis=(0, 1))
        brightness = float(mean_rgb.mean())
        red, green, blue = [float(v) for v in mean_rgb]
        color_variance = float(img.var())
        redness = red - green
        yellowness = (red + green) / 2 - blue

        n_classes = len(self.DISEASE_CLASSES)
        scores = np.full(n_classes, 0.05, dtype=np.float32)
        idx = {name: i for i, name in enumerate(self.DISEASE_CLASSES)}

        # Các lớp healthy tăng khi ảnh sáng, xanh, ít nhiễu.
        healthy_score = max(0.05, 0.75 * green + 0.35 * brightness - 1.2 * color_variance)
        for name, i in idx.items():
            if "healthy" in name.lower():
                scores[i] += healthy_score
                if green > red and green > blue:
                    scores[i] += 0.15

        # Bệnh liên quan tới đốm nâu / redness
        for name in ["Tomato___Early_blight", "Potato___Early_blight",
                      "Apple___Apple_scab", "Apple___Black_rot"]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.40 * redness + 0.20 * color_variance)

        # Bệnh liên quan tới tối / sẫm màu
        for name in ["Grape___Black_rot", "Grape___Esca_(Black_Measles)",
                      "Tomato___Late_blight", "Potato___Late_blight"]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.45 * (1.0 - brightness) + 0.30 * color_variance)

        # Bệnh phấn trắng / sáng bề mặt
        for name in ["Cherry_(including_sour)___Powdery_mildew", "Squash___Powdery_mildew"]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.40 * brightness + 0.15 * (1.0 - color_variance))

        # Bệnh đốm xám / xỉn màu
        for name in ["Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
                      "Corn_(maize)___Northern_Leaf_Blight"]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.30 * brightness + 0.35 * color_variance)

        # Bệnh vàng lá
        for name in ["Tomato___Tomato_Yellow_Leaf_Curl_Virus",
                      "Orange___Haunglongbing_(Citrus_greening)"]:
            if name in idx:
                scores[idx[name]] += max(0.01, 0.35 * yellowness + 0.20 * color_variance)

        return self._softmax(scores)

    @staticmethod
    def _normalize_output(raw_output: np.ndarray) -> np.ndarray:
        arr = np.array(raw_output, dtype=np.float32).squeeze()
        if arr.ndim != 1:
            arr = arr.reshape(-1)

        if len(arr) != len(ModelService.DISEASE_CLASSES):
            if len(arr) > len(ModelService.DISEASE_CLASSES):
                arr = arr[: len(ModelService.DISEASE_CLASSES)]
            else:
                arr = np.pad(arr, (0, len(ModelService.DISEASE_CLASSES) - len(arr)))

        # Nếu output đã là xác suất gần chuẩn, chỉ clamp + renorm.
        if np.all(arr >= 0) and 0.98 <= float(arr.sum()) <= 1.02:
            arr = np.clip(arr, 1e-6, 1.0)
            arr /= arr.sum()
            return arr

        return ModelService._softmax(arr)

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        logits = np.array(logits, dtype=np.float32)
        logits = logits - np.max(logits)
        exp = np.exp(logits)
        probs = exp / np.sum(exp)
        return probs.astype(np.float32)

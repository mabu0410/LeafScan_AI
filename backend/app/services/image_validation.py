"""
Leaf image validation service.

Mục tiêu:
- Chặn ảnh không phải lá cây trước khi chạy model.
- Trả về metrics để debug/hiệu chỉnh ngưỡng.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from PIL import Image

from app.config import (
    LEAF_MAX_DARK_PIXEL_RATIO,
    LEAF_MIN_BLUR_SCORE,
    LEAF_MIN_BRIGHTNESS,
    LEAF_MIN_BRIGHTNESS_P10,
    LEAF_MIN_CENTER_GREEN_RATIO,
    LEAF_MIN_GREEN_COMPONENT_DENSITY,
    LEAF_MIN_GREEN_RATIO,
    LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO,
)

LeafValidationErrorCode = Literal["NO_LEAF_DETECTED", "IMAGE_TOO_DARK", "IMAGE_TOO_BLURRY"]


@dataclass
class LeafValidationResult:
    is_valid_leaf: bool
    error_code: LeafValidationErrorCode | None
    message: str | None
    green_ratio: float
    center_green_ratio: float
    brightness: float
    brightness_p10: float
    dark_pixel_ratio: float
    blur_score: float
    largest_green_component_ratio: float
    green_component_density: float


def validate_leaf_image(image: str | Image.Image, settings: dict = None) -> LeafValidationResult:
    """
    Validate ảnh đầu vào có đủ điều kiện để chẩn đoán lá cây hay không.

    Rules:
    - brightness < threshold -> ảnh quá tối.
    - blur_score < threshold -> ảnh quá mờ.
    - green_ratio thấp hoặc vùng xanh không tập trung -> không phát hiện lá.
    """
    rgb = _load_rgb(image)
    hsv = np.asarray(Image.fromarray(rgb).convert("HSV"), dtype=np.float32)

    # Kênh V của HSV theo chuẩn Pillow nằm trong [0..255].
    brightness = float(hsv[..., 2].mean())
    blur_score = _laplacian_variance(rgb)
    brightness_p10 = float(np.percentile(hsv[..., 2], 10))
    dark_pixel_ratio = float((hsv[..., 2] < 50.0).mean())

    # Dải hue cho lá cây:
    # - Green band (28-95): lá khỏe, xanh non → xanh đậm
    # - Yellow-brown band (10-30): lá bệnh vàng hoá/chết hoại
    # OR hai band → bắt được cả lá khỏe lẫn lá bệnh nặng, vẫn chặn nền xám/xanh dương/đỏ thuần.
    hue = hsv[..., 0]
    sat = hsv[..., 1]
    val = hsv[..., 2]
    green_band = (
        (hue >= 28.0)
        & (hue <= 95.0)
        & (sat >= 35.0)
        & (val >= 35.0)
    )
    yellow_brown_band = (
        (hue >= 10.0)
        & (hue <= 30.0)
        & (sat >= 30.0)
        & (val >= 30.0)
        & (val <= 180.0)  # loại pixel quá sáng (trắng, màn hình)
    )
    green_mask = green_band | yellow_brown_band
    green_ratio = float(green_mask.mean())
    center_green_ratio = _compute_center_green_ratio(green_mask)

    largest_component = _largest_connected_component_size(green_mask)
    total_pixels = green_mask.size
    green_pixels = int(green_mask.sum())
    largest_component_ratio = float(largest_component / total_pixels) if total_pixels else 0.0
    green_component_density = (
        float(largest_component / green_pixels) if green_pixels > 0 else 0.0
    )

    settings = settings or {}
    min_brightness = settings.get("LEAF_MIN_BRIGHTNESS", LEAF_MIN_BRIGHTNESS)
    min_brightness_p10 = settings.get("LEAF_MIN_BRIGHTNESS_P10", LEAF_MIN_BRIGHTNESS_P10)
    max_dark_pixel_ratio = settings.get("LEAF_MAX_DARK_PIXEL_RATIO", LEAF_MAX_DARK_PIXEL_RATIO)
    min_green_ratio = settings.get("LEAF_MIN_GREEN_RATIO", LEAF_MIN_GREEN_RATIO)
    min_largest_green_ratio = settings.get("LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO", LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO)
    min_blur_score = settings.get("LEAF_MIN_BLUR_SCORE", LEAF_MIN_BLUR_SCORE)
    min_center_green_ratio = settings.get("LEAF_MIN_CENTER_GREEN_RATIO", LEAF_MIN_CENTER_GREEN_RATIO)
    min_green_density = settings.get("LEAF_MIN_GREEN_COMPONENT_DENSITY", LEAF_MIN_GREEN_COMPONENT_DENSITY)

    # Ảnh thực tế có thể có nền tối lớn nhưng vùng lá vẫn đủ sáng.
    # Chỉ chặn khi độ sáng trung bình thấp kèm thêm dấu hiệu ảnh quá tối.
    is_too_dark = (
        brightness < min_brightness
        and (
            brightness_p10 < min_brightness_p10
            or dark_pixel_ratio > max_dark_pixel_ratio
        )
    )
    is_extremely_dark = (
        brightness < (min_brightness * 0.75)
        or dark_pixel_ratio > 0.90
    )
    if is_too_dark or is_extremely_dark:
        return LeafValidationResult(
            is_valid_leaf=False,
            error_code="IMAGE_TOO_DARK",
            message="Ảnh quá tối. Vui lòng chụp ở nơi đủ ánh sáng.",
            green_ratio=green_ratio,
            center_green_ratio=center_green_ratio,
            brightness=brightness,
            brightness_p10=brightness_p10,
            dark_pixel_ratio=dark_pixel_ratio,
            blur_score=blur_score,
            largest_green_component_ratio=largest_component_ratio,
            green_component_density=green_component_density,
        )

    has_strong_leaf_signal = (
        green_ratio >= (min_green_ratio * 2)
        or largest_component_ratio >= (min_largest_green_ratio * 2)
    )

    # Lá trơn hoặc ảnh crop gần có thể có blur score thấp dù vẫn đủ vùng lá.
    # Với ảnh có tín hiệu lá rõ, để model xử lý tiếp thay vì chặn sớm.
    if blur_score < min_blur_score and not has_strong_leaf_signal:
        return LeafValidationResult(
            is_valid_leaf=False,
            error_code="IMAGE_TOO_BLURRY",
            message="Ảnh bị mờ. Vui lòng giữ máy ổn định và chụp gần lá hơn.",
            green_ratio=green_ratio,
            center_green_ratio=center_green_ratio,
            brightness=brightness,
            brightness_p10=brightness_p10,
            dark_pixel_ratio=dark_pixel_ratio,
            blur_score=blur_score,
            largest_green_component_ratio=largest_component_ratio,
            green_component_density=green_component_density,
        )

    low_color_signal = (
        green_ratio < min_green_ratio
        and largest_component_ratio < min_largest_green_ratio
    )
    leaf_is_off_center_and_sparse = (
        center_green_ratio < min_center_green_ratio
        and not has_strong_leaf_signal
    )
    green_pixels_are_scattered = (
        green_component_density < min_green_density
        and largest_component_ratio < (min_largest_green_ratio * 2)
    )

    if low_color_signal or leaf_is_off_center_and_sparse or green_pixels_are_scattered:
        return LeafValidationResult(
            is_valid_leaf=False,
            error_code="NO_LEAF_DETECTED",
            message=(
                "Không phát hiện lá cây trong ảnh. "
                "Vui lòng chụp rõ phần lá cây, tránh chụp đất, chậu cây hoặc nền xung quanh."
            ),
            green_ratio=green_ratio,
            center_green_ratio=center_green_ratio,
            brightness=brightness,
            brightness_p10=brightness_p10,
            dark_pixel_ratio=dark_pixel_ratio,
            blur_score=blur_score,
            largest_green_component_ratio=largest_component_ratio,
            green_component_density=green_component_density,
        )

    return LeafValidationResult(
        is_valid_leaf=True,
        error_code=None,
        message=None,
        green_ratio=green_ratio,
        center_green_ratio=center_green_ratio,
        brightness=brightness,
        brightness_p10=brightness_p10,
        dark_pixel_ratio=dark_pixel_ratio,
        blur_score=blur_score,
        largest_green_component_ratio=largest_component_ratio,
        green_component_density=green_component_density,
    )


def _load_rgb(image: str | Image.Image) -> np.ndarray:
    if isinstance(image, Image.Image):
        pil_image = image.convert("RGB")
    else:
        pil_image = Image.open(image).convert("RGB")

    # Downsample về kích thước vừa đủ để tính heuristic nhanh và ổn định.
    pil_image = pil_image.resize((256, 256))
    return np.asarray(pil_image, dtype=np.uint8)


def _compute_center_green_ratio(mask: np.ndarray) -> float:
    if mask.size == 0:
        return 0.0
    h, w = mask.shape
    y1, y2 = int(h * 0.25), int(h * 0.75)
    x1, x2 = int(w * 0.25), int(w * 0.75)
    center = mask[y1:y2, x1:x2]
    if center.size == 0:
        return 0.0
    return float(center.mean())


def _laplacian_variance(rgb: np.ndarray) -> float:
    """Độ nét ảnh qua variance của Laplacian."""
    gray = (
        0.299 * rgb[..., 0].astype(np.float32)
        + 0.587 * rgb[..., 1].astype(np.float32)
        + 0.114 * rgb[..., 2].astype(np.float32)
    )
    lap = (
        -4.0 * gray
        + np.roll(gray, 1, axis=0)
        + np.roll(gray, -1, axis=0)
        + np.roll(gray, 1, axis=1)
        + np.roll(gray, -1, axis=1)
    )
    return float(lap.var())


def _largest_connected_component_size(mask: np.ndarray) -> int:
    """Tìm kích thước thành phần liên thông lớn nhất trên mask nhị phân."""
    if mask.size == 0:
        return 0

    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=np.uint8)
    largest = 0

    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue

            stack: list[tuple[int, int]] = [(y, x)]
            visited[y, x] = 1
            component_size = 0

            while stack:
                cy, cx = stack.pop()
                component_size += 1

                for ny in range(max(0, cy - 1), min(h, cy + 2)):
                    for nx in range(max(0, cx - 1), min(w, cx + 2)):
                        if (ny == cy and nx == cx) or visited[ny, nx] or not mask[ny, nx]:
                            continue
                        visited[ny, nx] = 1
                        stack.append((ny, nx))

            if component_size > largest:
                largest = component_size

    return largest


# ──────────────────────────────────────────────
# Dict-based wrapper (backward-compatible with diagnosis router)
# ──────────────────────────────────────────────

def validate_leaf_image_dict(image: str | Image.Image, settings: dict = None) -> dict:
    """
    Wrapper trả về dict tương thích với diagnosis router.
    Dùng thay cho leaf_validator.validate_leaf_image cũ.
    """
    result = validate_leaf_image(image, settings)

    reason = "ok"
    if result.error_code == "IMAGE_TOO_DARK":
        reason = "brightness_too_low"
    elif result.error_code == "IMAGE_TOO_BLURRY":
        reason = "blur_score_too_low"
    elif result.error_code == "NO_LEAF_DETECTED":
        reason = "green_ratio_or_component_too_low"

    metrics = {
        "green_ratio": round(result.green_ratio, 6),
        "center_green_ratio": round(result.center_green_ratio, 6),
        "brightness": round(result.brightness, 4),
        "brightness_p10": round(result.brightness_p10, 4),
        "dark_pixel_ratio": round(result.dark_pixel_ratio, 4),
        "blur_score": round(result.blur_score, 4),
        "largest_green_area_ratio": round(result.largest_green_component_ratio, 6),
        "green_component_density": round(result.green_component_density, 6),
        "reason": reason,
    }

    return {
        "is_valid": result.is_valid_leaf,
        "error_code": result.error_code,
        "message": result.message,
        "metrics": metrics,
    }

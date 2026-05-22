"""
Leaf validator: kiểm tra ảnh có phải lá cây hợp lệ trước khi chạy model bệnh.
"""
from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image


# Ngưỡng kiểm tra theo yêu cầu.
MIN_BRIGHTNESS = 35.0
MIN_BLUR_SCORE = 20.0
MIN_GREEN_RATIO = 0.05
MIN_LARGEST_GREEN_AREA_RATIO = 0.03


def validate_leaf_image(image: Image.Image) -> dict[str, Any]:
    """
    Validate ảnh lá.

    Returns:
    {
      "is_valid": bool,
      "error_code": None | "NO_LEAF_DETECTED" | "IMAGE_TOO_DARK" | "IMAGE_TOO_BLURRY",
      "message": str | None,
      "metrics": {
        "green_ratio": float,
        "brightness": float,
        "blur_score": float,
        "largest_green_area_ratio": float,
        "reason": str
      }
    }
    """
    rgb = image.convert("RGB").resize((256, 256))
    rgb_arr = np.asarray(rgb, dtype=np.uint8)

    gray = (
        0.299 * rgb_arr[..., 0].astype(np.float32)
        + 0.587 * rgb_arr[..., 1].astype(np.float32)
        + 0.114 * rgb_arr[..., 2].astype(np.float32)
    )
    brightness = float(gray.mean())
    blur_score = _laplacian_variance(gray)

    hsv = np.asarray(rgb.convert("HSV"), dtype=np.float32)
    hue = hsv[..., 0]
    sat = hsv[..., 1]
    val = hsv[..., 2]

    # Threshold gốc user đưa theo OpenCV HSV (H: 0..179). PIL dùng H: 0..255.
    h_min = 25.0 * 255.0 / 179.0
    h_max = 95.0 * 255.0 / 179.0
    green_mask = (
        (hue >= h_min)
        & (hue <= h_max)
        & (sat >= 35.0)
        & (val >= 35.0)
    )

    green_ratio = float(green_mask.mean())
    largest_green_area_ratio = _largest_component_ratio(green_mask)

    metrics = {
        "green_ratio": round(green_ratio, 6),
        "brightness": round(brightness, 4),
        "blur_score": round(blur_score, 4),
        "largest_green_area_ratio": round(largest_green_area_ratio, 6),
        "reason": "ok",
    }

    if brightness < MIN_BRIGHTNESS:
        metrics["reason"] = "brightness_too_low"
        return {
            "is_valid": False,
            "error_code": "IMAGE_TOO_DARK",
            "message": "Ảnh quá tối. Vui lòng chụp rõ hơn ở nơi đủ ánh sáng.",
            "metrics": metrics,
        }

    # Chặn ảnh có xanh rải rác (màn hình/laptop/nền có chi tiết xanh) bằng largest component.
    if green_ratio < MIN_GREEN_RATIO and largest_green_area_ratio < MIN_LARGEST_GREEN_AREA_RATIO:
        metrics["reason"] = "green_ratio_too_low_and_component_too_small"
        return {
            "is_valid": False,
            "error_code": "NO_LEAF_DETECTED",
            "message": (
                "Không phát hiện lá cây trong ảnh. Vui lòng chụp rõ phần lá cây, "
                "tránh chụp màn hình, laptop, đồ vật, đất hoặc nền xung quanh."
            ),
            "metrics": metrics,
        }

    if largest_green_area_ratio < MIN_LARGEST_GREEN_AREA_RATIO:
        metrics["reason"] = "largest_green_area_too_small"
        return {
            "is_valid": False,
            "error_code": "NO_LEAF_DETECTED",
            "message": (
                "Không phát hiện lá cây trong ảnh. Vui lòng chụp rõ phần lá cây, "
                "tránh chụp màn hình, laptop, đồ vật, đất hoặc nền xung quanh."
            ),
            "metrics": metrics,
        }

    if green_ratio < MIN_GREEN_RATIO:
        metrics["reason"] = "green_ratio_too_low"
        return {
            "is_valid": False,
            "error_code": "NO_LEAF_DETECTED",
            "message": (
                "Không phát hiện lá cây trong ảnh. Vui lòng chụp rõ phần lá cây, "
                "tránh chụp màn hình, laptop, đồ vật, đất hoặc nền xung quanh."
            ),
            "metrics": metrics,
        }

    if blur_score < MIN_BLUR_SCORE:
        metrics["reason"] = "blur_score_too_low"
        return {
            "is_valid": False,
            "error_code": "IMAGE_TOO_BLURRY",
            "message": "Ảnh bị mờ. Vui lòng giữ máy ổn định và chụp gần lá hơn.",
            "metrics": metrics,
        }

    return {
        "is_valid": True,
        "error_code": None,
        "message": None,
        "metrics": metrics,
    }


def _laplacian_variance(gray: np.ndarray) -> float:
    """
    Độ sắc nét: var(Laplacian(gray)).
    Dùng NumPy để tránh bắt buộc phụ thuộc cv2.
    """
    lap = (
        -4.0 * gray
        + np.roll(gray, 1, axis=0)
        + np.roll(gray, -1, axis=0)
        + np.roll(gray, 1, axis=1)
        + np.roll(gray, -1, axis=1)
    )
    return float(lap.var())


def _largest_component_ratio(mask: np.ndarray) -> float:
    if mask.size == 0:
        return 0.0

    h, w = mask.shape
    total_pixels = float(h * w)
    visited = np.zeros_like(mask, dtype=np.uint8)
    largest = 0

    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue

            stack = [(y, x)]
            visited[y, x] = 1
            area = 0

            while stack:
                cy, cx = stack.pop()
                area += 1

                for ny in range(max(0, cy - 1), min(h, cy + 2)):
                    for nx in range(max(0, cx - 1), min(w, cx + 2)):
                        if (ny == cy and nx == cx) or visited[ny, nx] or not mask[ny, nx]:
                            continue
                        visited[ny, nx] = 1
                        stack.append((ny, nx))

            if area > largest:
                largest = area

    return float(largest / total_pixels) if total_pixels else 0.0

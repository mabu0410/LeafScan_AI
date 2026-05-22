"""
Diagnose tool: chạy image_validation trên 1 ảnh và in chi tiết metric.

Dùng khi ảnh bị reject nhưng bạn nghĩ là lá thật.

Cách chạy:
    cd backend
    source .venv/bin/activate
    python -m scripts.diagnose_validation /path/to/image.jpg
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.image_validation import validate_leaf_image  # noqa: E402
from app.config import (  # noqa: E402
    LEAF_MAX_DARK_PIXEL_RATIO,
    LEAF_MIN_BLUR_SCORE,
    LEAF_MIN_BRIGHTNESS,
    LEAF_MIN_BRIGHTNESS_P10,
    LEAF_MIN_CENTER_GREEN_RATIO,
    LEAF_MIN_GREEN_COMPONENT_DENSITY,
    LEAF_MIN_GREEN_RATIO,
    LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO,
)


def _fmt(value: float, threshold: float, kind: str = "min") -> str:
    """Format metric với check pass/fail."""
    if kind == "min":
        ok = value >= threshold
        arrow = "≥"
    else:
        ok = value <= threshold
        arrow = "≤"
    marker = "✅" if ok else "❌"
    return f"{marker} {value:.4f} (threshold: {arrow}{threshold})"


def diagnose(image_path: str) -> None:
    fp = Path(image_path)
    if not fp.is_file():
        print(f"❌ Không tìm thấy file: {fp}")
        sys.exit(1)

    print(f"📸 Đang phân tích: {fp}")
    print(f"   Size: {fp.stat().st_size / 1024:.1f} KB\n")

    # Load image và in thông tin RGB
    img = Image.open(str(fp)).convert("RGB")
    w, h = img.size
    print(f"   Kích thước: {w}×{h} pixels")

    # Phân tích HSV bổ sung để debug nếu green ratio thấp
    resized = img.resize((256, 256))
    hsv = np.asarray(resized.convert("HSV"), dtype=np.float32)
    hue = hsv[..., 0]
    sat = hsv[..., 1]
    val = hsv[..., 2]

    print(f"   Hue mean: {hue.mean():.1f} (max=255, green ~85 = 120°)")
    print(f"   Sat mean: {sat.mean():.1f} (max=255)")
    print(f"   Val mean: {val.mean():.1f} (max=255)")
    print()

    # Thử nhiều range hue khác nhau để xem mask nào match
    def _mask_ratio(h_lo: float, h_hi: float, s_min: float, v_min: float) -> float:
        mask = (
            (hue >= h_lo) & (hue <= h_hi)
            & (sat >= s_min) & (val >= v_min)
        )
        return float(mask.mean())

    print("🎨 Green mask test với nhiều range hue khác nhau:")
    print(f"   Range 28-71 (hiện tại, strict):  ratio = {_mask_ratio(28, 71, 45, 40):.4f}")
    print(f"   Range 30-95 (đề xuất):            ratio = {_mask_ratio(30, 95, 35, 35):.4f}")
    print(f"   Range 30-110 (rộng hơn):          ratio = {_mask_ratio(30, 110, 30, 30):.4f}")
    print(f"   Range 25-130 (legacy):            ratio = {_mask_ratio(25, 130, 25, 25):.4f}")
    print()

    # Chạy validation chính thức
    result = validate_leaf_image(img)

    print("🔍 Kết quả validation hiện tại:")
    print(f"   Status: {'✅ VALID' if result.is_valid_leaf else '❌ REJECT'}")
    if result.error_code:
        print(f"   Error code: {result.error_code}")
        print(f"   Message: {result.message}")
    print()

    print("📊 Chi tiết metrics (threshold | actual | pass):")
    print(f"   Brightness:                {_fmt(result.brightness, LEAF_MIN_BRIGHTNESS, 'min')}")
    print(f"   Brightness P10:            {_fmt(result.brightness_p10, LEAF_MIN_BRIGHTNESS_P10, 'min')}")
    print(f"   Dark pixel ratio:          {_fmt(result.dark_pixel_ratio, LEAF_MAX_DARK_PIXEL_RATIO, 'max')}")
    print(f"   Blur score:                {_fmt(result.blur_score, LEAF_MIN_BLUR_SCORE, 'min')}")
    print(f"   Green ratio:               {_fmt(result.green_ratio, LEAF_MIN_GREEN_RATIO, 'min')}")
    print(f"   Center green ratio:        {_fmt(result.center_green_ratio, LEAF_MIN_CENTER_GREEN_RATIO, 'min')}")
    print(f"   Largest component ratio:   {_fmt(result.largest_green_component_ratio, LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO, 'min')}")
    print(f"   Green component density:   {_fmt(result.green_component_density, LEAF_MIN_GREEN_COMPONENT_DENSITY, 'min')}")
    print()

    if not result.is_valid_leaf:
        print("💡 Fix gợi ý:")
        if result.green_ratio < LEAF_MIN_GREEN_RATIO:
            print("   - green_ratio thấp → mở rộng hue range (sửa image_validation.py)")
            print("     hoặc giảm LEAF_MIN_GREEN_RATIO trong .env")
        if result.center_green_ratio < LEAF_MIN_CENTER_GREEN_RATIO:
            print("   - center_green thấp → ảnh có lá ở rìa, chụp lại đưa lá vào giữa khung")
        if result.green_component_density < LEAF_MIN_GREEN_COMPONENT_DENSITY:
            print("   - density thấp → lá bị bệnh nhiều chỗ, vùng xanh bị cắt vỡ")
            print("     giảm LEAF_MIN_GREEN_COMPONENT_DENSITY xuống ~0.15 trong .env")
        if result.brightness < LEAF_MIN_BRIGHTNESS:
            print("   - brightness thấp → ảnh tối, chụp lại với đủ ánh sáng")
        if result.blur_score < LEAF_MIN_BLUR_SCORE:
            print("   - blur thấp → ảnh mờ, chụp lại ổn định hơn")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.diagnose_validation <image_path>")
        sys.exit(1)
    diagnose(sys.argv[1])

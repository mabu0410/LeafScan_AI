"""
Plant scope validator: chặn ảnh lá cây ngoài phạm vi hỗ trợ của PlantVillage classifier.
"""
from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter
from typing import Any, Sequence

from app.schemas.disease import PredictionItem

logger = logging.getLogger("leafscan.plant_scope")
SELECTED_PLANT_ACCEPT_CONFIDENCE = 0.60


def extract_plant_from_class(class_name: str) -> str:
    """
    Ví dụ:
    - Strawberry___Leaf_scorch -> Strawberry
    - Corn_(maize)___Common_rust_ -> Corn maize
    """
    prefix = (class_name or "").split("___", 1)[0]
    prefix = re.sub(r"\([^)]*\)", " ", prefix)
    prefix = prefix.replace("_", " ").replace(",", " ")
    prefix = re.sub(r"\s+", " ", prefix).strip()
    return prefix


def canonical_plant_key(value: str | None) -> str:
    raw = _normalize_text(value or "")
    if not raw:
        return ""

    alias_rules: list[tuple[tuple[str, ...], str]] = [
        (("strawberry", "dau tay"), "strawberry"),
        (("tomato", "ca chua"), "tomato"),
        (("corn", "maize", "ngo", "bap"), "corn"),
        (("potato", "khoai tay"), "potato"),
        (("apple", "tao"), "apple"),
        (("grape", "nho"), "grape"),
        (("peach", "dao"), "peach"),
        (("orange", "cam"), "orange"),
        (("pepper bell", "bell pepper", "pepper", "ot chuong"), "pepper_bell"),
        (("blueberry",), "blueberry"),
        (("cherry",), "cherry"),
        (("raspberry",), "raspberry"),
        (("soybean", "dau nanh"), "soybean"),
        (("squash", "bi"), "squash"),
    ]

    for needles, canonical in alias_rules:
        if any(needle in raw for needle in needles):
            return canonical

    return raw.split(" ")[0]


def build_supported_plants(class_names: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    plants: list[str] = []
    for class_name in class_names:
        canonical = canonical_plant_key(extract_plant_from_class(class_name))
        if canonical and canonical not in seen:
            seen.add(canonical)
            plants.append(canonical)
    return plants


def validate_plant_scope(
    predictions: Sequence[PredictionItem],
    supported_plants: Sequence[str],
    *,
    selected_plant_key: str | None,
    min_top1_confidence: float,
    min_margin: float,
    min_top5_same_plant_count: int,
) -> dict[str, Any]:
    if not predictions:
        return {
            "is_valid": False,
            "error_code": "LOW_CONFIDENCE",
            "message": "LeafScan chưa đủ tự tin để nhận diện. Vui lòng chụp rõ lá cây hơn.",
            "debug": {
                "reason": "no_predictions",
                "predicted_plant": "",
                "supported_plants": list(supported_plants),
                "top_predictions": [],
            },
        }

    top_5 = list(predictions[:5])
    top_1 = top_5[0]
    top_2 = top_5[1] if len(top_5) > 1 else None

    predicted_plant_key = canonical_plant_key(extract_plant_from_class(top_1.class_name))
    selected_plant_canonical = canonical_plant_key(selected_plant_key)
    supported_set = {
        canonical_plant_key(item)
        for item in supported_plants
        if canonical_plant_key(item)
    }

    top_plant_keys = [canonical_plant_key(extract_plant_from_class(item.class_name)) for item in top_5]
    plant_counts = Counter(top_plant_keys)
    same_plant_count_top5 = int(plant_counts.get(predicted_plant_key, 0))

    top1_conf = float(top_1.confidence)
    top2_conf = float(top_2.confidence) if top_2 else 0.0
    margin = top1_conf - top2_conf

    debug = {
        "predicted_plant": predicted_plant_key,
        "predicted_plant_key": predicted_plant_key,
        "predicted_label": top_1.class_name,
        "selected_plant_key": selected_plant_key,
        "selected_plant_canonical": selected_plant_canonical or None,
        "selected_plant_normalized": selected_plant_canonical or None,
        "supported_plants": list(supported_plants),
        "confidence": round(top1_conf, 6),
        "top1_confidence": round(top1_conf, 6),
        "top2_confidence": round(top2_conf, 6),
        "confidence_margin": round(margin, 6),
        "same_plant_count_top5": same_plant_count_top5,
        "top5_plants": top_plant_keys,
        "top_predictions": [
            {
                "class_index": item.class_index,
                "class_name": item.class_name,
                "disease_key": item.disease_key,
                "confidence": round(float(item.confidence), 6),
                "plant": canonical_plant_key(extract_plant_from_class(item.class_name)),
                "plant_key": canonical_plant_key(extract_plant_from_class(item.class_name)),
            }
            for item in top_5
        ],
    }

    if predicted_plant_key not in supported_set:
        return _scope_response(
            debug,
            is_valid=False,
            error_code="UNSUPPORTED_PLANT",
            reason="predicted_plant_not_supported",
            message=(
                "Loại cây này có thể chưa nằm trong dữ liệu nhận diện của LeafScan. "
                "Vui lòng chỉ quét các cây đang được hỗ trợ."
            ),
        )

    if selected_plant_canonical:
        if predicted_plant_key != selected_plant_canonical:
            return _scope_response(
                debug,
                is_valid=False,
                error_code="PLANT_MISMATCH",
                reason="selected_plant_mismatch",
                message=(
                    "Ảnh quét không khớp loại cây bạn đã chọn. "
                    "Vui lòng chọn đúng cây hoặc chụp lại ảnh rõ hơn."
                ),
            )

        if top1_conf >= SELECTED_PLANT_ACCEPT_CONFIDENCE:
            return _scope_response(
                debug,
                is_valid=True,
                error_code=None,
                reason="selected_plant_match_confident",
                message=None,
            )

        return _scope_response(
            debug,
            is_valid=False,
            error_code="LOW_CONFIDENCE",
            reason="selected_plant_match_but_confidence_too_low",
            message="Chưa đủ cơ sở nhận diện bệnh. Vui lòng chụp gần vùng lá nghi bị bệnh.",
        )

    if top1_conf < SELECTED_PLANT_ACCEPT_CONFIDENCE:
        return _scope_response(
            debug,
            is_valid=False,
            error_code="LOW_CONFIDENCE",
            reason="top1_confidence_too_low_for_unselected_scan",
            message="Chưa đủ cơ sở nhận diện bệnh. Vui lòng chụp gần vùng lá nghi bị bệnh.",
        )

    if top1_conf < min_top1_confidence:
        return _scope_response(
            debug,
            is_valid=False,
            error_code="LOW_CONFIDENCE",
            reason="top1_confidence_too_low",
            message="Chưa đủ cơ sở nhận diện bệnh. Vui lòng chụp gần vùng lá nghi bị bệnh.",
        )

    if margin < min_margin:
        return _scope_response(
            debug,
            is_valid=False,
            error_code="LOW_CONFIDENCE",
            reason="top1_top2_margin_too_low",
            message="Chưa đủ cơ sở nhận diện bệnh. Vui lòng chụp gần vùng lá nghi bị bệnh.",
        )

    if same_plant_count_top5 < min_top5_same_plant_count:
        return _scope_response(
            debug,
            is_valid=False,
            error_code="UNSUPPORTED_PLANT",
            reason="top5_plant_inconsistent",
            message=(
                "Loại cây này có thể chưa nằm trong dữ liệu nhận diện của LeafScan. "
                "Vui lòng chỉ quét các cây đang được hỗ trợ."
            ),
        )

    # Với top-1 quá cao nhưng top-5 vẫn phân tán nhiều plant khác,
    # chỉ áp dụng khi user không chọn cây. Khi user đã chọn đúng cây,
    # nhánh selected_plant_match_confident ở trên đã accept.
    if top1_conf >= 0.80 and same_plant_count_top5 < 3:
        return _scope_response(
            debug,
            is_valid=False,
            error_code="UNSUPPORTED_PLANT",
            reason="high_confidence_but_top5_still_inconsistent",
            message=(
                "Loại cây này có thể chưa nằm trong dữ liệu nhận diện của LeafScan. "
                "Vui lòng chỉ quét các cây đang được hỗ trợ."
            ),
        )

    return _scope_response(
        debug,
        is_valid=True,
        error_code=None,
        reason="ok",
        message=None,
    )


def _scope_response(
    debug: dict[str, Any],
    *,
    is_valid: bool,
    error_code: str | None,
    reason: str,
    message: str | None,
) -> dict[str, Any]:
    decision = "accept" if is_valid else "reject"
    debug["reason"] = reason
    debug["validation_decision"] = decision

    logger.info(
        (
            "plant_scope_validation selected_plant_key=%s selected_plant_normalized=%s "
            "predicted_label=%s predicted_plant=%s confidence=%.6f top5_plants=%s "
            "validation_decision=%s reason=%s"
        ),
        debug.get("selected_plant_key"),
        debug.get("selected_plant_normalized"),
        debug.get("predicted_label"),
        debug.get("predicted_plant"),
        float(debug.get("confidence") or 0.0),
        debug.get("top5_plants"),
        decision,
        reason,
    )

    if is_valid:
        return {
            "is_valid": True,
            "error_code": None,
            "message": None,
            "debug": debug,
        }

    return {
        "is_valid": False,
        "error_code": error_code,
        "message": message,
        "debug": debug,
    }


def _normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("_", " ")
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

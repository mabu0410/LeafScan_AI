"""
Stage Service - Rule-based dự đoán giai đoạn bệnh và dự báo 7 ngày.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, TYPE_CHECKING

from app.config import STAGE_EARLY_MAX, STAGE_MIDDLE_MAX

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


STAGE_ORDER = ["early", "middle", "late"]
VALID_STAGES = {"healthy", "early", "middle", "late", "unknown"}


@dataclass
class StageForecast:
    stage_7d: str
    confidence: float


class StageService:
    """Service suy luận giai đoạn bệnh và dự báo tiến triển ngắn hạn."""

    @staticmethod
    def infer_stage(disease_key: str, affected_area: float) -> str:
        """Dự đoán giai đoạn hiện tại từ disease_key + affected_area."""
        disease_key_norm = (disease_key or "").strip().lower()
        if disease_key_norm == "healthy" or disease_key_norm.endswith("_healthy"):
            return "healthy"

        if affected_area < STAGE_EARLY_MAX:
            return "early"
        if affected_area <= STAGE_MIDDLE_MAX:
            return "middle"
        return "late"

    @staticmethod
    def forecast_7d(
        db: Session,
        user_id: int,
        plant_id: int | None,
        current_stage: str,
        current_affected_area: float,
    ) -> StageForecast:
        """
        Dự báo stage sau 7 ngày dựa trên thay đổi affected_area so với lần quét trước.
        Nếu không đủ lịch sử thì trả về unknown.
        """
        if current_stage not in VALID_STAGES:
            return StageForecast(stage_7d="unknown", confidence=0.0)

        if current_stage == "healthy":
            return StageForecast(stage_7d="healthy", confidence=90.0)

        if plant_id is None:
            return StageForecast(stage_7d="unknown", confidence=0.0)

        previous_scan = StageService._get_previous_scan(db, user_id, plant_id)

        if previous_scan is None or previous_scan.affected_area_snapshot is None:
            return StageForecast(stage_7d="unknown", confidence=0.0)

        delta = current_affected_area - float(previous_scan.affected_area_snapshot)
        next_stage = StageService._project_stage(current_stage, delta)
        confidence = StageService._forecast_confidence(delta)
        return StageForecast(stage_7d=next_stage, confidence=confidence)

    @staticmethod
    def select_treatment_plan(
        treatment_by_stage: dict[str, list[str]],
        predicted_stage: str,
    ) -> list[str]:
        """Lấy phác đồ đúng theo stage hiện tại, fallback về middle/early."""
        if predicted_stage in treatment_by_stage:
            return treatment_by_stage[predicted_stage]
        if "middle" in treatment_by_stage:
            return treatment_by_stage["middle"]
        if "early" in treatment_by_stage:
            return treatment_by_stage["early"]
        return []

    @staticmethod
    def _project_stage(current_stage: str, delta: float) -> str:
        """Chiếu stage sau 7 ngày theo xu hướng tăng/giảm của vùng bệnh."""
        if current_stage not in STAGE_ORDER:
            return current_stage if current_stage in VALID_STAGES else "unknown"

        idx = STAGE_ORDER.index(current_stage)
        if delta > 10:
            idx = min(idx + 1, len(STAGE_ORDER) - 1)
        elif delta < -10:
            idx = max(idx - 1, 0)
        return STAGE_ORDER[idx]

    @staticmethod
    def _forecast_confidence(delta: float) -> float:
        """
        Rule confidence đơn giản:
        - Delta nhỏ => xu hướng ổn định, confidence cao hơn.
        - Delta lớn => biến động mạnh, confidence thấp hơn.
        """
        magnitude = abs(delta)
        confidence = 82.0 - min(magnitude, 25.0) * 1.2
        return round(max(45.0, min(confidence, 90.0)), 1)

    @staticmethod
    def _get_previous_scan(db: Any, user_id: int, plant_id: int):
        """
        Truy vấn scan trước đó.
        Tách thành helper để tránh hard dependency cho unit test môi trường tối giản.
        """
        try:
            from app.models.domain import ScanHistory
        except Exception:
            query = db.query(None)
            return query.filter(None).order_by(None).first()

        return (
            db.query(ScanHistory)
            .filter(
                ScanHistory.user_id == user_id,
                ScanHistory.plant_id == plant_id,
                ScanHistory.affected_area_snapshot.isnot(None),
            )
            .order_by(ScanHistory.scan_date.desc())
            .first()
        )

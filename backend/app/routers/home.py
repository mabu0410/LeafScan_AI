from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import Plant, ScanHistory, User
from app.schemas.home import (
    HomeAttentionPlant,
    HomeRecentScan,
    HomeStats,
    HomeSummaryData,
    HomeSummaryResponse,
    HomeTodayTip,
    HomeUser,
)
from app.services.care_tip_service import get_today_tip

router = APIRouter(tags=["Home"])


def _plant_status_from_health(health_score: float) -> str:
    if health_score < 40:
        return "critical"
    if health_score < 75:
        return "warning"
    return "healthy"


def _scan_status(scan: ScanHistory) -> str:
    severity = ""
    if scan.disease and scan.disease.severity:
        severity = str(scan.disease.severity).lower()
    if severity in {"moderate", "severe", "healthy"}:
        return severity
    return "healthy"


def _scan_result_name(scan: ScanHistory) -> str:
    if scan.disease and scan.disease.name:
        return scan.disease.name
    if scan.disease_key:
        return scan.disease_key
    return "Không xác định"


def _scan_plant_name(scan: ScanHistory) -> str:
    if scan.plant and scan.plant.name:
        return scan.plant.name
    return "Cây chưa đặt tên"


@router.get("/api/home/summary", response_model=HomeSummaryResponse)
@router.get("/api/v1/home/summary", response_model=HomeSummaryResponse, include_in_schema=False)
def get_home_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_plants = db.query(Plant).filter(Plant.user_id == current_user.id).all()

    avg_health = None
    if user_plants:
        avg_health = sum(float(plant.health_score or 0.0) for plant in user_plants) / len(user_plants)
        avg_health = round(avg_health, 2)

    attention_plants_rows = [
        plant for plant in user_plants if _plant_status_from_health(float(plant.health_score or 0.0)) != "healthy"
    ]
    attention_plants_rows.sort(key=lambda plant: float(plant.health_score or 0.0))

    recent_scan_rows = (
        db.query(ScanHistory)
        .filter(ScanHistory.user_id == current_user.id)
        .order_by(desc(ScanHistory.scan_date))
        .limit(10)
        .all()
    )

    scanned_plant_names = {_scan_plant_name(scan) for scan in recent_scan_rows if _scan_plant_name(scan)}
    alerts_count = len(attention_plants_rows)

    today_tip_row = get_today_tip(db)
    today_tip = None
    if today_tip_row:
        today_tip = HomeTodayTip(
            id=today_tip_row.id,
            slug=today_tip_row.slug,
            title=today_tip_row.title,
            summary=today_tip_row.summary,
            content=today_tip_row.content,
            category=today_tip_row.category,
            suitable_plants=today_tip_row.suitable_plants or [],
            source_name=today_tip_row.source_name,
            source_url=today_tip_row.source_url,
            source_note=today_tip_row.source_note,
        )

    attention_plants = [
        HomeAttentionPlant(
            id=plant.id,
            name=plant.name,
            latin_name=plant.latin_name,
            status=_plant_status_from_health(float(plant.health_score or 0.0)),
            health_score=float(plant.health_score or 0.0),
            image_url=plant.image_url or plant.thumbnail_url,
            location=plant.location,
            last_scanned=(
                max((scan.scan_date for scan in plant.scans), default=None).isoformat()
                if plant.scans
                else None
            ),
        )
        for plant in attention_plants_rows[:10]
    ]

    recent_scans = [
        HomeRecentScan(
            id=scan.id,
            plant_name=_scan_plant_name(scan),
            result_name=_scan_result_name(scan),
            confidence=float(scan.confidence or 0.0),
            status=_scan_status(scan),
            scanned_at=scan.scan_date if scan.scan_date else datetime.utcnow(),
            image_url=scan.image_url,
        )
        for scan in recent_scan_rows
    ]

    return HomeSummaryResponse(
        success=True,
        message="Thành công",
        data=HomeSummaryData(
            user=HomeUser(
                id=current_user.id,
                name=current_user.name,
                email=current_user.email,
                avatar=current_user.avatar,
            ),
            stats=HomeStats(
                average_health=avg_health,
                scanned_plants=len(scanned_plant_names),
                alerts=alerts_count,
            ),
            today_tip=today_tip,
            attention_plants=attention_plants,
            recent_scans=recent_scans,
        ),
    )

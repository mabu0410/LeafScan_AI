from __future__ import annotations

from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import (
    CareLog,
    CareTask,
    Plant,
    ScanHistory,
    User,
)
from app.schemas.home import (
    CareLogCreate,
    CareLogEnvelope,
    CareLogListEnvelope,
    CareLogUpdate,
    CareTaskCreate,
    CareTaskEnvelope,
    CareTaskListEnvelope,
    CareTaskUpdate,
    HomeAttentionPlant,
    HomeCareLog,
    HomeGardenSummary,
    HomeRecentActivity,
    HomeRecentScan,
    HomeStats,
    HomeSummaryData,
    HomeSummaryResponse,
    HomeTask,
    HomeTodayTip,
    HomeUser,
    HomeWeather,
)
from app.services.care_tip_service import get_today_tip
from app.services.weather_service import fetch_current_weather

router = APIRouter(tags=["Home"])


def _utcnow() -> datetime:
    return datetime.utcnow()


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


def _get_user_plant(db: Session, current_user: User, plant_id: int | None) -> Plant | None:
    if plant_id is None:
        return None
    plant = db.query(Plant).filter(Plant.id == plant_id, Plant.user_id == current_user.id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Không tìm thấy cây này trong vườn của bạn.")
    return plant


def _get_user_task(db: Session, current_user: User, task_id: int) -> CareTask:
    task = (
        db.query(CareTask)
        .filter(CareTask.id == task_id, CareTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy việc chăm sóc.")
    return task


def _get_user_care_log(db: Session, current_user: User, log_id: int) -> CareLog:
    care_log = (
        db.query(CareLog)
        .filter(CareLog.id == log_id, CareLog.user_id == current_user.id)
        .first()
    )
    if not care_log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký chăm sóc.")
    return care_log


def _task_to_home(task: CareTask) -> HomeTask:
    return HomeTask(
        id=task.id,
        title=task.title,
        task_type=task.task_type,
        due_at=task.due_at,
        status=task.status,
        plant_id=task.plant_id,
        plant_name=task.plant.name if task.plant else None,
    )


def _care_log_to_home(care_log: CareLog) -> HomeCareLog:
    return HomeCareLog(
        id=care_log.id,
        title=care_log.title,
        description=care_log.description,
        log_type=care_log.log_type,
        performed_at=care_log.performed_at,
        plant_id=care_log.plant_id,
        plant_name=care_log.plant.name if care_log.plant else None,
    )


def _today_tasks(db: Session, user_id: int) -> list[CareTask]:
    start_at = datetime.combine(_utcnow().date(), time.min)
    end_at = start_at + timedelta(days=1)
    return (
        db.query(CareTask)
        .filter(CareTask.user_id == user_id)
        .filter(CareTask.due_at >= start_at, CareTask.due_at < end_at)
        .filter(CareTask.status != "completed")
        .order_by(CareTask.due_at.asc(), CareTask.id.asc())
        .limit(10)
        .all()
    )


def _build_recent_activities(
    recent_scan_rows: list[ScanHistory],
    care_log_rows: list[CareLog],
) -> list[HomeRecentActivity]:
    activities: list[HomeRecentActivity] = []
    for scan in recent_scan_rows[:5]:
        occurred_at = scan.scan_date or _utcnow()
        activities.append(
            HomeRecentActivity(
                id=f"scan-{scan.id}",
                activity_type="scan",
                title=_scan_plant_name(scan),
                subtitle=_scan_result_name(scan),
                occurred_at=occurred_at,
                status=_scan_status(scan),
            )
        )

    for care_log in care_log_rows[:5]:
        subtitle = care_log.description or (care_log.plant.name if care_log.plant else "")
        activities.append(
            HomeRecentActivity(
                id=f"care-log-{care_log.id}",
                activity_type="care_log",
                title=care_log.title,
                subtitle=subtitle,
                occurred_at=care_log.performed_at,
                status=care_log.log_type,
            )
        )

    activities.sort(key=lambda item: item.occurred_at, reverse=True)
    return activities[:5]


def _build_today_tip(db: Session) -> HomeTodayTip | None:
    today_tip_row = get_today_tip(db)
    if not today_tip_row:
        return None
    return HomeTodayTip(
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
    all_scan_rows = db.query(ScanHistory).filter(ScanHistory.user_id == current_user.id).all()
    scanned_plant_names = {_scan_plant_name(scan) for scan in all_scan_rows if _scan_plant_name(scan)}

    weather_payload = fetch_current_weather()
    weather = HomeWeather(**weather_payload)

    latest_scan_at = recent_scan_rows[0].scan_date if recent_scan_rows else None

    care_log_rows = (
        db.query(CareLog)
        .filter(CareLog.user_id == current_user.id)
        .order_by(desc(CareLog.performed_at))
        .limit(10)
        .all()
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
            scanned_at=scan.scan_date if scan.scan_date else _utcnow(),
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
                alerts=len(attention_plants_rows),
            ),
            today_tip=_build_today_tip(db),
            weather=weather,
            garden_summary=HomeGardenSummary(
                attention_plants=len(attention_plants_rows),
                last_scan_at=latest_scan_at,
            ),
            attention_plants=attention_plants,
            recent_scans=recent_scans,
            recent_activities=_build_recent_activities(recent_scan_rows, care_log_rows),
            today_tasks=[_task_to_home(task) for task in _today_tasks(db, current_user.id)],
            care_logs=[_care_log_to_home(care_log) for care_log in care_log_rows[:5]],
        ),
    )


@router.get("/api/v1/home/tasks", response_model=CareTaskListEnvelope)
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = (
        db.query(CareTask)
        .filter(CareTask.user_id == current_user.id)
        .order_by(CareTask.due_at.is_(None), CareTask.due_at.asc(), desc(CareTask.created_at))
        .all()
    )
    return CareTaskListEnvelope(success=True, message="Thành công", data=[_task_to_home(task) for task in tasks])


@router.post("/api/v1/home/tasks", response_model=CareTaskEnvelope)
def create_task(
    payload: CareTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_user_plant(db, current_user, payload.plant_id)
    completed_at = _utcnow() if payload.status == "completed" else None
    task = CareTask(
        user_id=current_user.id,
        plant_id=payload.plant_id,
        title=payload.title,
        task_type=payload.task_type,
        due_at=payload.due_at,
        status=payload.status,
        completed_at=completed_at,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return CareTaskEnvelope(success=True, message="Đã tạo việc chăm sóc.", data=_task_to_home(task))


@router.patch("/api/v1/home/tasks/{task_id}", response_model=CareTaskEnvelope)
def update_task(
    task_id: int,
    payload: CareTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_user_task(db, current_user, task_id)
    values = payload.model_dump(exclude_unset=True)
    if "plant_id" in values:
        _get_user_plant(db, current_user, values["plant_id"])
    for key, value in values.items():
        setattr(task, key, value)
    if values.get("status") == "completed" and task.completed_at is None:
        task.completed_at = _utcnow()
    if values.get("status") and values.get("status") != "completed":
        task.completed_at = None
    db.commit()
    db.refresh(task)
    return CareTaskEnvelope(success=True, message="Đã cập nhật việc chăm sóc.", data=_task_to_home(task))


@router.delete("/api/v1/home/tasks/{task_id}", response_model=CareTaskEnvelope)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_user_task(db, current_user, task_id)
    db.delete(task)
    db.commit()
    return CareTaskEnvelope(success=True, message="Đã xóa việc chăm sóc.", data=None)


@router.get("/api/v1/home/care-logs", response_model=CareLogListEnvelope)
def list_care_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    care_logs = (
        db.query(CareLog)
        .filter(CareLog.user_id == current_user.id)
        .order_by(desc(CareLog.performed_at))
        .all()
    )
    return CareLogListEnvelope(
        success=True,
        message="Thành công",
        data=[_care_log_to_home(care_log) for care_log in care_logs],
    )


@router.post("/api/v1/home/care-logs", response_model=CareLogEnvelope)
def create_care_log(
    payload: CareLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_user_plant(db, current_user, payload.plant_id)
    care_log = CareLog(
        user_id=current_user.id,
        plant_id=payload.plant_id,
        title=payload.title,
        description=payload.description,
        log_type=payload.log_type,
        performed_at=payload.performed_at or _utcnow(),
    )
    db.add(care_log)
    db.commit()
    db.refresh(care_log)
    return CareLogEnvelope(success=True, message="Đã tạo nhật ký chăm sóc.", data=_care_log_to_home(care_log))


@router.patch("/api/v1/home/care-logs/{log_id}", response_model=CareLogEnvelope)
def update_care_log(
    log_id: int,
    payload: CareLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    care_log = _get_user_care_log(db, current_user, log_id)
    values = payload.model_dump(exclude_unset=True)
    if "plant_id" in values:
        _get_user_plant(db, current_user, values["plant_id"])
    for key, value in values.items():
        setattr(care_log, key, value)
    db.commit()
    db.refresh(care_log)
    return CareLogEnvelope(success=True, message="Đã cập nhật nhật ký chăm sóc.", data=_care_log_to_home(care_log))


@router.delete("/api/v1/home/care-logs/{log_id}", response_model=CareLogEnvelope)
def delete_care_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    care_log = _get_user_care_log(db, current_user, log_id)
    db.delete(care_log)
    db.commit()
    return CareLogEnvelope(success=True, message="Đã xóa nhật ký chăm sóc.", data=None)

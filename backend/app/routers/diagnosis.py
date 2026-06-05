"""
Diagnosis Router - API endpoints cho chẩn đoán bệnh lá cây.
"""
import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from app.config import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    PLANT_SCOPE_MIN_MARGIN,
    PLANT_SCOPE_MIN_TOP1_CONFIDENCE,
    PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT,
    TOP_K,
    UPLOAD_DIR,
)
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import Disease, Plant, ScanFeedback, ScanHistory, User
from app.schemas.disease import (
    DiagnosisDiseasePayload,
    DiagnosisErrorCode,
    DiagnosisResponse,
    DiseaseDetail,
    HealthCheckResponse,
    PredictionItem,
    PredictionSummary,
)
from app.schemas.scan import ScanFeedbackEnvelope, ScanFeedbackRequest
from app.services.image_validation import validate_leaf_image_dict as validate_leaf_image
from app.services.model_service import ModelService, class_name_to_disease_key
from app.services.plant_scope_validator import (
    build_supported_plants,
    validate_plant_scope,
)
from app.services.stage_service import StageService
from app.services.subscription_service import ensure_can_scan, record_scan_consumption
from app.services.treatment_service import TreatmentService


router = APIRouter(prefix="/api/v1", tags=["Diagnosis"])
logger = logging.getLogger("leafscan.diagnosis")

model_service = ModelService()
treatment_service = TreatmentService()
stage_service = StageService()
SAFETY_NOTICE_DEFAULT = (
    "Thông tin chỉ mang tính tham khảo. "
    "Hãy xác nhận với cán bộ nông nghiệp/chuyên gia trước khi áp dụng."
)
SUPPORTED_PLANTS = build_supported_plants(ModelService.DISEASE_CLASSES)


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Kiểm tra server đang hoạt động."""
    return HealthCheckResponse(
        status="ok",
        version="1.1.0",
        message="LeafScan AI Backend đang chạy!",
    )


@router.post("/diagnose", response_model=DiagnosisResponse)
async def diagnose_disease(
    file: UploadFile = File(...),
    plant_id: int | None = Form(None),
    selected_plant_key: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Chẩn đoán bệnh lá cây từ ảnh và dự báo stage 7 ngày.
    """
    _validate_upload(file)

    selected_plant = None
    if plant_id is not None:
        selected_plant = (
            db.query(Plant)
            .filter(Plant.id == plant_id, Plant.user_id == current_user.id)
            .first()
        )
        if selected_plant is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy cây trồng tương ứng.")

    ensure_can_scan(db, current_user.id)
    image_path = await _save_upload(file)

    upload_image = _read_uploaded_image(image_path)
    validation = validate_leaf_image(upload_image)
    metrics = validation.get("metrics", {})
    _log_validation_metrics(metrics)
    if not validation.get("is_valid", False):
        error_code = validation.get("error_code") or "NO_LEAF_DETECTED"
        message = validation.get("message") or (
            "Không phát hiện lá cây trong ảnh. Vui lòng chụp rõ phần lá cây, "
            "tránh chụp màn hình, laptop, đồ vật, đất hoặc nền xung quanh."
        )
        debug_payload = {
            **metrics,
            "supported_plants": SUPPORTED_PLANTS,
        }
        logger.info(
            "diagnosis_rejected error_code=%s reason=%s metrics=%s",
            error_code,
            metrics.get("reason", "unknown"),
            debug_payload,
        )
        return _rejected_response(
            error_code=error_code,
            message=message,
            debug=debug_payload,
        )

    predictions = model_service.predict(image_path)
    if not predictions:
        raise HTTPException(status_code=500, detail="Model không trả về kết quả dự đoán.")

    top_predictions = predictions[:TOP_K]
    top_5_predictions = predictions[:5]
    best = top_predictions[0]
    second_best = top_predictions[1] if len(top_predictions) > 1 else None
    best_confidence_pct = best.confidence * 100.0
    second_confidence_pct = (second_best.confidence * 100.0) if second_best else 0.0
    confidence_margin_pct = best_confidence_pct - second_confidence_pct
    logger.info(
        (
            "diagnosis_model_output predicted_class=%s confidence=%.2f green_ratio=%.4f "
            "brightness=%.2f blur_score=%.2f largest_green_area_ratio=%.4f "
            "confidence_margin=%.2f second_class=%s second_confidence=%.2f"
        ),
        best.class_name,
        best_confidence_pct,
        float(metrics.get("green_ratio", 0.0)),
        float(metrics.get("brightness", 0.0)),
        float(metrics.get("blur_score", 0.0)),
        float(metrics.get("largest_green_area_ratio", 0.0)),
        confidence_margin_pct,
        second_best.class_name if second_best else "none",
        second_confidence_pct,
    )

    requested_plant_key = _derive_requested_plant_key(
        selected_plant_key=selected_plant_key,
        selected_plant=selected_plant,
    )
    scope_validation = validate_plant_scope(
        predictions=top_5_predictions,
        supported_plants=SUPPORTED_PLANTS,
        selected_plant_key=requested_plant_key,
        min_top1_confidence=PLANT_SCOPE_MIN_TOP1_CONFIDENCE,
        min_margin=PLANT_SCOPE_MIN_MARGIN,
        min_top5_same_plant_count=PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT,
    )
    scope_debug = scope_validation.get("debug", {})
    if not scope_validation.get("is_valid", False):
        error_code = scope_validation.get("error_code") or "LOW_CONFIDENCE"
        message = scope_validation.get("message") or "Chưa đủ cơ sở nhận diện bệnh. Vui lòng chụp gần vùng lá nghi bị bệnh."
        logger.info(
            "diagnosis_rejected error_code=%s reason=%s debug=%s",
            error_code,
            scope_debug.get("reason", "unknown"),
            scope_debug,
        )
        return _rejected_response(
            error_code=error_code,
            message=message,
            debug=scope_debug,
        )

    disease_record = _find_disease_in_db_by_model_class(
        db=db,
        model_class_name=best.class_name,
    )
    disease_key_for_content = (
        disease_record.disease_key
        if disease_record and disease_record.disease_key
        else class_name_to_disease_key(best.class_name)
    )
    top_disease = treatment_service.get_treatment(
        disease_key=disease_key_for_content,
        confidence=round(best_confidence_pct, 2),
    )

    alternatives: list[DiseaseDetail] = []
    for pred in top_predictions[1:]:
        alt_key = class_name_to_disease_key(pred.class_name)
        alt = treatment_service.get_treatment(
            disease_key=alt_key,
            confidence=round(pred.confidence * 100.0, 2),
        )
        if alt is not None:
            alternatives.append(alt)

    predicted_stage = "unknown"
    forecast_stage_7d = "unknown"
    forecast_confidence = 0.0
    treatment_plan: list[str] = []
    safety_notice = SAFETY_NOTICE_DEFAULT
    affected_area_snapshot: float | None = None

    if top_disease is not None:
        predicted_stage = stage_service.infer_stage(
            disease_key=top_disease.id,
            affected_area=float(top_disease.affected_area),
        )
        stage_forecast = stage_service.forecast_7d(
            db=db,
            user_id=current_user.id,
            plant_id=plant_id,
            current_stage=predicted_stage,
            current_affected_area=float(top_disease.affected_area),
        )
        forecast_stage_7d = stage_forecast.stage_7d
        forecast_confidence = stage_forecast.confidence
        treatment_plan = stage_service.select_treatment_plan(
            treatment_by_stage=top_disease.treatment_by_stage,
            predicted_stage=predicted_stage,
        )
        safety_notice = top_disease.safety_notice
        affected_area_snapshot = float(top_disease.affected_area)

    scan_image_url = f"/uploads/{os.path.basename(image_path)}"
    uploaded_image_url = scan_image_url
    scan_record = ScanHistory(
        user_id=current_user.id,
        plant_id=plant_id,
        disease_key=disease_record.disease_key if disease_record else None,
        image_url=uploaded_image_url,
        confidence=round(best_confidence_pct, 2),
        predicted_stage=predicted_stage,
        forecast_stage_7d=forecast_stage_7d,
        affected_area_snapshot=affected_area_snapshot,
    )
    db.add(scan_record)
    db.flush()
    record_scan_consumption(db, current_user.id, scan_record.id)
    db.commit()

    prediction_payload = PredictionSummary(
        class_index=best.class_index,
        class_name=best.class_name,
        disease_key=best.disease_key,
        confidence=round(best.confidence, 4),
        top_predictions=[
            PredictionItem(
                class_index=pred.class_index,
                class_name=pred.class_name,
                disease_key=pred.disease_key,
                confidence=round(pred.confidence, 4),
            )
            for pred in top_predictions
        ],
    )

    disease_payload = _to_disease_payload(disease_record)
    if disease_payload is None:
        logger.warning(
            "diagnosis_missing_disease_record predicted_class=%s resolved_disease_key=%s",
            best.class_name,
            disease_key_for_content,
        )

    return DiagnosisResponse(
        success=True,
        low_confidence=False,
        error_code=None,
        message=(
            "Phân tích hoàn tất!"
            if disease_payload
            else "Phân tích hoàn tất, chưa có model_class_name tương ứng trong DB."
        ),
        debug=scope_debug,
        scan_id=scan_record.id,
        scan_image_url=scan_image_url,
        uploaded_image_url=uploaded_image_url,
        prediction=prediction_payload,
        disease=disease_payload,
        predicted_stage=predicted_stage,
        forecast_stage_7d=forecast_stage_7d,
        forecast_confidence=forecast_confidence,
        treatment_plan=treatment_plan,
        safety_notice=safety_notice,
        top_prediction=top_disease,
        alternatives=alternatives,
    )


@router.post("/diagnose/{scan_id}/feedback", response_model=ScanFeedbackEnvelope)
def submit_scan_feedback(
    scan_id: int,
    payload: ScanFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"correct", "incorrect", "unsure"}
    feedback_value = payload.feedback.strip().lower()
    if feedback_value not in allowed:
        raise HTTPException(status_code=400, detail="Phản hồi phải là correct, incorrect hoặc unsure.")

    scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id, ScanHistory.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt quét.")

    row = (
        db.query(ScanFeedback)
        .filter(ScanFeedback.scan_id == scan_id, ScanFeedback.user_id == current_user.id)
        .first()
    )
    if row is None:
        row = ScanFeedback(user_id=current_user.id, scan_id=scan_id, feedback=feedback_value, note=payload.note)
        db.add(row)
    else:
        row.feedback = feedback_value
        row.note = payload.note
    db.commit()
    db.refresh(row)
    return ScanFeedbackEnvelope(success=True, message="Đã ghi nhận phản hồi AI.", data=row)


def _log_validation_metrics(metrics: dict) -> None:
    logger.info(
        "leaf_validation metrics=%s",
        metrics,
    )


def _rejected_response(
    error_code: DiagnosisErrorCode,
    message: str,
    debug: dict | None = None,
) -> DiagnosisResponse:
    return DiagnosisResponse(
        success=False,
        low_confidence=error_code == "LOW_CONFIDENCE",
        error_code=error_code,
        message=message,
        debug=debug,
        scan_image_url=None,
        uploaded_image_url=None,
        prediction=None,
        disease=None,
        predicted_stage="unknown",
        forecast_stage_7d="unknown",
        forecast_confidence=0.0,
        treatment_plan=[],
        safety_notice=SAFETY_NOTICE_DEFAULT,
        top_prediction=None,
        alternatives=[],
    )


def _find_disease_in_db_by_model_class(db: Session, model_class_name: str) -> Disease | None:
    clean_name = model_class_name.strip()
    if not clean_name:
        return None
    return (
        db.query(Disease)
        .filter(Disease.model_class_name == clean_name)
        .first()
    )


def _as_string_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    return []


def _to_disease_payload(row: Disease | None) -> DiagnosisDiseasePayload | None:
    if row is None:
        return None

    return DiagnosisDiseasePayload(
        id=row.id,
        disease_key=row.disease_key or "",
        model_class_name=row.model_class_name,
        name=row.name or "",
        severity=row.severity,
        description=row.description or "",
        symptoms=_as_string_list(row.symptoms),
        treatment=_as_string_list(row.treatment),
        prevention=_as_string_list(row.prevention),
        affected_area=row.affected_area_typical,
        image_url=row.image_url,
    )


def _read_uploaded_image(image_path: str) -> Image.Image:
    try:
        with Image.open(image_path) as img:
            return img.convert("RGB")
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=400, detail=f"Không thể đọc ảnh upload: {exc}") from exc


def _derive_requested_plant_key(
    *,
    selected_plant_key: str | None,
    selected_plant: Plant | None,
) -> str | None:
    if selected_plant_key and selected_plant_key.strip():
        return selected_plant_key.strip()

    if selected_plant is None:
        return None

    candidates = [
        selected_plant.name,
        selected_plant.latin_name,
        selected_plant.category,
    ]
    for candidate in candidates:
        if candidate and candidate.strip():
            return candidate.strip()

    return None


def _validate_upload(file: UploadFile) -> None:
    """Kiểm tra file upload có hợp lệ không."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Không có file được upload.")

    extension = file.filename.rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Định dạng '{extension}' không được hỗ trợ. "
                f"Chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
            ),
        )


async def _save_upload(file: UploadFile) -> str:
    """Lưu file upload vào thư mục uploads và trả về đường dẫn."""
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    unique_name = f"{uuid.uuid4().hex}.{extension}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File quá lớn. Kích thước tối đa: {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    with open(save_path, "wb") as f:
        f.write(content)

    return save_path

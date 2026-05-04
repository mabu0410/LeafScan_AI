"""
Diagnosis Router - API endpoints cho chẩn đoán bệnh lá cây.
"""
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import (
    ALLOWED_EXTENSIONS,
    API_PUBLIC_BASE_URL,
    CONFIDENCE_THRESHOLD,
    MAX_FILE_SIZE,
    TOP_K,
    UPLOAD_DIR,
)
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import Plant, ScanHistory, User
from app.schemas.disease import DiagnosisResponse, DiseaseDetail, HealthCheckResponse
from app.services.model_service import ModelService
from app.services.stage_service import StageService
from app.services.treatment_service import TreatmentService


router = APIRouter(prefix="/api/v1", tags=["Diagnosis"])

model_service = ModelService()
treatment_service = TreatmentService()
stage_service = StageService()


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Chẩn đoán bệnh lá cây từ ảnh và dự báo stage 7 ngày.
    """
    _validate_upload(file)
    image_path = await _save_upload(file)

    if plant_id is not None:
        plant = (
            db.query(Plant)
            .filter(Plant.id == plant_id, Plant.user_id == current_user.id)
            .first()
        )
        if plant is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy cây trồng tương ứng.")

    predictions = model_service.predict(image_path)
    top_predictions = predictions[:TOP_K]
    best = top_predictions[0]

    if best.confidence < CONFIDENCE_THRESHOLD:
        return DiagnosisResponse(
            success=True,
            low_confidence=True,
            message=(
                "LeafScan chưa nhận diện rõ được bệnh. "
                "Bạn hãy thử chụp gần hơn, tập trung vào vết bệnh và đảm bảo đủ ánh sáng nhé!"
            ),
            predicted_stage="unknown",
            forecast_stage_7d="unknown",
            forecast_confidence=0.0,
            treatment_plan=[],
            safety_notice=(
                "Thông tin chỉ mang tính tham khảo. "
                "Hãy xác nhận với cán bộ nông nghiệp/chuyên gia trước khi áp dụng."
            ),
            top_prediction=None,
            alternatives=[],
        )

    top_disease = treatment_service.get_treatment(
        disease_key=best.disease_key,
        confidence=best.confidence,
    )
    if top_disease is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin bệnh trong database.")

    alternatives: list[DiseaseDetail] = []
    for pred in top_predictions[1:]:
        alt = treatment_service.get_treatment(
            disease_key=pred.disease_key,
            confidence=pred.confidence,
        )
        if alt is not None:
            alternatives.append(alt)

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
    treatment_plan = stage_service.select_treatment_plan(
        treatment_by_stage=top_disease.treatment_by_stage,
        predicted_stage=predicted_stage,
    )

    image_url = f"{API_PUBLIC_BASE_URL}/uploads/{os.path.basename(image_path)}"
    scan_record = ScanHistory(
        user_id=current_user.id,
        plant_id=plant_id,
        disease_key=top_disease.id,
        image_url=image_url,
        confidence=best.confidence,
        predicted_stage=predicted_stage,
        forecast_stage_7d=stage_forecast.stage_7d,
        affected_area_snapshot=float(top_disease.affected_area),
    )
    db.add(scan_record)
    db.commit()

    return DiagnosisResponse(
        success=True,
        low_confidence=False,
        message="Phân tích hoàn tất!",
        predicted_stage=predicted_stage,
        forecast_stage_7d=stage_forecast.stage_7d,
        forecast_confidence=stage_forecast.confidence,
        treatment_plan=treatment_plan,
        safety_notice=top_disease.safety_notice,
        top_prediction=top_disease,
        alternatives=alternatives,
    )


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

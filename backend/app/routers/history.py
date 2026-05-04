from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.domain import User, ScanHistory, Disease
from app.schemas.scan import ScanHistoryResponse, ScanHistoryListResponse
from app.dependencies.auth import get_current_user
from app.services.treatment_service import TreatmentService

router = APIRouter(prefix="/api/v1/history", tags=["History"])
treatment_service = TreatmentService()

@router.get("", response_model=ScanHistoryListResponse)
def get_user_scan_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lấy danh sách tóm tắt lịch sử quét bệnh của người dùng."""
    histories = (
        db.query(ScanHistory)
        .filter(ScanHistory.user_id == current_user.id)
        .order_by(desc(ScanHistory.scan_date))
        .all()
    )
    
    result_data = []
    for h in histories:
        resp = ScanHistoryResponse.model_validate(h)
        # Bổ sung các trường từ relations
        if h.plant:
            resp.plant_name = h.plant.name
            if h.plant.location:
                resp.plant_name += f" · {h.plant.location}"
        
        if h.disease_key:
            disease_info = db.query(Disease).filter(Disease.disease_key == h.disease_key).first()
            if disease_info:
                resp.result = disease_info.name
                resp.severity = disease_info.severity
            else:
                fallback = treatment_service.get_treatment(h.disease_key, confidence=h.confidence)
                if fallback:
                    resp.result = fallback.name
                    resp.severity = fallback.severity
            
        result_data.append(resp)
        
    return ScanHistoryListResponse(
        success=True,
        message="Thành công",
        data=result_data
    )

@router.get("/plant/{plant_id}", response_model=ScanHistoryListResponse)
def get_plant_scan_history(plant_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lấy lịch sử quét của một cây cụ thể."""
    histories = (
        db.query(ScanHistory)
        .filter(ScanHistory.plant_id == plant_id, ScanHistory.user_id == current_user.id)
        .order_by(desc(ScanHistory.scan_date))
        .all()
    )
    
    result_data = []
    for h in histories:
        resp = ScanHistoryResponse.model_validate(h)
        # Bổ sung các trường từ relations
        if h.plant:
            resp.plant_name = h.plant.name
            
        if h.disease_key:
            disease_info = db.query(Disease).filter(Disease.disease_key == h.disease_key).first()
            if disease_info:
                resp.result = disease_info.name
                resp.severity = disease_info.severity
            else:
                fallback = treatment_service.get_treatment(h.disease_key, confidence=h.confidence)
                if fallback:
                    resp.result = fallback.name
                    resp.severity = fallback.severity
            
        result_data.append(resp)
        
    return ScanHistoryListResponse(
        success=True,
        message="Thành công",
        data=result_data
    )

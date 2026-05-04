import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.domain import User, Plant
from app.schemas.plant import PlantCreate, PlantUpdate, PlantResponse, PlantListResponse, SinglePlantResponse
from app.dependencies.auth import get_current_user
from app.config import UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, API_PUBLIC_BASE_URL

router = APIRouter(prefix="/api/v1/plants", tags=["Plants"])

@router.get("", response_model=PlantListResponse)
def get_user_plants(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lấy danh sách tất cả cây trong My Garden của user hiện tại."""
    plants = db.query(Plant).filter(Plant.user_id == current_user.id).all()
    
    # Calculate additional fields for frontend
    result_data = []
    for plant in plants:
        # Mock calculation for days_tracked based on created_at
        days_tracked = (datetime.utcnow().replace(tzinfo=None) - plant.created_at.replace(tzinfo=None)).days
        
        # Scans info would normally be a subquery
        scans = plant.scans
        total_scans = len(scans)
        
        # Determine status
        status_val = "healthy"
        if plant.health_score < 40:
            status_val = "critical"
        elif plant.health_score < 75:
            status_val = "warning"
            
        last_scanned_val = "Chưa quét"
        if total_scans > 0:
            # Sort scans by date descending
            last_scan = sorted(scans, key=lambda s: s.scan_date, reverse=True)[0]
            last_scanned_val = last_scan.scan_date.strftime("%Y-%m-%d %H:%M")
            
        p_resp = PlantResponse.model_validate(plant)
        p_resp.days_tracked = max(1, days_tracked)
        p_resp.total_scans = total_scans
        p_resp.status = status_val
        p_resp.last_scanned = last_scanned_val
        
        result_data.append(p_resp)
        
    return PlantListResponse(
        success=True,
        message="Thành công",
        data=result_data
    )

@router.post("", response_model=SinglePlantResponse)
def create_plant(plant_data: PlantCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Thêm một cây mới vào khu vườn."""
    new_plant = Plant(
        user_id=current_user.id,
        name=plant_data.name,
        latin_name=plant_data.latin_name,
        category=plant_data.category,
        image_url=plant_data.image_url,
        thumbnail_url=plant_data.thumbnail_url,
        location=plant_data.location,
        notes=plant_data.notes
    )
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)
    
    return SinglePlantResponse(
        success=True,
        message="Thêm cây thành công",
        data=PlantResponse.model_validate(new_plant)
    )


@router.put("/{plant_id}", response_model=SinglePlantResponse)
def update_plant(
    plant_id: int,
    plant_data: PlantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật thông tin cây trồng."""
    plant = db.query(Plant).filter(Plant.id == plant_id, Plant.user_id == current_user.id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Không tìm thấy cây này trong vườn của bạn.")

    update_fields = plant_data.model_dump(exclude_unset=True)
    for key, value in update_fields.items():
        setattr(plant, key, value)

    db.commit()
    db.refresh(plant)

    return SinglePlantResponse(
        success=True,
        message="Cập nhật cây thành công",
        data=PlantResponse.model_validate(plant),
    )

@router.get("/{plant_id}", response_model=SinglePlantResponse)
def get_plant_detail(plant_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lấy thông tin chi tiết của một cây."""
    plant = db.query(Plant).filter(Plant.id == plant_id, Plant.user_id == current_user.id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Không tìm thấy cây này trong vườn của bạn.")
        
    return SinglePlantResponse(
        success=True,
        message="Thành công",
        data=PlantResponse.model_validate(plant)
    )

@router.delete("/{plant_id}")
def delete_plant(plant_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Xóa bỏ một cây khỏi khu vườn."""
    plant = db.query(Plant).filter(Plant.id == plant_id, Plant.user_id == current_user.id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Không tìm thấy cây này.")
        
    db.delete(plant)
    db.commit()
    return {"success": True, "message": "Đã xóa cây thành công."}

@router.post("/{plant_id}/image")
async def upload_plant_image(plant_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Upload ảnh mới cho cây trồng."""
    plant = db.query(Plant).filter(Plant.id == plant_id, Plant.user_id == current_user.id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Không tìm thấy cây này.")
        
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Định dạng file không hỗ trợ.")
        
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File quá lớn.")
        
    unique_name = f"plant_{plant.id}_{uuid.uuid4().hex}.{extension}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    
    with open(save_path, "wb") as f:
        f.write(content)
        
    # URL ảnh cho môi trường local/LAN.
    url = f"{API_PUBLIC_BASE_URL}/uploads/{unique_name}"
    
    plant.image_url = url
    plant.thumbnail_url = url
    db.commit()
    db.refresh(plant)
    
    return {"success": True, "message": "Upload ảnh thành công", "data": {"image_url": url}}

import os
import shutil
from typing import Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import User
from app.services.settings_service import SettingsService
from app.routers.diagnosis import model_service

router = APIRouter(prefix="/api/v1/admin/settings", tags=["Admin Settings"])

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền thực hiện thao tác này.")
    return current_user

class SettingUpdateRequest(BaseModel):
    value: str

@router.get("")
def get_all_settings(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    settings = SettingsService.get_all(db, as_dict=False)
    return {
        "success": True,
        "data": [
            {
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "type": s.type,
                "updated_at": s.updated_at
            }
            for s in settings
        ]
    }

@router.put("/{key}")
def update_setting(key: str, payload: SettingUpdateRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    updated = SettingsService.update(db, key, payload.value)
    if not updated:
         raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình này")
    return {"success": True, "message": "Cập nhật thành công"}

@router.get("/models/list")
def list_models(_: User = Depends(require_admin)):
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    if not os.path.exists(models_dir):
        return {"success": True, "data": []}
    
    files = [f for f in os.listdir(models_dir) if f.endswith(".onnx") or f.endswith(".tflite")]
    active_path = model_service.model_path
    
    data = []
    for f in files:
        full_path = os.path.join(models_dir, f)
        data.append({
            "filename": f,
            "path": full_path,
            "is_active": full_path == active_path,
            "size_mb": round(os.path.getsize(full_path) / (1024 * 1024), 2)
        })
    return {"success": True, "data": data}

@router.post("/models/upload")
async def upload_model(file: UploadFile = File(...), _: User = Depends(require_admin)):
    if not (file.filename.endswith(".onnx") or file.filename.endswith(".tflite")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file ONNX hoặc TFLite")
        
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    os.makedirs(models_dir, exist_ok=True)
    
    file_path = os.path.join(models_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"success": True, "message": f"Upload thành công {file.filename}", "path": file_path}

class ActivateModelRequest(BaseModel):
    path: str

@router.post("/models/active")
def activate_model(payload: ActivateModelRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if not os.path.exists(payload.path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file model")
        
    try:
        reloaded = model_service.reload_model(payload.path)
        if reloaded:
            SettingsService.update(db, "ACTIVE_MODEL_PATH", payload.path)
            return {"success": True, "message": "Kích hoạt model thành công"}
        else:
            return {"success": True, "message": "Model này đã đang được kích hoạt"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi load model: {str(e)}")

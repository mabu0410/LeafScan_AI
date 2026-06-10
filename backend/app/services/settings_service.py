import logging
from sqlalchemy.orm import Session
from app.models.domain import SystemSetting
from app.config import (
    MIN_DIAGNOSIS_CONFIDENCE,
    MIN_HEALTHY_CLASS_CONFIDENCE,
    MIN_TOP1_MARGIN,
    LEAF_MIN_GREEN_RATIO,
    LEAF_MIN_CENTER_GREEN_RATIO,
    LEAF_MIN_BRIGHTNESS,
    LEAF_MIN_BRIGHTNESS_P10,
    LEAF_MAX_DARK_PIXEL_RATIO,
    LEAF_MIN_BLUR_SCORE,
    LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO,
    LEAF_MIN_GREEN_COMPONENT_DENSITY,
    PLANT_SCOPE_MIN_TOP1_CONFIDENCE,
    PLANT_SCOPE_MIN_MARGIN,
    PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT,
    MODEL_PATH,
)

logger = logging.getLogger("leafscan.settings")

DEFAULT_SETTINGS = {
    "MIN_DIAGNOSIS_CONFIDENCE": {"value": str(MIN_DIAGNOSIS_CONFIDENCE), "type": "float", "description": "Ngưỡng tin cậy tối thiểu để chẩn đoán bệnh (%)"},
    "MIN_HEALTHY_CLASS_CONFIDENCE": {"value": str(MIN_HEALTHY_CLASS_CONFIDENCE), "type": "float", "description": "Ngưỡng tin cậy cho lớp cây khỏe mạnh (%)"},
    "MIN_TOP1_MARGIN": {"value": str(MIN_TOP1_MARGIN), "type": "float", "description": "Khoảng cách an toàn giữa top 1 và top 2 (%)"},
    "LEAF_MIN_GREEN_RATIO": {"value": str(LEAF_MIN_GREEN_RATIO), "type": "float", "description": "Tỉ lệ pixel xanh tối thiểu trong ảnh"},
    "LEAF_MIN_CENTER_GREEN_RATIO": {"value": str(LEAF_MIN_CENTER_GREEN_RATIO), "type": "float", "description": "Tỉ lệ pixel xanh ở vùng trung tâm ảnh"},
    "LEAF_MIN_BRIGHTNESS": {"value": str(LEAF_MIN_BRIGHTNESS), "type": "float", "description": "Độ sáng trung bình tối thiểu"},
    "LEAF_MIN_BRIGHTNESS_P10": {"value": str(LEAF_MIN_BRIGHTNESS_P10), "type": "float", "description": "Percentile 10 của độ sáng"},
    "LEAF_MAX_DARK_PIXEL_RATIO": {"value": str(LEAF_MAX_DARK_PIXEL_RATIO), "type": "float", "description": "Tỉ lệ pixel tối tối đa cho phép"},
    "LEAF_MIN_BLUR_SCORE": {"value": str(LEAF_MIN_BLUR_SCORE), "type": "float", "description": "Điểm độ mờ (variance of Laplacian) tối thiểu"},
    "LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO": {"value": str(LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO), "type": "float", "description": "Tỉ lệ vùng xanh liên tục lớn nhất tối thiểu"},
    "LEAF_MIN_GREEN_COMPONENT_DENSITY": {"value": str(LEAF_MIN_GREEN_COMPONENT_DENSITY), "type": "float", "description": "Mật độ vùng xanh liên tục lớn nhất"},
    "PLANT_SCOPE_MIN_TOP1_CONFIDENCE": {"value": str(PLANT_SCOPE_MIN_TOP1_CONFIDENCE), "type": "float", "description": "Ngưỡng top-1 OOD (tránh nhận diện sai cây trồng)"},
    "PLANT_SCOPE_MIN_MARGIN": {"value": str(PLANT_SCOPE_MIN_MARGIN), "type": "float", "description": "Margin tối thiểu OOD"},
    "PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT": {"value": str(PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT), "type": "integer", "description": "Số class cùng loại cây trong top 5 OOD"},
    "ACTIVE_MODEL_PATH": {"value": str(MODEL_PATH), "type": "string", "description": "Đường dẫn tuyệt đối của Model ONNX đang hoạt động"}
}

class SettingsService:
    @staticmethod
    def _init_defaults(db: Session):
        for key, conf in DEFAULT_SETTINGS.items():
            existing = db.query(SystemSetting).filter_by(key=key).first()
            if not existing:
                setting = SystemSetting(
                    key=key,
                    value=conf["value"],
                    description=conf["description"],
                    type=conf["type"]
                )
                db.add(setting)
        db.commit()

    @staticmethod
    def get_all(db: Session, as_dict: bool = False) -> list | dict:
        SettingsService._init_defaults(db)
        settings = db.query(SystemSetting).all()
        if not as_dict:
            return settings
            
        result = {}
        for s in settings:
            try:
                if s.type == "float":
                    result[s.key] = float(s.value)
                elif s.type == "integer":
                    result[s.key] = int(s.value)
                elif s.type == "boolean":
                    result[s.key] = s.value.lower() in ("true", "1", "yes")
                else:
                    result[s.key] = s.value
            except ValueError:
                result[s.key] = DEFAULT_SETTINGS.get(s.key, {}).get("value", s.value)
        return result

    @staticmethod
    def get_value(db: Session, key: str) -> any:
        setting = db.query(SystemSetting).filter_by(key=key).first()
        if not setting and key in DEFAULT_SETTINGS:
            SettingsService._init_defaults(db)
            setting = db.query(SystemSetting).filter_by(key=key).first()
            
        if not setting:
            return None
            
        try:
            if setting.type == "float":
                return float(setting.value)
            elif setting.type == "integer":
                return int(setting.value)
            elif setting.type == "boolean":
                return setting.value.lower() in ("true", "1", "yes")
            return setting.value
        except ValueError:
            return DEFAULT_SETTINGS.get(key, {}).get("value")

    @staticmethod
    def update(db: Session, key: str, value: str):
        setting = db.query(SystemSetting).filter_by(key=key).first()
        if not setting:
            if key in DEFAULT_SETTINGS:
                SettingsService._init_defaults(db)
                setting = db.query(SystemSetting).filter_by(key=key).first()
            else:
                setting = SystemSetting(key=key, value=value, type="string")
                db.add(setting)
        
        if setting:
            setting.value = value
        db.commit()
        return setting

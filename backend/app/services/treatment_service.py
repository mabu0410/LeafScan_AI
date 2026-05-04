"""
Treatment Service - Tra cứu phác đồ điều trị từ Disease Database.

Service này đọc file disease_db.json và cung cấp thông tin chi tiết
về bệnh, triệu chứng, cách điều trị và phòng ngừa.
"""
import json
import os
from app.schemas.disease import DiseaseDetail


class TreatmentService:
    """
    Service chịu trách nhiệm tra cứu thông tin bệnh và phác đồ điều trị.

    Cách sử dụng:
        service = TreatmentService()
        disease_info = service.get_treatment("tomato_early_blight", confidence=94.5)
        # disease_info = DiseaseDetail(name="Đốm Lá Sớm", treatment=[...], ...)
    """

    def __init__(self):
        """Đọc và cache dữ liệu bệnh từ JSON file."""
        db_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "disease_db.json"
        )
        with open(db_path, "r", encoding="utf-8") as f:
            self._disease_db: dict = json.load(f)

    def get_treatment(
        self,
        disease_key: str,
        confidence: float,
    ) -> DiseaseDetail | None:
        """
        Tra cứu thông tin đầy đủ về một loại bệnh.

        Args:
            disease_key: Key của bệnh (VD: "tomato_early_blight").
            confidence: Độ tin cậy từ AI model (%).

        Returns:
            DiseaseDetail nếu tìm thấy, None nếu không có trong DB.
        """
        disease_data = self._disease_db.get(disease_key)

        if disease_data is None:
            return None

        treatment_by_stage = disease_data.get("treatment_by_stage")
        if not treatment_by_stage:
            # Backward-compatible fallback khi DB chưa có cấu trúc mới.
            base_treatment = disease_data.get("treatment", [])
            treatment_by_stage = {
                "early": base_treatment,
                "middle": base_treatment,
                "late": base_treatment,
            }

        general_care = disease_data.get("general_care", disease_data.get("prevention", []))
        safety_notice = disease_data.get(
            "safety_notice",
            "Thông tin chỉ mang tính tham khảo. Hãy xác nhận với cán bộ nông nghiệp/chuyên gia trước khi áp dụng.",
        )

        return DiseaseDetail(
            id=disease_key,
            name=disease_data["name"],
            severity=disease_data["severity"],
            confidence=confidence,
            description=disease_data["description"],
            symptoms=disease_data["symptoms"],
            treatment=disease_data["treatment"],
            treatment_by_stage=treatment_by_stage,
            general_care=general_care,
            safety_notice=safety_notice,
            prevention=disease_data["prevention"],
            affected_area=disease_data["affected_area"],
            image=disease_data["image"],
        )

    def get_all_diseases(self) -> list[str]:
        """Trả về danh sách tất cả các key bệnh có trong database."""
        return list(self._disease_db.keys())

    def disease_exists(self, disease_key: str) -> bool:
        """Kiểm tra xem bệnh có tồn tại trong database không."""
        return disease_key in self._disease_db

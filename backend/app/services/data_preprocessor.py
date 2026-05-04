"""
Data Preprocessing & Validation Pipeline cho Disease Database.

Pipeline này thực hiện:
1. Validate cấu trúc và kiểu dữ liệu
2. Kiểm tra consistency với model class names
3. Làm sạch và chuẩn hóa dữ liệu
4. Tính quality score cho từng disease entry
5. Xuất cleaned database với metadata
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ============== Configuration ==============

REQUIRED_FIELDS = {
    "name": str,
    "severity": str,  # "healthy", "moderate", "severe"
    "description": str,
    "treatment": list,
    "prevention": list,
    "affected_area": (int, float),  # 0-100%
    "treatment_by_stage": dict,
    "general_care": list,
    "safety_notice": str,
    "image": str,
}

OPTIONAL_FIELDS = {
    "symptoms": list,
}

VALID_SEVERITIES = {"healthy", "moderate", "severe"}

# Default values cho các trường có thể thiếu
DEFAULTS = {
    "symptoms": [],
    "affected_area": 0,  # Với healthy plants
    "treatment_by_stage": {
        "early": [],
        "middle": [],
        "late": [],
    },
    "general_care": [],
    "safety_notice": "Thông tin chỉ mang tính tham khảo. Hãy xác nhận với cán bộ nông nghiệp/chuyên gia trước khi áp dụng.",
}


# ============== Data Models ==============

@dataclass
class ValidationResult:
    """Kết quả validation của một disease entry."""
    key: str
    is_valid: bool
    errors: list[str]
    warnings: list[str]
    quality_score: float  # 0-100
    cleaned_data: dict[str, Any] | None = None


@dataclass
class DatabaseStats:
    """Thống kê về database."""
    total_diseases: int
    valid_diseases: int
    invalid_diseases: int
    avg_quality_score: float
    missing_fields: dict[str, int]
    severity_distribution: dict[str, int]
    validation_timestamp: str


# ============== Validators ==============

class DiseaseValidator:
    """Validator cho từng disease entry."""

    @staticmethod
    def validate_types(disease: dict, key: str) -> list[str]:
        """Kiểm tra kiểu dữ liệu của các trường."""
        errors = []
        all_fields = {**REQUIRED_FIELDS, **OPTIONAL_FIELDS}

        for field, expected_type in all_fields.items():
            if field in disease:
                value = disease[field]
                # Handle union types
                if isinstance(expected_type, tuple):
                    if not isinstance(value, expected_type):
                        errors.append(f"Field '{field}' expects {expected_type}, got {type(value).__name__}")
                else:
                    if not isinstance(value, expected_type):
                        errors.append(f"Field '{field}' expects {expected_type.__name__}, got {type(value).__name__}")

        return errors

    @staticmethod
    def validate_severity(disease: dict, key: str) -> list[str]:
        """Kiểm tra severity có hợp lệ không."""
        errors = []
        sev = disease.get("severity", "").lower()
        if sev not in VALID_SEVERITIES:
            errors.append(f"Invalid severity '{disease.get('severity')}', must be one of {VALID_SEVERITIES}")
        return errors

    @staticmethod
    def validate_affected_area(disease: dict, key: str) -> list[str]:
        """Kiểm tra affected_area nằm trong range 0-100."""
        warnings = []
        errors = []

        if "affected_area" in disease:
            area = disease["affected_area"]
            if not isinstance(area, (int, float)):
                errors.append(f"affected_area must be number, got {type(area).__name__}")
            elif not (0 <= area <= 100):
                warnings.append(f"affected_area {area}% out of range [0, 100]")
        else:
            # Nếu là healthy, affected_area nên là 0
            if disease.get("severity") == "healthy":
                warnings.append("healthy disease missing affected_area, should be 0")
            else:
                warnings.append(f"Missing affected_area for non-healthy disease '{key}'")

        return errors, warnings

    @staticmethod
    def validate_lists(disease: dict, key: str) -> list[str]:
        """Kiểm tra các trường list không rỗng (nếu có)."""
        errors = []
        list_fields = ["symptoms", "treatment", "prevention", "general_care"]

        for field in list_fields:
            if field in disease:
                value = disease[field]
                if not isinstance(value, list):
                    errors.append(f"Field '{field}' must be a list")
                elif not value:
                    # Với một số trường, list rỗng là được chấp nhận
                    if field == "symptoms" and disease.get("severity") != "healthy":
                        errors.append(f"Field '{field}' should not be empty for non-healthy disease")

        return errors

    @staticmethod
    def validate_treatment_by_stage(disease: dict, key: str) -> list[str]:
        """Kiểm tra cấu trúc treatment_by_stage."""
        errors = []
        tbs = disease.get("treatment_by_stage")

        if not isinstance(tbs, dict):
            errors.append("treatment_by_stage must be a dict")
            return errors

        expected_stages = {"early", "middle", "late"}
        actual_stages = set(tbs.keys())

        # Kiểm tra missing stages
        missing = expected_stages - actual_stages
        if missing and disease.get("severity") != "healthy":
            errors.append(f"treatment_by_stage missing stages: {missing}")

        # Kiểm tra mỗi stage là list
        for stage, steps in tbs.items():
            if not isinstance(steps, list):
                errors.append(f"treatment_by_stage['{stage}'] must be a list")

        return errors

    @staticmethod
    def validate_with_model_class_names(disease: dict, key: str, class_names: list[str]) -> list[str]:
        """Kiểm tra disease key có tồn tại trong model class names không."""
        warnings = []

        # Mapping từ disease_key sang class name
        key_to_class = {
            "apple_scab": "Apple___Apple_scab",
            "apple_black_rot": "Apple___Black_rot",
            "apple_cedar_rust": "Apple___Cedar_apple_rust",
            "apple_healthy": "Apple___healthy",
            "blueberry_healthy": "Blueberry___healthy",
            "cherry_powdery_mildew": "Cherry_(including_sour)___Powdery_mildew",
            "cherry_healthy": "Cherry_(including_sour)___healthy",
            "corn_gray_leaf_spot": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
            "corn_common_rust": "Corn_(maize)___Common_rust_",
            "corn_northern_leaf_blight": "Corn_(maize)___Northern_Leaf_Blight",
            "corn_healthy": "Corn_(maize)___healthy",
            "grape_black_rot": "Grape___Black_rot",
            "grape_esca": "Grape___Esca_(Black_Measles)",
            "grape_leaf_blight": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
            "grape_healthy": "Grape___healthy",
            "orange_huanglongbing": "Orange___Haunglongbing_(Citrus_greening)",
            "peach_bacterial_spot": "Peach___Bacterial_spot",
            "peach_healthy": "Peach___healthy",
            "pepper_bacterial_spot": "Pepper,_bell___Bacterial_spot",
            "pepper_healthy": "Pepper,_bell___healthy",
            "potato_early_blight": "Potato___Early_blight",
            "potato_late_blight": "Potato___Late_blight",
            "potato_healthy": "Potato___healthy",
            "raspberry_healthy": "Raspberry___healthy",
            "soybean_healthy": "Soybean___healthy",
            "squash_powdery_mildew": "Squash___Powdery_mildew",
            "strawberry_leaf_scorch": "Strawberry___Leaf_scorch",
            "strawberry_healthy": "Strawberry___healthy",
            "tomato_bacterial_spot": "Tomato___Bacterial_spot",
            "tomato_early_blight": "Tomato___Early_blight",
            "tomato_late_blight": "Tomato___Late_blight",
            "tomato_leaf_mold": "Tomato___Leaf_Mold",
            "tomato_septoria_leaf_spot": "Tomato___Septoria_leaf_spot",
            "tomato_spider_mites": "Tomato___Spider_mites Two-spotted_spider_mite",
            "tomato_target_spot": "Tomato___Target_Spot",
            "tomato_yellow_leaf_curl_virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
            "tomato_mosaic_virus": "Tomato___Tomato_mosaic_virus",
            "tomato_healthy": "Tomato___healthy",
        }

        class_name = key_to_class.get(key)
        if class_name and class_name not in class_names:
            warnings.append(f"Disease key '{key}' maps to class '{class_name}' not found in model class_names.json")

        return warnings


# ============== Main Pipeline ==============

class DiseaseDBPreprocessor:
    """Pipeline preprocessing và validation cho disease database."""

    def __init__(
        self,
        db_path: str,
        class_names_path: str | None = None,
        output_dir: str = "backend/app/data/cleaned"
    ):
        self.db_path = Path(db_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Load class names nếu có
        self.class_names: list[str] = []
        if class_names_path:
            try:
                with open(class_names_path, 'r', encoding='utf-8') as f:
                    self.class_names = json.load(f)
                logger.info(f"Loaded {len(self.class_names)} class names from {class_names_path}")
            except Exception as e:
                logger.warning(f"Could not load class names: {e}")

        self.validator = DiseaseValidator()
        self.raw_db: dict[str, Any] = {}
        self.validation_results: list[ValidationResult] = []
        self.cleaned_db: dict[str, Any] = {}

    def load_database(self) -> None:
        """Load disease database từ JSON file."""
        with open(self.db_path, 'r', encoding='utf-8') as f:
            self.raw_db = json.load(f)
        logger.info(f"Loaded {len(self.raw_db)} diseases from {self.db_path}")

    def validate_all(self) -> list[ValidationResult]:
        """Validate tất cả diseases."""
        results = []

        for key, disease in self.raw_db.items():
            errors = []
            warnings = []

            # 1. Type validation
            errors.extend(self.validator.validate_types(disease, key))

            # 2. Severity validation
            errors.extend(self.validator.validate_severity(disease, key))

            # 3. Affected area validation
            err, warn = self.validator.validate_affected_area(disease, key)
            errors.extend(err)
            warnings.extend(warn)

            # 4. List validation
            errors.extend(self.validator.validate_lists(disease, key))

            # 5. Treatment_by_stage validation
            errors.extend(self.validator.validate_treatment_by_stage(disease, key))

            # 6. Cross-check với model class names
            if self.class_names:
                warnings.extend(self.validator.validate_with_model_class_names(disease, key, self.class_names))

            # Tính quality score
            quality_score = self._calculate_quality_score(errors, warnings, disease)

            result = ValidationResult(
                key=key,
                is_valid=len(errors) == 0,
                errors=errors,
                warnings=warnings,
                quality_score=quality_score,
            )
            results.append(result)

        self.validation_results = results
        return results

    def _calculate_quality_score(self, errors: list[str], warnings: list[str], disease: dict) -> float:
        """Tính quality score từ 0-100."""
        score = 100.0

        # Deduct cho mỗi error
        score -= len(errors) * 15

        # Deduct cho mỗi warning
        score -= len(warnings) * 5

        # Bonus cho completeness
        field_count = sum(1 for f in REQUIRED_FIELDS if f in disease and disease[f])
        completeness = (field_count / len(REQUIRED_FIELDS)) * 10
        score += completeness

        # Bonus cho treatment_by_stage completeness
        tbs = disease.get("treatment_by_stage", {})
        if isinstance(tbs, dict):
            stage_count = len(tbs)
            if stage_count == 3:
                score += 5
            elif stage_count == 2:
                score += 2

        return max(0.0, min(100.0, score))

    def clean_database(self, fix_errors: bool = True) -> dict[str, Any]:
        """
        Làm sạch database.
        - fix_errors=True: Tự động fix các lỗi nhỏ với defaults
        - fix_errors=False: Chỉ clean những trường rõ ràng sai
        """
        cleaned = {}

        for result in self.validation_results:
            disease = self.raw_db[result.key].copy()

            if fix_errors and not result.is_valid:
                # Apply fixes
                disease = self._apply_fixes(disease, result)

            # Thêm metadata
            disease["_metadata"] = {
                "quality_score": round(result.quality_score, 2),
                "validation_warnings": result.warnings,
                "cleaned_at": datetime.utcnow().isoformat() + "Z",
                "original_key": result.key,
            }

            cleaned[result.key] = disease

        self.cleaned_db = cleaned
        return cleaned

    def _apply_fixes(self, disease: dict, result: ValidationResult) -> dict:
        """Áp dụng các fix cho disease."""
        fixed = disease.copy()

        # 1. Fill missing affected_area cho healthy
        if "affected_area" not in fixed or fixed.get("severity") == "healthy":
            fixed["affected_area"] = 0

        # 2. Đảm bảo treatment_by_stage có đủ 3 stages
        if "treatment_by_stage" not in fixed or not isinstance(fixed["treatment_by_stage"], dict):
            fixed["treatment_by_stage"] = {"early": [], "middle": [], "late": []}
        else:
            tbs = fixed["treatment_by_stage"]
            for stage in ["early", "middle", "late"]:
                if stage not in tbs:
                    tbs[stage] = []

        # 3. Đảm bảo các list fields tồn tại
        for field in ["symptoms", "treatment", "prevention", "general_care"]:
            if field not in fixed or not isinstance(fixed[field], list):
                fixed[field] = []

        # 4. Normalize severity
        if "severity" in fixed:
            fixed["severity"] = fixed["severity"].lower()
            if fixed["severity"] not in VALID_SEVERITIES:
                fixed["severity"] = "moderate"  # fallback

        # 5. Ensure safety_notice exists
        if not fixed.get("safety_notice"):
            fixed["safety_notice"] = DEFAULTS["safety_notice"]

        return fixed

    def get_statistics(self) -> DatabaseStats:
        """Tính statistics về database."""
        total = len(self.validation_results)
        valid = sum(1 for r in self.validation_results if r.is_valid)
        invalid = total - valid
        avg_score = sum(r.quality_score for r in self.validation_results) / total if total else 0

        # Missing fields统计
        missing_counts: dict[str, int] = {}
        for result in self.validation_results:
            for error in result.errors:
                # Extract field name từ error message
                if "Field '" in error:
                    field = error.split("Field '")[1].split("'")[0]
                    missing_counts[field] = missing_counts.get(field, 0) + 1

        # Severity distribution
        severity_dist: dict[str, int] = {}
        for key, disease in self.raw_db.items():
            sev = disease.get("severity", "unknown").lower()
            severity_dist[sev] = severity_dist.get(sev, 0) + 1

        return DatabaseStats(
            total_diseases=total,
            valid_diseases=valid,
            invalid_diseases=invalid,
            avg_quality_score=round(avg_score, 2),
            missing_fields=missing_counts,
            severity_distribution=severity_dist,
            validation_timestamp=datetime.utcnow().isoformat() + "Z",
        )

    def save_cleaned_database(self, path: str | None = None) -> Path:
        """Lưu cleaned database vào file."""
        if not self.cleaned_db:
            raise ValueError("No cleaned database. Call clean_database() first.")

        save_path = Path(path) if path else self.output_dir / "disease_db_cleaned.json"
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(self.cleaned_db, f, ensure_ascii=False, indent=2)

        logger.info(f"Saved cleaned database to {save_path}")
        return save_path

    def save_validation_report(self, path: str | None = None) -> Path:
        """Lưu validation report chi tiết."""
        report = {
            "statistics": asdict(self.get_statistics()),
            "validation_results": [
                {
                    "key": r.key,
                    "is_valid": r.is_valid,
                    "errors": r.errors,
                    "warnings": r.warnings,
                    "quality_score": round(r.quality_score, 2),
                }
                for r in self.validation_results
            ],
        }

        save_path = Path(path) if path else self.output_dir / "validation_report.json"
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        logger.info(f"Saved validation report to {save_path}")
        return save_path


# ============== Convenience Functions ==============

def validate_and_clean(
    db_path: str,
    class_names_path: str | None = None,
    fix_errors: bool = True,
    output_dir: str = "backend/app/data/cleaned"
) -> tuple[dict[str, Any], DatabaseStats]:
    """
    Convenience function: validate và clean disease database.

    Args:
        db_path: Đường dẫn tới disease_db.json
        class_names_path: Đường dẫn tới class_names.json (optional)
        fix_errors: Có tự động fix lỗi không
        output_dir: Thư mục output

    Returns:
        (cleaned_db, stats)
    """
    processor = DiseaseDBPreprocessor(
        db_path=db_path,
        class_names_path=class_names_path,
        output_dir=output_dir
    )

    print(f"\n{'='*60}")
    print(f"DISEASE DATABASE PREPROCESSING PIPELINE")
    print(f"{'='*60}\n")

    # Step 1: Load
    print("📂 Step 1: Loading database...")
    processor.load_database()

    # Step 2: Validate
    print("🔍 Step 2: Validating diseases...")
    results = processor.validate_all()
    valid_count = sum(1 for r in results if r.is_valid)
    print(f"   Valid: {valid_count}/{len(results)}")
    print(f"   Invalid: {len(results)-valid_count}/{len(results)}")

    # Step 3: Clean
    print("🧹 Step 3: Cleaning database...")
    cleaned = processor.clean_database(fix_errors=fix_errors)

    # Step 4: Stats
    stats = processor.get_statistics()
    print(f"\n📊 Statistics:")
    print(f"   Total diseases: {stats.total_diseases}")
    print(f"   Valid: {stats.valid_diseases}, Invalid: {stats.invalid_diseases}")
    print(f"   Avg quality score: {stats.avg_quality_score}/100")
    print(f"   Severity: {stats.severity_distribution}")

    # Step 5: Save
    print("\n💾 Step 4: Saving outputs...")
    cleaned_path = processor.save_cleaned_database()
    report_path = processor.save_validation_report()
    print(f"   Cleaned DB: {cleaned_path}")
    print(f"   Report: {report_path}")

    return cleaned, stats


if __name__ == "__main__":
    import sys
    from pathlib import Path

    # Get project root (3 levels up from this file)
    project_root = Path(__file__).parent.parent.parent.parent

    # Default paths
    DB_PATH = project_root / "app" / "data" / "disease_db.json"
    CLASS_NAMES_PATH = project_root / "models" / "class_names.json"

    # Parse args
    fix_errors = "--no-fix" not in sys.argv

    cleaned, stats = validate_and_clean(
        db_path=str(DB_PATH),
        class_names_path=str(CLASS_NAMES_PATH) if CLASS_NAMES_PATH.exists() else None,
        fix_errors=fix_errors,
        output_dir=str(project_root / "app" / "data" / "cleaned")
    )

    print(f"\n✅ Preprocessing complete!")
    print(f"   Cleaned diseases: {len(cleaned)}")
    print(f"   Output: {project_root / 'app' / 'data' / 'cleaned'}")

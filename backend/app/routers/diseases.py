from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Disease
from app.schemas.disease import (
    DiseaseCatalogItem,
    DiseaseCatalogResponse,
    SingleDiseaseResponse,
)
from app.services.treatment_service import TreatmentService


router = APIRouter(prefix="/api/v1/diseases", tags=["Diseases"])
treatment_service = TreatmentService()


def _plant_from_key(disease_key: str) -> str:
    token = (disease_key or "").split("_", 1)[0].strip()
    if not token:
        return "Không rõ"
    return token.replace("-", " ").title()


@router.get("", response_model=DiseaseCatalogResponse)
def list_diseases(
    q: str | None = Query(default=None, min_length=1, max_length=100),
    severity: str | None = Query(default=None, min_length=3, max_length=12),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Disease)

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Disease.name.ilike(term),
                Disease.disease_key.ilike(term),
                Disease.description.ilike(term),
            )
        )

    if severity:
        severity_norm = severity.strip().lower()
        if severity_norm in {"healthy", "moderate", "severe"}:
            query = query.filter(func.lower(Disease.severity) == severity_norm)

    rows = query.order_by(Disease.name.asc()).limit(limit).all()
    items = [
        DiseaseCatalogItem(
            id=row.disease_key,
            name=row.name,
            severity=row.severity or "healthy",
            description=row.description or "",
            affected_area=int(row.affected_area_typical or 0),
            image=row.image_url or "",
            plant=_plant_from_key(row.disease_key or ""),
        )
        for row in rows
        if row.disease_key
    ]

    return DiseaseCatalogResponse(
        success=True,
        message="Thành công",
        total=len(items),
        data=items,
    )


@router.get("/{disease_key}", response_model=SingleDiseaseResponse)
def get_disease_detail(disease_key: str):
    detail = treatment_service.get_treatment(disease_key=disease_key, confidence=0.0)
    if detail is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bệnh tương ứng.")

    return SingleDiseaseResponse(
        success=True,
        message="Thành công",
        data=detail,
    )

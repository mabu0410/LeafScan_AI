"""
Shared VNPAY callbacks.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.partners import vnpay_ipn as partner_vnpay_ipn
from app.routers.subscriptions import user_vnpay_ipn
from app.services.vnpay_service import verify_vnpay_signature


router = APIRouter(prefix="/api/v1", tags=["VNPAY"])


@router.get("/vnpay/ipn")
def vnpay_ipn(request: Request, db: Session = Depends(get_db)):
    """One public IPN endpoint for VNPAY, dispatching by transaction prefix."""
    params = dict(request.query_params)
    if not verify_vnpay_signature(params):
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = str(params.get("vnp_TxnRef") or "")
    if txn_ref.startswith("USER"):
        return user_vnpay_ipn(request, db)
    if txn_ref.startswith("PARTNER"):
        return partner_vnpay_ipn(request, db)

    return {"RspCode": "01", "Message": "Order not found"}

"""
Shared VNPAY callbacks.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.partners import confirm_partner_vnpay_payment
from app.routers.subscriptions import confirm_user_vnpay_payment
from app.services.vnpay_return_page import render_vnpay_return_page


router = APIRouter(prefix="/api/v1", tags=["VNPAY"])


def _confirm_vnpay_payment(params: dict[str, object], db: Session) -> dict[str, str]:
    txn_ref = str(params.get("vnp_TxnRef") or "")
    if txn_ref.startswith("USER"):
        return confirm_user_vnpay_payment(params, db)
    if txn_ref.startswith("PARTNER"):
        return confirm_partner_vnpay_payment(params, db)
    return {"RspCode": "01", "Message": "Order not found"}


@router.get("/vnpay/ipn")
def vnpay_ipn(request: Request, db: Session = Depends(get_db)):
    """One public IPN endpoint for VNPAY, dispatching by transaction prefix."""
    params = dict(request.query_params)
    return _confirm_vnpay_payment(params, db)


@router.get("/vnpay/return")
def vnpay_return(request: Request, db: Session = Depends(get_db)):
    """One browser return endpoint for VNPAY."""
    params = dict(request.query_params)
    _confirm_vnpay_payment(params, db)
    return render_vnpay_return_page(params)

"""
User subscription, scan quota and VNPAY payment endpoints.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import PUBLIC_BASE_URL
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import User, UserPaymentTransaction
from app.schemas.subscription import (
    SubscriptionResponse,
    SubscriptionStatusDTO,
    UserPaymentCreateEnvelope,
    UserPaymentCreateRequestDTO,
    UserPaymentCreateResponseDTO,
    UserPaymentStatusEnvelope,
)
from app.services.subscription_service import (
    activate_user_subscription,
    get_user_plan_spec,
    now_utc,
    sync_scan_quota,
)
from app.services.vnpay_service import build_vnpay_payment_url, verify_vnpay_signature


router = APIRouter(prefix="/api/v1", tags=["Subscriptions"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


def _subscription_status_response(db: Session, user_id: int) -> SubscriptionStatusDTO:
    status = sync_scan_quota(db, user_id)
    return SubscriptionStatusDTO(**status)


@router.get("/subscription/status", response_model=SubscriptionResponse)
def get_subscription_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _subscription_status_response(db, current_user.id)
    db.commit()
    return SubscriptionResponse(success=True, message="Thành công", data=data)


@router.post("/user-payments/vnpay/create", response_model=UserPaymentCreateEnvelope)
def create_user_vnpay_payment(
    request: Request,
    payload: UserPaymentCreateRequestDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    spec = get_user_plan_spec(payload.plan_key)
    txn_ref = f"USER{current_user.id}{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    tx = UserPaymentTransaction(
        user_id=current_user.id,
        provider="vnpay",
        txn_ref=txn_ref,
        plan_key=spec.key,
        tier=spec.tier,
        amount_vnd=spec.price_vnd,
        duration_days=spec.duration_days,
        daily_scan_limit=spec.daily_scan_limit,
        status="pending",
    )
    db.add(tx)
    db.flush()

    try:
        payment_url = build_vnpay_payment_url(
            txn_ref=txn_ref,
            amount_vnd=spec.price_vnd,
            order_info=f"Thanh toan goi {spec.label} LeafScan {txn_ref}",
            client_ip=_client_ip(request),
            return_url=f"{PUBLIC_BASE_URL}/api/v1/user-payments/vnpay/return",
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    tx.payment_url = payment_url
    db.commit()
    return UserPaymentCreateEnvelope(
        success=True,
        message="Đã tạo URL thanh toán VNPAY.",
        data=UserPaymentCreateResponseDTO(
            txn_ref=txn_ref,
            amount_vnd=spec.price_vnd,
            payment_url=payment_url,
            status=tx.status,
            plan_key=spec.key,  # type: ignore[arg-type]
            tier=spec.tier,  # type: ignore[arg-type]
            duration_days=spec.duration_days,
            daily_scan_limit=spec.daily_scan_limit,
        ),
    )


@router.get("/user-payments/vnpay/ipn")
def user_vnpay_ipn(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    if not verify_vnpay_signature(params):
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = params.get("vnp_TxnRef")
    tx = db.query(UserPaymentTransaction).filter(UserPaymentTransaction.txn_ref == txn_ref).first()
    if not tx:
        return {"RspCode": "01", "Message": "Order not found"}

    try:
        amount_vnd = int(params.get("vnp_Amount", "0")) // 100
    except ValueError:
        return {"RspCode": "04", "Message": "Invalid amount"}
    if amount_vnd != tx.amount_vnd:
        return {"RspCode": "04", "Message": "Invalid amount"}

    if tx.status == "success":
        return {"RspCode": "02", "Message": "Order already confirmed"}

    response_code = params.get("vnp_ResponseCode")
    transaction_status = params.get("vnp_TransactionStatus")
    success = response_code == "00" and transaction_status == "00"

    tx.provider_response_code = response_code
    tx.provider_transaction_status = transaction_status
    tx.vnp_transaction_no = params.get("vnp_TransactionNo")
    tx.raw_payload = params
    tx.status = "success" if success else "failed"
    tx.updated_at = now_utc()
    if success:
        tx.paid_at = now_utc()
        spec = get_user_plan_spec(tx.plan_key)
        activate_user_subscription(db, tx.user_id, spec, source_transaction_id=tx.id)

    db.commit()
    return {"RspCode": "00", "Message": "Confirm Success"}


@router.get("/user-payments/vnpay/return")
def user_vnpay_return(request: Request):
    params = dict(request.query_params)
    txn_ref = params.get("vnp_TxnRef", "")
    response_code = params.get("vnp_ResponseCode", "")
    return {
        "success": response_code == "00",
        "message": "Đã nhận kết quả từ VNPAY. App sẽ kiểm tra trạng thái giao dịch từ server.",
        "txn_ref": txn_ref,
        "response_code": response_code,
    }


@router.get("/user-payments/status/{txn_ref}", response_model=UserPaymentStatusEnvelope)
def get_user_payment_status(
    txn_ref: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = (
        db.query(UserPaymentTransaction)
        .filter(UserPaymentTransaction.txn_ref == txn_ref, UserPaymentTransaction.user_id == current_user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")
    return UserPaymentStatusEnvelope(success=True, message="Thành công", data=tx)

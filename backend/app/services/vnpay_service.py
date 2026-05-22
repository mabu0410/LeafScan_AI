"""
VNPAY payment URL signing and callback verification.
"""
from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from app.config import (
    PUBLIC_BASE_URL,
    VNPAY_HASH_SECRET,
    VNPAY_IPN_URL,
    VNPAY_PAYMENT_URL,
    VNPAY_RETURN_URL,
    VNPAY_TMN_CODE,
)

VN_TZ = timezone(timedelta(hours=7))


def _sign_data(params: dict[str, object], secret: str) -> str:
    clean_params = {
        key: str(value)
        for key, value in params.items()
        if value is not None and str(value) != ""
    }
    sign_data = urlencode(sorted(clean_params.items()))
    return hmac.new(secret.encode("utf-8"), sign_data.encode("utf-8"), hashlib.sha512).hexdigest()


def verify_vnpay_signature(params: dict[str, object], secret: str | None = None) -> bool:
    """Verify HMAC SHA512 signature from VNPAY query params."""
    hash_secret = secret if secret is not None else VNPAY_HASH_SECRET
    if not hash_secret:
        return False

    received = str(params.get("vnp_SecureHash") or "")
    if not received:
        return False

    payload = {
        key: value
        for key, value in params.items()
        if key.startswith("vnp_") and key not in {"vnp_SecureHash", "vnp_SecureHashType"}
    }
    expected = _sign_data(payload, hash_secret)
    return hmac.compare_digest(expected.lower(), received.lower())


def build_vnpay_payment_url(
    *,
    txn_ref: str,
    amount_vnd: int,
    order_info: str,
    client_ip: str,
    return_url: str | None = None,
    payment_url: str | None = None,
    tmn_code: str | None = None,
    hash_secret: str | None = None,
) -> str:
    """Build a signed VNPAY redirect URL."""
    resolved_tmn_code = tmn_code if tmn_code is not None else VNPAY_TMN_CODE
    resolved_secret = hash_secret if hash_secret is not None else VNPAY_HASH_SECRET
    if not resolved_tmn_code or not resolved_secret:
        raise ValueError("Thiếu cấu hình VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET.")

    now = datetime.now(VN_TZ)
    resolved_return_url = return_url or VNPAY_RETURN_URL or f"{PUBLIC_BASE_URL}/api/v1/partner-payments/vnpay/return"
    params: dict[str, object] = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": resolved_tmn_code,
        "vnp_Amount": amount_vnd * 100,
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": txn_ref,
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": resolved_return_url,
        "vnp_IpAddr": client_ip,
        "vnp_CreateDate": now.strftime("%Y%m%d%H%M%S"),
        "vnp_ExpireDate": (now + timedelta(minutes=15)).strftime("%Y%m%d%H%M%S"),
    }
    params["vnp_SecureHash"] = _sign_data(params, resolved_secret)
    return f"{payment_url or VNPAY_PAYMENT_URL}?{urlencode(sorted(params.items()))}"


def get_vnpay_ipn_url() -> str:
    return VNPAY_IPN_URL or f"{PUBLIC_BASE_URL}/api/v1/partner-payments/vnpay/ipn"

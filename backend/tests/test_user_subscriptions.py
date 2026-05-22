"""
Tests cho gói quét AI người dùng, quota hằng ngày và VNPAY IPN.
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta

import pytest
from PIL import Image


def _unique_email(prefix: str = "user") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}@example.com"


def _register_user(client, email: str | None = None, password: str = "TestPass123!") -> tuple[str, str]:
    email = email or _unique_email()
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return email, resp.json()["data"]["access_token"]


def _black_png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (96, 96), color=(0, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def _user_id_by_email(db_session, email: str) -> int:
    from app.models.domain import User

    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    return user.id


class TestUserScanQuota:
    def test_free_user_has_five_scans_per_day_and_exhaustion_returns_402(self, app_client, db_session):
        from fastapi import HTTPException
        from app.services.subscription_service import ensure_can_scan, record_scan_consumption

        email, token = _register_user(app_client)
        status = app_client.get("/api/v1/subscription/status", headers={"Authorization": f"Bearer {token}"})
        assert status.status_code == 200
        assert status.json()["data"]["tier"] == "free"
        assert status.json()["data"]["daily_scan_limit"] == 5
        assert status.json()["data"]["remaining_scans"] == 5

        user_id = _user_id_by_email(db_session, email)
        for _ in range(5):
            record_scan_consumption(db_session, user_id, scan_id=None)
        db_session.commit()

        exhausted = app_client.get("/api/v1/subscription/status", headers={"Authorization": f"Bearer {token}"})
        assert exhausted.status_code == 200
        assert exhausted.json()["data"]["remaining_scans"] == 0

        with pytest.raises(HTTPException) as exc:
            ensure_can_scan(db_session, user_id)
        assert exc.value.status_code == 402
        assert exc.value.detail["error_code"] == "QUOTA_EXCEEDED"

    def test_invalid_leaf_scan_does_not_consume_quota(self, app_client):
        _, token = _register_user(app_client)
        invalid_scan = app_client.post(
            "/api/v1/diagnose",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("black.png", _black_png(), "image/png")},
        )
        assert invalid_scan.status_code == 200, invalid_scan.text
        assert invalid_scan.json()["success"] is False

        status = app_client.get("/api/v1/subscription/status", headers={"Authorization": f"Bearer {token}"})
        assert status.status_code == 200
        assert status.json()["data"]["remaining_scans"] == 5

    def test_expired_paid_plan_falls_back_to_free(self, app_client, db_session):
        from app.models.domain import Subscription

        email, token = _register_user(app_client)
        user_id = _user_id_by_email(db_session, email)
        db_session.add(
            Subscription(
                user_id=user_id,
                tier="pro",
                started_at=datetime.utcnow() - timedelta(days=40),
                expires_at=datetime.utcnow() - timedelta(days=1),
            )
        )
        db_session.commit()

        status = app_client.get("/api/v1/subscription/status", headers={"Authorization": f"Bearer {token}"})
        assert status.status_code == 200
        assert status.json()["data"]["tier"] == "free"
        assert status.json()["data"]["daily_scan_limit"] == 5


class TestUserVnpayPayments:
    def test_vnpay_ipn_success_activates_personal_plan_and_is_idempotent(self, app_client, monkeypatch):
        from app.services import vnpay_service
        from app.services.vnpay_service import _sign_data

        monkeypatch.setattr(vnpay_service, "VNPAY_TMN_CODE", "TESTCODE")
        monkeypatch.setattr(vnpay_service, "VNPAY_HASH_SECRET", "secret")

        _, token = _register_user(app_client)
        create = app_client.post(
            "/api/v1/user-payments/vnpay/create",
            headers={"Authorization": f"Bearer {token}"},
            json={"plan_key": "personal_monthly"},
        )
        assert create.status_code == 200, create.text
        tx = create.json()["data"]
        assert tx["amount_vnd"] == 39000
        assert tx["daily_scan_limit"] == 30

        params = {
            "vnp_TmnCode": "TESTCODE",
            "vnp_TxnRef": tx["txn_ref"],
            "vnp_Amount": "3900000",
            "vnp_ResponseCode": "00",
            "vnp_TransactionStatus": "00",
            "vnp_TransactionNo": "123456789",
        }
        params["vnp_SecureHash"] = _sign_data(params, "secret")

        first = app_client.get("/api/v1/user-payments/vnpay/ipn", params=params)
        assert first.status_code == 200
        assert first.json()["RspCode"] == "00"

        second = app_client.get("/api/v1/user-payments/vnpay/ipn", params=params)
        assert second.status_code == 200
        assert second.json()["RspCode"] == "02"

        status = app_client.get("/api/v1/subscription/status", headers={"Authorization": f"Bearer {token}"})
        assert status.status_code == 200
        assert status.json()["data"]["tier"] == "personal"
        assert status.json()["data"]["daily_scan_limit"] == 30

    def test_vnpay_ipn_rejects_amount_mismatch(self, app_client, monkeypatch):
        from app.services import vnpay_service
        from app.services.vnpay_service import _sign_data

        monkeypatch.setattr(vnpay_service, "VNPAY_TMN_CODE", "TESTCODE")
        monkeypatch.setattr(vnpay_service, "VNPAY_HASH_SECRET", "secret")

        _, token = _register_user(app_client)
        create = app_client.post(
            "/api/v1/user-payments/vnpay/create",
            headers={"Authorization": f"Bearer {token}"},
            json={"plan_key": "pro_monthly"},
        )
        assert create.status_code == 200, create.text
        tx = create.json()["data"]

        params = {
            "vnp_TmnCode": "TESTCODE",
            "vnp_TxnRef": tx["txn_ref"],
            "vnp_Amount": "1000000",
            "vnp_ResponseCode": "00",
            "vnp_TransactionStatus": "00",
            "vnp_TransactionNo": "123456789",
        }
        params["vnp_SecureHash"] = _sign_data(params, "secret")

        resp = app_client.get("/api/v1/user-payments/vnpay/ipn", params=params)
        assert resp.status_code == 200
        assert resp.json()["RspCode"] == "04"

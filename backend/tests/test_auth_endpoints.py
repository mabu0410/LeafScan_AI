"""
Tests cho 4 endpoint auth mới:
- POST /api/v1/auth/change-password
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- DELETE /api/v1/auth/account

Mỗi test tạo user riêng với email unique để tránh conflict.
"""
import uuid

import pytest


def _unique_email() -> str:
    return f"test_{uuid.uuid4().hex[:12]}@example.com"


def _register_and_login(client, password: str = "TestPass123!") -> tuple[str, str]:
    """Tạo user mới, trả về (email, access_token)."""
    email = _unique_email()
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["data"]["access_token"]
    return email, token


# ──────────────────────────────────────────────
# Change password
# ──────────────────────────────────────────────

class TestChangePassword:
    def test_change_password_success(self, app_client):
        email, token = _register_and_login(app_client, "OldPass123!")
        resp = app_client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # Verify login với password mới
        login_resp = app_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "NewPass456!"},
        )
        assert login_resp.status_code == 200

    def test_change_password_wrong_current(self, app_client):
        _, token = _register_and_login(app_client, "OldPass123!")
        resp = app_client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_password": "WrongPass!", "new_password": "NewPass456!"},
        )
        assert resp.status_code == 400
        assert "không chính xác" in resp.json()["detail"].lower()

    def test_change_password_too_short(self, app_client):
        _, token = _register_and_login(app_client, "OldPass123!")
        resp = app_client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_password": "OldPass123!", "new_password": "short"},
        )
        assert resp.status_code == 400
        assert "8 ký tự" in resp.json()["detail"]

    def test_change_password_requires_auth(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "x", "new_password": "y"},
        )
        assert resp.status_code in (401, 403)


# ──────────────────────────────────────────────
# Forgot password
# ──────────────────────────────────────────────

class TestForgotPassword:
    def test_forgot_password_existing_email(self, app_client):
        email, _ = _register_and_login(app_client)
        resp = app_client.post("/api/v1/auth/forgot-password", json={"email": email})
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_forgot_password_nonexistent_email(self, app_client):
        # Phải trả success để không leak email tồn tại hay không
        resp = app_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "definitely_not_exist@example.com"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_forgot_password_invalid_email_format(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "not-an-email"},
        )
        assert resp.status_code == 422  # Pydantic validation


# ──────────────────────────────────────────────
# Reset password (cần OTP thật)
# ──────────────────────────────────────────────

class TestResetPassword:
    def test_reset_with_invalid_otp(self, app_client):
        email, _ = _register_and_login(app_client)
        # Trigger tạo OTP
        app_client.post("/api/v1/auth/forgot-password", json={"email": email})

        resp = app_client.post(
            "/api/v1/auth/reset-password",
            json={"email": email, "otp": "000000", "new_password": "NewPass789!"},
        )
        assert resp.status_code == 400
        assert "OTP" in resp.json()["detail"]

    def test_reset_password_too_short(self, app_client):
        email, _ = _register_and_login(app_client)
        resp = app_client.post(
            "/api/v1/auth/reset-password",
            json={"email": email, "otp": "123456", "new_password": "short"},
        )
        assert resp.status_code == 400
        assert "8 ký tự" in resp.json()["detail"]

    def test_reset_with_valid_otp(self, app_client, db_session):
        """Tạo OTP trực tiếp qua DB rồi gọi reset."""
        from app.models.domain import PasswordResetOTP
        from app.utils.security import get_password_hash
        from datetime import datetime, timedelta

        email, _ = _register_and_login(app_client, "OldPass123!")
        otp_plain = "654321"
        db_session.add(
            PasswordResetOTP(
                email=email,
                otp_hash=get_password_hash(otp_plain),
                expires_at=datetime.utcnow() + timedelta(minutes=10),
                used=False,
            )
        )
        db_session.commit()

        resp = app_client.post(
            "/api/v1/auth/reset-password",
            json={"email": email, "otp": otp_plain, "new_password": "NewPass999!"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["success"] is True

        # Verify password mới hoạt động
        login = app_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "NewPass999!"},
        )
        assert login.status_code == 200


# ──────────────────────────────────────────────
# Delete account
# ──────────────────────────────────────────────

class TestDeleteAccount:
    def test_delete_account_success(self, app_client):
        email, token = _register_and_login(app_client, "MyPass123!")
        resp = app_client.request(
            "DELETE",
            "/api/v1/auth/account",
            headers={"Authorization": f"Bearer {token}"},
            json={"password": "MyPass123!"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # Login phải fail sau khi xóa
        login = app_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "MyPass123!"},
        )
        assert login.status_code == 401

    def test_delete_account_wrong_password(self, app_client):
        _, token = _register_and_login(app_client, "MyPass123!")
        resp = app_client.request(
            "DELETE",
            "/api/v1/auth/account",
            headers={"Authorization": f"Bearer {token}"},
            json={"password": "WrongPass!"},
        )
        assert resp.status_code == 400

    def test_delete_account_requires_auth(self, app_client):
        resp = app_client.request(
            "DELETE",
            "/api/v1/auth/account",
            json={"password": "x"},
        )
        assert resp.status_code in (401, 403)

"""
Tests cho marketplace đại lý, kiểm duyệt admin và VNPAY IPN.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta


def _unique_email(prefix: str = "partner") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}@example.com"


def _register_user(client, email: str | None = None, password: str = "TestPass123!") -> tuple[str, str]:
    email = email or _unique_email()
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return email, resp.json()["data"]["access_token"]


def _mark_admin(email: str) -> None:
    from app import config
    from app.dependencies import admin as admin_dep

    normalized = email.lower()
    if normalized not in config.ADMIN_EMAILS:
        config.ADMIN_EMAILS.append(normalized)
    if normalized not in admin_dep.ADMIN_EMAILS:
        admin_dep.ADMIN_EMAILS.append(normalized)


def _upload_partner_documents(client, token: str) -> dict:
    cover = client.post(
        "/api/v1/partners/me/cover",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("store.jpg", b"fake-store-image", "image/jpeg")},
    )
    assert cover.status_code == 200, cover.text

    license_file = client.post(
        "/api/v1/partners/me/business-license",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("license.pdf", b"%PDF-1.4 fake-license", "application/pdf")},
    )
    assert license_file.status_code == 200, license_file.text
    return license_file.json()["data"]


def _register_partner(client, token: str, contact_email: str | None = None, upload_documents: bool = True) -> dict:
    resp = client.post(
        "/api/v1/partners/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "company_name": "Cong ty Vat Tu Xanh",
            "store_name": "Vat Tu Xanh",
            "description": "Chuyen vat tu nong nghiep cho rau mau.",
            "contact_email": contact_email or _unique_email("contact"),
            "phone": "0900000000",
            "business_license": f"BL-{uuid.uuid4().hex[:8]}",
            "address": "TP HCM",
            "representative_name": "Nguyen Van A",
            "representative_role": "Chu cua hang",
            "service_area": "TP HCM va mien Tay",
            "main_products": "Phan bon, thuoc sinh hoc, hat giong",
            "advertising_commitment_accepted": True,
            "product_categories": ["phan_bon", "thuoc_bvtv"],
        },
    )
    assert resp.status_code == 200, resp.text
    if upload_documents:
        return _upload_partner_documents(client, token)
    return resp.json()["data"]


def _approve_partner(client, admin_token: str, partner_id: int) -> dict:
    resp = client.patch(
        f"/api/v1/admin/partners/{partner_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "active"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def _add_membership(db_session, partner_id: int, days: int = 30, max_products: int = 20):
    from app.models.domain import PartnerMembership

    membership = PartnerMembership(
        partner_id=partner_id,
        price_vnd=99000,
        duration_days=30,
        max_active_products=max_products,
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=days),
    )
    db_session.add(membership)
    db_session.commit()
    return membership


def _create_product(
    client,
    token: str,
    name: str = "Phan bon la huu co",
    disease_key: str = "tomato_early_blight",
) -> dict:
    resp = client.post(
        "/api/v1/partners/me/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": name,
            "description": "Ho tro phuc hoi cay sau benh.",
            "price_range": "99.000 - 129.000 VND",
            "target_diseases": [disease_key],
            "target_categories": ["Tomato"],
            "product_url": "https://example.com/product",
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


class TestPartnerMarketplace:
    def test_partner_registration_creates_admin_notification(self, app_client):
        admin_email, admin_token = _register_user(app_client, _unique_email("admin_notify"))
        _mark_admin(admin_email)
        _, partner_token = _register_user(app_client)

        partner = _register_partner(app_client, partner_token, upload_documents=False)

        notifications = app_client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert notifications.status_code == 200, notifications.text
        matching = [
            item
            for item in notifications.json()["data"]["items"]
            if item["notification_type"] == "partner_review"
            and item["data"].get("partner_id") == partner["id"]
        ]
        assert len(matching) == 1
        assert matching[0]["data"]["route"] == "partners"
        assert matching[0]["read_at"] is None

    def test_partner_registration_rejects_missing_business_license(self, app_client):
        _, token = _register_user(app_client)
        resp = app_client.post(
            "/api/v1/partners/register",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "company_name": "Cong ty Vat Tu Xanh",
                "store_name": "Vat Tu Xanh",
                "description": "Chuyen vat tu nong nghiep.",
                "contact_email": _unique_email("contact"),
                "phone": "0900000000",
                "business_license": " ",
                "address": "TP HCM",
                "representative_name": "Nguyen Van A",
                "representative_role": "Chu cua hang",
                "service_area": "TP HCM",
                "main_products": "Phan bon",
                "advertising_commitment_accepted": True,
                "product_categories": ["phan_bon"],
            },
        )
        assert resp.status_code == 400
        assert "giấy phép" in resp.json()["detail"]

    def test_partner_register_update_and_admin_approval(self, app_client):
        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token)
        assert partner["status"] == "pending_review"
        assert partner["store_name"] == "Vat Tu Xanh"
        assert partner["business_license_file_url"]
        assert partner["cover_url"]

        update = app_client.put(
            "/api/v1/partners/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"description": "Chuyen vat tu nong nghiep", "address": "Ha Noi", "main_products": "Phan bon huu co"},
        )
        assert update.status_code == 200
        assert update.json()["data"]["address"] == "Ha Noi"
        assert update.json()["data"]["main_products"] == "Phan bon huu co"

        admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
        _mark_admin(admin_email)
        approved = _approve_partner(app_client, admin_token, partner["id"])
        assert approved["status"] == "active"

    def test_only_admin_approved_partner_is_visible_to_users(self, app_client):
        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token)

        before_approval = app_client.get("/api/v1/marketplace/partners")
        assert before_approval.status_code == 200
        assert all(item["id"] != partner["id"] for item in before_approval.json()["data"])

        hidden_detail = app_client.get(f"/api/v1/marketplace/partners/{partner['id']}")
        assert hidden_detail.status_code == 404

        admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
        _mark_admin(admin_email)
        _approve_partner(app_client, admin_token, partner["id"])

        after_approval = app_client.get("/api/v1/marketplace/partners")
        assert after_approval.status_code == 200
        visible_partner = next(
            item for item in after_approval.json()["data"] if item["id"] == partner["id"]
        )
        assert visible_partner["status"] == "active"
        assert visible_partner["active_membership"] is None

        visible_detail = app_client.get(f"/api/v1/marketplace/partners/{partner['id']}")
        assert visible_detail.status_code == 200
        assert visible_detail.json()["data"]["id"] == partner["id"]

    def test_admin_approval_requires_store_photo_and_business_license_file(self, app_client):
        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token, upload_documents=False)
        admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
        _mark_admin(admin_email)

        missing_docs = app_client.patch(
            f"/api/v1/admin/partners/{partner['id']}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "active"},
        )
        assert missing_docs.status_code == 400
        assert "file giấy phép kinh doanh" in missing_docs.json()["detail"]
        assert "ảnh cửa hàng" in missing_docs.json()["detail"]

        cover = app_client.post(
            "/api/v1/partners/me/cover",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("store.png", b"fake-store-image", "image/png")},
        )
        assert cover.status_code == 200
        missing_license = app_client.patch(
            f"/api/v1/admin/partners/{partner['id']}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "active"},
        )
        assert missing_license.status_code == 400
        assert "file giấy phép kinh doanh" in missing_license.json()["detail"]

        license_file = app_client.post(
            "/api/v1/partners/me/business-license",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("license.pdf", b"%PDF-1.4 fake-license", "application/pdf")},
        )
        assert license_file.status_code == 200
        approved = _approve_partner(app_client, admin_token, partner["id"])
        assert approved["status"] == "active"

    def test_product_public_visibility_requires_membership_and_hides_after_rejection(self, app_client, db_session):
        disease_key = f"test_disease_{uuid.uuid4().hex[:8]}"
        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token)
        admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
        _mark_admin(admin_email)
        _approve_partner(app_client, admin_token, partner["id"])

        missing_payment = app_client.post(
            "/api/v1/partners/me/products",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "San pham chua thanh toan"},
        )
        assert missing_payment.status_code == 402

        _add_membership(db_session, partner["id"])
        product = _create_product(app_client, token, disease_key=disease_key)
        assert product["moderation_status"] == "pending_review"

        public_pending = app_client.get(f"/api/v1/marketplace/products?disease_key={disease_key}")
        assert public_pending.status_code == 200
        assert any(item["id"] == product["id"] for item in public_pending.json()["data"])

        click_pending = app_client.post(
            f"/api/v1/marketplace/products/{product['id']}/click",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert click_pending.status_code == 200, click_pending.text

        inquiry_pending = app_client.post(
            "/api/v1/marketplace/inquiries",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_id": product["id"], "name": "Nguoi mua", "message": "Can tu van san pham"},
        )
        assert inquiry_pending.status_code == 200, inquiry_pending.text

        reject_product = app_client.patch(
            f"/api/v1/admin/products/{product['id']}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "rejected", "rejection_reason": "Noi dung chua phu hop"},
        )
        assert reject_product.status_code == 200, reject_product.text

        public_rejected = app_client.get(f"/api/v1/marketplace/products?disease_key={disease_key}")
        assert public_rejected.status_code == 200
        assert all(item["id"] != product["id"] for item in public_rejected.json()["data"])

        click_rejected = app_client.post(
            f"/api/v1/marketplace/products/{product['id']}/click",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert click_rejected.status_code == 404

    def test_active_product_limit_is_enforced(self, app_client, db_session):
        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token)
        admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
        _mark_admin(admin_email)
        _approve_partner(app_client, admin_token, partner["id"])
        _add_membership(db_session, partner["id"], max_products=1)

        _create_product(app_client, token, "San pham 1")
        second = app_client.post(
            "/api/v1/partners/me/products",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "San pham 2"},
        )
        assert second.status_code == 400
        assert "tối đa 1" in second.json()["detail"]


class TestVnpayPartnerPayments:
    def test_vnpay_signature_helper(self):
        from app.services.vnpay_service import _sign_data, verify_vnpay_signature

        params = {
            "vnp_TxnRef": "ORDER123",
            "vnp_Amount": "9900000",
            "vnp_ResponseCode": "00",
            "vnp_TransactionStatus": "00",
        }
        params["vnp_SecureHash"] = _sign_data(params, "secret")
        assert verify_vnpay_signature(params, secret="secret") is True

        params["vnp_Amount"] = "1000000"
        assert verify_vnpay_signature(params, secret="secret") is False

    def test_vnpay_ipn_success_opens_membership_and_is_idempotent(self, app_client, db_session, monkeypatch):
        from app.models.domain import PaymentTransaction
        from app.services import vnpay_service
        from app.services.vnpay_service import _sign_data

        monkeypatch.setattr(vnpay_service, "VNPAY_HASH_SECRET", "secret")

        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token)
        tx = PaymentTransaction(
            partner_id=partner["id"],
            provider="vnpay",
            txn_ref=f"TXN{uuid.uuid4().hex[:12]}",
            amount_vnd=99000,
            status="pending",
        )
        db_session.add(tx)
        db_session.commit()

        params = {
            "vnp_TmnCode": "TESTCODE",
            "vnp_TxnRef": tx.txn_ref,
            "vnp_Amount": "9900000",
            "vnp_ResponseCode": "00",
            "vnp_TransactionStatus": "00",
            "vnp_TransactionNo": "123456789",
        }
        params["vnp_SecureHash"] = _sign_data(params, "secret")

        first = app_client.get("/api/v1/partner-payments/vnpay/ipn", params=params)
        assert first.status_code == 200
        assert first.json()["RspCode"] == "00"

        db_session.refresh(tx)
        assert tx.status == "success"

        second = app_client.get("/api/v1/partner-payments/vnpay/ipn", params=params)
        assert second.status_code == 200
        assert second.json()["RspCode"] == "02"

        me = app_client.get("/api/v1/partners/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["data"]["active_membership"]["max_active_products"] == 20

    def test_vnpay_ipn_yearly_plan_opens_365_day_membership(self, app_client, db_session, monkeypatch):
        from app.models.domain import PaymentTransaction
        from app.services import vnpay_service
        from app.services.vnpay_service import _sign_data

        monkeypatch.setattr(vnpay_service, "VNPAY_HASH_SECRET", "secret")

        _, token = _register_user(app_client)
        partner = _register_partner(app_client, token)
        tx = PaymentTransaction(
            partner_id=partner["id"],
            provider="vnpay",
            txn_ref=f"TXNYEAR{uuid.uuid4().hex[:12]}",
            amount_vnd=990000,
            status="pending",
        )
        db_session.add(tx)
        db_session.commit()

        params = {
            "vnp_TmnCode": "TESTCODE",
            "vnp_TxnRef": tx.txn_ref,
            "vnp_Amount": "99000000",
            "vnp_ResponseCode": "00",
            "vnp_TransactionStatus": "00",
            "vnp_TransactionNo": "123456790",
        }
        params["vnp_SecureHash"] = _sign_data(params, "secret")

        resp = app_client.get("/api/v1/partner-payments/vnpay/ipn", params=params)
        assert resp.status_code == 200
        assert resp.json()["RspCode"] == "00"

        me = app_client.get("/api/v1/partners/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        membership = me.json()["data"]["active_membership"]
        assert membership["price_vnd"] == 990000
        assert membership["duration_days"] == 365
        assert membership["max_active_products"] == 20

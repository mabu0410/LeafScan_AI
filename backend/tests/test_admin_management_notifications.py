from __future__ import annotations

import uuid
from datetime import datetime, timedelta


def _unique_email(prefix: str = "admin_mgmt") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}@example.com"


def _register_user(client, email: str | None = None, password: str = "TestPass123!", role: str = "farmer") -> tuple[str, str]:
    email = email or _unique_email()
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": email, "password": password, "role": role},
    )
    assert resp.status_code == 200, resp.text
    return email, resp.json()["data"]["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _mark_admin(email: str) -> None:
    from app import config
    from app.dependencies import admin as admin_dep

    normalized = email.lower()
    if normalized not in config.ADMIN_EMAILS:
        config.ADMIN_EMAILS.append(normalized)
    if normalized not in admin_dep.ADMIN_EMAILS:
        admin_dep.ADMIN_EMAILS.append(normalized)


def _user_by_email(db_session, email: str):
    from app.models.domain import User

    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    return user


def _create_partner_graph(db_session, owner_id: int, prefix: str | None = None) -> dict[str, int]:
    from app.models.domain import Partner, PartnerMembership, PartnerOutlet, PartnerProduct

    prefix = prefix or uuid.uuid4().hex[:8]
    partner = Partner(
        user_id=owner_id,
        company_name=f"Partner {prefix}",
        store_name=f"Store {prefix}",
        description="Marketplace test partner",
        address="TP HCM",
        contact_email=_unique_email(f"contact_{prefix}"),
        phone="0900000000",
        business_license=f"BL-{prefix}",
        representative_name="Owner",
        representative_role="Manager",
        service_area="TP HCM",
        main_products="Fertilizer",
        advertising_commitment_accepted=True,
        advertising_commitment_at=datetime.utcnow(),
        product_categories=["fertilizer"],
        status="active",
    )
    db_session.add(partner)
    db_session.flush()

    store = PartnerOutlet(
        partner_id=partner.id,
        name=f"Main Store {prefix}",
        address="TP HCM",
        contact_email=partner.contact_email,
        phone=partner.phone,
        is_active=True,
        is_primary=True,
    )
    db_session.add(store)
    db_session.flush()

    db_session.add(
        PartnerMembership(
            partner_id=partner.id,
            price_vnd=99000,
            duration_days=30,
            max_active_products=20,
            status="active",
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
        )
    )
    product = PartnerProduct(
        partner_id=partner.id,
        store_id=store.id,
        name=f"Approved Product {prefix}",
        description="Ready for marketplace inquiry",
        image_url="/uploads/test.jpg",
        price_range="99.000 VND",
        target_diseases=["test_disease"],
        target_categories=["Tomato"],
        is_active=True,
        moderation_status="approved",
    )
    db_session.add(product)
    db_session.commit()
    return {"partner_id": partner.id, "store_id": store.id, "product_id": product.id}


def test_admin_users_requires_admin_and_suspended_user_is_blocked(app_client):
    admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
    _mark_admin(admin_email)
    user_email, user_token = _register_user(app_client, _unique_email("suspend"))

    forbidden = app_client.get("/api/v1/admin/users", headers=_auth(user_token))
    assert forbidden.status_code == 403

    users = app_client.get(
        "/api/v1/admin/users",
        params={"q": user_email, "page": 1, "page_size": 5},
        headers=_auth(admin_token),
    )
    assert users.status_code == 200, users.text
    data = users.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["email"] == user_email
    user_id = data["items"][0]["id"]

    suspended = app_client.patch(
        f"/api/v1/admin/users/{user_id}/status",
        json={"status": "suspended"},
        headers=_auth(admin_token),
    )
    assert suspended.status_code == 200, suspended.text
    assert suspended.json()["data"]["status"] == "suspended"

    old_token_call = app_client.get("/api/v1/auth/me", headers=_auth(user_token))
    assert old_token_call.status_code == 403

    login = app_client.post("/api/v1/auth/login", json={"email": user_email, "password": "TestPass123!"})
    assert login.status_code == 403


def test_admin_payments_and_scans_have_filters_and_pagination(app_client, db_session):
    from app.models.domain import Disease, PaymentTransaction, Plant, ScanHistory, UserPaymentTransaction

    admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
    _mark_admin(admin_email)
    owner_email, _ = _register_user(app_client, _unique_email("payment_owner"))
    owner = _user_by_email(db_session, owner_email)
    graph = _create_partner_graph(db_session, owner.id, "pay")

    user_txn_ref = f"USER-{uuid.uuid4().hex}"
    partner_txn_ref = f"PARTNER-{uuid.uuid4().hex}"
    disease_key = f"disease_{uuid.uuid4().hex[:8]}"

    db_session.add(
        UserPaymentTransaction(
            user_id=owner.id,
            provider="vnpay",
            txn_ref=user_txn_ref,
            plan_key="personal_monthly",
            tier="personal",
            amount_vnd=39000,
            duration_days=30,
            daily_scan_limit=30,
            status="success",
            paid_at=datetime.utcnow(),
        )
    )
    db_session.add(
        PaymentTransaction(
            partner_id=graph["partner_id"],
            provider="vnpay",
            txn_ref=partner_txn_ref,
            amount_vnd=99000,
            status="pending",
        )
    )
    disease = Disease(
        disease_key=disease_key,
        model_class_name=f"Model_{uuid.uuid4().hex}",
        name="Test Disease",
        severity="moderate",
    )
    db_session.add(disease)
    db_session.flush()
    plant = Plant(user_id=owner.id, name="Tomato test plant", category="Tomato")
    db_session.add(plant)
    db_session.flush()
    db_session.add(
        ScanHistory(
            user_id=owner.id,
            plant_id=plant.id,
            disease_key=disease.disease_key,
            image_url="/uploads/scan.jpg",
            confidence=86.5,
            predicted_stage="moderate",
            forecast_stage_7d="moderate",
        )
    )
    db_session.commit()

    user_payments = app_client.get(
        "/api/v1/admin/payments",
        params={"kind": "user", "status": "success", "q": user_txn_ref, "page_size": 1},
        headers=_auth(admin_token),
    )
    assert user_payments.status_code == 200, user_payments.text
    user_payment_data = user_payments.json()["data"]
    assert user_payment_data["total"] == 1
    assert user_payment_data["items"][0]["kind"] == "user"
    assert user_payment_data["items"][0]["txn_ref"] == user_txn_ref

    partner_payments = app_client.get(
        "/api/v1/admin/payments",
        params={"kind": "partner", "status": "pending", "q": partner_txn_ref},
        headers=_auth(admin_token),
    )
    assert partner_payments.status_code == 200, partner_payments.text
    assert partner_payments.json()["data"]["items"][0]["kind"] == "partner"

    scans = app_client.get(
        "/api/v1/admin/scans",
        params={"q": disease_key, "severity": "moderate", "page": 1, "page_size": 10},
        headers=_auth(admin_token),
    )
    assert scans.status_code == 200, scans.text
    scan_data = scans.json()["data"]
    assert scan_data["total"] == 1
    assert scan_data["items"][0]["disease_key"] == disease_key
    assert scan_data["items"][0]["user_email"] == owner_email


def test_admin_revenue_report_export_and_refund(app_client, db_session):
    from app.models.domain import PartnerMembership, PaymentTransaction, Subscription, UserPaymentTransaction

    admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
    _mark_admin(admin_email)
    owner_email, _ = _register_user(app_client, _unique_email("revenue_owner"))
    owner = _user_by_email(db_session, owner_email)
    graph = _create_partner_graph(db_session, owner.id, "rev")
    paid_at = datetime(2020, 1, 15, 10, 30, 0)
    start = (paid_at - timedelta(days=1)).date().isoformat()
    end = (paid_at + timedelta(days=1)).date().isoformat()

    user_tx = UserPaymentTransaction(
        user_id=owner.id,
        provider="vnpay",
        txn_ref=f"USER-{uuid.uuid4().hex}",
        plan_key="pro_monthly",
        tier="pro",
        amount_vnd=99000,
        duration_days=30,
        daily_scan_limit=100,
        status="success",
        paid_at=paid_at,
    )
    partner_tx = PaymentTransaction(
        partner_id=graph["partner_id"],
        provider="vnpay",
        txn_ref=f"PARTNER-{uuid.uuid4().hex}",
        amount_vnd=199000,
        status="success",
        paid_at=paid_at,
    )
    db_session.add_all([user_tx, partner_tx])
    db_session.flush()
    db_session.add(
        Subscription(
            user_id=owner.id,
            tier="pro",
            started_at=paid_at,
            expires_at=paid_at + timedelta(days=30),
        )
    )
    db_session.add(
        PartnerMembership(
            partner_id=graph["partner_id"],
            price_vnd=199000,
            duration_days=30,
            max_active_products=20,
            status="active",
            started_at=paid_at,
            expires_at=paid_at + timedelta(days=30),
            source_transaction_id=partner_tx.id,
        )
    )
    db_session.commit()

    report = app_client.get(
        "/api/v1/admin/revenue-report",
        params={"start_date": start, "end_date": end, "period": "daily"},
        headers=_auth(admin_token),
    )
    assert report.status_code == 200, report.text
    report_data = report.json()["data"]
    assert report_data["gross_success_vnd"] == 298000
    assert report_data["user_success_vnd"] == 99000
    assert report_data["partner_success_vnd"] == 199000
    assert report_data["user_success_count"] == 1
    assert report_data["partner_success_count"] == 1
    assert report_data["success_count"] == 2
    assert any(item["partner_id"] == graph["partner_id"] for item in report_data["partner_reports"])
    payer_reports = report_data["payer_reports"]
    assert any(item["kind"] == "user" and item["owner_id"] == owner.id for item in payer_reports)
    assert any(item["kind"] == "partner" and item["owner_id"] == graph["partner_id"] for item in payer_reports)

    excel = app_client.get(
        "/api/v1/admin/revenue-report/export",
        params={"format": "excel", "start_date": start, "end_date": end},
        headers=_auth(admin_token),
    )
    assert excel.status_code == 200, excel.text
    assert "text/csv" in excel.headers["content-type"]
    assert "leafscan-revenue" in excel.headers["content-disposition"]

    pdf = app_client.get(
        "/api/v1/admin/revenue-report/export",
        params={"format": "pdf", "start_date": start, "end_date": end},
        headers=_auth(admin_token),
    )
    assert pdf.status_code == 200, pdf.text
    assert pdf.content.startswith(b"%PDF")

    refund_partner = app_client.post(
        f"/api/v1/admin/payments/partner/{partner_tx.id}/refund",
        headers=_auth(admin_token),
        json={"reason": "Customer refund"},
    )
    assert refund_partner.status_code == 200, refund_partner.text
    assert refund_partner.json()["data"]["status"] == "refunded"
    db_session.refresh(partner_tx)
    assert partner_tx.status == "refunded"
    assert (
        db_session.query(PartnerMembership)
        .filter(PartnerMembership.source_transaction_id == partner_tx.id, PartnerMembership.status == "cancelled")
        .count()
        == 1
    )

    refund_user = app_client.post(
        f"/api/v1/admin/payments/user/{user_tx.id}/refund",
        headers=_auth(admin_token),
        json={"reason": "User refund"},
    )
    assert refund_user.status_code == 200, refund_user.text
    assert refund_user.json()["data"]["status"] == "refunded"
    subscription = db_session.query(Subscription).filter(Subscription.user_id == owner.id).first()
    assert subscription is not None
    assert subscription.tier == "free"
    assert subscription.expires_at is None

    refunded_report = app_client.get(
        "/api/v1/admin/revenue-report",
        params={"start_date": start, "end_date": end},
        headers=_auth(admin_token),
    )
    assert refunded_report.status_code == 200, refunded_report.text
    refunded_data = refunded_report.json()["data"]
    assert refunded_data["gross_success_vnd"] == 0
    assert refunded_data["refunded_vnd"] == 298000
    assert refunded_data["refunded_count"] == 2


def test_admin_disease_crud_requires_admin(app_client):
    admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
    _mark_admin(admin_email)
    _, user_token = _register_user(app_client, _unique_email("disease_user"))
    disease_key = f"grad_disease_{uuid.uuid4().hex[:8]}"
    payload = {
        "disease_key": disease_key,
        "model_class_name": f"GradModel_{uuid.uuid4().hex}",
        "name": "Bệnh demo đồ án",
        "severity": "moderate",
        "description": "Mô tả bệnh cây phục vụ demo.",
        "symptoms": ["Đốm lá", "Vàng lá"],
        "treatment": ["Cắt bỏ lá bệnh", "Phun thuốc sinh học"],
        "prevention": ["Giữ vườn thông thoáng"],
        "affected_area_typical": 35,
        "image_url": "/uploads/diseases/demo.jpg",
    }

    forbidden = app_client.post("/api/v1/admin/diseases", headers=_auth(user_token), json=payload)
    assert forbidden.status_code == 403

    created = app_client.post("/api/v1/admin/diseases", headers=_auth(admin_token), json=payload)
    assert created.status_code == 200, created.text
    created_data = created.json()["data"]
    disease_id = created_data["id"]
    assert created_data["disease_key"] == disease_key
    assert created_data["symptoms"] == ["Đốm lá", "Vàng lá"]

    listing = app_client.get("/api/v1/admin/diseases", params={"q": disease_key}, headers=_auth(admin_token))
    assert listing.status_code == 200, listing.text
    assert any(item["id"] == disease_id for item in listing.json()["data"])

    updated_payload = {
        **payload,
        "name": "Bệnh demo đã sửa",
        "severity": "severe",
        "treatment": ["Cách ly cây", "Xử lý giá thể"],
    }
    updated = app_client.put(f"/api/v1/admin/diseases/{disease_id}", headers=_auth(admin_token), json=updated_payload)
    assert updated.status_code == 200, updated.text
    assert updated.json()["data"]["name"] == "Bệnh demo đã sửa"
    assert updated.json()["data"]["severity"] == "severe"

    deleted = app_client.delete(f"/api/v1/admin/diseases/{disease_id}", headers=_auth(admin_token))
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["data"] is None


def test_scan_feedback_only_owner_can_submit(app_client, db_session):
    from app.models.domain import Disease, Plant, ScanFeedback, ScanHistory

    owner_email, owner_token = _register_user(app_client, _unique_email("feedback_owner"))
    _, other_token = _register_user(app_client, _unique_email("feedback_other"))
    owner = _user_by_email(db_session, owner_email)
    disease_key = f"feedback_disease_{uuid.uuid4().hex[:8]}"

    disease = Disease(
        disease_key=disease_key,
        model_class_name=f"FeedbackModel_{uuid.uuid4().hex}",
        name="Bệnh feedback",
        severity="moderate",
    )
    db_session.add(disease)
    db_session.flush()
    plant = Plant(user_id=owner.id, name="Cây test feedback", category="Tomato")
    db_session.add(plant)
    db_session.flush()
    scan = ScanHistory(
        user_id=owner.id,
        plant_id=plant.id,
        disease_key=disease.disease_key,
        image_url="/uploads/feedback_scan.jpg",
        confidence=88.0,
        predicted_stage="middle",
        forecast_stage_7d="late",
    )
    db_session.add(scan)
    db_session.commit()

    other = app_client.post(
        f"/api/v1/diagnose/{scan.id}/feedback",
        headers=_auth(other_token),
        json={"feedback": "incorrect", "note": "not mine"},
    )
    assert other.status_code == 404

    owner_feedback = app_client.post(
        f"/api/v1/diagnose/{scan.id}/feedback",
        headers=_auth(owner_token),
        json={"feedback": "correct", "note": "looks right"},
    )
    assert owner_feedback.status_code == 200, owner_feedback.text
    assert owner_feedback.json()["data"]["feedback"] == "correct"

    updated_feedback = app_client.post(
        f"/api/v1/diagnose/{scan.id}/feedback",
        headers=_auth(owner_token),
        json={"feedback": "unsure"},
    )
    assert updated_feedback.status_code == 200, updated_feedback.text
    assert updated_feedback.json()["data"]["feedback"] == "unsure"
    assert db_session.query(ScanFeedback).filter(ScanFeedback.scan_id == scan.id).count() == 1


def test_notifications_can_be_read_and_marked_read_all(app_client, db_session):
    from app.services.notification_service import create_notification

    email, token = _register_user(app_client, _unique_email("notify"))
    user = _user_by_email(db_session, email)
    create_notification(
        db_session,
        user_id=user.id,
        notification_type="system",
        title="Test notification",
        body="Unread notification",
        data={"source": "test"},
        event_key=f"test_notification:{uuid.uuid4().hex}",
    )
    db_session.commit()

    listing = app_client.get("/api/v1/notifications", headers=_auth(token))
    assert listing.status_code == 200, listing.text
    data = listing.json()["data"]
    assert data["unread_count"] >= 1
    notification_id = data["items"][0]["id"]

    read = app_client.patch(f"/api/v1/notifications/{notification_id}/read", headers=_auth(token))
    assert read.status_code == 200, read.text
    assert read.json()["data"]["read_at"] is not None

    all_read = app_client.patch("/api/v1/notifications/read-all", headers=_auth(token))
    assert all_read.status_code == 200, all_read.text
    assert all_read.json()["data"]["unread_count"] == 0


def test_marketplace_inquiry_visible_to_partner_and_admin(app_client, db_session):
    admin_email, admin_token = _register_user(app_client, _unique_email("admin"))
    _mark_admin(admin_email)
    partner_email, partner_token = _register_user(app_client, _unique_email("partner"), role="partner")
    customer_email, customer_token = _register_user(app_client, _unique_email("customer"))
    partner_owner = _user_by_email(db_session, partner_email)
    graph = _create_partner_graph(db_session, partner_owner.id, "inq")

    create = app_client.post(
        "/api/v1/marketplace/inquiries",
        headers=_auth(customer_token),
        json={
            "product_id": graph["product_id"],
            "name": "Customer",
            "phone": "0912345678",
            "email": customer_email,
            "message": "Need consultation for this product",
        },
    )
    assert create.status_code == 200, create.text
    inquiry = create.json()["data"]
    assert inquiry["status"] == "new"
    assert inquiry["product_id"] == graph["product_id"]

    partner_list = app_client.get("/api/v1/partners/me/inquiries", headers=_auth(partner_token))
    assert partner_list.status_code == 200, partner_list.text
    assert any(item["id"] == inquiry["id"] for item in partner_list.json()["data"])

    partner_notifications = app_client.get("/api/v1/notifications", headers=_auth(partner_token))
    assert partner_notifications.status_code == 200, partner_notifications.text
    assert partner_notifications.json()["data"]["unread_count"] >= 1

    update = app_client.patch(
        f"/api/v1/partners/me/inquiries/{inquiry['id']}/status",
        headers=_auth(partner_token),
        json={"status": "contacted"},
    )
    assert update.status_code == 200, update.text
    assert update.json()["data"]["status"] == "contacted"

    admin_list = app_client.get("/api/v1/admin/inquiries", params={"status": "contacted"}, headers=_auth(admin_token))
    assert admin_list.status_code == 200, admin_list.text
    assert any(item["id"] == inquiry["id"] for item in admin_list.json()["data"])

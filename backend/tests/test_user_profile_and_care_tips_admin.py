import uuid


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


def _mark_admin(email: str) -> None:
    from app import config
    from app.dependencies import admin as admin_dep

    normalized = email.lower()
    if normalized not in config.ADMIN_EMAILS:
        config.ADMIN_EMAILS.append(normalized)
    if normalized not in admin_dep.ADMIN_EMAILS:
        admin_dep.ADMIN_EMAILS.append(normalized)


def _care_tip_payload(slug: str | None = None) -> dict:
    payload = {
        "title": "Tưới cây buổi sáng",
        "summary": "Tưới cây vào buổi sáng giúp cây hấp thụ nước ổn định.",
        "content": "Ưu tiên tưới cây vào sáng sớm, tránh tưới quá nhiều vào chiều tối.",
        "category": "general",
        "suitable_plants": ["tomato", "apple"],
        "priority": 5,
        "is_active": True,
    }
    if slug:
        payload["slug"] = slug
    return payload


class TestUserProfileApi:
    def test_get_users_me_returns_current_user(self, app_client):
        email, token = _register_user(app_client)

        resp = app_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200, resp.text
        payload = resp.json()
        assert payload["success"] is True
        assert payload["data"]["user"]["email"] == email

    def test_update_users_me_updates_profile(self, app_client):
        _, token = _register_user(app_client)
        next_email = _unique_email("updated")

        resp = app_client.put(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Updated User",
                "email": next_email,
                "phone": "0900000001",
                "avatar": "file:///avatar.jpg",
            },
        )

        assert resp.status_code == 200, resp.text
        user = resp.json()["data"]["user"]
        assert user["name"] == "Updated User"
        assert user["email"] == next_email
        assert user["phone"] == "0900000001"
        assert user["avatar"] == "file:///avatar.jpg"

        current = app_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert current.status_code == 200
        assert current.json()["data"]["user"]["email"] == next_email

    def test_update_users_me_rejects_duplicate_email(self, app_client):
        existing_email, _ = _register_user(app_client)
        _, token = _register_user(app_client)

        resp = app_client.put(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Duplicate User",
                "email": existing_email,
                "phone": None,
                "avatar": None,
            },
        )

        assert resp.status_code == 400
        assert "Email" in resp.json()["detail"]

    def test_users_me_requires_auth(self, app_client):
        resp = app_client.get("/api/v1/users/me")
        assert resp.status_code in (401, 403)


class TestCareTipsAdminAuth:
    def test_non_admin_cannot_manage_care_tips(self, app_client):
        _, token = _register_user(app_client)

        create_resp = app_client.post(
            "/api/v1/admin/care-tips",
            headers={"Authorization": f"Bearer {token}"},
            json=_care_tip_payload("non-admin-tip"),
        )
        assert create_resp.status_code == 403

        list_resp = app_client.get(
            "/api/v1/admin/care-tips",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_resp.status_code == 403

    def test_admin_can_crud_care_tips(self, app_client):
        admin_email, admin_token = _register_user(app_client, email=_unique_email("admin"))
        _mark_admin(admin_email)

        create_resp = app_client.post(
            "/api/v1/admin/care-tips",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=_care_tip_payload("admin-morning-tip"),
        )
        assert create_resp.status_code == 200, create_resp.text
        tip = create_resp.json()["data"]
        assert tip["slug"] == "admin-morning-tip"

        list_resp = app_client.get(
            "/api/v1/admin/care-tips",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert list_resp.status_code == 200, list_resp.text
        assert any(item["id"] == tip["id"] for item in list_resp.json()["data"])

        update_resp = app_client.put(
            f"/api/v1/admin/care-tips/{tip['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"title": "Tưới cây sáng sớm", "priority": 8},
        )
        assert update_resp.status_code == 200, update_resp.text
        assert update_resp.json()["data"]["title"] == "Tưới cây sáng sớm"
        assert update_resp.json()["data"]["priority"] == 8

        delete_resp = app_client.delete(
            f"/api/v1/admin/care-tips/{tip['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert delete_resp.status_code == 200, delete_resp.text
        assert delete_resp.json()["success"] is True

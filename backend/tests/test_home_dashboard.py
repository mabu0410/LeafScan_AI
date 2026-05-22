from __future__ import annotations

import uuid
from datetime import datetime, timedelta


def _unique_email() -> str:
    return f"home_{uuid.uuid4().hex[:12]}@example.com"


def _register(client, name: str = "Home User") -> str:
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": _unique_email(), "password": "TestPass123!"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_home_summary_requires_auth(app_client):
    resp = app_client.get("/api/v1/home/summary")
    assert resp.status_code in (401, 403)


def test_home_summary_empty_state_uses_real_empty_collections(app_client, monkeypatch):
    from app.routers import home as home_router

    monkeypatch.setattr(
        home_router,
        "fetch_current_weather",
        lambda: {
            "location": "Hà Nội",
            "temperature_c": 30.0,
            "humidity_percent": 70,
            "wind_speed_kmh": 8,
            "condition": "Có mây",
            "weather_code": 2,
            "observed_at": datetime.utcnow(),
        },
    )
    token = _register(app_client)

    resp = app_client.get("/api/v1/home/summary", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]

    assert data["weather"]["temperature_c"] == 30.0
    assert data["garden_summary"]["last_scan_at"] is None
    assert data["recent_activities"] == []
    assert data["today_tasks"] == []
    assert data["care_logs"] == []


def test_home_task_care_log_crud_appears_in_summary(app_client, monkeypatch):
    from app.routers import home as home_router

    monkeypatch.setattr(
        home_router,
        "fetch_current_weather",
        lambda: {
            "location": "Hà Nội",
            "temperature_c": 29.0,
            "humidity_percent": 72,
            "wind_speed_kmh": 6,
            "condition": "Ít mây",
            "weather_code": 1,
            "observed_at": datetime.utcnow(),
        },
    )
    token = _register(app_client)
    headers = _auth(token)

    due_at = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    task_resp = app_client.post(
        "/api/v1/home/tasks",
        headers=headers,
        json={"title": "Tưới cây", "task_type": "watering", "due_at": due_at},
    )
    assert task_resp.status_code == 200, task_resp.text

    log_resp = app_client.post(
        "/api/v1/home/care-logs",
        headers=headers,
        json={"title": "Đã kiểm tra lá", "description": "Không thấy đốm mới", "log_type": "inspection"},
    )
    assert log_resp.status_code == 200, log_resp.text

    summary = app_client.get("/api/v1/home/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    data = summary.json()["data"]

    assert data["today_tasks"][0]["title"] == "Tưới cây"
    assert data["care_logs"][0]["title"] == "Đã kiểm tra lá"
    assert any(item["activity_type"] == "care_log" for item in data["recent_activities"])


def test_home_dashboard_task_and_care_log_are_user_scoped(app_client):
    owner_token = _register(app_client, "Owner")
    other_token = _register(app_client, "Other")

    task_resp = app_client.post(
        "/api/v1/home/tasks",
        headers=_auth(owner_token),
        json={"title": "Private task", "task_type": "inspection"},
    )
    assert task_resp.status_code == 200, task_resp.text
    task_id = task_resp.json()["data"]["id"]

    log_resp = app_client.post(
        "/api/v1/home/care-logs",
        headers=_auth(owner_token),
        json={"title": "Private log", "log_type": "inspection"},
    )
    assert log_resp.status_code == 200, log_resp.text
    log_id = log_resp.json()["data"]["id"]

    other_task_update = app_client.patch(
        f"/api/v1/home/tasks/{task_id}",
        headers=_auth(other_token),
        json={"title": "Hijacked"},
    )
    assert other_task_update.status_code == 404

    other_log_update = app_client.patch(
        f"/api/v1/home/care-logs/{log_id}",
        headers=_auth(other_token),
        json={"title": "Hijacked"},
    )
    assert other_log_update.status_code == 404

    owner_tasks = app_client.get("/api/v1/home/tasks", headers=_auth(owner_token))
    other_tasks = app_client.get("/api/v1/home/tasks", headers=_auth(other_token))
    owner_logs = app_client.get("/api/v1/home/care-logs", headers=_auth(owner_token))
    other_logs = app_client.get("/api/v1/home/care-logs", headers=_auth(other_token))
    assert len(owner_tasks.json()["data"]) == 1
    assert other_tasks.json()["data"] == []
    assert len(owner_logs.json()["data"]) == 1
    assert other_logs.json()["data"] == []

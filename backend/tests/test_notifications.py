from __future__ import annotations

import uuid
from datetime import datetime, timedelta


def _unique_email(prefix: str = "notify") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}@example.com"


def _register_user(client) -> tuple[str, str]:
    email = _unique_email()
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Notify User", "email": email, "password": "TestPass123!"},
    )
    assert resp.status_code == 200, resp.text
    return email, resp.json()["data"]["access_token"]


def _user_id_by_email(db_session, email: str) -> int:
    from app.models.domain import User

    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    return user.id


class TestPushNotifications:
    def test_register_and_unregister_push_token(self, app_client):
        _, token = _register_user(app_client)

        register = app_client.post(
            "/api/v1/notifications/register",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "token": "ExponentPushToken[test-register]",
                "platform": "android",
                "device_id": "device-1",
            },
        )
        assert register.status_code == 200, register.text
        assert register.json()["data"]["enabled"] is True
        assert register.json()["data"]["active_token_count"] == 1

        unregister = app_client.post(
            "/api/v1/notifications/unregister",
            headers={"Authorization": f"Bearer {token}"},
            json={"token": "ExponentPushToken[test-register]"},
        )
        assert unregister.status_code == 200, unregister.text
        assert unregister.json()["data"]["enabled"] is False
        assert unregister.json()["data"]["active_token_count"] == 0

    def test_test_notification_uses_expo_push_api(self, app_client, monkeypatch):
        from app.services import notification_service

        captured_messages = []

        def fake_post(messages):
            captured_messages.extend(messages)
            return [{"status": "ok", "id": "ticket-1"} for _ in messages]

        monkeypatch.setattr(notification_service, "_post_expo_push", fake_post)
        _, token = _register_user(app_client)
        app_client.post(
            "/api/v1/notifications/register",
            headers={"Authorization": f"Bearer {token}"},
            json={"token": "ExponentPushToken[test-send]", "platform": "ios"},
        )

        resp = app_client.post(
            "/api/v1/notifications/test",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "LeafScan test", "body": "Ping"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["sent"] == 1
        assert captured_messages[0]["to"] == "ExponentPushToken[test-send]"
        assert captured_messages[0]["title"] == "LeafScan test"

    def test_scheduler_sends_due_care_task_once(self, app_client, db_session, monkeypatch):
        from app.models.domain import CareTask, NotificationDelivery
        from app.services import notification_service

        sent_messages = []

        def fake_post(messages):
            sent_messages.extend(messages)
            return [{"status": "ok", "id": "task-ticket"} for _ in messages]

        monkeypatch.setattr(notification_service, "_post_expo_push", fake_post)
        email, token = _register_user(app_client)
        user_id = _user_id_by_email(db_session, email)
        app_client.post(
            "/api/v1/notifications/register",
            headers={"Authorization": f"Bearer {token}"},
            json={"token": "ExponentPushToken[test-task]", "platform": "android"},
        )

        task = CareTask(
            user_id=user_id,
            title="Tưới nước luống rau",
            task_type="watering",
            due_at=datetime.utcnow() + timedelta(minutes=5),
            status="pending",
        )
        db_session.add(task)
        db_session.commit()

        first_count = notification_service.run_scheduled_notifications(db_session, now=datetime.utcnow())
        second_count = notification_service.run_scheduled_notifications(db_session, now=datetime.utcnow())
        db_session.commit()

        assert first_count == 1
        assert second_count == 0
        assert len(sent_messages) == 1
        assert sent_messages[0]["data"]["type"] == "care_task"
        assert (
            db_session.query(NotificationDelivery)
            .filter(NotificationDelivery.event_key == f"care_task_due:{task.id}")
            .count()
            == 1
        )

"""Security regressions for the public WebApp; all checks are local with fake IDs and tokens."""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

from fastapi.testclient import TestClient
import server


def signed(token: str, user_id: int, when: int | None = None) -> str:
    fields = {
        "auth_date": str(int(time.time()) if when is None else when),
        "query_id": "local-test",
        "user": json.dumps({"id": user_id}, separators=(",", ":")),
    }
    signature_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    digest = hmac.new(signature_key, check.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": digest})


def test_public_health_does_not_expose_webhook_or_internal_user_data(monkeypatch):
    monkeypatch.setattr(server, "_WEBHOOK_INFO", {"url": "https://example.test/webhook/SUPERSECRET_TOKEN", "verified": True})
    r = TestClient(server.app).get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.headers.get("cache-control") == "no-store"
    body = r.text.lower()
    for forbidden in ("supersecret_token", "webhook", "db_users", "scheduler", "users.db"):
        assert forbidden not in body


def test_location_endpoints_reject_missing_invalid_and_foreign_initdata(monkeypatch):
    monkeypatch.setattr(server, "BOT_TOKEN", "123456:LOCAL_FAKE_TOKEN")
    client = TestClient(server.app)
    assert client.get("/api/user/location", params={"user_id": 98765001}).status_code == 401
    data = {"user_id": 98765001, "lat": 52.0, "lon": 21.0, "city": "Test"}
    assert client.post("/api/user/location", json=data).status_code == 401
    token = signed(server.BOT_TOKEN, 98765001)
    headers = {"X-Telegram-Init-Data": token}
    assert client.get("/api/user/location", params={"user_id": 98765002}, headers=headers).status_code == 401
    assert client.post("/api/user/location", json={**data, "user_id": 98765002}, headers=headers).status_code == 401
    assert client.post("/api/user/location", json={**data, "lat": 100}, headers=headers).status_code == 400
    assert client.get("/api/user/location", params={"user_id": 98765001}, headers=headers).status_code == 200


def test_webhook_rejects_legacy_path_when_new_header_secret_is_enabled(monkeypatch):
    monkeypatch.setattr(server, "BOT_TOKEN", "123456:LOCAL_FAKE_TOKEN")
    monkeypatch.setattr(server, "WEBHOOK_SECRET", "new_test_secret_123")
    client = TestClient(server.app)
    assert client.post("/webhook/123456:LOCAL_FAKE_TOKEN", json={}).status_code == 403
    assert client.post("/webhook", json={}).status_code == 403
    assert client.post("/webhook", json={}, headers={"X-Telegram-Bot-Api-Secret-Token": "incorrect"}).status_code == 403


def test_notification_and_daily_briefing_require_signed_owner(monkeypatch):
    monkeypatch.setattr(server, "BOT_TOKEN", "123456:LOCAL_FAKE_TOKEN")
    client = TestClient(server.app)
    prefs = {"user_id": 98765001, "enabled": 1, "timing": {}, "tz_offset": 60}
    briefing = {"user_id": 98765001, "enabled": True, "time": "04:30", "tz_offset": 60}
    assert client.post("/api/user/notifications", json=prefs).status_code == 401
    assert client.post("/api/user/daily-briefing", json=briefing).status_code == 401
    foreign = {"X-Telegram-Init-Data": signed(server.BOT_TOKEN, 98765002)}
    assert client.post("/api/user/notifications", json=prefs, headers=foreign).status_code == 401
    assert client.post("/api/user/daily-briefing", json=briefing, headers=foreign).status_code == 401


def test_admin_routes_reject_spoofed_ids_without_secret(monkeypatch):
    monkeypatch.setattr(server, "ADMIN_IDS", [98765001])
    monkeypatch.setattr(server, "ADMIN_API_SECRET", "")
    client = TestClient(server.app)
    assert client.get("/api/admin/dbcheck", params={"admin_id": 98765001}).status_code == 403
    assert client.get("/api/admin/app-stats", params={"admin_id": 98765001}).status_code == 403
    for route in ("/api/admin/testnotif", "/api/admin/testbrief", "/api/admin/push-broadcast"):
        assert client.post(route, json={"admin_id": 98765001}).status_code == 403
    # Header is accepted only if the server explicitly has a matching independent shared secret.
    monkeypatch.setattr(server, "ADMIN_API_SECRET", "secure-local-admin-secret")
    assert not server._admin_rest_authorized(
        type("RequestFake", (), {"headers": {"X-Admin-API-Key": "bad"}})(), 98765001
    )
    assert server._admin_rest_authorized(
        type("RequestFake", (), {"headers": {"X-Admin-API-Key": "secure-local-admin-secret"}})(), 98765001
    )

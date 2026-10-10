import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import server


def _signed_init_data(token: str, user_id: int, auth_date: int | None = None):
    fields = {
        "auth_date": str(auth_date or int(time.time())),
        "query_id": "AA-test-query",
        "user": json.dumps({"id": user_id, "first_name": "Test"}, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    digest = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": digest})


def test_valid_initdata_is_bound_to_user(monkeypatch):
    token = "123456:TEST_TOKEN"
    monkeypatch.setattr(server, "BOT_TOKEN", token)
    init_data = _signed_init_data(token, 777)
    result = server._verify_telegram_init_data(init_data, 777)
    assert result is not None
    assert result["user"]["id"] == 777


def test_initdata_rejects_wrong_user(monkeypatch):
    token = "123456:TEST_TOKEN"
    monkeypatch.setattr(server, "BOT_TOKEN", token)
    init_data = _signed_init_data(token, 777)
    assert server._verify_telegram_init_data(init_data, 778) is None


def test_initdata_rejects_tampering(monkeypatch):
    token = "123456:TEST_TOKEN"
    monkeypatch.setattr(server, "BOT_TOKEN", token)
    init_data = _signed_init_data(token, 777).replace("777", "778")
    assert server._verify_telegram_init_data(init_data, 778) is None


def test_initdata_rejects_stale_payload(monkeypatch):
    token = "123456:TEST_TOKEN"
    monkeypatch.setattr(server, "BOT_TOKEN", token)
    init_data = _signed_init_data(token, 777, int(time.time()) - 90000)
    assert server._verify_telegram_init_data(init_data, 777) is None

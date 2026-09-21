"""
Regression test for the notification-scheduler safety gate added after a
real incident: restarting the local dev server previously started the live
notification scheduler unconditionally, and it sent a real Telegram message
using the real BOT_TOKEN against a stray local users.db.

server._scheduler_enabled() must:
  - default to OFF for local/dev (no RENDER, no LOCAL_WEBHOOK)
  - default to ON in production (RENDER=true, matching _is_production())
  - always obey an explicit ENABLE_SCHEDULER=true/false override
"""
import importlib
import os

import pytest


@pytest.fixture
def server_module(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "test-token-not-real")
    import server
    importlib.reload(server)
    yield server
    importlib.reload(server)


def test_disabled_by_default_in_local_dev(server_module, monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("LOCAL_WEBHOOK", raising=False)
    monkeypatch.delenv("ENABLE_SCHEDULER", raising=False)
    assert server_module._scheduler_enabled() is False


def test_enabled_in_production(server_module, monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.delenv("ENABLE_SCHEDULER", raising=False)
    assert server_module._scheduler_enabled() is True


def test_explicit_override_true_wins_even_locally(server_module, monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.setenv("ENABLE_SCHEDULER", "true")
    assert server_module._scheduler_enabled() is True


def test_explicit_override_false_wins_even_in_production(server_module, monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("ENABLE_SCHEDULER", "false")
    assert server_module._scheduler_enabled() is False

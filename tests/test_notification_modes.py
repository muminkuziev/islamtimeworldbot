"""Prayer notification modes over Telegram — uses a fake bot, never sends."""
import asyncio
from types import SimpleNamespace

import server


class FakeBot:
    def __init__(self):
        self.calls = []

    async def send_message(self, chat_id, text, **kw):
        self.calls.append(("message", kw.get("disable_notification")))

    async def send_voice(self, chat_id, voice, **kw):
        self.calls.append(("voice", voice if isinstance(voice, str) else "upload"))
        return SimpleNamespace(voice=SimpleNamespace(file_id="cached-adhan"))


def run(mode, offset, monkeypatch):
    bot = FakeBot()
    monkeypatch.setattr(server, "_bot_notif", bot)
    asyncio.run(server._send_prayer_message(1, "Asr", mode, offset))
    return bot.calls


def test_modes_map_to_telegram_delivery(monkeypatch):
    monkeypatch.setattr(server, "_adhan_file_id", None)
    assert run("silent", 0, monkeypatch) == [("message", True)]
    assert run("sound", 0, monkeypatch) == [("message", False)]
    assert run("vibrate", 0, monkeypatch) == [("message", False)]
    # Adhan at prayer time: quiet text, the voice message carries the alert,
    # and the uploaded file is reused afterwards.
    assert run("adhan", 0, monkeypatch) == [("message", True), ("voice", "upload")]
    assert run("adhan", 0, monkeypatch) == [("message", True), ("voice", "cached-adhan")]


def test_adhan_is_never_sent_for_early_reminders(monkeypatch):
    assert run("adhan", -15, monkeypatch) == [("message", False)]


def test_adhan_voice_is_telegram_voice_format():
    data = server.ADHAN_VOICE_PATH.read_bytes()[:200]
    assert data[:4] == b"OggS" and b"OpusHead" in data

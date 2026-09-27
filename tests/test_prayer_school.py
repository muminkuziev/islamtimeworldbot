"""Daily/monthly prayer requests must honor the same selected Asr school."""
import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from domain.prayer.service import PrayerService
from infrastructure.external import aladhan_api


@pytest.mark.parametrize("school", [0, 1])
def test_daily_service_passes_calculation_method_and_school(school):
    timings = {"Fajr": "05:00", "Sunrise": "06:20", "Dhuhr": "12:30", "Asr": "16:00", "Maghrib": "18:30", "Isha": "20:00"}
    upstream = AsyncMock(return_value={"timings": timings, "meta": {"timezone": "UTC"},
                                      "date": {"hijri": {"month": {"number": 9, "en": "Ramadan"}}}})
    with patch("domain.prayer.service.fetch_timings", upstream), patch(
        "domain.prayer.service.reverse_geocode", AsyncMock(return_value={})
    ):
        result = asyncio.run(PrayerService().get_prayer_data(52.2, 21.0, "en", 3, school))
    upstream.assert_awaited_once_with(52.2, 21.0, 3, school)
    assert result["school"] == school
    assert result["prayers"][3]["time"] == timings["Asr"]
    assert result["hijri"]["month_num"] == 9


@pytest.mark.parametrize("school", [0, 1])
def test_monthly_service_passes_the_same_school(school):
    upstream = AsyncMock(return_value=[{"timings": {"Asr": "16:10"}}])
    with patch("infrastructure.external.aladhan_api.fetch_calendar", upstream), patch(
        "domain.prayer.service.reverse_geocode", AsyncMock(return_value={})
    ):
        result = asyncio.run(PrayerService().get_monthly_prayer_data(52.2, 21.0, 9, 2026, "en", 3, school))
    upstream.assert_awaited_once_with(52.2, 21.0, 9, 2026, 3, school)
    assert result["school"] == school
    assert result["days"][0]["prayers"][3]["time"] == "16:10"


@pytest.mark.parametrize("school", [0, 1])
def test_aladhan_http_requests_include_school(school):
    requests = []

    class Response:
        status = 200

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def json(self):
            return {"code": 200, "data": {"fixture": True}}

    class Session(Response):
        def get(self, url, **kwargs):
            requests.append((url, kwargs["params"]))
            return Response()

    with patch.object(aladhan_api.aiohttp, "ClientSession", Session):
        asyncio.run(aladhan_api.fetch_timings(52.2, 21.0, 3, school))
        asyncio.run(aladhan_api.fetch_calendar(52.2, 21.0, 9, 2026, 3, school))
    assert len(requests) == 2
    assert all(params["school"] == school and params["method"] == 3 for _, params in requests)


def test_invalid_school_is_rejected_before_network_access():
    with patch.object(aladhan_api.aiohttp, "ClientSession") as session:
        with pytest.raises(ValueError, match="school"):
            asyncio.run(aladhan_api.fetch_timings(52.2, 21.0, school=2))
        with pytest.raises(ValueError, match="school"):
            asyncio.run(aladhan_api.fetch_calendar(52.2, 21.0, 9, 2026, school=-1))
        session.assert_not_called()


def test_timezone_database_failure_does_not_break_next_prayer_response():
    from domain.prayer.service import _calc_next_prayer
    from zoneinfo import ZoneInfoNotFoundError

    with patch("domain.prayer.service.ZoneInfo", side_effect=ZoneInfoNotFoundError):
        result = _calc_next_prayer({"Fajr": "05:00", "Isha": "23:59"}, "UTC")
    assert result["key"] in {"Fajr", "Isha"}
    assert result["time"] in {"05:00", "23:59"}

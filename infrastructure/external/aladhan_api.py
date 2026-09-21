"""Aladhan.com prayer times API — async client."""

import aiohttp
from typing import Optional

ALADHAN_BASE = "https://api.aladhan.com/v1"
_TIMEOUT = aiohttp.ClientTimeout(total=10)


async def fetch_timings(lat: float, lon: float, method: int = 3) -> Optional[dict]:
    """Fetch prayer timings from Aladhan API.

    Returns the full 'data' object (timings + date + meta) or None on failure.
    Method 3 = Muslim World League (works globally).
    """
    url = f"{ALADHAN_BASE}/timings"
    params = {"latitude": lat, "longitude": lon, "method": method}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=_TIMEOUT) as resp:
                if resp.status == 200:
                    body = await resp.json()
                    if body.get("code") == 200:
                        return body["data"]
    except Exception:
        pass

    return None


async def fetch_calendar(lat: float, lon: float, month: int, year: int, method: int = 3) -> Optional[list]:
    """Fetch a full month's prayer timings in a single call.

    Returns the list of 28-31 day entries (each with .timings/.date), or
    None on failure. Reuses the same calculation method as fetch_timings()
    so daily and monthly views never disagree for the same location.
    """
    url = f"{ALADHAN_BASE}/calendar"
    params = {"latitude": lat, "longitude": lon, "method": method, "month": month, "year": year}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, params=params, timeout=_TIMEOUT, allow_redirects=True
            ) as resp:
                if resp.status == 200:
                    body = await resp.json()
                    if body.get("code") == 200:
                        return body["data"]
    except Exception:
        pass

    return None

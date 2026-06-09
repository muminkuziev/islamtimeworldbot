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

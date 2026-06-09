"""OpenStreetMap Nominatim reverse geocoding — async client."""

import aiohttp
from typing import Optional

_NOMINATIM = "https://nominatim.openstreetmap.org/reverse"
_TIMEOUT   = aiohttp.ClientTimeout(total=8)
_HEADERS   = {"User-Agent": "IslamTimeWorldBot/1.0"}


async def reverse_geocode(lat: float, lon: float) -> dict:
    """Return city, country, country_code for the given coordinates.

    Falls back to empty strings on any failure — never raises.
    """
    params = {"lat": lat, "lon": lon, "format": "json", "accept-language": "en"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                _NOMINATIM, params=params, headers=_HEADERS, timeout=_TIMEOUT
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    addr = data.get("address", {})
                    city = (
                        addr.get("city")
                        or addr.get("town")
                        or addr.get("village")
                        or addr.get("county")
                        or ""
                    )
                    return {
                        "city":         city,
                        "country":      addr.get("country", ""),
                        "country_code": addr.get("country_code", "").upper(),
                    }
    except Exception:
        pass

    return {"city": "", "country": "", "country_code": ""}

"""
Haramayn LIVE source status — Masjid al-Haram (Makkah) and Masjid an-Nabawi
(Madinah).

Hard rule: never embed/proxy a third-party stream without confirmed official
permission, never mark a static image as LIVE, never fabricate availability.

The external destinations are the Saudi Quran TV and Saudi
Sunnah TV channels operated by the Saudi Broadcasting Authority. Stable
channel `/live` URLs are used so rotating YouTube video IDs do not break the
buttons. The app never proxies or re-hosts either official stream.
Channel URLs are source references, not evidence of a currently live broadcast.
No runtime broadcast verifier is installed, so no LIVE status is returned.
"""
from dataclasses import dataclass

UNAVAILABLE_NOT_CONFIRMED = "UNAVAILABLE_NOT_CONFIRMED"
LIVE_EMBED_ACTIVE = "LIVE_EMBED_ACTIVE"
LIVE_EXTERNAL_ACTIVE = "LIVE_EXTERNAL_ACTIVE"
OFFICIAL_SOURCE_AVAILABLE = "OFFICIAL_SOURCE_AVAILABLE"


@dataclass
class HaramaynSite:
    site_id: str
    name_en: str
    mosque_en: str
    status: str
    embed_url: str | None
    official_external_url: str
    official_authority: str
    note: str


SITES: dict[str, HaramaynSite] = {
    "makkah": HaramaynSite(
        site_id="makkah",
        name_en="Makkah",
        mosque_en="Masjid al-Haram",
        status=OFFICIAL_SOURCE_AVAILABLE,
        embed_url=None,
        official_external_url="https://www.youtube.com/@SaudiQuranTv/live",
        official_authority="Saudi Broadcasting Authority · Saudi Quran TV",
        note=(
            "Saudi Quran TV channel source. Current broadcast availability "
            "has not been verified; open the official source externally."
        ),
    ),
    "madinah": HaramaynSite(
        site_id="madinah",
        name_en="Madinah",
        mosque_en="Masjid an-Nabawi",
        status=OFFICIAL_SOURCE_AVAILABLE,
        embed_url=None,
        official_external_url="https://www.youtube.com/@SaudiSunnahTv/live",
        official_authority="Saudi Broadcasting Authority · Saudi Sunnah TV",
        note=(
            "Saudi Sunnah TV channel source. Current broadcast availability "
            "has not been verified; open the official source externally."
        ),
    ),
}


def get_site_status(site_id: str) -> HaramaynSite | None:
    return SITES.get(site_id)


def all_sites() -> list[dict]:
    from dataclasses import asdict
    return [asdict(SITES[k]) for k in ("makkah", "madinah")]

"""
Haramayn LIVE source status — Masjid al-Haram (Makkah) and Masjid an-Nabawi
(Madinah).

Hard rule: never embed/proxy a third-party stream without confirmed official
permission, never mark a static image as LIVE, never fabricate availability.

The external LIVE destinations are the verified Saudi Quran TV and Saudi
Sunnah TV channels operated by the Saudi Broadcasting Authority. Stable
channel `/live` URLs are used so rotating YouTube video IDs do not break the
buttons. The app never proxies or re-hosts either official stream.
"""
from dataclasses import dataclass

UNAVAILABLE_NOT_CONFIRMED = "UNAVAILABLE_NOT_CONFIRMED"
LIVE_EMBED_ACTIVE = "LIVE_EMBED_ACTIVE"
LIVE_EXTERNAL_ACTIVE = "LIVE_EXTERNAL_ACTIVE"


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
        status=LIVE_EXTERNAL_ACTIVE,
        embed_url=None,
        official_external_url="https://www.youtube.com/@SaudiQuranTv/live",
        official_authority="Saudi Broadcasting Authority · Saudi Quran TV",
        note=(
            "Official 24/7 Makkah broadcast. Opens the verified Saudi Quran "
            "TV channel externally."
        ),
    ),
    "madinah": HaramaynSite(
        site_id="madinah",
        name_en="Madinah",
        mosque_en="Masjid an-Nabawi",
        status=LIVE_EXTERNAL_ACTIVE,
        embed_url=None,
        official_external_url="https://www.youtube.com/@SaudiSunnahTv/live",
        official_authority="Saudi Broadcasting Authority · Saudi Sunnah TV",
        note=(
            "Official 24/7 Madinah broadcast. Opens the verified Saudi Sunnah "
            "TV channel externally."
        ),
    ),
}


def get_site_status(site_id: str) -> HaramaynSite | None:
    return SITES.get(site_id)


def all_sites() -> list[dict]:
    from dataclasses import asdict
    return [asdict(SITES[k]) for k in ("makkah", "madinah")]

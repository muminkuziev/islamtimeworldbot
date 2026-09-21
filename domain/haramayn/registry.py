"""
Haramayn LIVE source status — Masjid al-Haram (Makkah) and Masjid an-Nabawi
(Madinah).

Hard rule: never embed/proxy a third-party stream without confirmed official
permission, never mark a static image as LIVE, never fabricate availability.

Current state: no direct embed is activated. Multiple independent sources
(Wikipedia, Saudi Press Agency, Arab News) corroborate that the General
Presidency for the Affairs of the Two Holy Mosques (gph.gov.sa, a .gov.sa
government domain) is the legitimate official authority for these sites and
their broadcasts — but this session's network access could not independently
confirm gph.gov.sa is currently reachable or that it exposes a directly
embeddable stream. Embedding requires that confirmation; this registry keeps
the dependency explicit rather than guessing.

The app must never claim a fabricated/unofficial stream is official. Until
someone confirms a specific embeddable official URL, the UI shows a real
status card (real photo, real labeling, no fake LIVE indicator) with a button
that opens the official destination in an external browser tab — it is never
embedded or proxied through this app.
"""
from dataclasses import dataclass

UNAVAILABLE_NOT_CONFIRMED = "UNAVAILABLE_NOT_CONFIRMED"
LIVE_EMBED_ACTIVE = "LIVE_EMBED_ACTIVE"


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
        name_en="Makkah LIVE",
        mosque_en="Masjid al-Haram",
        status=UNAVAILABLE_NOT_CONFIRMED,
        embed_url=None,
        official_external_url="https://www.gph.gov.sa",
        official_authority="General Presidency for the Affairs of the Two Holy Mosques",
        note=(
            "Direct embed not activated: official embeddable stream URL not "
            "independently confirmed from this environment. Opens the "
            "official authority's site externally instead of embedding."
        ),
    ),
    "madinah": HaramaynSite(
        site_id="madinah",
        name_en="Madinah LIVE",
        mosque_en="Masjid an-Nabawi",
        status=UNAVAILABLE_NOT_CONFIRMED,
        embed_url=None,
        official_external_url="https://www.gph.gov.sa",
        official_authority="General Presidency for the Affairs of the Two Holy Mosques",
        note=(
            "Direct embed not activated: official embeddable stream URL not "
            "independently confirmed from this environment. Opens the "
            "official authority's site externally instead of embedding."
        ),
    ),
}


def get_site_status(site_id: str) -> HaramaynSite | None:
    return SITES.get(site_id)


def all_sites() -> list[dict]:
    from dataclasses import asdict
    return [asdict(SITES[k]) for k in ("makkah", "madinah")]

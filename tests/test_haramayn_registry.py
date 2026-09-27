"""A static official channel destination is never evidence of live playback."""
from domain.haramayn.registry import (
    LIVE_EMBED_ACTIVE, LIVE_EXTERNAL_ACTIVE, OFFICIAL_SOURCE_AVAILABLE,
    all_sites, get_site_status,
)


def test_registered_sources_make_no_unverified_live_claim():
    sources = all_sites()
    assert {source["site_id"] for source in sources} == {"makkah", "madinah"}
    for source in sources:
        assert source["status"] == OFFICIAL_SOURCE_AVAILABLE
        assert source["status"] not in {LIVE_EMBED_ACTIVE, LIVE_EXTERNAL_ACTIVE}
        assert source["embed_url"] is None
        assert source["official_external_url"].startswith("https://www.youtube.com/@Saudi")
        assert "24/7" not in source["note"]
        assert "not been verified" in source["note"]


def test_unknown_site_does_not_create_a_source():
    assert get_site_status("unknown") is None

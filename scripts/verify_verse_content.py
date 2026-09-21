"""
Cross-checks each entry in data/verse_content.json against the corresponding
AlQuran Cloud edition (when the same translator is available there), as a
corroboration step for curated verse quotations used directly in app UI copy
(distinct from the full-Quran-reader translation feed in
domain/quran/translation_registry.py).

This does NOT replace human scholarly review — it only catches the case
where "verified" text was mistyped, fabricated, or doesn't match any real
published translation at all.

Usage: python scripts/verify_verse_content.py
"""
import json
import sys
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VERSE_FILE = BASE_DIR / "data" / "verse_content.json"

# Maps our (language, translator name substring) -> AlQuran Cloud edition id,
# only for entries we can actually cross-check this way.
_CROSS_CHECK_EDITIONS = {
    ("uz", "Sodik"): "uz.sodik",
}


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "IslamTimeWorld-verse-check/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    entries = json.loads(VERSE_FILE.read_text(encoding="utf-8"))
    for e in entries:
        edition = None
        for (lang, name_part), ed in _CROSS_CHECK_EDITIONS.items():
            if e["language"] == lang and name_part in (e.get("translation_source") or ""):
                edition = ed
                break
        if not edition:
            print(f"SKIP {e['surah']}:{e['ayah']} ({e['language']}) — no cross-check edition mapped")
            continue
        url = f"https://api.alquran.cloud/v1/ayah/{e['surah']}:{e['ayah']}/{edition}"
        try:
            data = fetch_json(url)
        except Exception as exc:  # noqa: BLE001
            print(f"FETCH_FAILED {e['surah']}:{e['ayah']} — {exc}")
            continue
        remote_text = data.get("data", {}).get("text", "")
        print(f"--- {e['surah']}:{e['ayah']} ({edition}) ---")
        print("ours: ", e["text"])
        print("cloud:", remote_text)
        print()


if __name__ == "__main__":
    main()

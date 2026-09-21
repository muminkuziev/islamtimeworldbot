"""
Curated verse quotations used directly in app UI copy (e.g. the Qibla
screen's verse card) — distinct from the bulk per-ayah translation feed in
domain/quran/translation_registry.py. Each entry carries its own provenance
because these are hand-picked and hand-placed, not served wholesale from a
provider API.

Never fabricated: if no entry exists for a (surah, ayah, language), callers
get None back — they must not invent text to fill the gap.
"""
import json
from dataclasses import dataclass
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "verse_content.json"


@dataclass
class VerseContent:
    surah: int
    ayah: int
    language: str
    text: str
    translation_source: str | None
    source_reference: str | None
    corroboration: str | None
    verification_status: str
    version: str | None


def _load_all() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    try:
        return json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def get_verse(surah: int, ayah: int, language: str) -> VerseContent | None:
    for r in _load_all():
        if r["surah"] == surah and r["ayah"] == ayah and r["language"] == language:
            if r.get("verification_status") != "verified":
                return None  # never surface unverified curated verse text
            return VerseContent(
                surah=r["surah"], ayah=r["ayah"], language=r["language"], text=r["text"],
                translation_source=r.get("translation_source"),
                source_reference=r.get("source_reference"),
                corroboration=r.get("corroboration"),
                verification_status=r["verification_status"],
                version=r.get("version"),
            )
    return None

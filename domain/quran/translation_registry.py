"""
Verified Quran translation source registry — one real, named, provider-
published translation per canonical language (never AI-generated), each
tagged with a verification status:

  VERIFIED_USABLE       — usage terms independently confirmed by a human,
                           safe to serve to users
  LICENSE_REVIEW_REQUIRED — a real translation/source is identified, but its
                           usage terms have not been independently confirmed
                           by a human yet (an automated web-page fetch is not
                           sufficient confirmation for religious content)
  UNAVAILABLE            — no source identified at all

Source availability and license review are separate facts. All twelve named
translations are provider-published and enabled in the WebApp's provider.
The official edition catalog and terms were checked on 2026-09-27. The terms
attribute translations to rights-holder contributions or public-domain
editions and request translator attribution. This is provider evidence,
not independent legal clearance; the historical human-review status remains
LICENSE_REVIEW_REQUIRED. No source-specific withdrawal is recorded here.
"""
from dataclasses import dataclass, asdict

VERIFIED_USABLE = "VERIFIED_USABLE"
LICENSE_REVIEW_REQUIRED = "LICENSE_REVIEW_REQUIRED"
UNAVAILABLE = "UNAVAILABLE"

CANONICAL_LANGS = ["ar", "en", "id", "ur", "bn", "fr", "hi", "fa", "tr", "ru", "uz", "de", "ms"]


@dataclass
class TranslationSource:
    language: str
    provider: str
    edition: str | None
    translator: str | None
    status: str
    terms_url: str | None
    note: str
    availability: str = "provider_published"
    legal_clearance: bool = False
    translator_verification: str = "provider_metadata"
    project_attribution: str | None = None


_TERMS_URL = "https://alquran.cloud/terms-and-conditions"
_PENDING_NOTE = (
    "Edition listed in the official Al-Quran Cloud catalog (checked 2026-09-27). "
    "Provider terms request named translator attribution; served with edition "
    "and source metadata. Independent legal clearance is not claimed."
)

REGISTRY: dict[str, TranslationSource] = {
    "ar": TranslationSource("ar", "canonical Arabic (Uthmani)", None, None, VERIFIED_USABLE, None,
                             "The Quran's own Arabic text — not a translation, no license question."),
    "en": TranslationSource("en", "Al-Quran Cloud (api.alquran.cloud)", "en.asad", "Muhammad Asad",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "ru": TranslationSource("ru", "Al-Quran Cloud (api.alquran.cloud)", "ru.kuliev", "Elmir Kuliev",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "uz": TranslationSource("uz", "Al-Quran Cloud (api.alquran.cloud)", "uz.sodik", "Muhammad Sodik Muhammad Yusuf",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "tr": TranslationSource("tr", "Al-Quran Cloud (api.alquran.cloud)", "tr.diyanet", "Diyanet İşleri Başkanlığı",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "fr": TranslationSource("fr", "Al-Quran Cloud (api.alquran.cloud)", "fr.hamidullah", "Muhammad Hamidullah",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "de": TranslationSource("de", "Al-Quran Cloud (api.alquran.cloud)", "de.bubenheim", "Bubenheim & Elyas",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "id": TranslationSource("id", "Al-Quran Cloud (api.alquran.cloud)", "id.indonesian",
                             None, LICENSE_REVIEW_REQUIRED, _TERMS_URL,
                             _PENDING_NOTE + " The provider catalog names the translator Unknown; the existing project attribution is unconfirmed.",
                             translator_verification="unconfirmed_project_attribution",
                             project_attribution="Kementerian Agama Republik Indonesia"),
    "ur": TranslationSource("ur", "Al-Quran Cloud (api.alquran.cloud)", "ur.jalandhry", "Fateh Muhammad Jalandhry",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "hi": TranslationSource("hi", "Al-Quran Cloud (api.alquran.cloud)", "hi.hindi",
                             "Suhel Farooq Khan & Saifur Rahman Nadwi", LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "bn": TranslationSource("bn", "Al-Quran Cloud (api.alquran.cloud)", "bn.bengali", "Muhiuddin Khan",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "fa": TranslationSource("fa", "Al-Quran Cloud (api.alquran.cloud)", "fa.makarem", "Naser Makarem Shirazi",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
    "ms": TranslationSource("ms", "Al-Quran Cloud (api.alquran.cloud)", "ms.basmeih", "Abdullah Muhammad Basmeih",
                             LICENSE_REVIEW_REQUIRED, _TERMS_URL, _PENDING_NOTE),
}


def get_translation_source(language: str) -> TranslationSource:
    return REGISTRY.get(language) or TranslationSource(
        language, "none", None, None, UNAVAILABLE, None, "No source identified for this language.",
        availability="unavailable",
    )


def all_sources() -> list[dict]:
    return [asdict(REGISTRY[l]) for l in CANONICAL_LANGS if l in REGISTRY]

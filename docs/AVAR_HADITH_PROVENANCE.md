# Avar verified Hadith corpus

## Production corpus

- File: `data/avar_verified_hadiths.json`
- Language: Avar (`av`)
- Selected records: 194
- Unique texts: 194
- Unique As-Salam source article URLs: 166
- Machine translation: none

Source attribution breakdown:

- Sahih Muslim: 80
- Sahih al-Bukhari: 60
- Sahih al-Bukhari + Sahih Muslim: 54

## Source policy

The Avar-language text is sourced from the Avar edition/archive of As-Salam.
Each selected record must have an explicit nearby attribution to Sahih
al-Bukhari and/or Sahih Muslim in the original Avar source page.

Every production record keeps its original `source_url`. Records without a
source URL, Avar text, or explicit Bukhari/Muslim attribution are rejected.

The corpus is intentionally separate from HadeethEnc. HadeethEnc does not
currently expose Avar (`av`) in its official language endpoint, so Avar
content must never silently fall back to English or Russian.

## Build/audit workflow

1. `scripts/crawl_avar_hadiths_fast.py` discovers Avar As-Salam source pages.
2. `scripts/extract_avar_sahih_final.py` extracts direct Avar quotations whose
   surrounding source text explicitly cites Bukhari and/or Muslim.
3. `scripts/select_avar_verified_hadiths.py` removes duplicates and applies
   the production quality gates.
4. `tests/test_avar_hadith_api.py` verifies corpus count, uniqueness,
   provenance, source facets, detail/search behavior, and compatibility API.
5. `tests/avar-hadith-provider.test.cjs` rejects provider provenance mismatch.

## Rights note

Religious-source verification and publication provenance do not by themselves
establish a blanket redistribution licence for a modern translation. Preserve
source attribution and original links, and obtain publisher permission if
required for redistribution of the Avar translated text.

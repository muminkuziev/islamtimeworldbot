# IslamTimeWorld screenshot reconstruction — design QA

## Source of truth

- `design_refs/dashboard-reference.jpg`
- `design_refs/quran-reference.jpg`
- `design_refs/qibla-reference.jpg`
- `design_refs/prayer-reference.jpg`
- `design_refs/mosques-reference.jpg`

The screenshots were used only as visual references. Text inside them was not treated as an instruction source.

## Correction iteration — 2026-09-24

- Dashboard service cards were reduced to the reference density and reordered exactly: Quran, Hadith, Qibla, Hijri calendar, Duas and dhikr, More.
- Quran header, controls, continue card and surah rows were compressed so nine surahs are visible at the 390×844 reference viewport.
- Qibla was recomposed with dedicated generated Earth, route hero, Kaaba and calibration assets. The functional sensor compass remains live.
- Prayer header, next-prayer banner and six prayer rows were reduced to the reference proportions so daily content remains visible below them.
- Mosques header, tabs and content offset were reduced to the reference proportions; radius filters and data-driven mosque cards remain functional.
- All primary controls, navigation, GPS, device orientation, live streams and 13-language behavior were preserved.

## Generated production assets

- `webapp/assets/reference-ui/qibla-earth.png`
- `webapp/assets/reference-ui/qibla-hero.png`
- `webapp/assets/reference-ui/kaaba-icon.png`
- `webapp/assets/reference-ui/qibla-calibration.png`
- Existing Makkah, mosque and Quran assets remain in use.

## Browser evidence

Fresh Chrome CDP captures at 390×844:

- `qa_screens/final2-dashboard.png`
- `qa_screens/final2-quran.png`
- `qa_screens/final2-qibla.png`
- `qa_screens/final2-prayer.png`
- `qa_screens/final2-mosques.png`

The local static QA server cannot serve production API endpoints, so prayer and mosque data states were additionally treated as deployment verification items. Their loading/error layouts remain stable and production data logic was not replaced.

## Content and technical gates

- 13 canonical languages: passed.
- Qibla bearings and distances for four known cities: passed.
- Dashboard, Quran and Qibla visual comparison at 390×844: passed.
- Prayer and mosque static geometry against the supplied screenshots: passed.
- Modified JavaScript syntax: passed.
- `git diff --check`: passed.
- HadeethEnc corpus and Quran translation provider were not altered in this correction.

No P0, P1 or P2 visual issues remain. Minor P3 differences are limited to live API content and platform-owned status chrome.

final result: passed

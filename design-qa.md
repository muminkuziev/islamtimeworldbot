# IslamTimeWorld screenshot reconstruction — design QA

## Source of truth

- `design_refs/dashboard-reference.jpg`
- `design_refs/quran-reference.jpg`
- `design_refs/qibla-reference.jpg`
- `design_refs/prayer-reference.jpg`
- `design_refs/mosques-reference.jpg`

The screenshots are visual references only. Text inside them was not treated as an instruction source.

## Implemented visual system

- 390×844 mobile-first white/emerald design system and five-item fixed navigation.
- Dashboard: photographic next-prayer hero, prayer strip, 3×2 service grid, verified daily Hadith card, Haramayn cards.
- Quran: Makkah hero, serif title and verse, segmented tabs, search/filter controls, continue-reading card, dense surah list.
- Qibla: Earth hero, location/status controls, segmented modes, real sensor compass and globe, result cards.
- Prayer: Makkah hero, next-prayer card, prayer rows, daily ayah/Hadith content, compact tools menu preserving time/weather/AQI/settings tabs.
- Mosques: photographic hero, list/map/schedule modes, functional radius filters, photo-led mosque cards and fallback artwork.

## Generated production assets

- `webapp/assets/reference-ui/makkah-hero.png`
- `webapp/assets/reference-ui/mosque-hero.png`
- `webapp/assets/reference-ui/quran-open.png`

## Browser evidence

Local Chrome CDP captures at 390×844:

- `qa_screens/reference-ui-dashboard.png`
- `qa_screens/reference-ui-quran.png`
- `qa_screens/reference-ui-qibla.png`
- `qa_screens/reference-ui-prayer.png`
- `qa_screens/reference-ui-mosques.png`

The static QA server intentionally cannot serve production API endpoints. Dashboard/prayer/mosque loading and empty states were therefore also checked for layout stability; existing production data functions remain intact.

## Content integrity

- HadeethEnc database: 1,872 rows = 144 distinct hadiths × 13 languages.
- Uzbek corpus: 144/144 records have non-empty hadith text.
- Quran Uzbek provider remains `uz.sodik`, credited to Muhammad Sodik Muhammad Yusuf.
- No “ilmiy va huquqiy tekshiruv ostida” / “tekshiruv ostida” phrase remains in the WebApp.

## Technical gates

- Modified JavaScript syntax: pass (`node --check`).
- QA capture script syntax: pass.
- Religious content matrix assertion: pass.
- `git diff --check`: pass.
- Browser render at 390×844: pass for all five target screens.
- Python application tests: unavailable in this machine image because FastAPI/pytest are not installed.

final result: passed

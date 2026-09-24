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

## Extended secondary-screen QA (2026-09-24)

- Hadith, Duas, Dhikr, Hijri Calendar, 99 Names, More, Shahodat, Haramayn, Settings, Qazo and Monthly Calendar now use the same photo-led header, serif display type, emerald controls and rounded white-card system.
- Qibla was recomposed against `design_refs/qibla-reference.jpg`: Earth backdrop, large functional compass, status panel, result cards, calibration guidance, settings shortcut and Masjid al-Haram link.
- Existing GPS, device-orientation, map, distance, settings, content and live-stream functions were preserved.
- Browser render at 390x844: passed for all 12 secondary screens (`qa_screens/all-pages-*.png`).
- Canonical language audit: passed for all 13 product languages.
- Arabic RTL visual QA: passed for Qibla, More and Settings (`qa_screens/rtl-*.png`).
- Qibla geographic audit: passed for Warsaw, London, New York and Jakarta bearings/distances.
- JavaScript syntax and `git diff --check`: passed.
- Python pytest suite remains unavailable in this machine image because pytest is not installed.

final result: passed

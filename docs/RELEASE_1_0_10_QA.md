# IslamTimeWorld 1.0.10 — Theme, language and haptics corrections

Date: 2026-10-10. Android package: com.islamtimeworld.app, versionName 1.0.10, versionCode 11.

## Fixed
- Day mode: prayer times details, weather and AQI now use a light surface and readable dark text instead of dark backgrounds with dark text.
- Night mode: weather/AQI legacy inline text colors remapped to accessible pale text on dark surfaces. Card styling is preserved.
- Names of Allah: photo overlay now has a dark scrim; header Quran verse uses bright lettering and sufficient space to avoid overlap with the search field.
- Dhikr: vibration toggle uses Capacitor Haptics on native Android/iOS, Telegram WebApp haptics in Telegram and navigator.vibrate as browser fallback; disabled preference suppresses tap/reset vibration, enabling gives immediate feedback. Physical motor behavior remains subject to Android vibration settings.
- Product language count: 15 selectable product languages (13 core + Chechen + Avar) are shown consistently across the WebApp and the multi-language website; 4 legacy preferences remain supported. Hadith/Quran sources do not automatically become available in all 15 languages; maintain accurate source notices.
- App, service worker and landing cache versions updated; old version label replaced with 1.0.10.

## QA evidence
- Python pytest: 153/153 PASS in isolated QA mode.
- JavaScript Node: 107/107 PASS, including six language/theme/haptic regression tests.
- Browser mock QA: day and night weather/AQI, Names verse not overlapping search field, 15 languages present, and vibration enabled/off/on behavior PASS.
- npm production-dependency vulnerability audit: zero vulnerabilities.
- Android release AAB/APK, signing and lint must be individually verified in this worktree before release.
- No true Telegram-bot delivery and no Play Console submission is included in automated smoke testing.

## Open items before public Google Play listing
- Google Play Console account is not yet created; developer verification, store listing, Internal Testing and closed test prerequisites remain.
- Real-device physical vibration should be confirmed on representative Android phones; test automation verifies API invocation, not the motor itself.
- Nearby mosque API on public Overpass instances is intermittently unavailable. The existing client fallback reduces impact but does not guarantee results. Do not assert universal availability.
- Telegram token previously exposed via health endpoint should be rotated by the owner; new webhook secret should be configured in production if not already.
- FCM remote push requires correct Firebase provisioning and device tests.
- iOS requires Xcode/macOS signing and TestFlight before App Store availability.

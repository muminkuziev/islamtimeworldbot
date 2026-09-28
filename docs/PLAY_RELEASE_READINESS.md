# IslamTimeWorld — Google Play Release Readiness

Date: 2026-09-28
Production package: `com.islamtimeworld.app`
Release candidate: `1.0.6` (versionCode 7)
Source baseline before Play hardening: `49acc29`

## Release status

**Technical Android release gate: PASS.**
The production AAB builds, is signed, targets API 36, and contains the current WebApp assets.

Artifact:
`artifacts/android/IslamTimeWorld-1.0.6-play-api36.aab`

- Size: 22,896,112 bytes
- SHA-256: `9898A4EC680B8C47182970C77D61B1BAC07CD5F696EF2F5580ED14FF675D9021`
- Signing certificate SHA-256:
  `81:54:10:21:83:30:DD:F2:14:07:49:AD:EC:E5:F8:EC:F3:E1:CD:35:FA:D1:88:57:60:3B:7F:EB:E6:8C:CC:DB`
- Standard `jarsigner -verify`: PASS (exit 0)
- Certificate validity: 2026-06-21 through 2053-11-06
## Android toolchain

- compileSdk: 36
- targetSdk: 36
- minSdk: 24
- Android Gradle Plugin: 8.10.1
- Gradle: 8.11.1
- JDK: 17
- Android platform 36 installed locally
- Android build-tools 36.0.0 installed locally

The project no longer uses the obsolete
`android.suppressUnsupportedCompileSdk=35` workaround.

Release WebView debugging is disabled:
- Capacitor config: `webContentsDebuggingEnabled=false`
- MainActivity also enforces `WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)`

## Build and test evidence

Web regression:
`node --test tests/dashboard-hadith.test.cjs tests/theme.test.cjs tests/service-worker.test.cjs`
Result: **25/25 PASS**.

Capacitor Android sync: PASS.
Current WebApp source comparison:
- source files: 125
- missing in packaged public assets: 0
- SHA-256 mismatches: 0
Android release gate:
`gradlew --no-daemon :app:testReleaseUnitTest :app:lintRelease :app:bundleRelease`
Result: **BUILD SUCCESSFUL**.

Android Lint:
- errors: 0
- warnings: 14
- no lint baseline or suppression was added to hide errors

Production dependency audit:
`npm audit --omit=dev --json`
Result: **0 vulnerabilities** (critical/high/moderate/low all zero).

## Manifest verification

Final bundle manifest confirms:
- package: `com.islamtimeworld.app`
- versionCode: 7
- versionName: 1.0.6
- targetSdkVersion: 36
- minSdkVersion: 24
- no `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission

Explicit app permissions:
- INTERNET
- ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION
- POST_NOTIFICATIONS
- VIBRATE
- ACCESS_NETWORK_STATE
- RECEIVE_BOOT_COMPLETED
Firebase/Android libraries also merge the normal FCM permissions such as
WAKE_LOCK and `com.google.android.c2dm.permission.RECEIVE`.

Permission purposes:
- Location: prayer calculations, Qibla/location-aware functionality, nearby mosques.
- Notifications/vibration/boot: prayer/reminder notification scheduling and restoration.
- Network: online APIs and content.
- No battery-optimization exemption permission is requested.

## Privacy / policy preparation

Public endpoints verified HTTP 200:
- `https://islamtimeworld.com/privacy`
- `https://islamtimeworld.com/terms`

The privacy policy discloses location use, Telegram WebApp data where applicable,
Firebase device token use, request logs, third-party services, retention and
user controls.

No advertising SDK or account/password creation flow was found in the current
project scan.

See:
- `docs/PLAY_DATA_SAFETY_DRAFT.md`
- `docs/PLAY_STORE_LISTING.md`

## Remaining non-blocking technical warnings

Lint still reports 14 warnings. The important visible ones are:
- adaptive launcher icon has no Android 13 monochrome layer;
- splash bitmap density consistency warnings;
- several generated/legacy resources are unused;
- a newer Gradle release exists, but 8.11.1 is deliberately paired with AGP 8.10.1 for this migration.

These do not block the release build, but themed-icon and splash cleanup can be
done as polish before public launch.
## Play Console manual gates

These cannot be truthfully completed from source code alone and must be
confirmed in the Play Console before Production rollout:

- Enroll/use Play App Signing and verify the expected upload certificate.
- Upload the AAB first to Internal testing.
- Review Play automated pre-launch report for crashes, ANRs, accessibility and device compatibility.
- Complete Data safety using the prepared draft and actual production backend behavior.
- Add the public privacy-policy URL.
- Complete Ads declaration (current code scan indicates no ads SDK).
- Complete App access declaration.
- Complete Target audience and content declaration.
- Complete IARC content-rating questionnaire.
- Confirm category and store-listing copy/screenshots.
- Confirm countries/regions, pricing and distribution settings.
- Review Data deletion requirement if account creation is added later.

No Play Console upload or production publication was performed during this preparation.
No real-user notification was sent during QA.

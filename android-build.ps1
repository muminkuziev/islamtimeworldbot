# ================================================================
# Islam Time World — Android Build Script
# Ishlatish:  .\android-build.ps1
# Parametrlar:
#   -Init      : birinchi marta setup (cap add android)
#   -Sync      : faqat cap sync (kod o'zgarganda)
#   -Open      : Android Studio ochish
#   -Icons     : ikonkalar generatsiya (@capacitor/assets)
# ================================================================

param(
  [switch]$Init,
  [switch]$Sync,
  [switch]$Open,
  [switch]$Icons,
  [switch]$All    # hammasi ketma-ket
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Off

function Write-Step { param($n, $text) Write-Host "`n[$n] $text" -ForegroundColor Cyan }
function Write-Ok   { param($text) Write-Host "    OK  $text" -ForegroundColor Green }
function Write-Warn { param($text) Write-Host "    !   $text" -ForegroundColor Yellow }
function Write-Err  { param($text) Write-Host "    ERR $text" -ForegroundColor Red }
function Confirm-Continue { param($msg)
  Write-Warn $msg
  $a = Read-Host "    Davom etaymi? (y/n)"
  if ($a -ne 'y') { exit 0 }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║      Islam Time World — Android Build     ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ── Mode select ────────────────────────────────────────────
if (-not ($Init -or $Sync -or $Open -or $Icons -or $All)) {
  Write-Host "Rejim tanlang:" -ForegroundColor White
  Write-Host "  1) Birinchi marta setup  (-Init)" -ForegroundColor Gray
  Write-Host "  2) Sync (kod o'zganda)   (-Sync)" -ForegroundColor Gray
  Write-Host "  3) Studio ochish         (-Open)" -ForegroundColor Gray
  Write-Host "  4) Ikonkalar generatsiya (-Icons)" -ForegroundColor Gray
  Write-Host "  5) Hammasi               (-All)" -ForegroundColor Gray
  Write-Host ""
  $choice = Read-Host "Tanlang (1-5)"
  switch ($choice) {
    "1" { $Init  = $true }
    "2" { $Sync  = $true }
    "3" { $Open  = $true }
    "4" { $Icons = $true }
    "5" { $All   = $true }
    default { Write-Err "Noto'g'ri tanlov"; exit 1 }
  }
}

if ($All) { $Init = $true; $Icons = $true; $Sync = $true; $Open = $true }

# ── 0. Prerequisites ────────────────────────────────────────
Write-Step "0" "Talablar tekshirilmoqda..."

$ok = $true
try   { $v = (node --version 2>&1); Write-Ok "Node.js $v" }
catch { Write-Err "Node.js topilmadi → https://nodejs.org (v18+)"; $ok = $false }

try   { $v = (java -version 2>&1)[0]; Write-Ok "Java: $v" }
catch { Write-Err "Java JDK topilmadi → https://adoptium.net (JDK 17)"; $ok = $false }

if (-not $ok) {
  Write-Host "`n  Prerequisites o'rnatilgandan keyin qayta ishga tushiring." -ForegroundColor Red
  exit 1
}

# ── 1. npm install ──────────────────────────────────────────
if ($Init -or -not (Test-Path "node_modules")) {
  Write-Step "1" "npm install..."
  npm install
  if ($LASTEXITCODE -ne 0) { Write-Err "npm install xato"; exit 1 }
  Write-Ok "Dependencies o'rnatildi"
}

# ── 2. Ikonkalar generatsiya ───────────────────────────────
if ($Icons) {
  Write-Step "2" "Ikonkalar generatsiya (@capacitor/assets)..."

  $iconSrc = "resources\icon.png"
  $splashSrc = "resources\splash.png"

  if (-not (Test-Path "resources")) {
    New-Item -ItemType Directory -Force -Path "resources" | Out-Null
  }

  if (-not (Test-Path $iconSrc)) {
    Write-Warn "resources\icon.png topilmadi (1024x1024 PNG kerak)"
    Write-Host ""
    Write-Host "    Ikonka yaratish yo'li:" -ForegroundColor White
    Write-Host "    1. logo.svg → 1024x1024 PNG: https://cloudconvert.com/svg-to-png" -ForegroundColor Gray
    Write-Host "    2. Faylni resources\icon.png ga saqlang" -ForegroundColor Gray
    Write-Host "    3. resources\splash.png (2732x2732, markazda logo) tayyorlang" -ForegroundColor Gray
    Write-Host "    4. .\android-build.ps1 -Icons qayta ishga tushiring" -ForegroundColor Gray
    Write-Host ""
    Confirm-Continue "Ikonkasiz davom etasizmi?"
  } else {
    if (-not (Test-Path $splashSrc)) {
      Write-Warn "resources\splash.png topilmadi — faqat ikonkalar generatsiya qilinadi"
    }
    npx @capacitor/assets generate --iconBackgroundColor '#080D1A' --splashBackgroundColor '#080D1A'
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Ikonkalar generatsiya qilindi"
    } else {
      Write-Warn "Ikonka generatsiya xato — qo'lda qo'shish kerak"
    }
  }
}

# ── 3. Android platform ────────────────────────────────────
if ($Init) {
  Write-Step "3" "Android platform qo'shilmoqda..."
  if (Test-Path "android") {
    Write-Ok "Android platform allaqachon mavjud"
  } else {
    npx cap add android
    if ($LASTEXITCODE -ne 0) { Write-Err "cap add android xato"; exit 1 }
    Write-Ok "Android platform qo'shildi"

    # Deep Link intent filter patch
    Write-Step "3b" "Deep Link intent filter qo'shilmoqda..."
    $manifest = "android\app\src\main\AndroidManifest.xml"
    if (Test-Path $manifest) {
      $content = Get-Content $manifest -Raw
      if ($content -notmatch 'islamtimeworld') {
        $deeplink = @'

        <!-- Deep Links: islamtimeworld://screen/prayer -->
        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="islamtimeworld" />
        </intent-filter>
        <!-- HTTPS Deep Links: https://islamtimeworld.com/app/... -->
        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" android:host="islamtimeworld.com" android:pathPrefix="/app" />
        </intent-filter>
'@
        $content = $content -replace '(<activity[^>]+>)', "`$1$deeplink"
        $content | Out-File $manifest -Encoding utf8 -NoNewline
        Write-Ok "Deep Link intent filter qo'shildi"
      }
    }

    # google-services.json tekshirish
    if (-not (Test-Path "android\app\google-services.json")) {
      Write-Host ""
      Write-Warn "google-services.json topilmadi!"
      Write-Host "    Push Notifications uchun Firebase loyiha kerak:" -ForegroundColor White
      Write-Host "    1. https://console.firebase.google.com → Yangi loyiha" -ForegroundColor Gray
      Write-Host "    2. Android ilova qo'shing: com.islamtimeworld.app" -ForegroundColor Gray
      Write-Host "    3. google-services.json yuklab android\app\ ga joylashtiring" -ForegroundColor Gray
      Write-Host "    4. Render ga FIREBASE_SERVER_KEY env var qo'shing" -ForegroundColor Gray
      Write-Host ""
    }
  }
}

# ── 4. Sync ────────────────────────────────────────────────
if ($Sync -or $Init) {
  Write-Step "4" "cap sync android..."
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { Write-Err "cap sync xato"; exit 1 }
  Write-Ok "Sync tugadi"
}

# ── 5. Android Studio ──────────────────────────────────────
if ($Open) {
  Write-Step "5" "Android Studio ochilmoqda..."
  npx cap open android
}

# ── Done ───────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Tayyor!                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if ($Open -or $Init) {
  Write-Host "  Android Studio'da APK/AAB olish:" -ForegroundColor White
  Write-Host "    Build → Generate Signed App Bundle / APK" -ForegroundColor Gray
  Write-Host "    → Release APK yoki AAB (Play Store uchun AAB)" -ForegroundColor Gray
  Write-Host "    → Keystore yarating yoki mavjudini tanlang" -ForegroundColor Gray
  Write-Host ""
  Write-Host "  Signing keystore SHA-256 fingerprint:" -ForegroundColor White
  Write-Host "    keytool -list -v -keystore android\app\release.keystore" -ForegroundColor Gray
  Write-Host ""
  Write-Host "  Render env vars:" -ForegroundColor White
  Write-Host "    TWA_SHA256_FINGERPRINT = <keytool dan olingan SHA256>" -ForegroundColor Gray
  Write-Host "    TWA_PACKAGE_NAME       = com.islamtimeworld.app" -ForegroundColor Gray
  Write-Host "    FIREBASE_SERVER_KEY    = <Firebase Console → Project Settings → Cloud Messaging>" -ForegroundColor Gray
}
Write-Host ""

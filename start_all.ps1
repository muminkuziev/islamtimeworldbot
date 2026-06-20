# IslamTimeWorldBot - One-click startup (PowerShell 5.1)
# Architecture: cloudflared -> update .env -> server.py (WebApp + bot via webhook)
# server.py handles BOTH WebApp files AND Telegram commands via cloudflare webhook

$ErrorActionPreference = "Continue"
$env:PYTHONIOENCODING = "utf-8"
$ROOT    = $PSScriptRoot
$CF      = "$ROOT\scripts\cloudflared.exe"
$CF_LOG  = "$env:TEMP\cf_tunnel.log"
$SRV_OUT = "$ROOT\server_out.txt"
$SRV_ERR = "$ROOT\server_err.txt"

# Original production values to restore on exit
$PROD_WEBAPP_URL    = "https://islamtimeworld.com/app"
$PROD_WEBHOOK_BASE  = "https://islamtimeworldbot-dbup.onrender.com"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  IslamTimeWorldBot - Starting..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Kill old processes ---
Write-Host "1. Stopping old processes..." -ForegroundColor Yellow
Get-Process python      -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800

# Wait for port 8080 to free up
$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
    $inUse = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
    if (-not $inUse) { break }
    Start-Sleep -Milliseconds 300
}

# --- 2. Start cloudflared FIRST ---
Write-Host "2. Starting HTTPS tunnel..." -ForegroundColor Yellow

if (-not (Test-Path $CF)) {
    Write-Host "   ERROR: Not found: $CF" -ForegroundColor Red
    exit 1
}

Remove-Item $CF_LOG -ErrorAction SilentlyContinue

$cfArgs = @{
    FilePath              = $CF
    ArgumentList          = "tunnel --url http://localhost:8080 --protocol http2 --no-autoupdate"
    RedirectStandardError = $CF_LOG
    WindowStyle           = "Hidden"
}
Start-Process @cfArgs

Write-Host "   Waiting for tunnel URL (up to 30s)..." -ForegroundColor Gray

$HTTPS_URL = $null
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    $lines = Get-Content $CF_LOG -ErrorAction SilentlyContinue
    if ($lines) {
        foreach ($ln in $lines) {
            if ($ln -match "(https://[a-zA-Z0-9\-]+\.trycloudflare\.com)") {
                $HTTPS_URL = $Matches[1]
                break
            }
        }
    }
    if ($HTTPS_URL) { break }
}

if (-not $HTTPS_URL) {
    Write-Host "   ERROR: Tunnel URL not found after 30s" -ForegroundColor Red
    Get-Content $CF_LOG -Tail 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "   $_" }
    exit 1
}
Write-Host "   Tunnel: $HTTPS_URL" -ForegroundColor Green

# --- 3. Update .env: WEBAPP_URL + WEBHOOK_BASE + LOCAL_WEBHOOK ---
Write-Host "3. Updating .env for local webhook mode..." -ForegroundColor Yellow

$envFile = "$ROOT\.env"
if (Test-Path $envFile) {
    $envText = Get-Content $envFile -Raw

    # WEBAPP_URL - WebApp button URL (with /app suffix)
    if ($envText -match "WEBAPP_URL=") {
        $envText = $envText -replace "(?m)^WEBAPP_URL=.*$", "WEBAPP_URL=$HTTPS_URL/app"
    } else {
        $envText = $envText.TrimEnd() + "`nWEBAPP_URL=$HTTPS_URL/app`n"
    }

    # WEBHOOK_BASE - server.py uses this to set Telegram webhook
    if ($envText -match "WEBHOOK_BASE=") {
        $envText = $envText -replace "(?m)^WEBHOOK_BASE=.*$", "WEBHOOK_BASE=$HTTPS_URL"
    } else {
        $envText = $envText.TrimEnd() + "`nWEBHOOK_BASE=$HTTPS_URL`n"
    }

    # LOCAL_WEBHOOK - activates bot handlers in server.py (same as RENDER=true)
    if ($envText -match "LOCAL_WEBHOOK=") {
        $envText = $envText -replace "(?m)^LOCAL_WEBHOOK=.*$", "LOCAL_WEBHOOK=true"
    } else {
        $envText = $envText.TrimEnd() + "`nLOCAL_WEBHOOK=true`n"
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, $envText, $utf8NoBom)
}
Write-Host "   WEBAPP_URL    = $HTTPS_URL/app" -ForegroundColor Green
Write-Host "   WEBHOOK_BASE  = $HTTPS_URL" -ForegroundColor Green
Write-Host "   LOCAL_WEBHOOK = true" -ForegroundColor Green

# --- 4. Start FastAPI server (reads .env -> activates bot webhook + WebApp) ---
Write-Host "4. Starting FastAPI server..." -ForegroundColor Yellow

$srvArgs = @{
    FilePath               = "python"
    ArgumentList           = "-u server.py"
    WorkingDirectory       = $ROOT
    RedirectStandardOutput = $SRV_OUT
    RedirectStandardError  = $SRV_ERR
    WindowStyle            = "Hidden"
}
Start-Process @srvArgs
Start-Sleep -Seconds 6

try {
    $check = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "   Server OK ($($check.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Server FAILED - check server_err.txt" -ForegroundColor Red
    Get-Content $SRV_ERR -Tail 8 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "   $_" }
    exit 1
}

# --- 5. Check webhook was registered by server.py ---
Write-Host "5. Checking Telegram webhook..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$srvLog = Get-Content $SRV_OUT -Raw -ErrorAction SilentlyContinue
if ($srvLog -match "webhook set OK") {
    Write-Host "   Webhook set OK" -ForegroundColor Green
} elseif ($srvLog -match "ADMIN HANDLERS LOADED") {
    Write-Host "   Bot handlers loaded OK" -ForegroundColor Green
} else {
    Write-Host "   WARNING: Webhook status unknown - check server_out.txt" -ForegroundColor Yellow
    $srvLog -split "`n" | Select-Object -Last 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

# --- 6. Verify endpoints via Cloudflare ---
Write-Host ""
Write-Host "6. Verifying endpoints..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$allOK = $true

$tests = @(
    @{ url = "$HTTPS_URL/";      label = "Landing page" }
    @{ url = "$HTTPS_URL/app";   label = "WebApp (/app)" }
    @{ url = "$HTTPS_URL/health"; label = "Health check" }
)

foreach ($t in $tests) {
    try {
        $resp = Invoke-WebRequest -Uri $t.url -UseBasicParsing -TimeoutSec 15
        Write-Host ("   {0} OK ({1})" -f $t.label, $resp.StatusCode) -ForegroundColor Green
    } catch {
        Write-Host ("   {0} FAILED: {1}" -f $t.label, $_.Exception.Message) -ForegroundColor Red
        $allOK = $false
    }
}

# --- Summary ---
Write-Host ""
if ($allOK) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  ALL SYSTEMS RUNNING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  WebApp  : $HTTPS_URL/app" -ForegroundColor Cyan
    Write-Host "  Webhook : $HTTPS_URL/webhook/..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Telegram da /start yuboring - ishlaydi!" -ForegroundColor White
    Write-Host ""
    Write-Host "  Loglar  : server_out.txt / server_err.txt" -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "  Started with issues - see above" -ForegroundColor Yellow
    Write-Host "  WebApp : $HTTPS_URL/app" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to stop all processes..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# --- Cleanup: kill processes ---
Get-Process python      -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# --- Restore Telegram webhook to production Render URL ---
Write-Host "Restoring Telegram webhook to production..." -ForegroundColor Yellow
$BOT_TOKEN_VAL = (Get-Content $envFile -Raw) -replace "(?s).*BOT_TOKEN=([^\r\n]+).*", '$1'
if ($BOT_TOKEN_VAL -and $BOT_TOKEN_VAL -match "^[0-9]+:") {
    $PROD_WEBHOOK_URL = "$PROD_WEBHOOK_BASE/webhook/$BOT_TOKEN_VAL"
    try {
        $wh = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BOT_TOKEN_VAL/setWebhook?url=$PROD_WEBHOOK_URL" -UseBasicParsing -TimeoutSec 10
        Write-Host "   Webhook restored: $PROD_WEBHOOK_BASE/webhook/..." -ForegroundColor Green
    } catch {
        Write-Host "   WARNING: Could not restore webhook: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# --- Restore .env to production values ---
Write-Host "Restoring .env to production values..." -ForegroundColor Yellow
if (Test-Path $envFile) {
    $envText = Get-Content $envFile -Raw
    $envText = $envText -replace "(?m)^WEBAPP_URL=.*$",   "WEBAPP_URL=$PROD_WEBAPP_URL"
    $envText = $envText -replace "(?m)^WEBHOOK_BASE=.*$", "WEBHOOK_BASE=$PROD_WEBHOOK_BASE"
    $envText = $envText -replace "(?m)^LOCAL_WEBHOOK=.*$","LOCAL_WEBHOOK=false"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, $envText, $utf8NoBom)
    Write-Host ".env restored." -ForegroundColor Green
}

Write-Host "Stopped."

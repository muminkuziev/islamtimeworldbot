# IslamTimeWorldBot - One-click startup (PowerShell 5.1)

$ErrorActionPreference = "Continue"
$env:PYTHONIOENCODING = "utf-8"
$ROOT    = $PSScriptRoot
$CF      = "$ROOT\scripts\cloudflared.exe"
$CF_LOG  = "$env:TEMP\cf_tunnel.log"
$SRV_OUT = "$ROOT\server_run.log"
$SRV_ERR = "$ROOT\server_err.log"
$BOT_OUT = "$ROOT\bot_run.log"
$BOT_ERR = "$ROOT\bot_err.log"

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

# --- 2. Start FastAPI server ---
Write-Host "2. Starting FastAPI server (port 8080)..." -ForegroundColor Yellow

$srvArgs = @{
    FilePath               = "python"
    ArgumentList           = "-u server.py"
    WorkingDirectory       = $ROOT
    RedirectStandardOutput = $SRV_OUT
    RedirectStandardError  = $SRV_ERR
    WindowStyle            = "Hidden"
}
Start-Process @srvArgs
Start-Sleep -Seconds 4

try {
    $check = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Server OK ($($check.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Server FAILED - check server_err.log" -ForegroundColor Red
    Get-Content $SRV_ERR -Tail 8 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "   $_" }
    exit 1
}

# --- 3. Start cloudflared tunnel ---
Write-Host "3. Starting HTTPS tunnel..." -ForegroundColor Yellow

if (-not (Test-Path $CF)) {
    Write-Host "   ERROR: Not found: $CF" -ForegroundColor Red
    exit 1
}

Remove-Item $CF_LOG -ErrorAction SilentlyContinue

$cfArgs = @{
    FilePath              = $CF
    ArgumentList          = "tunnel --url http://localhost:8080"
    RedirectStandardError = $CF_LOG
    WindowStyle           = "Hidden"
}
Start-Process @cfArgs

Write-Host "   Waiting for tunnel URL (up to 30s)..." -ForegroundColor Gray

# --- 4. Extract tunnel URL (poll up to 30s) ---
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

# --- 5. Update .env with new WEBAPP_URL ---
Write-Host "4. Updating .env..." -ForegroundColor Yellow

$envFile = "$ROOT\.env"
if (Test-Path $envFile) {
    $envText = Get-Content $envFile -Raw
    if ($envText -match "WEBAPP_URL=") {
        $envText = $envText -replace "(?m)^WEBAPP_URL=.*$", "WEBAPP_URL=$HTTPS_URL"
    } else {
        $envText = $envText.TrimEnd() + "`nWEBAPP_URL=$HTTPS_URL`n"
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, $envText, $utf8NoBom)
} else {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, "WEBAPP_URL=$HTTPS_URL`n", $utf8NoBom)
}
Write-Host "   WEBAPP_URL=$HTTPS_URL" -ForegroundColor Green

# --- 6. Start bot ---
Write-Host "5. Starting Telegram bot..." -ForegroundColor Yellow

$botArgs = @{
    FilePath               = "python"
    ArgumentList           = "-u bot.py"
    WorkingDirectory       = $ROOT
    RedirectStandardOutput = $BOT_OUT
    RedirectStandardError  = $BOT_ERR
    WindowStyle            = "Hidden"
}
Start-Process @botArgs
Start-Sleep -Seconds 4

$botErrLines = Get-Content $BOT_ERR -Tail 3 -ErrorAction SilentlyContinue
$botErrText  = if ($botErrLines) { $botErrLines -join " " } else { "" }
if ($botErrText -match "Error|Traceback|ImportError") {
    Write-Host "   Bot WARNING - check bot_err.log" -ForegroundColor Yellow
    $botErrLines | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
} else {
    Write-Host "   Bot started" -ForegroundColor Green
}

# --- 7. Verify all endpoints ---
Write-Host ""
Write-Host "6. Verifying endpoints..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$allOK = $true

$url1 = $HTTPS_URL + "/"
$url2 = $HTTPS_URL + "/api/prayer-times?lat=41.3&lon=69.2&lang=uz"
$url3 = $HTTPS_URL + "/api/hadith?collection=bukhari&page=1&limit=2"

foreach ($pair in @("$url1|/", "$url2|/api/prayer-times", "$url3|/api/hadith")) {
    $parts   = $pair -split "\|"
    $testUrl = $parts[0]
    $label   = $parts[1]
    try {
        $resp = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 15
        Write-Host ("   {0} OK ({1})" -f $label, $resp.StatusCode) -ForegroundColor Green
    } catch {
        Write-Host ("   {0} FAILED" -f $label) -ForegroundColor Red
        $allOK = $false
    }
}

# --- Summary ---
Write-Host ""
if ($allOK) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  ALL SYSTEMS RUNNING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  WebApp : $HTTPS_URL" -ForegroundColor Cyan
    Write-Host "  Action : Send /start to your bot in Telegram" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "  Started with issues - see above" -ForegroundColor Yellow
    Write-Host "  WebApp : $HTTPS_URL" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to stop all processes..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Get-Process python      -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Stopped."

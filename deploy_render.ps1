# IslamTimeWorldBot — Render.com Deploy Script
# Run once after git is installed

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "========================================"
Write-Host "  IslamTimeWorldBot — Deploy to Render"
Write-Host "========================================"
Write-Host ""

# 1. Init git if needed
if (-not (Test-Path "$ROOT\.git")) {
    Write-Host "1. Initializing git repo..." -ForegroundColor Yellow
    git -C $ROOT init
    git -C $ROOT branch -M main
} else {
    Write-Host "1. Git repo already initialized" -ForegroundColor Green
}

# 2. Configure git user (if not set)
$gitUser = git config --global user.name 2>$null
if (-not $gitUser) {
    Write-Host "2. Setting git user..." -ForegroundColor Yellow
    git config --global user.name "IslamTimeWorldBot"
    git config --global user.email "muminkuziev@gmail.com"
} else {
    Write-Host "2. Git user: $gitUser" -ForegroundColor Green
}

# 3. Stage all files
Write-Host "3. Staging files..." -ForegroundColor Yellow
git -C $ROOT add .
$status = git -C $ROOT status --short
Write-Host "   Files to commit: $($status.Count)"

# 4. Commit
Write-Host "4. Creating commit..." -ForegroundColor Yellow
git -C $ROOT commit -m "Phase 4: Production deployment ready

- Dockerfile for Render.com
- render.yaml config
- server.py: bot webhook endpoint + lifespan startup
- requirements.txt: cleaned (removed unused deps)
- .gitignore added
- Bot uses polling locally, webhook on Render (RENDER=true)"

Write-Host ""
Write-Host "========================================"
Write-Host "  NEXT STEPS:"
Write-Host ""
Write-Host "  1. Create GitHub repo:"
Write-Host "     https://github.com/new"
Write-Host "     Name: IslamTimeWorldBot"
Write-Host "     Private: YES (contains bot code)"
Write-Host ""
Write-Host "  2. Push to GitHub:"
Write-Host "     git remote add origin https://github.com/YOUR_USERNAME/IslamTimeWorldBot.git"
Write-Host "     git push -u origin main"
Write-Host ""
Write-Host "  3. Deploy on Render:"
Write-Host "     https://render.com -> New -> Web Service"
Write-Host "     Connect GitHub repo"
Write-Host "     Environment variables:"
Write-Host "       BOT_TOKEN  = (from .env)"
Write-Host "       WEBAPP_URL = https://islamtimeworldbot.onrender.com"
Write-Host ""
Write-Host "  4. After deploy, WEBAPP_URL = your Render URL"
Write-Host "     Update it in Render dashboard env vars"
Write-Host "========================================"

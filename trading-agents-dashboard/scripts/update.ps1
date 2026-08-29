# update.ps1 — aplica cambios de código al servicio siempre-activo.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\update.ps1
#
# Hace: git pull → npm install (si cambió package-lock) → npm run build (frontend)
#       → pm2 restart trading-dashboard → verificación local + externa.
# El túnel (trading-tunnel) NO se toca: no depende del código del repo.

$ErrorActionPreference = 'Stop'
$Proj = 'Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard'
$Pm2  = Join-Path $env:APPDATA 'npm\pm2.cmd'
Set-Location $Proj

Write-Host '== git pull ==' -ForegroundColor Cyan
$before = git rev-parse HEAD
git pull --ff-only
$after = git rev-parse HEAD

if ($before -eq $after) {
  Write-Host 'Sin cambios nuevos en git.' -ForegroundColor Yellow
}

Write-Host '== npm install (raíz + server) ==' -ForegroundColor Cyan
npm install --no-fund --no-audit
npm install --no-fund --no-audit --prefix server

Write-Host '== build frontend ==' -ForegroundColor Cyan
npm run build

Write-Host '== pm2 restart trading-dashboard ==' -ForegroundColor Cyan
# Pasar el ecosystem re-lee la config (por si el pull cambió script/args/env).
& $Pm2 restart (Join-Path $Proj 'ecosystem.config.cjs') --only trading-dashboard --update-env
& $Pm2 save

Start-Sleep 6
Write-Host '== verificación ==' -ForegroundColor Cyan
try {
  $local = (Invoke-WebRequest -UseBasicParsing http://localhost:5175/api/health -TimeoutSec 8).Content
  Write-Host "  local  /api/health -> $local"
} catch { Write-Warning "  local health FAIL: $_" }
try {
  $ext = (Invoke-WebRequest -UseBasicParsing https://trading.buenchollotech.com/api/health -TimeoutSec 12).Content
  Write-Host "  público /api/health -> $ext"
} catch { Write-Warning "  público health FAIL: $_" }

& $Pm2 list | Select-String 'trading-dashboard|trading-tunnel'
Write-Host 'Listo.' -ForegroundColor Green

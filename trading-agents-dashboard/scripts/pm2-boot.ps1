# pm2-boot.ps1 — arranca el dashboard al iniciar sesión en Windows.
# Lo lanza la tarea programada "TradingDashboard-Autostart" (ver install-autostart.ps1).
#
# Qué hace:
#   1. Espera a que el disco de red Z: (\\Zambu-nas\nas-drive-pedro) esté montado.
#   2. `pm2 resurrect`  → restaura la lista de procesos guardada con `pm2 save`.
#   3. `pm2 start ecosystem.config.cjs` → red de seguridad idempotente (no-op si ya corre).
#
# No usa rutas UNC (\\...): npm/cmd.exe rechazan un cwd UNC. Todo va por Z:.
#
# pm2 se invoca como `node <pm2-cli.js>`, NO vía `pm2.cmd`: el .cmd arranca un
# cmd.exe y en Windows 11 (con Windows Terminal por defecto) eso hace parpadear
# una ventana en el login. `node` directo hereda la consola oculta de la tarea.

$ErrorActionPreference = 'Continue'
$ProjectDir = 'Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard'
$Ecosystem  = Join-Path $ProjectDir 'ecosystem.config.cjs'
$Node       = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { $Node = 'C:\Program Files\nodejs\node.exe' }
$Pm2Cli     = Join-Path $env:APPDATA 'npm\node_modules\pm2\bin\pm2'
$LogDir     = Join-Path $env:USERPROFILE '.pm2\logs'
$BootLog    = Join-Path $LogDir 'autostart-boot.log'

function Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Output $line
  try { Add-Content -Path $BootLog -Value $line -Encoding utf8 } catch {}
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Log '--- pm2-boot start ---'

# 1. Esperar a Z: (los discos de red persistentes reconectan de forma perezosa tras el login)
$tries = 0
while (-not (Test-Path $ProjectDir) -and $tries -lt 40) {
  if ($tries -eq 0) {
    try { & net use Z: \\Zambu-nas\nas-drive-pedro /persistent:yes 2>&1 | Out-Null } catch {}
  }
  Start-Sleep -Seconds 3
  $tries++
}
if (-not (Test-Path $ProjectDir)) {
  Log "ERROR: $ProjectDir no accesible tras $($tries*3)s. Abortando."
  exit 1
}
Log "Z: disponible tras $($tries*3)s"

if (-not (Test-Path $Pm2Cli)) { Log "ERROR: pm2 CLI no encontrado en $Pm2Cli (¿npm i -g pm2?)"; exit 1 }
if (-not (Test-Path $Node))   { Log "ERROR: node no encontrado ($Node)"; exit 1 }

# pm2 lee ecosystem.config.cjs con rutas absolutas de Z:; situarse ahí mantiene
# coherentes las rutas relativas y el dump de `pm2 save`.
Set-Location $ProjectDir

function Pm2([string[]]$Pm2Args) { & $Node $Pm2Cli @Pm2Args 2>&1 | ForEach-Object { Log "  $_" } }

# 2. Restaurar procesos guardados
Log 'pm2 resurrect'
Pm2 @('resurrect')
Start-Sleep -Seconds 5

# 3. Red de seguridad: si resurrect NO dejó ambas apps arriba, arrancar desde el ecosystem.
#    (No se usa `pm2 jlist` + ConvertFrom-Json: en PS 5.1 revienta por claves
#     duplicadas 'username'/'USERNAME' en el entorno serializado. `pm2 pid` basta.)
function Test-PmAppUp([string]$name) {
  $out = (& $Node $Pm2Cli pid $name 2>$null | Out-String).Trim()
  $procId = 0
  if (-not [int]::TryParse((($out -split '\r?\n')[-1]).Trim(), [ref]$procId)) { return $false }
  if ($procId -le 0) { return $false }
  return [bool](Get-Process -Id $procId -ErrorAction SilentlyContinue)
}

$missing = @('trading-dashboard', 'trading-tunnel') | Where-Object { -not (Test-PmAppUp $_) }
if ($missing.Count -gt 0) {
  Log "faltan apps [$($missing -join ', ')] -> pm2 start ecosystem.config.cjs"
  Pm2 @('start', $Ecosystem)
} else {
  Log 'resurrect dejo ambas apps arriba - nada mas que hacer'
}

Pm2 @('save')
Log '--- pm2-boot done ---'

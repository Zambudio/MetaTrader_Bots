# install-autostart.ps1 — registra (o actualiza) la tarea programada que arranca
# el dashboard al iniciar sesión en Windows. Idempotente: se puede re-ejecutar.
#
#   Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-autostart.ps1
#
# Copia pm2-boot.ps1 a una ruta LOCAL (C:\ProgramData\TradingDashboard) para que la
# tarea no dependa de que Z: ya esté montado en el instante del login. Si editas
# pm2-boot.ps1, vuelve a ejecutar este script para propagar la copia.

$ErrorActionPreference = 'Stop'
$TaskName   = 'TradingDashboard-Autostart'
$SrcBoot    = Join-Path $PSScriptRoot 'pm2-boot.ps1'
$LocalDir   = 'C:\ProgramData\TradingDashboard'
$LocalBoot  = Join-Path $LocalDir 'pm2-boot.ps1'
$User       = "$env:USERDOMAIN\$env:USERNAME"

if (-not (Test-Path $SrcBoot)) { throw "No encuentro $SrcBoot" }

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
Copy-Item $SrcBoot $LocalBoot -Force
Write-Host "Copiado boot script -> $LocalBoot"

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$LocalBoot`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $User
$trigger.Delay = 'PT30S'   # deja que la red / discos mapeados se estabilicen

# RunLevel Limited: un usuario normal (sin UAC) puede registrar una tarea que
# corre como él mismo en su propio inicio de sesión. pm2 / net use / cloudflared
# no necesitan privilegios de administrador.
$principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2) `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0)   # sin límite de tiempo

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Tarea previa '$TaskName' eliminada"
}

try {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description 'Arranca el dashboard de trading (pm2 resurrect) al iniciar sesion.' | Out-Null
  Write-Host "Tarea '$TaskName' registrada (Register-ScheduledTask) para $User."
}
catch {
  Write-Warning "Register-ScheduledTask fallo ($($_.Exception.Message)). Probando schtasks.exe..."
  $tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$LocalBoot`""
  & schtasks.exe /Create /TN $TaskName /SC ONLOGON /RL LIMITED /TR $tr /F
  if ($LASTEXITCODE -ne 0) { throw "schtasks tambien fallo (exit $LASTEXITCODE)" }
  Write-Host "Tarea '$TaskName' registrada (schtasks.exe) para $User."
}

Write-Host "Prueba manual:  Start-ScheduledTask -TaskName $TaskName"

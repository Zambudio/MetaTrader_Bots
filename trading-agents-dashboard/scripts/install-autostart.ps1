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
$LocalVbs   = Join-Path $LocalDir 'pm2-boot-hidden.vbs'
$User       = "$env:USERDOMAIN\$env:USERNAME"

if (-not (Test-Path $SrcBoot)) { throw "No encuentro $SrcBoot" }

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
Copy-Item $SrcBoot $LocalBoot -Force
Write-Host "Copiado boot script -> $LocalBoot"

# Lanzador .vbs: wscript.exe es subsistema GUI (sin consola), así que arranca
# PowerShell 100% oculto — sin ventana, sin parpadeo, sin entrada en la barra de
# tareas. Es lo que resuelve la queja de "no quiero ver esta consola".
$vbs = @"
' Generado por install-autostart.ps1 - arranca pm2-boot.ps1 sin ninguna ventana.
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$LocalBoot""", 0, False
"@
Set-Content -Path $LocalVbs -Value $vbs -Encoding ASCII
Write-Host "Lanzador oculto -> $LocalVbs"

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$LocalVbs`""

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
  $tr = "wscript.exe `"$LocalVbs`""
  & schtasks.exe /Create /TN $TaskName /SC ONLOGON /RL LIMITED /TR $tr /F
  if ($LASTEXITCODE -ne 0) { throw "schtasks tambien fallo (exit $LASTEXITCODE)" }
  Write-Host "Tarea '$TaskName' registrada (schtasks.exe) para $User."
}

Write-Host "Prueba manual:  Start-ScheduledTask -TaskName $TaskName"

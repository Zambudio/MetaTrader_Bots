param(
    [string]$EaName = "BuyOnDip_Pro.ex5",
    [string]$Symbol = "EURUSD",
    [string]$Period = "H1",
    [string]$FromDate = "2026.01.01",
    [string]$ToDate = "2026.08.18",
    [double]$Deposit = 10000.0,
    [int]$Leverage = 100,
    [int]$Model = 0 # 0 = Every tick, 1 = 1 minute OHLC, 2 = Open prices only
)

$mt5Terminal = "C:\Program Files\MetaTrader 5\terminal64.exe"
$mt5Editor   = "C:\Program Files\MetaTrader 5\MetaEditor64.exe"
$dataDir     = "C:\Users\fadwe\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075"
$expertsDir  = Join-Path $dataDir "MQL5\Experts"
$filesDir    = Join-Path $dataDir "MQL5\Files"

# 1. Verificar o Compilar si se pasa un .mq5
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($EaName)
$mq5Path  = Join-Path $expertsDir "$baseName.mq5"
$ex5Path  = Join-Path $expertsDir "$baseName.ex5"
$logPath  = Join-Path $expertsDir "$baseName.compile.log"

if (Test-Path $mq5Path) {
    Write-Host "Compilando $baseName.mq5..." -ForegroundColor Cyan
    & $mt5Editor "/compile:$mq5Path" "/log:$logPath"
    Start-Sleep -Milliseconds 800
    if (Test-Path $logPath) {
        $compileLog = Get-Content $logPath -Encoding Unicode
        $hasErrors = ($compileLog | Select-String "error").Count -gt 0
        if ($hasErrors) {
            Write-Host "Error en la compilación:" -ForegroundColor Red
            $compileLog | ForEach-Object { Write-Host $_ }
            exit 1
        } else {
            Write-Host "Compilación exitosa: 0 errores." -ForegroundColor Green
        }
    }
}

# 2. Generar archivo de configuración INI para el Tester
$reportName = "Report_${baseName}_${Symbol}_${Period}.htm"
$reportFullPath = Join-Path $filesDir $reportName
$iniPath = Join-Path $dataDir "autotester_$baseName.ini"

$iniContent = @"
[Tester]
Expert=$baseName.ex5
Symbol=$Symbol
Period=$Period
Deposit=$Deposit
Currency=USD
Leverage=$Leverage
Model=$Model
ExecutionMode=0
Optimization=0
FromDate=$FromDate
ToDate=$ToDate
ForwardMode=0
Report=$reportFullPath
ReplaceReport=1
ShutdownTerminal=1
Visual=0
"@

Set-Content -Path $iniPath -Value $iniContent -Encoding UTF8

Write-Host "Iniciando backtest headless en MetaTrader 5..." -ForegroundColor Cyan
Write-Host "EA: $baseName.ex5 | Par: $Symbol | TF: $Period | Periodo: $FromDate -> $ToDate" -ForegroundColor Yellow

# 3. Lanzar Terminal con /config
$arg = "/config:$iniPath"
$proc = Start-Process -FilePath $mt5Terminal -ArgumentList $arg -PassThru

# Esperar a que el proceso termine (ShutdownTerminal=1 lo cierra al acabar)
Write-Host "Ejecutando backtest en segundo plano (PID: $($proc.Id))..." -ForegroundColor Cyan
$timeoutSeconds = 120
$sw = [System.Diagnostics.Stopwatch]::StartNew()

while (-not $proc.HasExited -and $sw.Elapsed.TotalSeconds -lt $timeoutSeconds) {
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline
}
Write-Host ""

if (-not $proc.HasExited) {
    Write-Host "Timeout alcanzado ($timeoutSeconds s). Finalizando proceso..." -ForegroundColor Yellow
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

# 4. Verificar reporte generado
if (Test-Path $reportFullPath) {
    Write-Host "Backtest completado con éxito." -ForegroundColor Green
    Write-Host "Reporte generado en: $reportFullPath" -ForegroundColor Green
} else {
    Write-Host "El backtest finalizó. Buscando reporte y logs más recientes..." -ForegroundColor Yellow
}

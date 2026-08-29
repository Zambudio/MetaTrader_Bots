# Diagnóstico Codex — Iteración 6

> Extraído de `scratchpad/codex-out-6.txt` (efímero). Preservado para el registro del bucle /loop 2026-08-29.

===BEGIN DIAGNOSIS===

## CLASIFICACION

**P0 — corrupción de integridad por carrera temporal y ausencia de correlación entre job y sesión.**

El Quality Gate está bien configurado; recibe métricas de otro backtest. No hay que relajar ningún umbral.

## CAUSA_RAIZ

El análisis principal queda confirmado, con tres correcciones:

1. `findLatestAgentLog()` solo usa el `mtime` para seleccionar un **archivo**, no una sesión dentro del archivo acumulativo.

2. Al comenzar run 9, el log se modifica en la línea 7652, a las `11:24:09.636`, con `Cloud servers switched off`. En ese momento todavía no existe el marcador del nuevo experto, que aparece en la línea 7671 a las `11:24:15.771`.

3. El polling lee ese estado intermedio y ejecuta:

```ts
if (/final balance/i.test(content)) {
  rawLog = content;
  break;
}
```

Ese `content` ya contiene los balances finales históricos de las líneas 6934 y 7644. Por tanto rompe el polling antes de que aparezca `EA_EURUSD_H1_V7PbfK8Q.ex5`. Después:

```ts
session = sessions[sessions.length - 1];
```

selecciona legítimamente la última sesión existente en ese instante: `EA_EURUSD_H1_3_7xkFD9.ex5`.

Reproducción determinista sobre el prefijo del log hasta la línea 7652:

```text
currentBreak=true
selected=EA_EURUSD_H1_3_7xkFD9.ex5
expected=EA_EURUSD_H1_V7PbfK8Q.ex5
```

Correcciones al análisis forense:

- `FINAL_BALANCE_RE` **sí casa las tres líneas**: `12470.88`, `10583.25` y `9250.42`.
- `run9.json` contiene expresamente `finalBalance: 10583.25`. El `netProfit: 583.25` procede de `10583.25 - 10000`, no del fallback. El fallback habría producido aproximadamente `3460.19 - 2877.76 = 582.43`.
- La sesión real de run 9 tiene 21 trades, 5 ganadores, 16 perdedores, win rate `23.81%`, RR medio `1.665`, esperanza `-0.365 R`, profit factor aproximado `0.518`, neto `-749.58 USD` y drawdown aproximado `7.96%`. Pasa operaciones, rechazos y drawdown: **3/6**, no 2/6.

El supuesto error de `TRIGGER_RE` tampoco es un error de parsing. Por ejemplo:

```text
market sell ... (1.16537 / ...)
stop loss triggered ... EURUSD 1.16537 sl: 1.16603 ...
```

El grupo `entryPrice` reproduce correctamente el precio real de apertura. Los RR extremos de la sesión de las 10:43 son geometría real del EA: calculaba SL/TP alrededor de `iClose(...,0)` pero enviaba una orden de mercado con precio `0.0`; el fill podía quedar lejos de ese precio base. La mediana es aproximadamente `2.56`, el máximo `81.83`. Run 9 ya centra SL/TP sobre el BID y sus 21 RR están alrededor de `1.665`.

## CAMBIO_PROPUESTO

Un único invariante lógico: **una ejecución solo puede terminar y llegar al Quality Gate cuando aparece una sesión completa cuyo `expertFile` coincide con el `.ex5` único generado para ese job; si falta el balance autoritativo, se falla cerrado.**

No borrar ni rotar el log: MT5 puede mantenerlo abierto y se perdería información forense. Tampoco hace falta introducir ahora un parser HTML.

### Archivo: `src/mql5Backtester.ts`

Ubicación: `findLatestAgentLog()`, helper de lectura y polling de `runHeadlessBacktest()`.

```diff
diff --git a/src/mql5Backtester.ts b/src/mql5Backtester.ts
--- a/src/mql5Backtester.ts
+++ b/src/mql5Backtester.ts
@@
-async function findLatestAgentLog(baseDir: string, sinceDate: Date): Promise<string | null> {
+async function findRecentAgentLogs(baseDir: string, sinceDate: Date): Promise<string[]> {
   try {
     const agentDirs = await fs.readdir(baseDir, { withFileTypes: true });
     const logFiles: { path: string; mtime: Date }[] = [];
@@
-    if (logFiles.length === 0) return null;
+    if (logFiles.length === 0) return [];
     logFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
-    return logFiles[0].path;
+    return logFiles.map((log) => log.path);
   } catch {
-    return null;
+    return [];
   }
 }
@@
 async function readLogFileAnyEncoding(filePath: string): Promise<string> {
   try {
     const raw = await fs.readFile(filePath, 'utf16le');
     return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
   } catch {
     return '';
   }
 }
 
+function findCompletedSessionForExpert(
+  rawLog: string,
+  expectedExpertFile: string
+): Mt5LogSession | null {
+  const expectedName = expectedExpertFile.toLowerCase();
+  const sessions = parseMt5Log(rawLog);
+
+  for (let i = sessions.length - 1; i >= 0; i--) {
+    const candidate = sessions[i];
+    const loggedName = candidate.expertFile
+      ?.replace(/\\/g, '/')
+      .split('/')
+      .pop()
+      ?.toLowerCase();
+
+    if (loggedName === expectedName && candidate.finalBalance !== null) {
+      return candidate;
+    }
+  }
+
+  return null;
+}
+
 export async function runHeadlessBacktest(
@@
   const pollDeadline = Date.now() + BACKTEST_TIMEOUT_MS;
   const pollIntervalMs = 3000;
   let rawLog = '';
+  let session: Mt5LogSession | null = null;
   let startupError: string | null = null;
   let runtimeCrashError: string | null = null;
   while (Date.now() < pollDeadline) {
-    const latestLogPath = await findLatestAgentLog(testerDir, startTime);
-    if (latestLogPath) {
-      const content = await readLogFileAnyEncoding(latestLogPath);
-      if (/final balance/i.test(content)) {
+    const recentLogPaths = await findRecentAgentLogs(testerDir, startTime);
+    for (const logPath of recentLogPaths) {
+      const content = await readLogFileAnyEncoding(logPath);
+      const completedSession = findCompletedSessionForExpert(content, ex5FileName);
+      if (completedSession) {
         rawLog = content;
+        session = completedSession;
         break;
       }
     }
+    if (session) break;
+
     startupError = await findTesterStartupError(dataDir, startTime);
     if (startupError) break;
     runtimeCrashError = await findRuntimeCrashError(dataDir, startTime);
@@
-  let session: Mt5LogSession | null = null;
-  if (rawLog) {
-    const sessions = parseMt5Log(rawLog);
-    session = sessions.length > 0 ? sessions[sessions.length - 1] : null;
-  }
-
   // 5. Evaluar Quality Gate cuantitativo (Doc 20 §4)
```

Buscar todos los logs recientes evita que un log de `Tester/logs` o de otro `Agent-N` tape al que contiene la sesión esperada. El `nanoid` del nombre `.ex5` es la clave de correlación per-run.

### Archivo: `src/mt5LogParser.ts`

Ubicación: `FINAL_BALANCE_RE` y `computeStats()`.

```diff
diff --git a/src/mt5LogParser.ts b/src/mt5LogParser.ts
--- a/src/mt5LogParser.ts
+++ b/src/mt5LogParser.ts
@@
-const FINAL_BALANCE_RE = /final balance ([\d.]+) (\w+)/;
+const FINAL_BALANCE_RE = /\bfinal balance\s+(-?\d+(?:\.\d+)?)\s+(\w+)\b/i;
@@
   const netProfit =
     session.finalBalance !== null && session.initialDeposit !== null
       ? session.finalBalance - session.initialDeposit
-      : (session.triggers.length > 0 ? grossProfitApprox - grossLossApprox : null);
+      : null;
```

Así, un log incompleto o un cambio de formato nunca convierte una estimación de fills en “beneficio neto” autoritativo. `null` hace fallar el criterio de beneficio y, por tanto, el gate completo.

## RIESGO_REGRESION

- Si MT5 deja de emitir `expert file added` o `final balance`, el backtest terminará en timeout/fallo en vez de aprobar otra sesión. Es el comportamiento seguro.
- Las sesiones sin balance final dejarán de obtener `netProfit` aproximado. Pueden conservar `grossProfitApprox` y `grossLossApprox` para diagnóstico, pero no aprobar el gate.
- Se leerán varios logs recientes durante el polling; el coste es pequeño frente al backtest.
- La correlación depende del nombre `.ex5`, pero este ya incorpora un `nanoid` distinto por job, por lo que evita colisiones incluso entre ejecuciones del mismo EA.

## COMO_VERIFICAR

1. Prueba de regresión con el prefijo del log hasta la línea 7652:

```text
findCompletedSessionForExpert(prefix, "EA_EURUSD_H1_V7PbfK8Q.ex5") === null
```

El polling debe continuar aunque existan balances históricos.

2. Con el log completo:

```text
expertFile   = Experts\EA_EURUSD_H1_V7PbfK8Q.ex5
finalBalance = 9250.42
netProfit    = -749.58
closedTrades = 21
expectancyR  ≈ -0.365
profitFactor ≈ 0.518
```

3. `evaluateQualityGate(session.stats)` debe devolver `passed: false`, score `50`, con 3/6 criterios aprobados.

4. Añadir una prueba donde la sesión esperada tiene trades pero no `final balance`: `netProfit` debe ser `null` y el Quality Gate debe fallar.

5. Ejecutar `npx tsc --noEmit` y dos backtests consecutivos el mismo día. El segundo resultado debe contener exclusivamente el nombre `.ex5` generado para el segundo job.

## OTROS_CANDIDATOS

- **RR/entryPrice:** no cambiar `TRIGGER_RE`. El dato está bien parseado. Endurecer posteriormente el codegen para que SL, TP y position sizing se calculen desde el mismo BID/ASK usado como referencia de la orden; si se envía `price=0.0`, no deben calcularse desde `iClose(...,0)`. Run 9 demuestra que esta corrección de geometría funciona.
- **Formato del log principal:** en el fichero suministrado, `cols[0]` es un código como `CE`/`RS`, no el timestamp simulado. Por eso `periodStart`, `periodEnd` y a veces `symbol/timeframe` quedan mal. Debe corregirse en otra iteración.
- **Report HTML per-run:** es una buena evolución para obtener profit factor, comisiones, swaps y drawdown oficiales, evitando aproximaciones del log. No es el cambio mínimo para esta carrera y exige un parser adicional y fixtures de distintas versiones de MT5.
- **Borrar/rotar el log:** descartado por riesgo de fichero abierto, pérdida de historial y carreras con una instancia MT5 ya existente.
- **Filtrar solo por hora:** insuficiente frente a ejecuciones paralelas, cambios de medianoche o desfases; el nombre `.ex5` único es una clave de correlación más fuerte.

===END DIAGNOSIS===

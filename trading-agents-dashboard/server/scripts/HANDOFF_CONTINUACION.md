# HANDOFF (continuación 2) — cerrar la VALIDACIÓN REAL de FOREX

Esta es la 2ª entrega del relevo. Lee primero, enteros:
- `wiki-Traiding/proyecto-dashboard/informes/VALIDACION_REAL_FOREX.md` — **§"Continuación Codex — resultado real"** tiene el estado exacto.
- `trading-agents-dashboard/server/scripts/HANDOFF_CODEX.md` — reglas duras y comandos (siguen vigentes).
- El prompt original de la tarea.

Trabaja en `Z:\IA\02_Proyectos\MetaTrader_Bots`, rama **`validacion-real-forex`** (HEAD `a24ce14`). Commitea ahí, nunca en `main`.

## Qué ya está hecho (NO repetir)

| Item | Estado |
|---|---|
| FASE 0 (baseline `forex_v1`) | ✅ hash `504e6f2a…b8c`, round-trip idéntico |
| C1 `AGENT_CLI_TIMEOUT_MS` | ✅ + test |
| C2 reintento transitorio de CLI (`AGENT_CLI_RETRIES`, `isTransientCliError`) | ✅ + test |
| C3 diagnóstico de límite de sesión (extrae `.result` de stdout JSON; NO reintenta límites de sesión) | ✅ + test |
| Soporte ventana histórica (`getCandles endDate`, `buildMarketSnapshot asOf`) | ✅ + test |
| Audit endurecido (`RUN_NOT_FUNCTIONAL`, `TEMPORAL_CONTEXT_ERROR`, condición sobrecargada, no da OK a runs en error) | ✅ |
| `MQL5_DISABLE_OPTIMIZATION=1` → 1 solo smoke, sin relajar estrategia | ✅ + test |
| `scripts/generateValidatedForexMql5.ts` (fail-closed: solo desde run `validated+GO+0 blockers`) | ✅ |
| **`forex_v1.1`** — preset NUEVO `baseline-forex-forex-v1-1`, hash `17affd3cd123e32dce5f25c27da0982d58ed8ebb7ed271707c4103a411fb1378` | ✅ sembrado; `forex_v1` intacto |
| typecheck / vitest 76 / build | ✅ verdes |
| Commit `a24ce14` en `validacion-real-forex` | ✅ |

**`forex_v1.1`** = `forex_v1` con el mismo DAG, modelos (`claude:sonnet`), pesos, activación y risk gate; **solo añade aclaraciones al final del systemPrompt de cada agente** para 3 defectos reproducidos en runs reales sobre `forex_v1`:
1. `TEMPORAL_CONTEXT_ERROR` — ventana histórica (`=== VENTANA HISTÓRICA REPRODUCIBLE ===`) tratada como cotización live obsoleta → modo `HISTORICAL_AS_OF` (frescura/sesión respecto al `as_of`).
2. Capacidad `DATA_NOT_AVAILABLE` conocida (spread, macro, volumen, params de cuenta) convertida en blocker previo al backtest, aunque la regla no dependa de ella.
3. `condicionEntrada` sobrecargada (metía "mercado abierto", "primera vela semanal", macro… dentro de la condición) → máximo 1 evento + 1 filtro; el resto son salvedades de ejecución, no la regla.
Se conservan como blocker: geometría incorrecta, R:R < 1.6, riesgo > 1%, SL fuera de [1.25, 2.5] ATR, look-ahead, regla no codificable, evidencia inventada, dependencia real de un dato ausente.

## Diagnóstico de por qué `forex_v1` no llegó a GO

En 4 runs sobre `forex_v1`: 3 estrategias pasaron el gate geométrico determinista, **0 aceptadas por el juez**. Causas (evidencia en los run JSON y en el informe §"Auditoría"):
- El **juez `fx-judge` sobre-bloquea**: convierte spread/calendario/volumen/params-de-cuenta ausentes (todos `DATA_NOT_AVAILABLE` conocidos, no usados por la regla) en `unresolvedBlockers`, y exige barrido de parámetros + walk-forward **antes** de GO — contradice el significado documentado de GO = *elegible para smoke backtest*, no rentable.
- Contaminación temporal en escenarios históricos (`fx-momentum`, `fx-session`, `fx-risk`, `fx-critic` comparan el `as_of` con la fecha del sistema y narran "obsoleto").
- Aritmética de pips errónea puntual del sintetizador/revisores (ej: `1.16680-1.16300` descrito como 3,8 pips en vez de 38).
- El límite de sesión de Claude (`resets 2:40am Europe/Madrid`) cortó R2-judge y R2-retry entero.

## LO QUE FALTA (tu trabajo)

> El límite de sesión de Claude se agota rápido: cada run son ~7–15 llamadas `claude -p`. **Chequea `claude -p "ping"` antes de empezar; si devuelve "session limit", espera al reset.** Trabaja escenario a escenario y deja el informe + `git commit` actualizado tras CADA run para no perder progreso.

### 1. FASE 1 sobre `forex_v1.1` — los 6 escenarios, uno a uno
```
cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server
$env:FOREX_VALIDATION_PRESET_ID = "baseline-forex-forex-v1-1"
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r2-trend
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r3-range
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r4-highvol
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r1-current
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r5a-absent
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r5b-stale
```
Prioriza `r2-trend` / `r3-range` / `r4-highvol` (histórico limpio, mercado abierto → es donde puede salir un GO legítimo). `r1-current` es fin de semana cerrado (difícil por diseño; no fuerces GO). Los `r5*` son pruebas negativas (esperado: `insufficient_data` / `stale + warning`).
Éxito funcional = `status=done`, sin `error/waiting`, roster `fx-*` exacto, `fx-macro` omitido `DATA_NOT_AVAILABLE`, estado final coherente.

### 2. FASE 2–4 — auditoría
`npx tsx --env-file-if-exists=.env scripts/auditRealForex.ts` + revisión manual: contratos `AgentAnalysis`, activación/omisión, transferencia de contexto, DATO/INFERENCIA/HIPÓTESIS/CONCLUSIÓN, **alucinaciones** (todo número DATO debe estar en el snapshot; marca spread/liquidez/noticias/macro inventados). Recalcula TODA estrategia GO de forma determinista (el audit usa `validateStrategyProposal`; verifica además 1 evento + 1 filtro, indicadores disponibles/codificables, sin nivel anecdótico, sin look-ahead, evaluable sobre velas cerradas).
**Exigencia de reproducibilidad**: al menos **R2 + 2 corridas consecutivas** sin `TEMPORAL_CONTEXT_ERROR`, sin blockers inventados, sin aritmética incorrecta, sin condición sobrecargada.

### 3. FASE 5 — MQL5 (SOLO si aparece un run `finalState=validated` + veredicto `go` + 0 `unresolvedBlockers`)
```
$env:MQL5_DISABLE_OPTIMIZATION = "1"
npx tsx --env-file-if-exists=.env scripts/generateValidatedForexMql5.ts
```
El script es fail-closed (aborta si no hay run elegible). Luego verifica del `.mq5`: codifica **literalmente** `condicionEntrada`; sin filtros inventados; dirección/SL/TP/risk coinciden; sizing determinista por riesgo y normalizado (tick size/value, volume step/min/max); guard de nueva barra + velas cerradas; sin look-ahead; handles de indicador + `CopyBuffer` correctos; validación de retcodes; Magic Number; cero rutas de trading live. Compila con MetaEditor (**0 errores**, justifica warnings). Smoke backtest headless: `terminal64.exe` debe estar CERRADO (si está abierto → registra `BLOCKED_EXTERNAL_MT5_RUNNING`, sigue con compilación + estática, **no lo cierres**). Verifica: arranca y termina, símbolo/timeframe correctos, sin excepciones, informe legible, operaciones o su ausencia explicable, logs coherentes. **NO exijas rentabilidad. NO optimices el EA.**

### 4. FASE 6 — loop de corrección
Por cada defecto real: clasifícalo (`PROMPT_ERROR`, `CONTRACT_ERROR`, `HALLUCINATION`, `STRATEGY_ERROR`, `MODEL_ERROR`, `TOOL_ERROR`, `MQL5_FIDELITY_ERROR`, `MQL5_COMPILE_ERROR`, `BACKTEST_EXECUTION_ERROR`…). Corrige la causa raíz. Si es de prompt y afecta a `forex_v1.1`, edita `forex_v1.1` (NO `forex_v1`) y actualiza su hash esperado en `scripts/validateRealForex.ts` (`EXPECTED_HASHES`) y en `test/baselinePresets.test.ts`; si el cambio es grande, publica `forex_v1.2`. Añade test de regresión. `npm run typecheck` + `npx vitest run` + `npm run build` verdes (`npm run lint` está roto por WDAC — anótalo). Repite el escenario + 2 corridas consecutivas sin regresión.

### 5. Docs + commit
Completa `VALIDACION_REAL_FOREX.md` (matriz final de runs, informes por agente, afirmaciones contrastadas, gates, artefactos MQL5, compilaciones, backtests, defectos/correcciones, tests, métricas acumuladas, limitaciones, **estado final**). Actualiza `00_INDEX.md`. No borres nada previo. Commit convencional, `git add` explícito (NUNCA `git add -A` → arrastra `README.md`), sin push. Mensaje: `fix(forex): validación real forex_v1.1 completa` (o similar).

## Criterio de estado final
- **`VALIDATED_REAL`** solo si: análisis + estrategia aprobada + compilación 0 errores + smoke backtest que termina limpio, TODO real, y **≥3 corridas reproducibles** (R2 + 2 más). Indica sobre qué preset (`forex_v1.1`).
- **`VALIDATED_ANALYSIS_AND_COMPILE`** si el smoke backtest queda bloqueado externamente (MT5 abierto) pero todo lo demás está validado.
- **`BLOCKED`** si el límite de cuota impide completar.
- **`UNSTABLE`** si hay defectos no resueltos que impiden un GO legítimo.
- **`forex_v1` (baseline original)**: documenta su estado por separado — contratos de análisis + gate determinista OK, pero el juez sobre-bloquea (evidencia: 4 runs, 0 GO) → superado por `forex_v1.1`. NO lo declares `VALIDATED_REAL`.

## Reglas que NO cambian
CERO órdenes live / capital / cuenta live. No cerrar MetaTrader. **No debilitar gates/prompts/juez para lograr GO. No fabricar datos. No optimizar rentabilidad.** No tocar `README.md`. No push/deploy. No avanzar a ACCIONES/CRIPTO — al terminar FOREX, para y pregunta.

## Respuesta final para Pedro
Estado de FOREX (+ sobre qué preset), nº runs y tasa de éxito, agentes ejecutados/omitidos, estrategias aceptadas/rechazadas, MQL5 generados + compilación, smoke backtest, defectos encontrados/corregidos, limitaciones, tests y comandos, commit creado, ruta del informe. Pregunta si continuar con ACCIONES / TSLA.

# Validación REAL de FOREX `forex_v1` (EUR/USD, H1)

Fecha de inicio: 2026-08-30. Fase: **validación de comportamiento real** (modelos reales `claude:sonnet` vía CLI de suscripción, datos históricos verificables, informes reales de agentes) — posterior a [`VALIDATION_LOOP.md`](VALIDATION_LOOP.md), que solo comprobó contratos/aislamiento/orquestación con ejecutor simulado determinista.

Seguridad: **0 órdenes live, 0 capital, 0 llamadas de ejecución**. Solo análisis, datos históricos, compilación MQL5 y backtest headless sin órdenes live. MetaTrader no se cierra en ningún caso.

Relacionados: [auditoría](AUDITORIA_MULTIAGENTE.md) · [config Forex](CONFIGURACION_FOREX.md) · [validation loop simulado](VALIDATION_LOOP.md) · [estado final](ESTADO_FINAL_CONFIGURACIONES.md).

> **ESTADO DE LA EJECUCIÓN: `EN_VALIDACION` con dos carriles separados.** Validación estructural: `forex_v1.2`, OmniRoute, hash `feddf9d4…4cdc`. Validación analítica final: `forex_v1.1`, Claude/Codex, hash `64c35dc7…be9d135`, aplazada para preservar cuotas.
> Hay 12 runs completados/evaluables (4 de `forex_v1`, 7 de `forex_v1.1` y 1 de `forex_v1.2`) más un intento R2 interrumpido deliberadamente, excluido de métricas y quórum. `forex_v1.2` conserva prompts, DAG y gates de v1.1 pero cambia los ocho modelos a OmniRoute; sus resultados validan contratos y orquestación, no la calidad analítica final ni habilitan MQL5. Su primer smoke estructural R5a terminó correctamente. El quórum analítico y MQL5/MetaEditor/smoke siguen pendientes antes de declarar un estado final.

---

## Commit de partida y baseline

- Commit de arquitectura: `4c99fdc` *feat(agents): add validated market-specific baselines*.
- HEAD real al validar: `8c51f0d` *chore(agents): sync active stocks roster* — `4c99fdc` + una sincronización de `agents.json` (roster plano de ACCIONES) que **no toca `baselinePresets.ts` ni nada de FOREX**. `README.md` tiene una reescritura local ajena de una sesión previa: **no se toca ni se incluye en commits**.

### FASE 0 — verificación de la baseline (✅ PASA)

Preset cargado por el mecanismo real (`agentConfigsStore.getPreset`) y round-trip a disco:

| Campo | Valor |
|---|---|
| id / key / version | `baseline-forex-forex-v1` / `FOREX` / `forex_v1` |
| schemaVersion | `multiagent-config.v1` |
| marketType / activo / TF | `forex` / `EUR/USD` / `H1` |
| **SHA-256** | `504e6f2ac86fd05a321e99049b489654f48524f776b7bcf54e679fb70429bb8c` (coincide con el `504e6f2a…b8c` documentado) |
| availableCapabilities | `market_snapshot`, `ohlcv`, `session_clock` |
| unavailableCapabilities | `verified_macro_calendar`, `verified_news`, `corporate_fundamentals`, `sec_filings`, `benchmark_data`, `derivatives_metrics`, `on_chain_metrics` |
| consensus | `judge_with_adversarial_review`, juez `fx-judge`, `maxRevisionRounds` 2, `unresolved_blocker_prevents_go` |
| riskPolicy | `maxRiskPercent` 1 · `minRrRatio` 1.6 · `minStopAtr` 1.25 · `maxStopAtr` 2.5 |
| validation | `requireStructuredOutputs` + `requireEvidence` + `deterministicRiskGate` |
| `validatePreset` | VALID |

8 agentes, todos `model: claude:sonnet`, todos `enabled`:

| id | outputType | activación | requiredData | dependsOn (+opt) | weight |
|---|---|---|---|---|---|
| `fx-structure` | analysis | data_available | `market_snapshot` | — | 0.20 |
| `fx-momentum-volatility` | analysis | data_available | `market_snapshot` | — | 0.20 |
| `fx-session` | analysis | data_available | `session_clock` | — | 0.20 |
| `fx-macro` | analysis | data_available | `verified_macro_calendar` + `verified_news` | — | 0.10 |
| `fx-strategy` | strategy | data_available | `market_snapshot` | structure, momentum, session (+`fx-macro` opt) | 0.25 |
| `fx-risk` | analysis | always | — | fx-strategy | 0.20 |
| `fx-critic` | analysis | always | — | fx-strategy | 0.15 |
| `fx-judge` | verdict | always | — | fx-risk, fx-critic | 1.00 |

Round-trip `getPreset → setActivePreset(FOREX) → setActivePreset(null) → getPreset` de nuevo: **hash idéntico, JSON completo idéntico, prompts idénticos, modelos = `claude:sonnet`, relaciones idénticas.** Prompts completos capturados (SHA por agente en el log de FASE 0).

Estado activo previo: `baseline-acciones-stocks-v1` (ACCIONES) — **registrado y restaurado**. El runner de FASE 1 no muta el preset activo (usa `getPreset` directo, el mismo camino que la ruta con `configurationId`). Sin contaminación cruzada.

---

## Correcciones aplicadas (infra, no baseline; con test de regresión)

Ninguna toca prompts, agentes, relaciones ni gates. Todas con evidencia de una ejecución real fallida.

### C1 — `AGENT_CLI_TIMEOUT_MS` configurable en los CLIs de agente
`claudeCli.ts`/`codexCli.ts` tenían el timeout **fijo** en 180 s / 240 s. Evidencia: run `_rWt37-Ku2` (TSLA) → `stock-risk` y `stock-critic` murieron con `[claudeCli] timeout (180s)` y dejaron el juez en `waiting` y el run en `error`. Los revisores reciben toda la cadena de contexto + snapshot + estrategia y varios agentes del mismo nivel corren en paralelo. Fix: `resolveAgentCliTimeoutMs(fallback)` lee `AGENT_CLI_TIMEOUT_MS` (mismo patrón que `MQL5_GEN_TIMEOUT_MS`). El runner usa 600 s. Test: `cliClients.test.ts` › `resolveAgentCliTimeoutMs`.

### C2 — reintento acotado ante fallos TRANSITORIOS del CLI
`llmRouter` **no hace fallback** entre fuentes; un hipo puntual de la suscripción tumba el run. Evidencia: run `real-forex-20260830150301-r1-current` → `fx-judge` falló con `[claudeCli] claude salió con código 1. stderr: (vacío)` en **6.1 s**, en la 3ª pasada, tras un run de ~30 min ya completado hasta el juez. Fix: `claudeCli`/`codexCli` reintentan hasta `AGENT_CLI_RETRIES` (def. 2, tope 5) ante fallos **transitorios** (salida rápida código≠0 stderr vacío, stdout no parseable, `.result` vacío, `subtype != success`, "no se pudo lanzar"). **Los timeouts NO se reintentan** (probable prompt demasiado grande / saturación) ni los errores de formato del JSON del modelo. Helper `isTransientCliError`. Tests: `cliClients.test.ts` › `resolveAgentCliRetries`, `isTransientCliError`.

### Soporte mínimo reproducible de ventana histórica (FASE 1)
Los proveedores solo devolvían las ~5000 velas más recientes → no se podían recrear periodos de tendencia/lateral/alta volatilidad. Añadido, sin inventar velas:
- `twelveDataAdapter.fetchTwelveDataCandles(pair, tf, { endDate })` → `&end_date=` (UTC).
- `marketData/index.ts`: `getCandles(pair, tf, { endDate, noCache })`, helpers puros `parseEndDateToEpochSec` y `filterCandlesByEndDate` (recorte local para proveedores sin `end_date` nativo), `candleSourceLabel`.
- `marketSnapshot.buildMarketSnapshot(pair, tf, { asOf, noCache })` → cabecera **`=== VENTANA HISTÓRICA REPRODUCIBLE ===`** con fuente, símbolo, timeframe, rango de velas y corte; la frescura se evalúa respecto al `asOf` (no a "ahora").
- Tests: `test/marketDataHistorical.test.ts` (5 casos: parser flexible, recorte inclusivo sin inventar, corte inválido → serie intacta, frescura as_of vs frescura "ahora").

`.env.example` documenta `AGENT_CLI_TIMEOUT_MS` y `AGENT_CLI_RETRIES`.

**Verificación:** `npm run typecheck` (server) ✅ · `npx vitest run` **16 files / 70 tests ✅** (antes 58; +12 de las regresiones nuevas) · `npm run build` (dashboard) ✅. `npm run lint` (oxlint) **bloqueado por política de Control de Aplicaciones de Windows (WDAC) en la máquina** — `oxlint.win32-x64-msvc.node` denegado; no es un problema del código.

---

## FASE 1 — matriz de ejecuciones reales

Runner: `trading-agents-dashboard/server/scripts/validateRealForex.ts` (orquestador real + persistencia real, `executionMode:'real'`). Auditoría determinista: `scripts/auditRealForex.ts`. Informe máquina: `server/src/data/validation-real-forex-latest.json` (+ `-audit.json`) — gitignored.

| id | escenario | as_of (UTC) | régimen verificado |
|---|---|---|---|
| `r1-current` | snapshot en vivo | — (live) | fin de semana FX cerrado; RSI≈10.5 (sobreventa extrema), precio bajo todas las MAs y bajo banda inferior BB |
| `r2-trend` | tendencia clara | `2026-03-25 00:00:00` | alcista: RSI 62, MACD alcista, precio > EMA20/50/SMA20/50/200, cierre sobre BB superior |
| `r3-range` | lateral / bajo momentum | `2026-08-25 00:00:00` | compresión: RSI 49.9, MACD plano, BBW 0.17%, ATR ≈ 7.1 pips |
| `r4-highvol` | volatilidad elevada | `2025-04-10 00:00:00` | ATR ≈ 33.3 pips, BBW 1.61%, rango 20-velas 172 pips (turbulencia arancelaria abr-2025) |
| `r5a-absent` | prueba negativa: datos ausentes | — | `marketSnapshot = null` |
| `r5b-stale` | prueba negativa: snapshot obsoleto | ventana `2026-03-25` evaluada "ahora" | `⚠ AVISO DE FRESCURA` → `dataQuality=stale` |

### R1 — `real-forex-20260830150301-r1-current` (status: **error**, por C2 → re-ejecutar)

- Snapshot live EUR/USD H1 2026-08-30 15:00 UTC, `FX_WEEKEND_CLOSED`, RSI 10.47, MACD bajista, cierre 1.15373 < banda inferior BB 1.15442, ATR 0.00153.
- `fx-macro` **omitido `DATA_NOT_AVAILABLE: verified_macro_calendar, verified_news`** ✅ (comportamiento esperado — sin feeds verificados nunca participa).
- `fx-structure` (110 s), `fx-momentum-volatility` (146 s), `fx-session` (129 s) → **todos `done`, contrato `AgentAnalysis` válido, calidad alta**:
  - Cada `fact` cita el campo exacto del snapshot como `source`. **Cero alucinaciones** (verificado a mano: todos los números — 1.15373, EMA20 1.15717, RSI 10.47, ATR 0.00153, etc. — están literalmente en el snapshot).
  - Aritmética correcta (p. ej. "~107 pips bajo la SMA200": 1.16447−1.15373 = 0.01074 ✅).
  - `fx-momentum` **se abstiene explícitamente** de calcular divergencias/pendientes por no recibir series históricas — exactamente lo que exige su prompt.
  - Ninguno inventa spread/liquidez/profundidad ni macro: los listan como no disponibles. `dataQuality: stale`, confidence reducida (0.57 / 0.45 / 0.40) por el cierre de fin de semana.
- `fx-strategy` (`done`, tras **1 rechazo del gate determinista** + reintento interno): BUY, entrada 1.15373, SL 1.15144, TP 1.15768, riesgo 0.5%. **Pasa el gate determinista**: R:R 1.72 (≥1.6), SL 1.50 ATR (∈ [1.25, 2.5]), geometría BUY correcta, `condicionEntrada` = 1 evento (RSI(14) cruza al alza el 30) + 1 filtro (cierre > banda inferior BB) → mecánica y codificable. *Nota:* añadió "precondiciones de ejecución" que citan calendario macro y spread (no disponibles) — el `fx-critic` lo detectó; posible afinado de prompt del sintetizador, pendiente de confirmar con más runs.
- `fx-risk` (239 s) y `fx-critic` (201 s) → `done`. El run pasó por **2 rondas completas de "ajustar"** (`retryCount: 2`) — el juez objetó (probablemente entrada contra-tendencia en mercado cerrado / dependencia de datos ausentes) y se reejecutó el subgrafo estrategia→revisores→juez dos veces.
- `fx-judge` → **`error`** en la 3ª pasada: `[claudeCli] claude salió con código 1. stderr: (vacío)` en 6.1 s. **Fallo transitorio del CLI**, no de contenido. → corregido por **C2**; R1 debe re-ejecutarse.

Duración total R1: ~29 min (7 llamadas a `claude -p` de 95–240 s + reintentos + overhead de persistencia SMB).

### R2–R5: estado al entregar el handoff

En el checkpoint original estaban pendientes. La continuación Codex llegó a ejecutar R2 dos veces; R3–R5 quedaron bloqueados por el límite externo de sesión descrito abajo.

---

## Continuación Codex — resultado real

Rama: `validacion-real-forex`, partida `8d679da`. El worktree estaba limpio al empezar, `main` no divergió y el preset activo permaneció en todo momento en `baseline-acciones-stocks-v1`. No se tocó `README.md`, no hubo push/deploy y no se cerró ningún proceso del usuario.

### Matriz acumulada de runs persistidos

Éxito funcional exige `status=done`, sin `error/waiting`, roster FOREX exacto, `fx-macro` omitido por `DATA_NOT_AVAILABLE` y estado final coherente. Resultado: **0/4 runs registrados = 0%**. De ellos, tres fueron lanzados en esta continuación y uno era el R1 del checkpoint anterior.

| run | preset | escenario | duración | ejecutados `done` | omitidos | resultado |
|---|---|---|---:|---|---|---|
| `real-forex-20260830150301-r1-current` | `forex_v1` | actual | ~29 min | structure, momentum, session, strategy, risk, critic | macro | `error`: juez, salida CLI 1 vacía; estrategia BUY gate PASS |
| `real-forex-20260830195351-r1-current` | `forex_v1` | actual | 1.978 s | structure, momentum, session, strategy, risk, critic, judge | macro | `invalid_result`: juez mantuvo `AJUSTAR` tras 2 revisiones |
| `real-forex-20260830202712-r2-trend` | `forex_v1` | histórico | 733 s | structure, momentum, session, strategy, risk, critic | macro | `error`: juez agotó 3 intentos CLI transitorios |
| `real-forex-20260830203938-r2-trend` | `forex_v1` | histórico, retry `AGENT_CLI_RETRIES=3` | 85 s | ninguno | macro + downstream por dependencia | `error`: los 3 especialistas agotaron 4 intentos durante límite de sesión |

En los cuatro runs el roster esperado fue exclusivamente `fx-*`; **cero agentes `stock-*`/`crypto-*`** y `fx-macro` se omitió siempre con `DATA_NOT_AVAILABLE: verified_macro_calendar, verified_news`. Las salidas completadas respetaron la forma de `AgentAnalysis`: `status`, `bias`, `confidence` 0..1, `dataQuality`, facts con source, inferencias, hipótesis y conclusión no vacía. Riesgo y crítico citaron geometría y evidencia ancestral; no aprobaron en vacío.

### Estrategias y gates

| run | propuesta | gate determinista | auditoría manual | decisión |
|---|---|---|---|---|
| R1 inicial | BUY 1.15373 / SL 1.15144 / TP 1.15768 / 0,5% | R:R 1,72; SL 1,50 ATR; PASS | 1 evento RSI + 1 filtro Bollinger; snapshot no persistido por runner antiguo | no aceptada: juez falló |
| R1 reejecutado | SELL 1.15819 / SL 1.16320 / TP 1.14984 / 0,5% | R:R 1,667; SL 1,50 ATR; PASS | evento MACD + filtro EMA50, pero añadió dos restricciones operativas dentro de `condicionEntrada` (`mercado abierto` y `primera vela semanal`) | rechazada: `AJUSTAR`, 7 blockers |
| R2 trend | BUY 1.15980 / SL 1.15560 / TP 1.16680 / 0,5% | R:R 1,667; SL 2,258 ATR; PASS | evento recuperación EMA20 + filtro SMA200, velas cerradas, sin look-ahead; niveles de referencia mezclados con una regla dinámica | no aceptada: juez no pudo ejecutarse |

**Aceptadas por juez: 0. Rechazadas/no concluidas: 3.** Ninguna estrategia habilitó FASE 5. La prueba del script `generateValidatedForexMql5.ts` terminó correctamente en fail-closed: `No existe ningun run FOREX validated + GO + 0 blockers.`

### Auditoría de afirmaciones y contexto

- R1 reejecutado: facts de especialistas y revisores contrastados contra el snapshot (cierre 1.15819, medias, RSI 54.3, MACD, Bollinger, ATR 0.00334 y rango); sin números de mercado huérfanos detectados por el audit. El juez, sin embargo, convirtió capacidades ausentes conocidas —spread, calendario, volumen real, balance y serie histórica— en requisitos previos al propio backtest y exigió barrido/optimización walk-forward. Eso contradice el significado documentado de GO como **elegibilidad para backtest**, no rentabilidad.
- R1 `condicionEntrada`: el evento y filtro eran codificables, pero las exclusiones adicionales violaban el máximo de un evento + un filtro. El audit ahora lo marca `STRATEGY_ERROR`.
- R2: snapshot reproducible de 5.000 velas hasta `as_of=2026-03-25T00:00:00Z`, `dataQuality=good`. `fx-momentum`, `fx-session`, `fx-risk` y `fx-critic` lo compararon indebidamente con 2026-08-30 y generaron narrativa de “~5 meses obsoleto”. El audit lo marca `TEMPORAL_CONTEXT_ERROR`.
- R2: la aritmética vinculante fue correcta (42 pips de riesgo, 70 de recompensa, R:R 1,67, SL 2,26 ATR), pero apareció una inferencia incorrecta: `1.16680 - 1.16300` se describió como 3,8 pips cuando son **38 pips**. También se citó un “spread típico” pese a estar ausente. Se clasifican `MODEL_ERROR`/`HALLUCINATION`; la estrategia no se acepta.
- No se inventaron velas ni se alteraron snapshots. Las abstenciones por fuentes macro ausentes fueron correctas. La transferencia de contexto funcionó: los revisores citaron strategy, snapshot y especialistas; el problema fue cómo interpretaron ese contexto.

### Defectos, causa raíz y correcciones

1. **`TOOL_ERROR` — límite de sesión oculto y reintentos inútiles.** Claude Code devuelve el diagnóstico en stdout dentro del sobre JSON, pero `claudeCli` solo mostraba stderr. Reproducción mínima: `claude --version` = 2.1.251; prompt mínimo = exit 1, `You've hit your session limit · resets 2:40am (Europe/Madrid)`. Fix: `formatCliFailureDetail` prioriza stderr, extrae `.result` de stdout JSON y acota a 500 caracteres; `isTransientCliError` no reintenta límites de sesión. Verificación real: un único intento, mensaje completo.
2. **`PROMPT_ERROR` / `TEMPORAL_CONTEXT_ERROR` — histórico tratado como live obsoleto.** Evidencia reproducible en R2. Se conserva `forex_v1` byte por byte y hash original; se publica **preset nuevo** `forex_v1.1`, id `baseline-forex-forex-v1-1`, hash `17affd3cd123e32dce5f25c27da0982d58ed8ebb7ed271707c4103a411fb1378`.
3. **`PROMPT_ERROR` / `STRATEGY_ERROR` — requisitos imposibles y condición sobrecargada.** v1.1 mantiene los 8 agentes, todos `claude:sonnet`, DAG, pesos, activación y risk gate. Solo aclara: `HISTORICAL_AS_OF`; capacidad ausente no es blocker si la regla no depende de ella; GO no exige rentabilidad/optimización; `condicionEntrada` contiene solo un evento + un filtro; blockers técnicos reales (geometría, look-ahead, evidencia inventada, regla no codificable o dependencia real ausente) se conservan.
4. **`VALIDATION_TOOL_ERROR` — audit daba OK a `status=error/invalid_result`.** `auditRealForex.ts` ahora emite `RUN_NOT_FUNCTIONAL`, detecta contaminación temporal y restricciones extra en la condición, conserva id/version de preset y clasifica fallos del CLI como `TOOL_ERROR`.
5. **`MQL5_FIDELITY_ERROR` preventivo — pipeline optimizaba tras el smoke.** `generateMql5` podía relajar filtros o añadir indicadores por Quality Gate/cero trades, incompatible con esta validación. `MQL5_DISABLE_OPTIMIZATION=1` limita el pipeline a generación, correcciones de compilación, revisión estática y **un único smoke backtest**, sin cambiar la estrategia por rentabilidad.

`forex_v1.1` quedó registrado sin sustituir v1; el preset activo siguió en ACCIONES. No se declara corregido en real: el límite de sesión impidió las corridas de regresión requeridas.

### MQL5, compilación y backtest

- Artefactos `.mq5/.ex5`: **ninguno**; el gate previo bloqueó correctamente.
- Compilación de una estrategia aprobada: **no ejecutada** porque no hubo GO.
- Smoke backtest: **no ejecutado**; `terminal64.exe` no se abrió ni se cerró.
- Optimización: **0 ciclos**, por política y por ausencia de run elegible.

### Verificación del repo

- `npm run typecheck` (server): PASS.
- `npx vitest run`: **17 files / 76 tests PASS** (antes 70; +6 regresiones).
- `npm run build` (dashboard): PASS; warning no bloqueante ya conocido por chunk JS de 584,14 kB.
- `npx tsx --env-file-if-exists=.env scripts/auditRealForex.ts`: 4 runs, 14 errores reales/esperados de los intentos fallidos y 1 limitación del snapshot antiguo; informe máquina en `server/src/data/validation-real-forex-audit.json` (gitignored).
- `npm run lint`: no ejecutable por WDAC (`oxlint.win32-x64-msvc.node` bloqueado), limitación de máquina ya documentada.

Tests nuevos: extracción/recorte de errores CLI desde stdout JSON y no-retry de límites de sesión; inmutabilidad hash de `forex_v1` + validez/modelos/guardrails de `forex_v1.1`; política `MQL5_DISABLE_OPTIMIZATION` (1 smoke vs. 3 ciclos normales). El script MQL5 fail-closed y el audit real completan la verificación operativa.

### Trabajo bloqueado pendiente

Tras el reset de la suscripción se deben ejecutar, **uno a uno**, los seis escenarios con `FOREX_VALIDATION_PRESET_ID=baseline-forex-forex-v1-1`, repetir el audit y exigir al menos R2 más dos corridas consecutivas sin `TEMPORAL_CONTEXT_ERROR`, blockers inventados, aritmética incorrecta o condición sobrecargada. Solo entonces, si aparece `validated + go + 0 blockers`, procede `generateValidatedForexMql5.ts`, inspección literal, MetaEditor 0 errores y un smoke headless con optimización desactivada.

---

## Continuación 2026-09-01 — checkpoint R2 sobre `forex_v1.1`

Rama `validacion-real-forex`, partida `be7cddb`. `claude -p "ping"` respondió correctamente; no había límite de sesión. El preset activo no se cambió, no se tocaron procesos de MetaTrader, no hubo órdenes live, push ni deploy.

### Incidencia de datos y corrección C4

El primer intento de `r2-trend` abortó antes de crear el run: `fetchTwelveDataCandles` agotó su timeout fijo de 10 s. Repro mínimo, dos veces: `TimeoutError` a los 10.010 s. La misma URL real con timeout de 45 s devolvió HTTP 200 y 5.000 velas en 11.139 s. Clasificación: **`DATA_PROVIDER_TIMEOUT` / `TOOL_ERROR`**.

Corrección de causa raíz, sin tocar la baseline:

- `TWELVEDATA_TIMEOUT_MS`, 30 s por defecto y acotado a 1–120 s; documentado en `.env.example`.
- El runner histórico reutiliza la misma serie ya descargada para procedencia y snapshot; elimina la segunda petición idéntica con `noCache: true`.
- Regresión: `marketDataHistorical.test.ts`, 7/7 PASS (timeout configurable realmente conectado al `AbortSignal` + snapshot histórico desde velas ya obtenidas).
- Repro original tras el fix: 5.000 velas, PASS en 3.060 s.

### Run `real-forex-20260901174952-r2-trend`

| preset | escenario | duración | ejecutados | omitidos | resultado funcional |
|---|---|---:|---|---|---|
| `forex_v1.1` (`baseline-forex-forex-v1-1`) | R2 tendencia, `as_of=2026-03-25T00:00:00Z` | 1.991 s | `fx-structure`, `fx-momentum-volatility`, `fx-session`, `fx-strategy`, `fx-risk`, `fx-critic`, `fx-judge` | `fx-macro`: `DATA_NOT_AVAILABLE: verified_macro_calendar, verified_news` | `status=done`, `finalState=validated`, juez `go`, 0 blockers declarados, 0 agentes error/waiting |

Roster exclusivamente `fx-*`, cero contaminación ACCIONES/CRIPTO. Los cinco `AgentAnalysis` persistidos tienen contrato válido, facts con source, inferencias/hipótesis/conclusión y confidence 0..1. La transferencia de contexto llegó a riesgo, crítico y juez. Snapshot real: 5.000 velas de Twelve Data, rango `2025-07-02T19:00:00Z → 2026-03-25T00:00:00Z`, `dataQuality=good`, última vela igual al corte.

Propuesta final: BUY; condición = un evento (recruce alcista de EMA20 en vela H1 cerrada) + un filtro (MACD línea > señal); ejecución en apertura de la vela siguiente; instancia ilustrativa `entry=1.15980`, `SL=1.15738`, `TP=1.16389`, riesgo 0,5 %. Recalculo independiente: riesgo `0.00242` = 24,2 pips = 1,301 ATR; recompensa `0.00409` = 40,9 pips; R:R `1,690`; geometría y gate numérico ilustrativo PASS.

### Auditoría manual: GO todavía NO elegible para MQL5

El audit automático marcó tres `TEMPORAL_CONTEXT_ERROR` falsos: los textos dicen explícitamente que la fecha del sistema **no** se usa. También marcó como condición extra la frase negativa `No incluye filtros de calendario, spread, sesión...`; la regla efectiva sí cumple 1 evento + 1 filtro. Se clasifica como **`VALIDATION_TOOL_ERROR`** y debe corregirse con regresión antes del siguiente audit.

Defectos reales del contenido, pese al GO:

1. **`MODEL_ERROR` / aritmética calendaria:** `fx-session` afirmó que 2026-03-25 era martes; era miércoles. El crítico lo detectó y el juez lo dio por resuelto, pero la exigencia de corridas limpias no permite conservar el error en la cadena.
2. **`HALLUCINATION`:** estrategia/revisores introdujeron spread `0,6–1,0 pip` y slippage `0,2–0,5 pip` sin fuente. Se presentan como supuesto de backtest, no como DATO observado, pero siguen siendo cifras fabricadas en un entorno que declara spread/slippage `DATA_NOT_AVAILABLE`; no se aceptan como evidencia ni parámetros de esta validación.
3. **`STRATEGY_ERROR`:** la entrada real se define en la apertura de la vela siguiente, pero SL/TP se anclan al cierre de la vela de señal. El propio crítico y juez reconocen que el R:R realizado puede caer por debajo de 1,6; por tanto el triplete ilustrativo no garantiza el gate en runtime y esto es un blocker técnico, no una condición posponible al backtest.

Decisión humana: **rechazar temporalmente este GO para FASE 5**. No se ejecuta `generateValidatedForexMql5.ts`, no se genera `.mq5/.ex5`, no hay compilación ni smoke. Próximo paso: corregir audit y aclarar solo `forex_v1.1` para cálculo determinista de día/ausencia de cifras inventadas y una única referencia coherente de entrada-SL-TP; actualizar hashes, añadir tests y repetir R2 + dos corridas limpias.

### Corrección C5 aplicada tras R2

- Audit extraído a reglas puras con regresiones: las negaciones HISTORICAL_AS_OF ya no son contaminación temporal; `No incluye filtros...` no cuenta como restricción; sí se detectan costes numéricos sin fuente, día ISO incorrecto y entrada en apertura siguiente con SL/TP anclados al cierre previo.
- `forex_v1.1` aclara, sin tocar `forex_v1`: calcular o abstenerse del día de semana; no inventar cifras de spread/slippage; usar la **misma referencia de precio ejecutable** para entrada, SL y TP. Riesgo, crítico y juez deben conservar como blocker cualquier discrepancia de referencia que deje el R:R runtime sin garantizar.
- Nuevo hash v1.1: `a48925ec9f91d84a319b54508cea40f06a622599b9fddc5645a6769b69797ed4`. Hash v1 permanece `504e6f2ac86fd05a321e99049b489654f48524f776b7bcf54e679fb70429bb8c`.
- Verificación previa a repetir: `npm run typecheck` PASS; `npx vitest run` **18 files / 83 tests PASS**; `npm run build` PASS (solo warning conocido de chunk 584,14 kB).

### Corrección C6 — sincronización del store de baselines

El primer relanzamiento tras C5 abortó fail-closed antes de agentes: el código esperaba `a48925ec…ed4`, pero `getPreset` devolvió la copia persistida antigua `17affd3c…1378`. Causa: `loadAgentConfigsState` solo añadía IDs ausentes y nunca refrescaba una baseline inmutable existente. Fix: los IDs baseline se sincronizan desde código al cargar; presets custom y `activePresetId` se conservan. Regresión pura 2/2 + typecheck PASS. Verificación real del JSON: v1.1=`a48925ec…ed4`, activo=`baseline-acciones-stocks-v1`, 1 preset custom conservado. El aborto no creó run ni invocó modelos.

### Run `real-forex-20260901183540-r2-trend` y correcciones C7/C8

Segundo R2 sobre v1.1 tras C5/C6: 5.000 filas descargadas, `fx-structure`, `fx-momentum-volatility`, `fx-session` y `fx-strategy` completados; `fx-macro` omitido correctamente. Tras dos rondas `AJUSTAR`, la tercera estrategia terminó, pero `fx-risk` y `fx-critic` fallaron en 7,4/7,5 s con límite de sesión (`resets 1am Europe/Madrid`); `fx-judge` quedó omitido por dependencia. Resultado: `status=error`, 1.767 s, no funcional, no cuenta como corrida limpia.

Mejoras confirmadas antes del corte: `fx-session` calculó **miércoles** correctamente; no aparecieron cifras inventadas de spread/slippage; la estrategia final expresó SL/TP desde el precio de entrada. Persistieron dos defectos: momentum/estrategia afirmaron “baja liquidez” sin métrica y la estrategia usó el gap anterior `−0.00002` para suponer que la apertura futura sería próxima al cierre.

El agente de sesión detectó además un defecto real de datos: la fila Twelve Data `2026-03-25T00:00:00Z` no era una vela cerrada al corte. La [documentación oficial de Twelve Data](https://twelvedata.com/docs#time-series) define `datetime` como el instante de **apertura** de la barra. C7 corrige el filtro: una barra solo entra si `open_time + intervalo <= as_of`; el repro real devuelve 4.999 velas, última apertura `2026-03-24T23:00:00Z` y cierre derivado `2026-03-25T00:00:00Z`. El snapshot etiqueta explícitamente apertura y cierre derivado. Se elimina así el look-ahead de una hora.

C8 amplía audit/prompt v1.1: error ante liquidez alta/baja sin métrica y ante uso de un gap pasado para predecir fill futuro; el prompt prohíbe ambas inferencias. Nuevo hash v1.1: `c3d6b2b00627115ddaf10d740db8bdbf8e1b65f93ab6fb6edefe08fbe1809a77`; v1 sigue intacto. Verificación: `npm run typecheck` PASS; `npx vitest run` **19 files / 88 tests PASS**; `npm run build` PASS (warning conocido de chunk 584,14 kB). Audit del run parcial: sin falso `TEMPORAL_CONTEXT_ERROR`; conserva `RUN_NOT_FUNCTIONAL`, liquidez inventada, proxy de fill y los dos `TOOL_ERROR` de cuota.

FASE 5 continúa bloqueada: ningún run limpio posterior a C7/C8, cero MQL5, cero compilaciones y cero backtests.

### Run `real-forex-20260901191422-r5a-absent`

Prueba negativa con `marketSnapshot=null` sobre hash `c3d6b2b0…09a77`. `fx-structure`, `fx-momentum-volatility` y `fx-macro` se omitieron por datos ausentes; estrategia, riesgo, crítico y juez se omitieron por dependencias. `fx-session` se activó legítimamente porque `session_clock` sí está disponible, pero su única llamada falló por el mismo límite de sesión (`resets 1am`). Resultado: `status=error`, `finalState=error`, 9 s; no valida aún el esperado `insufficient_data`. No se cambia el DAG para evitar la llamada: la selección coincide con las capacidades declaradas.

### Cierre de esta ejecución

| preset | runs persistidos | éxito funcional | estrategia / juez | aceptación manual |
|---|---:|---:|---|---:|
| `forex_v1` original | 4 | 0/4 (0 %) | 3 propuestas; 0 GO | 0 |
| `forex_v1.1` (hashes sucesivos documentados) | 3 | 1/3 (33,3 %) | 2 propuestas; 1 GO, 1 sin juez, R5a sin estrategia | 0 |
| **Total** | **7** | **1/7 (14,3 %)** | **5 propuestas; 1 GO LLM** | **0/5** |

Agentes: en el único run funcional se ejecutaron los siete `fx-*` no macro y `fx-macro` se omitió `DATA_NOT_AVAILABLE`; en el R2 parcial completaron los tres especialistas + estrategia, macro se omitió, riesgo/crítico fallaron por cuota y juez se omitió; en R5a solo sesión intentó ejecutarse y los otros siete se omitieron por datos/dependencias. Cero agentes `stock-*` o `crypto-*` en los siete runs.

MQL5/MT5: **0 `.mq5`, 0 `.ex5`, 0 compilaciones, 0 smoke backtests, 0 optimizaciones**. El gate manual bloqueó el único GO y la cuota impidió obtener un run limpio posterior. No se abrió ni cerró `terminal64.exe`; no hubo órdenes live, capital ni cuenta live.

Defectos nuevos de esta continuación y estado: timeout real Twelve Data + doble fetch (corregidos); falsos positivos del audit (corregidos); día de semana incorrecto, costes inventados y referencia de R:R incoherente (guardrails/audit corregidos); baseline persistida obsoleta (store corregido); barra H1 abierta incluida en `as_of` / look-ahead (corregido y verificado con 4.999 velas); liquidez inferida sin métrica y gap anterior usado como proxy de fill futuro (guardrails/audit corregidos). Falta demostrar estas dos últimas correcciones en una corrida completa por la cuota.

Verificación final de código: `npm run typecheck` PASS; `npx vitest run` **19 files / 88 tests PASS**; `npm run build` PASS con el warning conocido de chunk 584,14 kB. `npm run lint` sigue no ejecutable por WDAC. Worktree y commits no incluyen `README.md`, `agents.json` ni datos runtime ignorados; no hubo push/deploy.

Para desbloquear: después del reset, repetir primero R2 con hash `c3d6b2b0…09a77`; después exigir dos corridas consecutivas limpias adicionales (prioridad R3/R4), completar R1/R5a/R5b y reauditar. Solo un run `validated + go + 0 blockers` que además pase la auditoría manual puede entrar en FASE 5.

---

## Continuación 2026-09-02 — R2 limpio posterior a C7/C8

`claude -p "ping"` respondió `pong`; se reanudó la matriz sobre `baseline-forex-forex-v1-1` sin cambiar el preset activo. Run `real-forex-20260902063009-r2-trend`, hash exacto `c3d6b2b00627115ddaf10d740db8bdbf8e1b65f93ab6fb6edefe08fbe1809a77`:

| escenario | snapshot real | duración | ejecutados | omitidos | resultado |
|---|---|---:|---|---|---|
| R2 tendencia | Twelve Data, 4.999 velas H1 **cerradas**, aperturas `2025-07-02T19:00:00Z → 2026-03-24T23:00:00Z`, cierre derivado final = `as_of 2026-03-25T00:00:00Z` | 1.584 s | `fx-structure`, `fx-momentum-volatility`, `fx-session`, `fx-strategy`, `fx-risk`, `fx-critic`, `fx-judge` | `fx-macro`: `DATA_NOT_AVAILABLE: verified_macro_calendar, verified_news` | `status=done`, `finalState=validated`, juez `go`, 0 blockers, gate PASS |

Los contratos de los cinco `AgentAnalysis`, `StrategyProposal` y `AgentVerdict` son válidos; el roster contiene solo agentes `fx-*`. Estructura, momentum y sesión separan hechos citados del snapshot, inferencias, hipótesis, conclusión, riesgos e invalidaciones. Riesgo/crítico recibieron el snapshot, los especialistas y la propuesta; el juez recibió ambas revisiones. No se detectaron comparaciones con la fecha del sistema, día semanal erróneo, liquidez inferida, cifras de spread/slippage fabricadas ni dependencia de datos macro ausentes.

Estrategia final aceptada manualmente: BUY; EVENTO = histograma MACD(12,26,9) cruza de `<=0` a `>0` en vela H1 cerrada; FILTRO único = cierre de esa vela `> EMA(50)`; entrada en la apertura siguiente, con SL y TP calculados desde el **fill real** usando el ATR(14) de la vela señal cerrada. Ejemplo numérico no hardcodeable: entrada `1.16145`, SL `1.15807`, TP `1.16709`, riesgo `0,5%`. Recalculo: riesgo `0.00338`, recompensa `0.00564`, R:R `1,6686`; SL `1,798×ATR` y TP `3,0×ATR`. Geometría BUY, policy y ausencia de look-ahead: PASS. En el `as_of` no existía cruce vivo; los niveles son ilustrativos para el gate y no una orden.

El audit inicialmente dio dos falsos positivos sobre esta salida: contó como restricción la declaración negativa tras punto y coma `no incluye calendario...`, y tomó `un gap pasado no se asume como proxy` como una predicción positiva. Clasificación **`VALIDATION_TOOL_ERROR`**, no defecto del preset. Loop rojo reproducible: `npx vitest run test/forexAuditRules.test.ts` → 2 fallos. C9 amplía el reconocimiento de declaraciones negativas tras `;` y excluye aserciones de gap explícitamente negadas sin cortar números decimales como `0.00002`. Regresión final: 7/7 PASS; `auditRealForex.ts` clasifica el nuevo R2 como **OK** y conserva los hallazgos históricos de runs anteriores.

### R3 parcial `real-forex-20260902070322-r3-range`

Snapshot Twelve Data reproducible de 4.999 velas H1 cerradas, última apertura `2026-08-24T23:00:00Z` y cierre derivado igual al `as_of=2026-08-25T00:00:00Z`. Completaron `fx-structure`, `fx-momentum-volatility`, `fx-session`, la estrategia ajustada en una ronda, `fx-risk` y `fx-critic`; `fx-macro` se omitió correctamente. El juez del segundo intento falló en 6,1 s con límite externo `resets 1:20pm (Europe/Madrid)`. Resultado fail-closed: `status=error`, sin `finalState`, 1.328 s; no funcional y no cuenta como corrida limpia.

La estrategia parcial pasa el gate determinista: BUY, evento cruce alcista MACD/señal + filtro único cierre > SMA200, fill en apertura posterior, SL `1,5×ATR`, TP `2,625×ATR`, riesgo `0,5%`; ejemplo `1.16684 / 1.16575 / 1.16876`, R:R recalculado `1,761`. No obstante, el crítico introdujo un hallazgo real incompatible con C8: `liquidez potencialmente más fina` inferida desde la transición horaria, aunque a continuación declarara que no había métrica y que no la infería. Se rechaza la corrida parcial además de por cuota.

C10 corrige tres fallos del auditor demostrados con regresiones rojas: (a) ya no asocia el lunes de `2026-08-24` con el `as_of 2026-08-25` a través de campos JSON vecinos; ambos días estaban correctamente expresados; (b) no confunde `spread/slippage=DATA_NOT_AVAILABLE` seguido de una distancia de SL de 10,9 pips con un coste numérico inventado; (c) una declaración negativa en otra parte del texto ya no oculta una afirmación positiva de liquidez. Regresión 7/7 PASS. Audit final de R3 conserva exactamente `RUN_NOT_FUNCTIONAL`, la inferencia real de liquidez y el `TOOL_ERROR` de cuota.

C11 refuerza preventivamente la auditoría estática MQL5 antes de generar el artefacto definitivo. El revisor anterior aceptaba cualquiera de step/min/max, la mera palabra `StopLoss`, `trade.Buy()` o `CTrade` como prueba suficiente, y clasificaba `TRADE_RETCODE_DONE_PARTIAL` como API inventada. La referencia oficial confirma que esa constante existe (código 10010), que un `Buy()` con retorno `true` solo valida estructuras y que deben consultarse `ResultRetcode()` y `ResultDeal()`, además de que `SYMBOL_VOLUME_STEP/MIN/MAX`, `SYMBOL_TRADE_STOPS_LEVEL/FREEZE_LEVEL` y tick size/value son propiedades distintas. C11 exige las conjunciones completas y un control real de retcode/fill. Loop rojo: 5 fallos; regresión final: `codeReviewer.test.ts` 8/8 PASS. Suite: 19 archivos / **92 tests**, typecheck y build PASS. Fuentes: [retcodes oficiales](https://www.mql5.com/en/docs/constants/errorswarnings/enum_trade_return_codes), [`CTrade::Buy`](https://www.mql5.com/en/docs/standardlibrary/tradeclasses/ctrade/ctradebuy), [propiedades de símbolo](https://www.mql5.com/en/docs/constants/environment_state/marketinfoconstants).

C12 cierra la ruta live del artefacto generado: el prompt MQL5 y el revisor exigen que `OnInit()` consulte `MQLInfoInteger(MQL_TESTER)` y devuelva `INIT_FAILED` si es falso, sin bypass demo/live. La API es oficial y `MQL_TESTER` indica de forma booleana que el programa corre en el tester ([MQL5 Reference](https://www.mql5.com/en/docs/constants/environment_state/mql5_programm_info)). Se corrige también el texto contradictorio “cuenta DEMO” por “exclusivo Strategy Tester” y se eliminan de la lista de APIs inexistentes los retcodes oficiales `DONE_PARTIAL`, `INVALID_ORDER` y `NO_CHANGES`. Regresión roja: un EA live-capable recibía PASS; final: 23 controles estáticos y test explícito del prompt, 19 archivos / **94 tests**, typecheck y build PASS.

C13 hace verificable el requisito de velas cerradas: el revisor bloquea `CopyBuffer/CopyClose/CopyOpen/CopyHigh/CopyLow/CopyRates` con `start_pos=0` y lecturas `iClose/iOpen/iHigh/iLow` con `shift=0`, manteniendo `iTime(...,0)` únicamente para el guard de nueva barra. El prompt exige `start_pos >= 1`, copiar todos los índices usados, crear handles en `OnInit`, liberarlos con `IndicatorRelease` y validar conjuntamente stops/freeze. Dos regresiones rojas pasan; suite final provisional: 19 archivos / **96 tests**, typecheck y build PASS.

C14 cierra el gate agentes→MQL5 de esta validación. `auditRealForex.ts` persiste ahora el hash exacto por run; `generateValidatedForexMql5.ts` exige audit posterior al informe, R2 limpio, al menos tres runs `ok` del mismo id/hash y que los dos últimos sean consecutivamente limpios. El run fuente debe tener ejecución real terminada, configuración FOREX completa, hash recalculado idéntico, par/timeframe coherentes, roster exacto, solo `fx-macro` omitible por `DATA_NOT_AVAILABLE`, estrategia exacta, GO y cero blockers. Prueba real en el estado de un solo run limpio: el comando oficial abortó antes de OmniRoute/MetaEditor con exit 1 y `MQL5_BLOCKED: Faltan dos corridas consecutivas limpias al final de la secuencia auditada.` Dos regresiones del gate pasan; suite: 19 archivos / **98 tests**, typecheck y build PASS.

### C15 — segundo R3 parcial, aritmética de pips y hash sucesor

Tras el reset, `claude -p "ping"` respondió `pong` y se ejecutó `real-forex-20260902145439-r3-range` sobre el hash entonces vigente `c3d6b2b00627115ddaf10d740db8bdbf8e1b65f93ab6fb6edefe08fbe1809a77`. Snapshot Twelve Data reproducible: 4.999 velas H1 cerradas, aperturas `2026-01-27T19:00:00Z → 2026-08-24T23:00:00Z`, cierre derivado igual a `as_of=2026-08-25T00:00:00Z`, calidad `good`. Duración: 1.996,7 s.

`fx-structure`, `fx-momentum-volatility` y `fx-session` completaron; `fx-macro` se omitió correctamente con `DATA_NOT_AVAILABLE`. El panel recorrió tres propuestas: riesgo/crítico terminaron las dos primeras y el juez devolvió `AJUSTAR` dos veces; en la tercera, `fx-risk` y `fx-critic` fallaron en 7,4 s por el nuevo límite externo (`resets 6:20pm Europe/Madrid`) y el juez final se omitió por `MISSING_REQUIRED_DEPENDENCY`. Resultado fail-closed: `status=error`, sin `finalState` ni veredicto final; no cuenta como corrida funcional o limpia.

La estrategia parcial final pasa el gate determinista: BUY, evento = histograma MACD(12,26,9) cruza de `<=0` a `>0` sobre velas H1 cerradas; filtro único = cierre `> SMA(200)`; fill en la apertura siguiente; SL `E - 1,5×ATR(14)` y TP `E + 2,55×ATR(14)` desde el mismo fill. Ejemplo no hardcodeable: `E=1.16684`, `SL=1.16574`, `TP=1.16870`, riesgo `0,5%`. Recálculo independiente: riesgo `0,00110` = 11 pips = `1,507×ATR`; recompensa `0,00186` = 18,6 pips = `2,548×ATR`; R:R `1,6909`. Geometría, dimensionamiento, condición y ausencia de look-ahead: PASS.

La auditoría manual detectó un `MODEL_ERROR` no cubierto: `fx-session` afirmó que `1.16684 - 1.16462` eran `~222 pips`; en EUR/USD son `22,2 pips`. El auditor se amplió con una regla conservadora que recalcula relaciones explícitas entre dos precios sin cruzar campos ni objetos de enumeraciones. El loop rojo descubrió y eliminó capturas parciales y emparejamientos ambiguos; la regresión final cubre el error real y sus falsos positivos. El audit de esta R3 conserva exactamente cuatro errores: `RUN_NOT_FUNCTIONAL`, el `MODEL_ERROR` 222→22,2 y los dos `TOOL_ERROR` de cuota.

La causa raíz se refuerza sólo en `forex_v1.1`: todos los agentes deben usar `1 pip = 0.0001`, recalcular toda distancia entre precios o abstenerse de cuantificarla. `forex_v1` no cambia y conserva hash `504e6f2a…29bb8c`; el hash activo de `forex_v1.1` se actualiza y queda anclado en código/test. Verificación: tests focales 12/12, `npm run typecheck` PASS, suite **19 archivos / 99 tests PASS**, `npm run build` PASS (sólo warning conocido de chunk 584,14 kB). `npm run lint` continúa bloqueado por WDAC.

Acumulado tras C15: `forex_v1` 0/4 funcional; `forex_v1.1` 2/6 funcional; total 2/10 (20%). Estrategias persistidas: 8; GO del modelo: 2; aceptadas manualmente: 1. El R2 limpio pertenece a un hash anterior y queda como evidencia histórica, pero no satisface el quórum estricto del hash activo: tras el reset se repetirá R2 y se exigirán dos corridas limpias consecutivas adicionales. Aún no se genera MQL5. Seguridad: cero órdenes/capital/cuenta live, cero procesos MetaTrader cerrados, cero push/deploy.

### C16 — R2 funcional rechazado por contaminación temporal

Run `real-forex-20260902162126-r2-trend`, sobre hash `2d0f2986ef976559e7dea8657fe92f5f27041e20aec9410e25f85917f55159b6`: 4.999 velas H1 cerradas, cierre derivado `2026-03-25T00:00:00Z` exactamente igual al `as_of`; 1.665,3 s. Completaron los siete agentes no macro, `fx-macro` se omitió correctamente, y el segundo juez cerró `status=done`, `finalState=validated`, `go`, cero `unresolvedBlockers`.

La estrategia final pasa recálculo: BUY; evento cruce alcista MACD/señal en vela cerrada + filtro único cierre `> EMA50`; ejecución en primer tick posterior; SL/TP desde el fill real con ATR de la vela señal. Ejemplo `1.16145 / 1.15863 / 1.16615`, riesgo `0,5%`; riesgo `0,00282` = 28,2 pips = `1,5×ATR`; recompensa `0,00470` = 47 pips = `2,5×ATR`; R:R `1,6667`. Sin look-ahead, geometría y gate PASS. La vela del snapshot no dispara el cruce; los niveles son plantilla, no orden.

Rechazo manual: `fx-momentum-volatility` llamó la foto “desactualizada” contra `2026-09-02` y `fx-risk` repitió que tenía “~5 meses de antigüedad”. Aunque ambos aclararon que no era cotización live, el contrato HISTORICAL_AS_OF exige juzgar frescura exclusivamente contra `as_of`; son dos `TEMPORAL_CONTEXT_ERROR`. El audit inicialmente sumó dos falsos positivos: interpretó “Sin más filtros, sin calendario…” como condición extra y una doble negación de liquidez como afirmación. C16 reconoce ambos formatos negativos con regresiones; el audit definitivo conserva sólo los dos errores temporales y `STRATEGY_OK`.

La causa raíz se corrige exclusivamente en `forex_v1.1`: en HISTORICAL_AS_OF queda prohibido calcular/mencionar antigüedad frente al reloj del sistema o calificar la foto de obsoleta/stale, incluso al advertir que no es live. Hash activo nuevo: `64c35dc7e78d558c4329d58c1ba62f733c0dc28bef248db358527d2cabe9d135`; `forex_v1` permanece inmutable. Acumulado: `forex_v1` 0/4 funcional; `forex_v1.1` 3/7 funcional; total 3/11 (27,3%). Estrategias: 9; GO del modelo: 3; aceptadas manualmente: 1. Esta R2 no cuenta para el quórum; debe repetirse sobre `64c35dc7…be9d135` seguida de dos runs limpios.

### Pausa de cuota — R2 del hash definitivo interrumpido

Se inició `real-forex-20260902165546-r2-trend` sobre el hash definitivo `64c35dc7e78d558c4329d58c1ba62f733c0dc28bef248db358527d2cabe9d135`. Antes de la petición de detener el consumo completaron `fx-structure`, `fx-momentum-volatility` y `fx-session`; `fx-macro` se omitió según contrato. La ejecución estaba en `fx-strategy` cuando se envió `Ctrl+C`. El archivo persistido quedó con `status=error`, sin `finalState`, sin estrategia ni veredicto; estrategia, riesgo, crítico y juez muestran el error genérico de reinicio del servidor provocado por la interrupción.

Este intento se clasifica como **`USER_ABORTED_QUOTA_GUARD`** a efectos del informe: no demuestra un defecto del modelo, del preset ni del runner, no se incluye entre los 11 runs completados/evaluables, no altera la tasa 3/11 y no puede participar en el quórum. Tras detenerlo no se hicieron nuevas llamadas a Claude/OmniRoute/Antigravity, no se ejecutaron más escenarios ni tests y no quedó una llamada Claude nueva en curso. No se abrió ni cerró MetaTrader y no hubo ninguna ruta live.

### Estado documentado y trabajo pendiente — modo ahorro de cuota

Avance consolidado:

- FASE 0 e infraestructura C1–C16 completadas; `forex_v1` permanece inmutable y documentado por separado: 4 runs, 0 GO, contrato y gate determinista correctos, juez sobre-bloqueante; superado por `forex_v1.1`.
- 11 runs completados/evaluables más 1 intento interrumpido por el usuario. Resultado evaluable: 3/11 funcionales (27,3 %), 9 estrategias persistidas, 3 GO del modelo y 1 estrategia aceptada manualmente como evidencia histórica. Ninguna satisface el quórum del hash activo.
- Última verificación de código anterior a la pausa: `npm run typecheck` PASS, `npx vitest run` 19 archivos / 99 tests PASS y `npm run build` PASS con el warning conocido del chunk. No se repiten en este checkpoint documental.
- FASE 5 no iniciada para una estrategia final: 0 artefactos MQL5 definitivos, 0 compilaciones MetaEditor definitivas y 0 smoke backtests definitivos. Los controles estáticos y smoke de fixture previos no sustituyen este gate.
- Estado formal: **`EN_VALIDACION` / pausa operativa solicitada por el usuario**. No cumple `VALIDATED_REAL`, `VALIDATED_ANALYSIS_AND_COMPILE` ni un cierre `UNSTABLE`; la evidencia simplemente está incompleta.

Pendiente, en este orden y únicamente cuando el usuario autorice reanudar con cuota disponible:

1. Repetir una sola vez R2 sobre `baseline-forex-forex-v1-1` y hash exacto `64c35dc7…be9d135`; auditarlo automática y manualmente y documentar/commitear el resultado antes de otra corrida.
2. Si R2 es limpio, ejecutar R3 y R4 uno a uno hasta reunir R2 + dos corridas consecutivas limpias del mismo hash. Son como mínimo tres runs completos para el quórum; no se repetirán para perseguir un GO.
3. Completar después la matriz restante R1, R5a y R5b, cada escenario una sola vez y con checkpoint documental. Los escenarios negativos deben demostrar abstención correcta, no generar estrategia.
4. Solo con un run `finalState=validated`, `go`, 0 blockers y quórum limpio: generar el MQL5 con optimización desactivada, revisar fidelidad/seguridad, compilar con 0 errores y ejecutar un smoke headless si `terminal64.exe` está cerrado. Si está abierto, registrar `BLOCKED_EXTERNAL_MT5_RUNNING` sin cerrarlo.
5. Ejecutar una única verificación final proporcionada al cambio realizado: tests focales solo si se modifica código; `typecheck` + suite + build una vez al cierre. Actualizar matriz, estado final e índice y crear el commit final sin push.

Política de consumo para la reanudación:

- Nada de sondeos periódicos `claude -p "ping"`; como máximo uno inmediatamente antes de una corrida autorizada.
- Una corrida a la vez, sin paralelismo de modelos, sin reintentos automáticos para conseguir GO y parada inmediata ante el primer aviso de cuota.
- Auditoría determinista, lectura de artefactos, redacción y commits se hacen localmente con Codex; no se delegan a otro modelo ni consumen llamadas Claude.
- Actualizaciones al usuario solo en hitos (run terminada, defecto real o bloqueo), evitando mensajes y ciclos de inspección redundantes.
- El presupuesto estimado observado sigue siendo 15–30 minutos por run completo, con varias llamadas `claude:sonnet`; antes de cada nueva corrida se priorizará preservar cuota sobre completar rápidamente la matriz.

### C17 — carril estructural `forex_v1.2` por OmniRoute

Para evitar que la validación repetitiva consuma las suscripciones destinadas a otros proyectos, se publica `baseline-forex-forex-v1-2`, hash `feddf9d404020de68e6884a519cb6b558292e98e846e1e77bd5bf35145434cdc`. Es una copia independiente de `forex_v1.1`: mismos ocho agentes, prompts, dependencias, activación, contratos, capacidades, consenso y risk gate; la única diferencia funcional es `model=omniroute:auto/best-fast` en todos los agentes. `forex_v1` y `forex_v1.1` mantienen sus hashes y modelos.

Alcance deliberado: v1.2 sirve para probar serialización, selección/omisión de agentes, transferencia de contexto, schemas de análisis/estrategia/veredicto, revisiones, persistencia y auditoría determinista. No sustituye una validación representativa con los modelos Claude/Codex que harán los análisis finales. `generateValidatedForexMql5.ts` continúa exigiendo explícitamente `baseline-forex-forex-v1-1`, por lo que un GO estructural de v1.2 no puede saltarse el gate de MQL5.

Guard de coste: el prefijo explícito `omniroute:` es resuelto por `llmRouter` únicamente hacia `omniClient`; su fallback permanece dentro de modelos OmniRoute y nunca cae en Claude o Codex. Comprobación local, sin llamadas LLM: `npx vitest run test/baselinePresets.test.ts` 4/4 PASS y `npm run typecheck` PASS. La matriz estructural se ejecutará con `FOREX_VALIDATION_PRESET_ID=baseline-forex-forex-v1-2`, un escenario por vez y sin reintentos destinados a perseguir GO.

Primer smoke real: `real-forex-20260902204943-r5a-absent`, 8 s. Con `marketSnapshot=null`, `fx-session` fue el único agente ejecutado porque `session_clock` seguía disponible; devolvió el contrato estructurado esperado. `fx-structure`, `fx-momentum-volatility` y `fx-macro` se omitieron por `DATA_NOT_AVAILABLE`; estrategia, riesgo, crítico y juez se omitieron por dependencias. Resultado correcto: `status=done`, `finalState=insufficient_data`, 0 agentes en error, sin estrategia ni veredicto. `auditRealForex.ts`: **OK**, sin hallazgos. Esto valida el caso negativo y la ruta OmniRoute con una sola llamada; no hubo llamadas Claude/Codex.

Acumulado evaluable: `forex_v1` 0/4 funcional, `forex_v1.1` 3/7 y `forex_v1.2` estructural 1/1; total 4/12 (33,3 %). El siguiente escenario estructural útil es R2, que cubre los tres tipos de salida y la transferencia completa de contexto.

---

## Handoff original — recibido por Codex

Motivo del handoff: cuota general de Claude limitada. Los agentes siguen siendo `claude:sonnet` (inherente a validar `forex_v1`); lo que se delega es la **orquestación** (lanzar scripts, auditar, generar/compilar/backtestear MQL5, redactar, commit).

Carta de trabajo para codex: **`trading-agents-dashboard/server/scripts/HANDOFF_CODEX.md`** (creada en este checkpoint). Resumen de lo que falta:

1. **FASE 1** — re-ejecutar `r1-current` (ya con C2) y ejecutar `r2-trend`, `r3-range`, `r4-highvol`, `r5a-absent`, `r5b-stale`:
   `npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts <id>` (uno a uno; ~15–30 min c/u).
2. **FASE 2–4** — `npx tsx --env-file-if-exists=.env scripts/auditRealForex.ts` + revisión manual de cada `AgentAnalysis` contra su snapshot (contratos, activación/omisión, transferencia de contexto, DATO/INFERENCIA/HIPÓTESIS/CONCLUSIÓN, alucinaciones). Re-cálculo determinista de toda estrategia GO (el audit ya lo hace vía `validateStrategyProposal`).
3. **FASE 5** — SOLO desde un run `finalState:validated` + veredicto `go` + 0 `unresolvedBlockers` + estrategia exacta: generar MQL5, verificar fidelidad de `condicionEntrada`, compilar con MetaEditor (0 errores), smoke backtest headless (MT5 `terminal64.exe` está CERRADO → puede correr; si se abre, registrar `BLOCKED_EXTERNAL_MT5_RUNNING`, **no cerrarlo**).
4. **FASE 6** — clasificar defectos, corregir causa raíz en el repo, test de regresión, `typecheck`+`test`+`build` verdes, repetir el escenario + 2 corridas consecutivas sin regresión.
5. **Docs** — completar este informe (matriz de runs, informes por agente, afirmaciones contrastadas, gates, artefactos MQL5, compilaciones, backtests, defectos, tests, métricas, limitaciones, estado final) + actualizar [`00_INDEX.md`](../00_INDEX.md). No borrar informes previos.
6. **Commit** — convencional, sin push, sin `README.md`, sin datos runtime (`src/data/` está gitignored salvo `agents.json`/`pairs.json`; no incluir `agents.json` si el server lo reescribió). Mensaje: `fix(forex): validate real agent analysis and MQL5 pipeline`.

**Criterio de estado final** (§CRITERIO del prompt): `VALIDATED_REAL` solo si análisis + estrategia + compilación + smoke backtest realmente validados y varias corridas reproducibles; si el backtest queda bloqueado externamente → `VALIDATED_ANALYSIS_AND_COMPILE` o `BLOCKED`. **No forzar GO, no debilitar gates, no optimizar rentabilidad, no avanzar a ACCIONES.**

## Limitaciones conocidas

- Sin feeds verificados de macro/noticias → `fx-macro` siempre se abstiene; su comportamiento con fuente real no puede validarse aquí.
- `npm run lint` bloqueado por WDAC en la máquina (no por el código).
- Latencia real: ~100–240 s por llamada `claude -p`; un run completo ~15–30 min. Persistencia sobre SMB añade overhead entre agentes.
- El audit de alucinaciones de `r1-current` salió con 131 falsos positivos porque ese run se persistió con un script previo a añadir `marketSnapshotUsed`; runs posteriores lo llevan y el audit ya lo detecta y avisa.

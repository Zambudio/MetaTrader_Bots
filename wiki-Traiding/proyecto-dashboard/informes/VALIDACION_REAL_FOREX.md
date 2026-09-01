# Validación REAL de FOREX `forex_v1` (EUR/USD, H1)

Fecha de inicio: 2026-08-30. Fase: **validación de comportamiento real** (modelos reales `claude:sonnet` vía CLI de suscripción, datos históricos verificables, informes reales de agentes) — posterior a [`VALIDATION_LOOP.md`](VALIDATION_LOOP.md), que solo comprobó contratos/aislamiento/orquestación con ejecutor simulado determinista.

Seguridad: **0 órdenes live, 0 capital, 0 llamadas de ejecución**. Solo análisis, datos históricos, compilación MQL5 y backtest headless sin órdenes live. MetaTrader no se cierra en ningún caso.

Relacionados: [auditoría](AUDITORIA_MULTIAGENTE.md) · [config Forex](CONFIGURACION_FOREX.md) · [validation loop simulado](VALIDATION_LOOP.md) · [estado final](ESTADO_FINAL_CONFIGURACIONES.md).

> **ESTADO FINAL DE ESTA EJECUCIÓN: `BLOCKED`.**
> La baseline original `forex_v1` reprodujo defectos reales de prompt/modelo y el CLI de Claude agotó el límite de sesión (`resets 2:40am Europe/Madrid`). Se publicó `forex_v1.1` sin sobrescribir v1, pero no pudo someterse todavía a la matriz real completa. No existe GO elegible; por tanto no se generó MQL5 ni se abrió MetaTrader.

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

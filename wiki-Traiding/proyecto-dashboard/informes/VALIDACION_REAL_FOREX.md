# Validación REAL de FOREX `forex_v1` (EUR/USD, H1)

Fecha de inicio: 2026-08-30. Fase: **validación de comportamiento real** (modelos reales `claude:sonnet` vía CLI de suscripción, datos históricos verificables, informes reales de agentes) — posterior a [`VALIDATION_LOOP.md`](VALIDATION_LOOP.md), que solo comprobó contratos/aislamiento/orquestación con ejecutor simulado determinista.

Seguridad: **0 órdenes live, 0 capital, 0 llamadas de ejecución**. Solo análisis, datos históricos, compilación MQL5 y backtest headless sin órdenes live. MetaTrader no se cierra en ningún caso.

Relacionados: [auditoría](AUDITORIA_MULTIAGENTE.md) · [config Forex](CONFIGURACION_FOREX.md) · [validation loop simulado](VALIDATION_LOOP.md) · [estado final](ESTADO_FINAL_CONFIGURACIONES.md).

> **ESTADO: EN CURSO — `UNSTABLE` (a la espera de re-ejecución tras corrección C2).**
> Trabajo restante delegado a `codex exec` (cuota separada). Ver §"Handoff — pendiente".

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

### R2–R5: **PENDIENTES** (no ejecutados).

---

## Handoff — pendiente (delegado a `codex exec`, cuota ChatGPT separada)

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

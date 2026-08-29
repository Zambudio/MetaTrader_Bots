---
tags: [proyecto-dashboard, agentes, mql5, backtest, loop, autonomo, en-curso]
updated: 2026-08-29
---

# Registro vivo: bucle autónomo hasta Quality Gate verde en EUR/USD H1

> Registro de la ejecución del plan [`../planes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md). `## Estado actual` se reescribe entero en cada iteración; `## Log de iteraciones` es append-only. **En curso** — este informe no está cerrado hasta que el Quality Gate pase 6/6 o el bucle se detenga por otra condición de parada.

## Estado actual

- **Iteración:** 3 en curso. **PRIMER `go` del proyecto** (run 6, `retryCount 0`). **PRIMER backtest real** ejecutándose ahora (job MQL5 `yhJtlWyQiUuN`).
- **Fase:** Paso 3 (generación MQL5 + backtest real). A la espera del `job.result`.
- **Hipótesis viva (confirmada por Codex, iter 3):** el panel confundía "apto para backtest" con "validado para operar en vivo" → **dependencia circular**: exigía KPIs de backtest *antes* de permitir el backtest que los produce. Runs 4 y 5 fueron **falsos negativos** (tesis limpias bloqueadas). Solución aplicada: redefinir refutador + razonador como **gate de elegibilidad estructural** con lista cerrada de bloqueantes.
- **Cambios ya probados y su efecto:**
  - **Roster 6 agentes → `cerebras/gpt-oss-120b`** (iter 2, instrucción de Pedro). Infra resuelta; pipeline completa sin errores. Sincronizado en `agents.json` / `agentsStore.ts` / preset `agentConfigs.json`.
  - **`agente-riesgo` + "RESTRICCIONES BLOQUEANTES DE SALIDA"** (iter 2): máx 2 predicados, no sobreventa→SELL, R:R ≥ 1.60, SL 1.25–2.5 ATR. Efecto: tesis mecánicamente sanas (R:R correcto, sin RSI<30). Efecto pendular: reglas de tipo "estado" poco discriminantes (`cierre<EMA20 Y EMA20<EMA50`).
  - **`agente-refutador` + `agente-razonador` + "GATE DE ELEGIBILIDAD PARA BACKTEST"** (iter 3, Codex): lista cerrada de 5–6 bloqueantes (geometría invertida, dirección contra-tendencia clara, condición no mecánica / >2 predicados, R:R<1.50, SL fuera de 1–2.5 ATR sin justificación, niveles ausentes/invertidos) + lista de lo que NO bloquea (3er filtro, momentum del snapshot, R:R>mínimo, datos ausentes, KPIs de backtest, sobreoperación teórica). Efecto: **run 6 → `go` a la primera** con la tesis `price_close < EMA20 AND EMA20 < EMA50` (SELL, R:R 1.60).
- **Progreso hacia verde:** 0/6 criterios aún, pero **el pipeline llegó por primera vez al Paso 3**. El backtest real está corriendo. Es el hito que faltaba desde el inicio del proyecto.
- **Notas de cuota:** Claude ~$10.7 de sesión (3 iteraciones, mucha orquestación + polling + el peso de GateGuard interrogando cada edición). Codex: 2 `exec` (runs 3 y 4/5), ambos respondieron; el de iter 3 tuvo problemas leyendo el disco de red pero completó del brief detallado. Cuota Codex sana.
- **Siguiente acción concreta:** esperar `job.result` de `yhJtlWyQiUuN`. Si `qualityGate.passed` → **TERMINADO** (cierre, commit final, `stop`). Si `compileStatus: errors` / `discarded` / `qualityGate.passed=false` → **Paso 4** (Codex diagnostica con las métricas reales) → iteración 4.

## Log de iteraciones

### Iteración 1 (2026-08-29 08:35) — SALTADA (infraestructura)

- **Contexto:** n/a — no se llegó a veredicto ni a generación de código.
- **Paso 0 (salud del entorno):** OK. Backend ya activo en `:5175` (`/api/agents` → 200). Caché EUR/USD H1 caliente: 5000 velas, `2026-02-01` → `2026-08-29` (fresca a hoy). `metaeditor64.exe` y `terminal64.exe` presentes en `C:\Program Files\MetaTrader 5\`.
- **Paso 1 (análisis):** 2 runs, ambos muertos por `OmniRoute respondió 503` (upstream provider `oc/deepseek-v4-flash-free` no disponible):
  - `QaJNFW28SK`: completó 5/6 agentes + 2 reintentos internos del orquestador (veredicto "ajustar" ×2, `retryCount` llegó a 2). `agente-razonador` (el veredicto) → 503. Estrategia de `agente-riesgo`: SELL pullback a EMA20/SMA20 (~1.1598), `condicionEntrada = "Cierre de vela H1 por debajo de EMA(20) Y al menos una de las 3 velas previas cerró por encima de EMA(20) Y RSI(14) < 65"`, entry 1.1595 / SL 1.1610 / TP 1.1572, R:R 1:1.53, riesgo 1%.
  - `EuwWXli9dU` (reintento único, plan §Paso 1): `agente-riesgo` → 503 tras ~3 agentes. Falló antes que el primero.
- **Métricas backtest:** n/a (nunca se generó `.mq5`).
- **Clasificación Codex:** n/a (no invocado — no hay fallo del pipeline que diagnosticar, solo indisponibilidad del proveedor LLM).
- **Cambio aplicado:** ninguno de código ni de prompt. Solo este registro.
- **Commit:** este mismo commit (`loop(iter 1): saltada por OmniRoute 503`).
- **Cuota:** Claude bajo. Codex sin usar. OmniRoute degradado (`poolSize` 22→18, 503 en free endpoints).
- **Observación (candidata — NO aplicar aún):** si OmniRoute free tumba runs de forma recurrente en próximas iteraciones, evaluar (a) fijar modelos no-free en el roster de agentes, o (b) subir reintentos/backoff ante 503 en `omniClient.ts`. Solo si se confirma patrón en 2+ iteraciones; este episodio por sí solo no lo justifica.

### Iteración 2 (2026-08-29 09:23) — 2 cambios ligados · NO_GO ×2 · progreso diagnóstico

- **Contexto:** `NO_GO` (veredicto `ajustar` tras agotar `maxRetries=3`, ambos runs). Nunca se generó `.mq5`.
- **Paso 0:** OK (backend `:5175` → 200; caché EUR/USD H1 5000 velas fresca; MT5 presente).
- **Cambio 1 — infra (instrucción de Pedro "cambia los motores de los agentes"):** probé ~25 modelos de OmniRoute. `aug/*` (gpt5.x, sonnet5, opus) → 502 (falta CLI `auggie`); `tllm/*` → 403; `groq/*` → 404 (mal enrutado); `gemini/*` → 429 (cooling down); `mistral/*` → 402. **`cerebras/gpt-oss-120b` → 200 en ~1–2 s, tool-calling OK.** Cambié los 6 agentes a ese modelo (3 sitios sincronizados). Los `auto/*` que había colapsaban todos a `gemini-3.1-flash-lite` y a veces a endpoints free caídos (causa de los 503 de iter 1).
- **Paso 1 — run 3 `XmHfVe7C0c`** (modelo nuevo, prompt viejo): **primer ciclo completo sin errores del proyecto.** `retryCount` 3/3, veredicto `ajustar`. `condicionEntrada = "Cierre de la vela bajo EMA20 Y EMA20 < EMA50 Y RSI(14) < 30 Y MACD_histogram > 0"` (4 filtros; `RSI<30` como gatillo de SELL, casi contradictorio con `MACD_hist>0`). entry 1.1582 / SL 1.1595 / TP 1.15626, R:R real 1.4923 (< 1.50).
- **Paso 4 — Codex** (`codex exec --sandbox read-only -c model_reasoning_effort=high`, ~15 min): clasificó **tipo I**. Causa raíz: `agente-riesgo` incumple su propio prompt (apila 4 filtros, usa sobreventa como gatillo, R:R por debajo del mínimo, SL pegado a EMA20). `validateStrategyProposal()` solo mira geometría/campos/R:R y con `minRr=1.49`. Descalibración secundaria confirmada del panel (refutador+razonador exigen backtest inexistente). **Arreglo (c) NO justificado aún** (nunca se ha llegado a un GO). Salida completa en `scratchpad/codex-out-2.txt`.
- **Cambio 2 — diagnóstico Codex:** añadido al final de `agente-riesgo.systemPrompt` el bloque "RESTRICCIONES BLOQUEANTES DE SALIDA" (máx 2 predicados; prohibido sobreventa→SELL y momentum contrario; R:R ≥ 1.60; SL 1.25–2.5 ATR más allá de la invalidación). Sincronizado en `agents.json`, `agentsStore.ts` (`DEFAULT_AGENTS`), preset `agentConfigs.json`. `tsc --noEmit -p server` limpio.
- **Paso 1 — run 4 `PvPUMJXmAP`** (modelo + prompt nuevos): `retryCount` 3/3, veredicto `ajustar`. `condicionEntrada = "cierre < EMA20 Y precio < SMA200"` (**2 predicados**, sin RSI), entry 1.15823 / SL 1.1598 / TP 1.15523, **R:R 1.91**. Los defectos mecánicos de Codex, corregidos. Objeciones nuevas del razonador: (1) SL a 0.33 pips de EMA20 (pide moverlo al swing-high ~1.1650, lo que rompería el R:R), (2) "momentum contradictorio RSI 23.8 / MACD hist +" del snapshot puntual, (3) "`precio < SMA200` redundante, exige `EMA20<EMA50<SMA200`" (contradice el máx-2-predicados), (4) TP "poco realista" bajo la banda de Bollinger. El refutador añadió un punto **válido**: con precio bajo EMA20, `precio<SMA200` casi siempre se cumple → la regla ≈ "cierre<EMA20", poco discriminante.
- **Métricas backtest:** n/a (no se llegó a Paso 3 en ninguno de los 2 runs).
- **Clasificación Codex:** tipo I (run 3). El run 4 aún no diagnosticado por Codex → iteración 3.
- **Commit:** este mismo commit (`loop(iter 2): roster a cerebras/gpt-oss-120b + restricciones de salida en agente-riesgo`). `agentConfigs.json` no entra (gitignored); cambio aplicado en local.
- **Cuota:** Claude moderado (~$5 sesión). Codex 1 llamada, OK.
- **Candidatos anotados (Codex OTROS_CANDIDATOS, NO aplicar aún):** (i) bloque a `agente-razonador` prohibiendo objeciones por falta de KPIs de backtest [texto ya redactado por Codex]; (ii) alinear `strategyValidator.ts` `minRr` 1.49 → 1.50; (iii) `agente-refutador`: corregir geometría direccional SL/TP y prohibir umbrales absolutos de MACD sin normalizar por ATR; (iv) `agente-fundamental` inventa noticias — investigar aparte, no fue causa de este NO_GO.

### Iteración 3 (2026-08-29 10:05) — gate de elegibilidad al panel · PRIMER GO · PRIMER BACKTEST

- **Contexto:** NO_GO persistente. Runs 4 y 5 (config de iter 2) confirmaron el patrón: `agente-riesgo` ya produce tesis mecánicamente sanas pero `agente-razonador` nunca da `go`.
- **Paso 0:** OK.
- **Paso 1 — run 5 `JP_clZd_s9`** (2º punto de datos): veredicto `ajustar`, `retryCount 3/3`. Tesis **buena**: `condicionEntrada = "Cierre anterior >= EMA20 Y Cierre actual < EMA20"` (cruce genuino, evento, 2 predicados independientes), R:R exactamente 1.60, geometría SELL correcta, SL = 2 ATR — el propio Validador la declara correcta. El razonador la bloquea con 7 objeciones: pide más filtros (contra el máx-2), juzga el momentum del snapshot puntual, **escala el R:R exigido a ≥2.0**, pide volumen/ADX/correlación de cartera/calendario (nada de eso está en el snapshot).
- **Paso 4 — Codex** (`codex exec ... model_reasoning_effort=high`; ~15 min; problemas de permisos leyendo `N:\` y `\\Zambu-nas\`, completó del brief detallado + acabó leyendo ficheros). Clasificó **tipo I — panel pre-backtest mal calibrado → falsos negativos**. Causa raíz: el panel confunde "apto para backtest" (lo único que `go` habilita) con "validado para operar en vivo" → **dependencia circular** (exige KPIs de backtest antes de permitir el backtest). También detectó errores aritméticos del refutador (llama "157 pips" a 15.7 pips). Recomendó **opción C**: refutador + razonador como un único cambio lógico. Salida completa en `scratchpad/codex-out-3.txt`.
- **Cambio aplicado (Codex, opción C):** bloque **"GATE DE ELEGIBILIDAD PARA BACKTEST"** al final de `agente-refutador.systemPrompt` y **"DECISIÓN DE ELEGIBILIDAD PARA BACKTEST"** al final de `agente-razonador.systemPrompt`. Lista cerrada de bloqueantes + lista explícita de lo que NO bloquea + caso de referencia obligatorio. Sincronizado en `agents.json` / `agentsStore.ts` / preset. `tsc --noEmit -p server` limpio.
- **Paso 1 — run 6 `1UiUjk-6tP`** (verificación): **veredicto `go`, `retryCount 0`** (primera pasada, sin reintentos). **PRIMER `go` DEL PROYECTO.** Tesis: `price_close < EMA20 AND EMA20 < EMA50` (SELL, entry 1.15823 / SL 1.15937 / TP 1.15641, R:R 1.60). Nota: es de nuevo una regla de tipo "estado" (dispara en ~cada vela bajo EMA20 en tendencia bajista) — probablemente muchas operaciones sin ventaja; el backtest real lo dirá.
- **Paso 3 — generación MQL5 + backtest:** job `yhJtlWyQiUuN` lanzado con `model: "cerebras/gpt-oss-120b"` y `runId` (para que se dispare `retryStrategyForBacktestFailure`). **EN CURSO al escribir esto.**
- **Métricas backtest:** pendientes (job en curso).
- **Clasificación Codex:** tipo I.
- **Commit:** este mismo commit (`loop(iter 3): gate de elegibilidad para backtest en refutador+razonador -> primer GO`). El resultado del backtest se registra al completarse el job (posible commit adicional o inicio de iteración 4).
- **Cuota:** Claude ~$10.7 sesión. Codex 2 llamadas OK.
- **Verificación de que no se relajó demasiado (Codex COMO_VERIFICAR, pendiente si hay dudas):** batería de casos — control positivo (run 5 → GO), geometría invertida → AJUSTAR, contra-tendencia → AJUSTAR, no mecánica → AJUSTAR, R:R 1.49 → AJUSTAR, SL 0.3/6 ATR → AJUSTAR, objeciones espurias del refutador → sigue GO.

## Ver también

- [`../planes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md) — el plan / carta operativa que este informe registra.
- [`2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md`](2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md) — estado del sistema justo antes de este bucle.

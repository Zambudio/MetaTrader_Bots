---
tags: [proyecto-dashboard, agentes, mql5, backtest, loop, autonomo, en-curso]
updated: 2026-08-29
---

# Registro vivo: bucle autónomo hasta Quality Gate verde en EUR/USD H1

> Registro de la ejecución del plan [`../planes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md). `## Estado actual` se reescribe entero en cada iteración; `## Log de iteraciones` es append-only. **En curso** — este informe no está cerrado hasta que el Quality Gate pase 6/6 o el bucle se detenga por otra condición de parada.

## Estado actual

- **Iteración:** 2 completada. (Iteración 1 saltada por infra.) Sigue sin llegarse nunca al Paso 3 (generación MQL5): el panel no da GO.
- **Fase:** cerrando iteración 2 → iteración 3 irá a Paso 4 (Codex diagnostica el run 4).
- **Hipótesis viva:** el bloqueo tiene **dos capas**. (1) `agente-riesgo` oscila entre tesis **demasiado estrictas** (4 filtros apilados + `RSI<30` como gatillo de SELL — run 3) y **demasiado laxas** (2 predicados no independientes: `cierre<EMA20 Y precio<SMA200` ≈ un solo predicado real, el refutador lo señaló — run 4). El punto medio (disparador tipo *evento* de reanudación tras pullback + 1 filtro de régimen) aún no ha aparecido. (2) `agente-razonador` bloquea con `ajustar` tesis mecánicamente limpias: en run 4 objetó el *momentum del snapshot puntual* (RSI 23.8 / MACD hist +) contra el SELL —cuando la `condicionEntrada` ni usa RSI/MACD— y pidió más filtros y "realismo" del TP contra el rango reciente; ambas cosas prohibidas por su propio prompt. Codex clasificó el run 3 como **tipo I** (tesis floja + panel descalibrado).
- **Cambios ya probados y su efecto:**
  - **Roster de los 6 agentes: pools `auto/*` de OmniRoute → `cerebras/gpt-oss-120b`** (instrucción de Pedro). Efecto: **infra resuelta** — los `auto/*` colapsaban a `gemini-3.1-flash-lite` y elegían endpoints free caídos (503). Con `cerebras/gpt-oss-120b` (rápido, fiable, tool-calls OK) el pipeline completa sin errores. Sincronizado en `agents.json`, `agentsStore.ts`, preset `agentConfigs.json`. OmniRoute abandonado como router de agentes.
  - **`agente-riesgo.systemPrompt` + bloque "RESTRICCIONES BLOQUEANTES DE SALIDA"** (máx 2 predicados; prohibido sobreventa→SELL / sobrecompra→BUY / momentum contrario; R:R ≥ 1.60; SL 1.25–2.5 ATR más allá de la invalidación). Diagnóstico Codex del run 3. Efecto (run 4): la tesis pasó a R:R 1.91, 2 predicados, sin `RSI<30` — **los defectos mecánicos que Codex señaló, corregidos**. Pero surgió el efecto pendular: los 2 predicados no son independientes y el veredicto sigue `ajustar` por el panel.
- **Progreso hacia verde:** 0/6 criterios (backtest nunca ejecutado). **Progreso diagnóstico real:** el bloqueo pasó de "tesis mecánicamente rota" a "tesis casi limpia + panel sobre-estricto + predicados no independientes". Cuenta como iteración de progreso.
- **Notas de cuota:** Claude moderado (orquestación + juicio + ediciones; ~$5 de sesión al cerrar iter 2). Codex: 1 `exec` (diagnóstico run 3, `model_reasoning_effort=high`, ~15 min, respondió bien). Cuota Codex sana.
- **Siguiente acción concreta:** Iteración 3 — Paso 0 + Paso 1 (run nuevo; el veredicto seguirá `ajustar` casi seguro) → **Paso 4: Codex diagnostica el run 4**. Decisión pendiente que Codex debe resolver: ¿el cambio de más palanca es (a) fix de `agente-razonador` para que deje de exigir KPIs de backtest y de juzgar el snapshot puntual [Codex OTROS_CANDIDATOS #1, ya redactado], (b) afinar `agente-riesgo` para exigir un disparador tipo evento y predicados independientes, o (c) el Arreglo (b) determinista del plan? Aplicar UNO.

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

## Ver también

- [`../planes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md) — el plan / carta operativa que este informe registra.
- [`2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md`](2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md) — estado del sistema justo antes de este bucle.

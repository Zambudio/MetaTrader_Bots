# Validación REAL de ACCIONES `stocks_v1` (TSLA, H1)

Fecha de inicio: 2026-09-05. Fase: **validación de comportamiento real** (modelos reales `claude:sonnet` vía CLI de suscripción, datos históricos verificables, informes reales de agentes), análoga a [`VALIDACION_REAL_FOREX.md`](VALIDACION_REAL_FOREX.md) pero deliberadamente reducida a 2 escenarios en vez de 6: la validación de FOREX agotó cuota de Claude/Codex con rapidez, y esta validación se completará "una por una en vivo afinando" después de este bloque mínimo. Solo se justifican aquí los dos escenarios que aportan una señal distinta: abstención con datos ausentes (gratis) y una corrida real de la cadena completa.

Seguridad: **0 órdenes live, 0 capital, 0 llamadas de ejecución**. Solo análisis y datos históricos. MetaTrader no se toca en esta fase.

Relacionados: [config Acciones](CONFIGURACION_ACCIONES.md) · [validation loop simulado](VALIDATION_LOOP.md) · [validación real Forex](VALIDACION_REAL_FOREX.md) (mismo método, mismo harness de infraestructura).

> **ESTADO DE LA EJECUCIÓN: `EN_VALIDACION` — bloque mínimo (2/2 escenarios) completado 2026-09-05.** Rama `validacion-real-acciones` (creada desde `validacion-real-forex` para heredar las correcciones genéricas de infraestructura — timeouts, reintentos de CLI, `STRATEGY_VALIDATION_RETRIES`, ventana histórica —, no desde `main`, que carece de ellas). Preset `baseline-acciones-stocks-v1` (`stocks_v1`), hash `bff0aef503604f82da45945d332b0c411319fc7f47196672a78c20fe14c44c3d`.
> **Importante:** `stocks_v1` es la baseline **original sin parchear** — usa los mismos helpers genéricos que `forex_v1` antes de las correcciones de `forex_v1.1` (HISTORICAL_AS_OF, liquidez sin métrica, `condicionEntrada` sobrecargada, etc.). `s2-trend` confirmó con evidencia real (no solo sospecha) que reproduce el mismo `TEMPORAL_CONTEXT_ERROR` y la misma inferencia de liquidez sin métrica ya documentados en `forex_v1` antes de v1.1. Ver §"Cierre de este bloque mínimo" para el detalle y las siguientes sesiones de afinado en vivo.

---

## FASE 0 — verificación de la baseline (✅ PASA)

Preset cargado por el mecanismo real (`agentConfigsStore.getPreset`):

| Campo | Valor |
|---|---|
| id / key / version | `baseline-acciones-stocks-v1` / `ACCIONES` / `stocks_v1` |
| schemaVersion | `multiagent-config.v1` |
| marketType / activo / TF | `stocks` / `TSLA` / `H1` |
| **SHA-256** | `bff0aef503604f82da45945d332b0c411319fc7f47196672a78c20fe14c44c3d` |
| availableCapabilities | `market_snapshot`, `ohlcv`, `session_clock` |
| unavailableCapabilities | `verified_macro_calendar`, `verified_news`, `corporate_fundamentals`, `sec_filings`, `benchmark_data`, `derivatives_metrics`, `on_chain_metrics` |
| consensus | `judge_with_adversarial_review`, juez `stock-judge`, `maxRevisionRounds` 2, `unresolved_blocker_prevents_go` |
| riskPolicy | `maxRiskPercent` 1 · `minRrRatio` 1.6 · `minStopAtr` 1.25 · `maxStopAtr` 2.5 |
| validation | `requireStructuredOutputs` + `requireEvidence` + `deterministicRiskGate` |
| `validatePreset` | VALID |

8 agentes, todos `model: claude:sonnet`, todos `enabled`: `stock-structure`, `stock-volume-gap`, `stock-corporate` (opcional), `stock-market-regime` (opcional), `stock-strategy`, `stock-risk`, `stock-critic`, `stock-judge`.

## Defecto de infraestructura encontrado y corregido antes de correr agentes

**`DATA_ERROR` — multiplicador de pip inexistente para tickers de acciones.** `getInstrumentPipMultiplier` (usado por `computeSnapshotFromCandles` para mostrar `atr14.pipsEstimate` en el snapshot) no tenía caso para acciones: cualquier símbolo sin la forma de 6 letras `BASE+QUOTE` de un par forex caía al valor por defecto `10000`. Para TSLA (ATR de pocos dólares) esto habría mostrado en el snapshot algo como `"ATR: 5.23 (~52300 pips/unidades)"` — un número fabricado por el pipeline, no por el modelo, pero igual de incorrecto. El gate determinista no se veía afectado (`orchestrator.ts` extrae el ATR crudo del snapshot por regex, antes del paréntesis con la estimación en pips), así que ninguna estrategia aceptada hasta ahora estuvo mal evaluada por esto. Corrección: solo un código de 6 letras mayúsculas (forma de par de divisas) usa el multiplicador `10000`; cualquier otro símbolo (TSLA, AAPL, GOOGL...) usa `1`. Regresión: `test/marketSnapshot.test.ts` (nuevo caso + verificación de que `EURUSD`/`EUR/USD` siguen dando `10000`). `npm run typecheck` PASS. Commit `84fc6bd`.

## Harness de validación (mirror reducido de FOREX)

- `scripts/validateRealStocks.ts` — mismo patrón que `validateRealForex.ts`: orquestador real (`executionMode:'real'`), cap `STOCKS_VALIDATION_MAX_REVISION_ROUNDS` (0..2, controla `run.maxRetries` sin tocar el preset ni su hash), guard de entrypoint con `pathToFileURL` (construido correctamente desde el inicio, aprendiendo del defecto encontrado en FOREX).
- `scripts/auditRealStocks.ts` — mismas reglas deterministas que `auditRealForex.ts`, reutilizando las funciones genéricas de `src/validation/forexAuditRules.ts` (no son específicas de EUR/USD salvo `findForexPipArithmeticMismatch`, que aquí **no se usa**: TSLA cotiza en dólares con 2 decimales, no en pips de 4/5 dígitos — una comprobación aritmética específica para acciones queda como limitación documentada, no implementada en este pase mínimo).
- Escenarios (2, no 6): `s1-absent` (snapshot nulo, prueba negativa gratuita) y `s2-trend` (una corrida histórica real para ejercitar la cadena completa al menos una vez).
- Test focal: `test/validateRealStocksRevisionRounds.test.ts` (4 casos, mismo patrón que el de FOREX). `npm run typecheck` PASS. Commit `542f962`.

## Run `real-stocks-20260905080805-s1-absent`

Prueba negativa con `marketSnapshot=null`. Los 8 agentes se omitieron correctamente: `stock-structure`/`stock-volume-gap` por `market_snapshot`/`ohlcv` ausentes, `stock-corporate`/`stock-market-regime` por sus capacidades opcionales ausentes, y `stock-strategy`/`stock-risk`/`stock-critic`/`stock-judge` por dependencia. Resultado: `status=done`, `finalState=insufficient_data`, **0 s, 0 llamadas Claude** (ningún especialista de `stocks_v1` depende solo de `session_clock` como sí lo hacía `fx-session` en FOREX, así que esta prueba negativa es completamente gratuita). `auditRealStocks.ts`: **OK**, 0 hallazgos.

---

## Run `real-stocks-20260905080953-s2-trend`

`claude -p "ping"` respondió `Pong` (único ping de la sesión, inmediatamente antes de la corrida). Controles activos confirmados en log y en el JSON persistido: `AGENT_CLI_RETRIES=0`, `STRATEGY_VALIDATION_RETRIES=0`, `STOCKS_VALIDATION_MAX_REVISION_ROUNDS=0` → `maxRetries:0`, `retryCount:0`; hash del run = `bff0aef503…4c3d` (coincide con el preset). Snapshot Twelve Data reproducible: 4.999 velas H1, apertura de la última vela `2026-06-15T18:30:00Z`, corte `as_of=2026-06-15 20:00:00 UTC`, `dataQuality=stale` (mercado `US_CASH_CLOSED` en el corte — sesión bursátil cerrada a esa hora, no falla de datos). Duración total: 302 s, 3 llamadas `claude:sonnet` (86,1 / 119,0 / 96,2 s).

**Especialistas — contrato válido, pero reproducen el defecto ya conocido de FOREX pre-v1.1.** `stock-structure` y `stock-volume-gap` completaron `done`; `stock-corporate` y `stock-market-regime` se omitieron correctamente `DATA_NOT_AVAILABLE`. Auditoría automática: `TEMPORAL_CONTEXT_ERROR` en ambos + `HALLUCINATION` (liquidez sin métrica) en ambos. Verificación manual contra el JSON persistido, no aceptada automáticamente:

1. **`TEMPORAL_CONTEXT_ERROR` real, no falso positivo.** Ambos especialistas incluyen como *fact* literal: *"Fecha actual del sistema=2026-09-05, es decir ~82 días posteriores al corte del snapshot (2026-06-15)"*, con `source: "system-reminder: Today's date is 2026-09-05"` — usan la fecha real de la sesión de Claude Code (no un dato de mercado) para calificar el snapshot de *"fotografía histórica obsoleta"* y lo listan como **blocker**: *"Snapshot desactualizado en ~82 días... se requiere un snapshot reciente antes de usar este análisis"*. Es exactamente el defecto `TEMPORAL_CONTEXT_ERROR` documentado en `forex_v1` antes de la corrección `HISTORICAL_AS_OF` de `forex_v1.1` — esperable porque `stocks_v1` usa los mismos helpers genéricos sin esa corrección de prompt.
2. **`HALLUCINATION` de liquidez — dos casos, uno claro y uno matizado.** (a) `stock-structure`: *"Mercado cerrado (US_CASH_CLOSED) en el momento del corte, con posible menor liquidez y riesgo de gaps al reabrir sesión"* — infiere liquidez desde el estado de sesión/hora sin ninguna métrica de spread/profundidad; coincide exactamente con el patrón que `forex_v1.1` prohíbe explícitamente tras C8. (b) `stock-volume-gap`: *"Volumen relativo de 0.5x indica baja liquidez/participación en la vela analizada"* — este sí cita una métrica real (ratio de volumen 0.5x), aunque etiqueta el resultado como "liquidez" cuando técnicamente describe participación/volumen, no liquidez de mercado (spread/profundidad). El heurístico de `hasUnsupportedLiquidityClaim` (reutilizado de `forexAuditRules.ts`) no distingue todavía esta diferencia — **limitación conocida del audit, no corregida en este pase mínimo** (queda para el afinado en vivo).
3. Contratos `AgentAnalysis` válidos en ambos (status/bias/confidence 0,25 y 0,15 dentro de [0,1]/dataQuality); DATO con `source` exacto contrastado campo a campo contra el snapshot persistido (precio 409.67001, EMAs, RSI 61.43, MACD, Bollinger, ATR 5.58079, volumen, gap — todos literales); separación DATO/INFERENCIA/HIPÓTESIS/CONCLUSIÓN correcta; ninguna cifra de spread/slippage fabricada; `stock-corporate`/`stock-market-regime` omitidos `DATA_NOT_AVAILABLE` como corresponde.

**Estrategia — rechazada por el gate determinista en el único intento permitido.** `stock-strategy` (96,2 s) falló: *"Incoherencia numérica en estrategia tras 1 intentos: Distancia del Stop Loss = 1.00 ATR; debe estar entre 1.25 y 2.5 ATR."* — **exactamente el mismo tipo de fallo** (SL = 1,00×ATR, justo fuera del límite inferior 1,25) que el primer R2 real sobre `forex_v1.1` (ver [`VALIDACION_REAL_FOREX.md`](VALIDACION_REAL_FOREX.md) §"Continuación 2026-09-05"), en un mercado y baseline distintos. Es un indicio (no una prueba con una sola muestra por mercado) de que el modelo tiende a proponer `SL=1.00×ATR` como valor "redondo" por defecto, justo fuera del rango exigido, y que la política de cero reintentos hace que esta corrida se pierda con frecuencia en el primer intento. Clasificación: `MODEL_ERROR` de contenido, no defecto de infraestructura ni de prompt — no se reintenta automáticamente. `stock-risk`, `stock-critic` y `stock-judge` se omitieron correctamente `MISSING_REQUIRED_DEPENDENCY`. Resultado: `status=error`, `finalState=error`, no funcional.

**Decisión tomada:** por la misma regla aplicada en FOREX, un rechazo de contenido del modelo no se reintenta automáticamente. Este era el segundo y último escenario planificado para este bloque mínimo (`s1-absent` + `s2-trend`); no se lanzan más escenarios en esta pasada.

## Cierre de este bloque mínimo

| escenario | resultado | llamadas Claude | hallazgo principal |
|---|---|---:|---|
| `s1-absent` | `done` / `insufficient_data`, OK | 0 | abstención fail-closed correcta en los 8 agentes |
| `s2-trend` | `error` / no funcional | 3 | especialistas con contrato válido pero reproducen `TEMPORAL_CONTEXT_ERROR` + liquidez sin métrica (defecto conocido de FOREX pre-v1.1); estrategia rechazada por gate (SL 1,00 ATR) |

**Runs:** 2/2 planificados completados. **Éxito funcional:** 1/2 (el escenario negativo). **Estrategias:** 0 propuestas aceptadas (1 rechazada por gate). **MQL5/compilación/smoke:** 0/0/0 — no aplica todavía (no hay quórum ni objetivo de MQL5 en este bloque).

**Defectos encontrados:**
1. `DATA_ERROR` de pipeline (multiplicador de pip para acciones) — **corregido**, ver arriba, commit `84fc6bd`.
2. `TEMPORAL_CONTEXT_ERROR` en ambos especialistas — **defecto real reproducido, NO corregido en este pase**: `stocks_v1` carece de la corrección `HISTORICAL_AS_OF` que sí tiene `forex_v1.1`. Corregirlo requeriría publicar `stocks_v1.1` con aclaraciones de prompt análogas a las de `forex_v1.1`, igual que se hizo para FOREX — se deja pendiente para el afinado en vivo, uno por uno, que pidió el usuario.
3. Inferencia de liquidez desde sesión/hora sin métrica — **defecto real reproducido, NO corregido en este pase**, misma causa que el anterior.
4. Rechazo de estrategia por SL=1,00 ATR — comportamiento esperado de la política de cero reintentos, no un defecto de código; documentado como evidencia cruzada con FOREX.
5. Limitación del audit: `hasUnsupportedLiquidityClaim` no distingue una inferencia de liquidez sin métrica de una etiquetada "liquidez" pero respaldada por una métrica de volumen real — **limitación conocida, no corregida**.

**Estado de este bloque: `EN_VALIDACION` (bloque mínimo completado, sin quórum ni GO — exactamente lo esperado antes de pasar a afinado en vivo).** No se declara `BLOCKED` porque no hay una decisión de cuota pendiente: el bloque planificado (2 escenarios) se completó en su totalidad, con hallazgos reales documentados, tal como pidió el usuario ("pruebas justas, las importantes"). Los defectos 2/3 quedan como diagnóstico para las sesiones de afinado en vivo, no para una corrección automática ahora.

**Tests y comandos ejecutados:** `npx vitest run test/marketSnapshot.test.ts` (4/4), `npx vitest run test/validateRealStocksRevisionRounds.test.ts` (4/4), `npm run typecheck` (PASS ×2), `scripts/validateRealStocks.ts s1-absent`, `scripts/validateRealStocks.ts s2-trend`, `scripts/auditRealStocks.ts` (×2). No se ejecutó la suite completa ni el build (reservados para un cierre posterior si procede).

**Commits (rama `validacion-real-acciones`, creada desde `validacion-real-forex`, sin push):** `84fc6bd` (fix pip multiplier), `542f962` (harness), `66af5d7` (docs FASE 0 + s1-absent). Pendiente el commit de este cierre.

**Seguridad:** cero órdenes live, cero capital, cero cuenta live, MetaTrader no tocado, sin push/deploy, `git add` explícito de solo los ficheros propios de esta sesión.

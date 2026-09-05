# Validación REAL de ACCIONES `stocks_v1` (TSLA, H1)

Fecha de inicio: 2026-09-05. Fase: **validación de comportamiento real** (modelos reales `claude:sonnet` vía CLI de suscripción, datos históricos verificables, informes reales de agentes), análoga a [`VALIDACION_REAL_FOREX.md`](VALIDACION_REAL_FOREX.md) pero deliberadamente reducida a 2 escenarios en vez de 6: la validación de FOREX agotó cuota de Claude/Codex con rapidez, y esta validación se completará "una por una en vivo afinando" después de este bloque mínimo. Solo se justifican aquí los dos escenarios que aportan una señal distinta: abstención con datos ausentes (gratis) y una corrida real de la cadena completa.

Seguridad: **0 órdenes live, 0 capital, 0 llamadas de ejecución**. Solo análisis y datos históricos. MetaTrader no se toca en esta fase.

Relacionados: [config Acciones](CONFIGURACION_ACCIONES.md) · [validation loop simulado](VALIDATION_LOOP.md) · [validación real Forex](VALIDACION_REAL_FOREX.md) (mismo método, mismo harness de infraestructura).

> **ESTADO DE LA EJECUCIÓN: `EN_VALIDACION`.** Rama `validacion-real-acciones` (creada desde `validacion-real-forex` para heredar las correcciones genéricas de infraestructura — timeouts, reintentos de CLI, `STRATEGY_VALIDATION_RETRIES`, ventana histórica —, no desde `main`, que carece de ellas). Preset `baseline-acciones-stocks-v1` (`stocks_v1`), hash `bff0aef503604f82da45945d332b0c411319fc7f47196672a78c20fe14c44c3d`.
> **Importante:** `stocks_v1` es la baseline **original sin parchear** — usa los mismos helpers genéricos que `forex_v1` antes de las correcciones de `forex_v1.1` (HISTORICAL_AS_OF, liquidez sin métrica, `condicionEntrada` sobrecargada, etc.). Es esperable reproducir aquí defectos ya documentados en FOREX antes de v1.1.

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

*(Continúa tras el run `s2-trend`.)*

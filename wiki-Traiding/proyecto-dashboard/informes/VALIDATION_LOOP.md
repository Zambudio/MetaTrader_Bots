# Validation loop de baselines multiagente

Fecha: 2026-08-30. Modo: `simulation`. Seguridad: **0 órdenes live, 0 capital real**. Informe máquina: `trading-agents-dashboard/server/src/data/validation-loop-latest.json`; cada run también quedó persistido por el `runsStore` normal.

Relacionados: [auditoría](AUDITORIA_MULTIAGENTE.md), [Forex](CONFIGURACION_FOREX.md), [Acciones](CONFIGURACION_ACCIONES.md), [Cripto](CONFIGURACION_CRYPTO.md) y [estado final](ESTADO_FINAL_CONFIGURACIONES.md).

## Protocolo

Se ejecutó el orquestador real y su persistencia real con ejecutor LLM simulado determinista. No se sustituyó el orquestador por mocks: se recorrieron niveles, dependencias opcionales, activaciones, contratos, gate numérico, juez, estados finales y escrituras a disco. El modo simulado evita coste/variabilidad externa y cualquier posibilidad de ejecución de capital; valida arquitectura, no rentabilidad ni calidad predictiva.

Se cubrieron tendencia alcista, tendencia bajista con mayor volatilidad, lateralidad con snapshot obsoleto, ausencia total de OHLCV y alternancia `FOREX → CRIPTOMONEDAS → ACCIONES → FOREX`. Un run es éxito funcional si termina `done`, no deja agentes `waiting/error`, respeta el roster fijado y produce el estado esperado. Con datos ausentes, `done + insufficient_data` es correcto y más seguro que inventar una estrategia.

## Ciclos y trazas

Prefijo de ejecución: `baseline-validation-20260830141502`.

| Configuración | Escenario/run suffix | Ejecutados | Omitidos | Calidad | Estado final | Resultado |
|---|---|---:|---:|---|---|---|
| FOREX | `forex-trend_bullish` | 7 | 1 macro | good | validated | done |
| FOREX | `forex-trend_bearish_high_volatility` | 7 | 1 macro | good | validated | done |
| FOREX | `forex-sideways_stale` | 7 | 1 macro | stale | validated | done + warning |
| FOREX | `forex-data_unavailable` | 1 sesión | 7 | unavailable | insufficient_data | done + warning |
| ACCIONES | `acciones-trend_bullish` | 6 | 2 corporativo/benchmark | good | validated | done |
| ACCIONES | `acciones-trend_bearish_high_volatility` | 6 | 2 | good | validated | done |
| ACCIONES | `acciones-sideways_stale` | 6 | 2 | stale | validated | done + warning |
| ACCIONES | `acciones-data_unavailable` | 0 | 8 | unavailable | insufficient_data | done + warning |
| CRIPTO | `criptomonedas-trend_bullish` | 6 | 3 derivados/on-chain/regulación | good | validated | done |
| CRIPTO | `criptomonedas-trend_bearish_high_volatility` | 6 | 3 | good | validated | done |
| CRIPTO | `criptomonedas-sideways_stale` | 6 | 3 | stale | validated | done + warning |
| CRIPTO | `criptomonedas-data_unavailable` | 0 | 9 | unavailable | insufficient_data | done + warning |
| FOREX | `forex-isolation_1_trend_bullish` | 7 | 1 | good | validated | done |
| CRIPTO | `criptomonedas-isolation_2_trend_bearish_high_volatility` | 6 | 3 | good | validated | done |
| ACCIONES | `acciones-isolation_3_sideways_stale` | 6 | 2 | stale | validated | done + warning |
| FOREX | `forex-isolation_4_trend_bullish` | 7 | 1 | good | validated | done |

Cada resultado contiene `activationReason` o `omissionReason`, timestamps, duración y contrato estructurado. Se observaron omisiones `DATA_NOT_AVAILABLE` para macro/news, corporativo/SEC/benchmarks y derivados/on-chain/regulación. Los descendientes sin requisito terminado usan `MISSING_REQUIRED_DEPENDENCY`.

## Métricas acumuladas

| Métrica | FOREX `forex_v1` | ACCIONES `stocks_v1` | CRIPTO `crypto_v1` |
|---|---:|---:|---:|
| total_runs | 6 | 5 | 5 |
| successful_runs | 6 | 5 | 5 |
| failed_runs | 0 | 0 | 0 |
| runs_with_warning | 2 | 3 | 2 |
| agent_errors | 0 | 0 | 0 |
| tool_errors | 0 | 0 | 0 |
| contract_errors | 0 | 0 | 0 |
| hallucination_detected | 0 | 0 | 0 |
| invalid_results | 0 | 0 | 0 |
| unexpected_agents | 0 | 0 | 0 |
| missing_agents | 0 | 0 | 0 |
| average_execution_time (ms) | 305 | 280 | 319 |
| success_rate | 100% | 100% | 100% |

Los warnings son deliberados: snapshot obsoleto o datos ausentes. No se rebajaron errores a warnings.

## Persistencia y aislamiento

Se seleccionó cada baseline mediante el store, se volvió a leer desde disco y se comparó SHA-256:

| Configuración | ID | Hash abreviado | Recuperada idéntica |
|---|---|---|---|
| FOREX | `baseline-forex-forex-v1` | `504e6f2a…b8c` | sí |
| ACCIONES | `baseline-acciones-stocks-v1` | `bff0aef5…4c3d` | sí |
| CRIPTO | `baseline-criptomonedas-crypto-v1` | `e0a34c97…00e5` | sí |

Tras la alternancia no hubo prompts, IDs ni parámetros cruzados. El estado activo final quedó en FOREX; cada run histórico permanece aislado por su copia y hash.

## Loop de corrección

| Problema | Clasificación | Corrección | Revalidación |
|---|---|---|---|
| Run dependía del roster global | CONFIGURATION_ERROR | Preset completo + hash; resume/MQL5 usan la copia | verde |
| Fundamental sin fuente y todos activos | DATA_ERROR / AGENT_SELECTION_ERROR | Capacidades, opcionales y `DATA_NOT_AVAILABLE` | verde |
| Revisores en texto libre | CONTRACT_ERROR | `AgentAnalysis` estructurado | verde |
| Riesgo crítico LLM | INVALID_RESULT | Gate de geometría/R:R/risk%/ATR | verde |
| 5 fixtures antiguos sin `condicionEntrada` | CONTRACT_ERROR | Fixtures actualizados | verde |
| Descendientes quedaban `waiting` | ORCHESTRATION_ERROR | `skipped` + razón terminal | verde |
| Fallo de nivel no marcaba run `error` | ORCHESTRATION_ERROR | Propagación explícita | verde |
| No existían métricas agregadas | CONFIGURATION_ERROR | Script reproducible + JSON | verde |

## Tests y cierre

Comandos finales: `npm test --prefix server`, `npm run typecheck --prefix server`, `npm run build` y `npm run validate:baselines --prefix server`.

Resultado del loop: **15 archivos, 58 tests, 58 passed**. Se cubren presets/versiones, round-trip JSON, hashes, DAG, dependencias, retry, selección/omisión, contratos, riesgo numérico, gate agentes→MQL5, nueve ciclos consecutivos, alternancia y métricas. Las tres configuraciones satisfacen la validación funcional; rentabilidad, Sharpe, drawdown y optimización quedan fuera.

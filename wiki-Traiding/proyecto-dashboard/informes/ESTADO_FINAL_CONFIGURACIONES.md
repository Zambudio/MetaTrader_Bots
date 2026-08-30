# Estado final de configuraciones multiagente

Fecha: 2026-08-30. Fase: baseline funcional, anterior a optimización cuantitativa.

| Configuración | Activo prueba | Estado | Runs | Éxitos | Fallos | Success rate |
|---|---|---|---:|---:|---:|---:|
| Forex `forex_v1` | EUR/USD | **VALIDATED** | 6 | 6 | 0 | 100% |
| Acciones `stocks_v1` | TSLA | **VALIDATED** | 5 | 5 | 0 | 100% |
| Cripto `crypto_v1` | BTC/USD | **VALIDATED** | 5 | 5 | 0 | 100% |

`VALIDATED` significa validación funcional en modo seguro de simulación: no implica rentabilidad, robustez estadística ni autorización para operar live.

## Resultado entregado

- Tres configuraciones distintas, versionadas, inmutables, registradas y recuperables.
- Cada run fija configuración, versión y hash; resume y feedback MQL5 no consultan el roster mutable.
- DAG por mercado con especialistas paralelos, dependencias opcionales, validador y crítico antes del juez.
- Contratos estructurados que separan evidencia, inferencia, hipótesis y conclusión.
- Activación/abstención trazable; los datos ausentes no se sustituyen con narrativa.
- Riesgo crítico determinista y separado del LLM.
- MQL5 solo parte de un run validado con GO y sin blockers; no se ejecutó capital real.
- 16 runs persistidos: 0 contaminación, errores de agente, contratos inválidos o alucinaciones detectadas.
- 58 tests verdes, typecheck y build de producción verdes.

## Límites conocidos

Faltan feeds verificables para macro/noticias, fundamentales/SEC/benchmarks, derivados/on-chain/regulación y spread/order book/slippage. Las ramas opcionales se abstienen correctamente; su conducta con una fuente real no puede validarse hasta integrar esos datos. Esto no bloquea la baseline técnica, pero sí limita el análisis semántico disponible.

La siguiente fase puede optimizar por separado agentes, prompts, reglas, indicadores, parámetros, timeframes y backtests. No se ha buscado Sharpe, rentabilidad o drawdown.

Evidencias: [auditoría](AUDITORIA_MULTIAGENTE.md), [Forex](CONFIGURACION_FOREX.md), [Acciones](CONFIGURACION_ACCIONES.md), [Cripto](CONFIGURACION_CRYPTO.md) y [validation loop](VALIDATION_LOOP.md).

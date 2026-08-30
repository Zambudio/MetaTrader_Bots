# Auditoría multiagente de Bots_Traiding

Fecha: 2026-08-30. Estado de auditoría: **COMPLETADA**. Alcance: dashboard, servidor, configuración, prompts, grafo, almacenamiento, datos de mercado, ejecución MQL5, pruebas, logs y tratamiento de errores.

Documentos relacionados: [Forex](CONFIGURACION_FOREX.md), [Acciones](CONFIGURACION_ACCIONES.md), [Cripto](CONFIGURACION_CRYPTO.md), [validation loop](VALIDATION_LOOP.md) y [estado final](ESTADO_FINAL_CONFIGURACIONES.md).

## Conclusión ejecutiva

```text
CONFIGURACIÓN FOREX ACTUAL (PREVIA):
PARCIALMENTE ADECUADA
```

La implementación previa sí era multiagente: había un DAG real, paralelismo por nivel, transferencia del contexto de todos los ancestros, dos revisores, un juez y reintentos acotados. No era una mera concatenación. Sin embargo, no era una baseline Forex reproducible: utilizaba el roster global para cualquier activo, el agente fundamental se ejecutaba sin feeds macro/noticias verificables, tres salidas eran texto libre, los runs no fijaban la configuración y reanudar podía mezclar el estado global actual con un run histórico.

La decisión fue conservar el motor DAG y el límite de debate, y refactorizar selección, contratos, activación condicional, riesgo determinista, persistencia y trazabilidad.

## Arquitectura encontrada

- Cliente React/Zustand: selecciona símbolo/timeframe, administra agentes y presets, presenta grafo, logs, estrategia, veredicto y generación MQL5.
- API Express: rutas de agentes, configuraciones, runs, mercado y MQL5.
- Persistencia JSON: agentes, presets, runs y artefactos MQL5 en `server/src/data/`; escritura serializada y reemplazo atómico con reintento para SMB.
- Datos: Twelve Data para EUR/USD y TSLA; Kraken para BTC/USD; OHLCV e indicadores calculados localmente.
- LLM: router de modelos con salidas libres o herramientas estructuradas; simulador separado para pruebas.
- MetaTrader: generación/compilación/backtest como fase posterior. No existe una ruta que envíe órdenes live desde los agentes.

## Flujo real previo

```text
POST /runs
  ↓
Lee agents.json global y filtra enabled
  ↓
Construye snapshot OHLCV + indicadores
  ↓
Nivel 0 en paralelo: Analista Técnico || Analista Fundamental
  ↓
Gestor de Riesgos → StrategyProposalLite + validación numérica
  ↓
Nivel 2 en paralelo: Validador Técnico || Refutador
  ↓
Razonador → GO / AJUSTAR / NO_OPERAR
  ↓
Si AJUSTAR: reejecuta subgrafo Riesgo → revisores → Razonador (máximo acotado)
  ↓
Resultado; opcionalmente generación MQL5 y backtest determinista
```

`buildLevels` implementaba orden topológico, `ancestorChain` entregaba evidencia ancestral y los hermanos de un nivel se ejecutaban en paralelo. No se hallaron ciclos en el roster efectivo.

## Inventario y selección previa de EURUSD

| Agente | Función real | Activación | Contrato previo | Hallazgo |
|---|---|---|---|---|
| Analista Técnico | Tendencia, momentum, volatilidad y niveles | Siempre | Texto | Demasiadas dimensiones en un solo especialista; sin abstención programática |
| Analista Fundamental | Macro, calendario y noticias | Siempre | Texto | No disponía de calendario/noticias verificadas; ruta directa a afirmaciones no sustentadas |
| Gestor de Riesgos | En realidad sintetizaba estrategia y niveles | Tras ambos analistas | JSON strategy | Rol mal nombrado; mezclaba síntesis LLM con riesgo crítico |
| Validador Técnico | Coherencia, geometría y R:R | Tras estrategia | Texto | Revisión útil, pero no verificable programáticamente |
| Refutador | Busca fallos de la propuesta | Tras estrategia | Texto | Adversarial real, aunque el prompt acumuló reglas repetidas y excepciones |
| Razonador | Juez GO/AJUSTAR/NO_OPERAR | Tras revisores | JSON verdict | Juez existente, pero históricamente sesgado a permitir GO y sin blockers estructurados |

No había agentes desactivados relevantes. Tampoco había especialistas de sesión/spread, macro verificable, volumen/gaps corporativos, benchmarks, derivados u on-chain. TSLA y BTC podían recorrer accidentalmente el mismo roster Forex genérico.

## Auditoría de prompts

| Agente previo | Objetivo/contexto | Restricciones y finalización | Problema principal |
|---|---|---|---|
| Técnico | Snapshot completo; no inventar indicadores | Texto con niveles | Sin esquema DATO/INFERENCIA/HIPÓTESIS/CONCLUSIÓN, calidad o confianza |
| Fundamental | Macro/noticias según timeframe | “Complementar” técnico | Pedía información que ninguna herramienta aportaba; sin `DATA_NOT_AVAILABLE` |
| Riesgo | Dos análisis y snapshot | Regla mecánica, geometría, ATR y R:R | Prompt muy extenso; sintetizador y gestor de riesgo eran la misma responsabilidad |
| Validador | Estrategia y ancestros | Rechazar incoherencias | Texto libre; parte de sus controles debía ser código determinista |
| Refutador | Estrategia y evidencia | Lista cerrada de blockers | Buen principio adversarial, pero reglas duplicadas y parsing frágil |
| Razonador | Todas las ramas | Veredicto acotado | Sin lista estructurada de conflictos resueltos y blockers pendientes |

La nueva baseline elimina instrucciones vagas. Cada especialista tiene responsabilidad, inputs, outputs, herramientas, activación, abstención, peso e intervención. `analysis`, `strategy` y `verdict` son contratos verificables.

## Datos realmente accesibles

| Capacidad | Estado |
|---|---|
| OHLCV, precio, SMA/EMA, RSI, MACD, Bollinger, ATR, rango | Disponible |
| Reloj/sesión determinista y apertura aproximada | Disponible |
| Volumen relativo y gap calculados desde OHLCV | Disponible |
| Spread bid/ask, profundidad, slippage y order flow | No disponible |
| Calendario macro, BCE/Fed y noticias verificadas | No disponible |
| Earnings, guidance, valoración y SEC filings | No disponible |
| Nasdaq/S&P/sector como benchmarks | No disponible |
| Funding, open interest y liquidaciones | No disponible |
| Métricas on-chain | No disponible |

Los especialistas que exigen estas fuentes quedan persistidos pero se omiten con motivo exacto `DATA_NOT_AVAILABLE`; no se simula que la fuente existe.

## Hallazgos y correcciones

1. **Contaminación de configuración**: los runs usaban el roster global, incluso al reanudar o retroalimentar MQL5. Se corrigió fijando una copia completa de la configuración y su SHA-256 en cada run; resume rechaza hashes alterados.
2. **Un preset para todos los mercados**: se publicaron tres IDs/versiones independientes e inmutables.
3. **Agentes siempre activos**: se añadieron reglas `always`, `data_available` y `on_conflict`, dependencias opcionales y razones de activación/omisión.
4. **Texto libre**: se añadió `AgentAnalysis`; evidencia, inferencias, hipótesis, conclusión, confianza, calidad, riesgos, invalidaciones y blockers son campos separados.
5. **Riesgo LLM**: geometría BUY/SELL, R:R mínimo, riesgo porcentual y distancia del stop en ATR se validan en código. El LLM asesora; el gate determinista manda.
6. **Datos ausentes/obsoletos**: ausencia produce `insufficient_data`; obsolescencia queda registrada como `DATA_ERROR` warning y reduce calidad.
7. **Trazabilidad incompleta**: run guarda timestamps, duración, escenario, agentes previstos, configuración, versión, hash, modo, snapshot, capacidades, calidad, errores y razones de omisión.
8. **Downstream inconcluso**: los descendientes de un error/omisión requerido terminan `skipped` con `MISSING_REQUIRED_DEPENDENCY`, nunca eternamente `waiting`.
9. **MQL5 sin gate**: generar desde un run exige estrategia exacta, `finalState=validated`, veredicto GO y cero blockers sin resolver.
10. **Mock no reproducible**: ahora es determinista, numérico, estructurado y deriva entrada/SL/TP del snapshot.

## Seguridad y deuda explícita

Ninguna validación de esta fase envió órdenes ni utilizó capital. Las 16 corridas fueron `executionMode=simulation`. MQL5 permanece después de propuesta → validación → estrategia y se encarga de ejecución/SL/TP/trailing de forma determinista.

Deuda no bloqueante para esta baseline: incorporar feeds verificables con timestamp/source para macro, corporativo, benchmarks, derivados y on-chain; medir rentabilidad/robustez en la fase posterior; dividir el bundle frontend grande señalado por Vite. Estas carencias no se ocultan: activan abstención.

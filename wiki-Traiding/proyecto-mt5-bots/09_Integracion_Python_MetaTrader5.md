# Integración Python + MetaTrader 5

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07

## 1. Paquete oficial [VERIFICADO]

El paquete oficial se llama **`MetaTrader5`** (PyPI), mantenido por MetaQuotes. Se actualiza junto con el propio Terminal — la build 6090 (30/07/2026) incluyó explícitamente una actualización de este paquete (`pip install --upgrade MetaTrader5`), lo que confirma que Terminal y paquete Python evolucionan de forma coordinada, no independiente.

**Mecanismo:** el paquete se comunica con el Terminal mediante **IPC (comunicación entre procesos) directamente con el proceso del Terminal en ejecución** — no es un cliente de red independiente ni reimplementa el protocolo del broker. Esto implica una dependencia dura: **sin un Terminal MT5 abierto y logueado en la misma máquina (o accesible), el paquete Python no funciona**.

## 2. Capacidades oficiales (funciones principales) [VERIFICADO]

| Categoría | Funciones |
|---|---|
| Conexión | `initialize()`, `login()`, `shutdown()`, `version()`, `last_error()` |
| Cuenta/terminal | `account_info()`, `terminal_info()` |
| Símbolos | `symbols_total()`, `symbols_get()`, `symbol_info()`, `symbol_info_tick()`, `symbol_select()` |
| Market Depth | `market_book_add()`, `market_book_get()`, `market_book_release()` |
| Histórico de barras/ticks | `copy_rates_from()`, `copy_rates_from_pos()`, `copy_rates_range()`, `copy_ticks_from()`, `copy_ticks_range()` |
| Órdenes/posiciones activas | `orders_total()`, `orders_get()`, `positions_total()`, `positions_get()` |
| Trading | `order_check()`, `order_send()`, `order_calc_margin()`, `order_calc_profit()` |
| Historial | `history_orders_total()`, `history_orders_get()`, `history_deals_total()`, `history_deals_get()` |

Cobertura completa de lo pedido por el prompt maestro (`initialize, login, terminal_info, account_info, symbols, ticks, bars, Market Depth, orders, deals, positions, history, order_check, order_send`).

## 3. Muy importante: que Python pueda operar no significa que deba ser la ruta principal

`order_send()` en Python **envía órdenes reales igual que `OrderSend()` en MQL5** — no es una simulación. Su existencia es una capacidad técnica, no una recomendación arquitectónica. El principio central del proyecto (`00_Contexto_y_Objetivos_Proyecto.md` §4) es que la **ejecución determinista y continua vive en el EA MQL5**, no en un script Python que dependería de que ese proceso Python esté vivo, con buena conectividad y sin errores no capturados.

### Responsabilidades recomendadas para Python

```text
análisis estadístico
research
ETL de resultados (parsear reportes del Strategy Tester)
comparativas entre estrategias/versiones
Monte Carlo / bootstrap sobre secuencias de trades (ver 07_Backtesting_...)
walk-forward avanzado (orquestar múltiples ejecuciones del tester y consolidar)
reporting (generar StrategyValidationReport, dashboards)
orquestación de experimentos (lanzar backtests, recoger resultados)
machine learning futuro (si se justifica, siempre como generador de señales para *proponer*, no para ejecutar directamente)
```

### Frente a

```text
Ejecución determinista y continua de una estrategia aprobada -> MQL5 EA
```

**Regla de diseño [INFERIDO]:** un script Python puede usar `order_send()` de forma **puntual y supervisada** (por ejemplo, para pruebas manuales controladas o utilidades administrativas), pero **ningún proceso Python debe ser el mecanismo de ejecución continuo y desatendido de una estrategia en producción** — eso viola el principio de "el EA debe seguir funcionando si el servicio de IA/Python cae" (regla 2 de `36. REGLAS PARA EL FUTURO EA EN PRODUCCIÓN` del prompt maestro).

## 4. Evaluación de dependencias y limitaciones [VERIFICADO] / [INFERIDO]

- **Dependencia del terminal local:** obligatoria — el paquete no funciona sin un Terminal en ejecución y logueado.
- **IPC:** comunicación local entre el proceso Python y el proceso del Terminal; no está diseñado como servicio de red remoto per se (para acceso remoto habría que exponer la máquina completa, no el paquete en sí).
- **Windows:** el Terminal MT5 es nativamente Windows (con soporte de macOS/Linux vía capas de compatibilidad para el propio Terminal, ver `01_Arquitectura...`); el paquete Python de MetaQuotes está documentado y probado principalmente sobre Windows. En Linux/macOS dependería de que el Terminal corra vía Wine/capa de compatibilidad, lo cual añade fragilidad — `[PENDIENTE]` verificar soporte oficial multiplataforma del paquete en profundidad si se planteara research en máquina no-Windows.
- **Ejecución 24/7:** un script Python que dependa del Terminal abierto hereda toda la fragilidad operacional del propio Terminal (reinicios, actualizaciones, sesión de Windows) — ver `14_Despliegue_24x7_VPS.md`.
- **Limitaciones en VPS integrado (MQL5 Virtual Hosting):** el VPS de MetaQuotes aloja el Terminal, pero no está pensado para ejecutar procesos Python arbitrarios junto a él — tratado en detalle en `14_Despliegue_24x7_VPS.md`.
- **Seguridad de credenciales:** un script Python que llama a `login()` maneja credenciales de cuenta de trading — deben tratarse con el mismo rigor que cualquier secreto (ver `15_Seguridad_Credenciales_y_Permisos.md`), nunca hardcodeadas ni versionadas.
- **Aislamiento de entornos:** recomendable un entorno Python dedicado (venv/conda) por proyecto, con la versión de `MetaTrader5` fijada y actualizada deliberadamente (no automáticamente), para mantener reproducibilidad de los pipelines de research/backtest.

## 5. Matriz de responsabilidades

| Función | MQL5 | Python | MCP/Agentes | Decisión recomendada |
|---|---:|---:|---:|---|
| Ejecución continua de estrategia aprobada | Sí | No | No | MQL5 EA — único responsable |
| Gestión de SL/TP/trailing en vivo | Sí | No | No | MQL5 EA |
| Backtest / optimización | Sí (Strategy Tester) | Orquestación externa posible | No | MQL5 Strategy Tester como motor; Python como orquestador/analizador de resultados |
| Análisis estadístico avanzado (Monte Carlo, bootstrap, walk-forward multi-símbolo) | Limitado | Sí | No | Python |
| Generación/edición de código MQL5 | — | — | Sí (AI Assistant / Claude Code vía MCP) | Agente IA con revisión humana/CodeReviewerAgent |
| Envío puntual de órdenes de prueba manual supervisada | Sí | Sí (con supervisión) | No (deshabilitado en esta fase) | Cualquiera, siempre en demo, nunca automatizado sin supervisión |
| Lectura de datos de mercado para research | Limitado (requiere EA/script corriendo) | Sí (cómodo para notebooks/pipelines) | Sí (vía MCP, ver `10_MCP_IA_y_Agentes_MetaTrader5.md`) | Python para research batch; MCP para research interactiva con agente |
| Reporting / dashboards | No | Sí | No | Python |

## Fuentes consultadas

- F021 — "MetaTrader5 for Python" (documentación oficial del paquete). https://www.mql5.com/en/docs/python_metatrader5 — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07 — lista completa de funciones, mecanismo IPC.
- F003 (ver [`FUENTES.md`](FUENTES.md)) — confirmación de que el paquete se actualiza junto con el Terminal (changelog build 6090).

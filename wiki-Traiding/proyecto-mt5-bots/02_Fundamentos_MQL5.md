# Fundamentos de MQL5

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> No es un curso de programación. Cubre solo lo necesario para escribir EAs mantenibles en este proyecto.

## 1. El lenguaje [VERIFICADO]

- Sintaxis de tipo C++, compilado a bytecode `.ex5` ejecutado por la máquina virtual MQL5 del Terminal.
- Tipado estático: tipos primitivos, `enum`, `struct`, `class`, con herencia simple e interfaces mediante clases abstractas.
- `input` declara parámetros configurables desde la UI del EA y desde el Strategy Tester (son los "parámetros optimizables" del proyecto — ver `07_Backtesting_Optimizacion_y_Validacion_Quant.md`).
- Arrays y **series temporales**: los arrays ligados a datos de precio (`Open[]`, `High[]`, buffers de indicador, etc.) se comportan como series indexadas desde el presente hacia el pasado salvo que se llame a `ArraySetAsSeries`; esta es una fuente común de errores de "look-ahead" si no se entiende bien la dirección del índice.
- Manejo de errores: no hay excepciones en el sentido de C++/Java; los errores se consultan con `GetLastError()` tras la llamada que falla, y las funciones de trading devuelven código de resultado (`retcode`) explícito — ver `04_Modelo_Trading_Ordenes_Deals_Posiciones.md`.
- Logging: `Print()`, `PrintFormat()`, `Comment()` (en el gráfico) y los logs de `MQL5/Logs` / `MQL5/Files`.
- `#include` para archivos `.mqh` propios o de la Standard Library.
- **Standard Library**: conjunto de clases oficiales (`Include/`), incluida `Trade/Trade.mqh` (clase `CTrade`), colecciones de datos, indicadores en clases, paneles, etc.

## 2. Tipos de programas MQL5 [VERIFICADO]

| Tipo | Rol | Puede operar (enviar órdenes) | Se ejecuta |
|---|---|---|---|
| **Expert Advisor (EA)** | Programa principal de trading algorítmico; vive en un gráfico | Sí | Continuamente mientras el gráfico esté abierto y AlgoTrading habilitado |
| **Indicator** | Calcula y dibuja series derivadas de precio; puede exponer buffers a EAs | No (no debe enviar órdenes; es una violación de responsabilidad) | Continuamente, ligado a un gráfico |
| **Script** | Ejecución puntual bajo demanda (una pasada) | Sí, pero de forma puntual/manual, no continua | Una vez, al arrastrarlo al gráfico |
| **Service** | Programa sin gráfico asociado, ejecutado en segundo plano por el Terminal | Depende del diseño | Continuamente, sin UI |
| **Library** | Código reutilizable (`.ex5` como librería o `.mqh`) | N/A (no es un programa ejecutable independiente) | Enlazada por otros programas |

Para este proyecto: la **lógica de estrategia y ejecución vive en el EA**; los indicadores solo calculan y exponen datos (principio reforzado en `03_Arquitectura_Expert_Advisors.md`).

## 3. Modelo de eventos [VERIFICADO]

Handlers relevantes:

| Handler | Cuándo se dispara |
|---|---|
| `OnInit` | Al cargar el programa, cambiar parámetros de entrada, cambiar cuenta/símbolo/periodo del gráfico, o recompilar |
| `OnDeinit` | Al descargar el programa (cierre de gráfico, recompilación, cierre del Terminal, cambio de símbolo/periodo) |
| `OnTick` | Al llegar una nueva cotización del símbolo del gráfico |
| `OnTimer` | Periódicamente, solo si se activó con `EventSetTimer` |
| `OnTrade` | Tras cualquier cambio en el estado del entorno de trading de la cuenta (más genérico y sin detalle, se dispara después de que la información de cuenta/órdenes/posiciones ya está actualizada) |
| `OnTradeTransaction` | Ante cada transacción de trading procesada por el servidor y reflejada en el Terminal (creación/modificación/eliminación de orden, deal, cambio de historial) — ver detalle abajo |
| `OnBookEvent` | Al cambiar el Market Depth (DOM) de un símbolo suscrito con `MarketBookAdd` |
| `OnChartEvent` | Eventos de interacción con el gráfico (click, teclado, objetos, eventos de usuario) |
| `OnTester` | Al finalizar un pase del Strategy Tester; devuelve el valor usado como criterio de optimización personalizado |
| `OnTesterInit` / `OnTesterPass` / `OnTesterDeinit` | Ciclo de vida de una **optimización**: al iniciar, tras cada pase individual, y al finalizar toda la optimización (se ejecutan en el "gestor" de la optimización, no en cada agente) |

### 3.1 Cola de eventos y sus implicaciones [VERIFICADO]

MQL5 usa un **modelo de un solo hilo por programa**, con una **cola de eventos propia por cada programa cargado**. Los eventos se procesan uno a uno, en el orden de llegada. Puntos críticos para el diseño de EAs:

- **`OnTick` no representa "un hilo por tick"**: si ya hay un evento `OnTick` en cola o en proceso, un nuevo tick **no se vuelve a encolar** (se descarta el duplicado, no el precio — el próximo `OnTick` procesado leerá el precio más reciente disponible en ese momento). Lo mismo aplica a `OnTimer` y a eventos de cambio de gráfico: como máximo un evento de ese tipo pendiente.
- Un handler lento (por ejemplo, un `OnTick` que tarda demasiado) puede hacer que **se acumulen o se descarten** eventos de otro tipo si la cola se satura; un programa mal escrito puede desbordar su propia cola, perdiendo eventos sin aviso.
- **Consecuencia directa para `OnTradeTransaction`**: no existe correspondencia 1:1 garantizada entre una solicitud (`OrderSend`) y los eventos de transacción recibidos; puede llegar más de un evento por la misma solicitud (por ejemplo, creación de orden + ejecución + eliminación de orden pendiente), y el handler debe ser rápido y no bloqueante para no generar backlog. Ver desarrollo completo en `04_Modelo_Trading_Ordenes_Deals_Posiciones.md`.
- Los eventos entre **distintos programas** (EA, indicador, script) tienen colas independientes: no hay orden garantizado de ejecución entre programas distintos, solo dentro de la cola de cada uno.

## 4. `OnTradeTransaction` en detalle [VERIFICADO]

- Recibe tres parámetros: la estructura `MqlTradeTransaction` (qué cambió), y — solo quando la transacción es de tipo `TRADE_TRANSACTION_REQUEST` — también `MqlTradeRequest` y `MqlTradeResult` de la solicitud original, permitiendo correlacionar la respuesta con la petición.
- `ENUM_TRADE_TRANSACTION_TYPE` distingue, entre otros, transacciones sobre **órdenes** (`TRADE_TRANSACTION_ORDER_ADD`, `_UPDATE`, `_DELETE`) y sobre **historial** (`TRADE_TRANSACTION_DEAL_ADD`, `TRADE_TRANSACTION_HISTORY_ADD`, etc.).
- Es el mecanismo recomendado para **reconstruir el estado real** de órdenes/posiciones del EA, en vez de fiarse únicamente del valor de retorno de `OrderSend`.

## 5. Criterio de aceptación

Un desarrollador que lea este documento junto con `04_Modelo_Trading_Ordenes_Deals_Posiciones.md` debe entender que:

1. `OnTick` procesa ticks de forma secuencial, no paralela, y puede saltarse ticks intermedios si el procesamiento anterior no ha terminado — el EA nunca debe asumir que ve "todos" los ticks.
2. Las decisiones de trading tomadas en un `OnTick` no son atómicas con la ejecución real en el broker: hay que confirmar el resultado en `OnTradeTransaction` o consultando el estado real (`PositionsTotal`, `HistorySelect`, etc.).
3. Los indicadores no deben enviar órdenes; separar cálculo (indicador) de decisión y ejecución (EA) es la base de la arquitectura de `03_Arquitectura_Expert_Advisors.md`.

## Fuentes consultadas

- F009 — "Event Handling" (índice) y subpáginas OnTick, OnTradeTransaction, OnBookEvent. https://www.mql5.com/en/docs/event_handlers — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07 — modelo de eventos y cola.
- F010 — "Overview of event handling functions", MQL5 Programming for Traders (book). https://www.mql5.com/en/book/applications/runtime/runtime_events_overview — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07 — comportamiento de la cola de eventos, descarte de eventos duplicados.
- F011 — "Trade Transaction Types" / `ENUM_TRADE_TRANSACTION_TYPE` y "Trade Transaction Structure" / `MqlTradeTransaction`. https://www.mql5.com/en/docs/constants/tradingconstants/enum_trade_transaction_type , https://www.mql5.com/en/docs/constants/structures/mqltradetransaction — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07.

# Arquitectura estándar de nuestros Expert Advisors

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> Diseño conceptual, no implementación. Será la plantilla usada en `18_Primeros_Bots_Laboratorio.md`.

## 1. Principio obligatorio

Las condiciones de entrada/salida de la estrategia **no deben mezclarse** con gestión monetaria, ejecución, logging, tratamiento de errores o reconciliación de estado. Esta separación es lo que permite reutilizar la infraestructura del EA entre estrategias distintas y auditar cada capa por separado (trazabilidad exigida en `16_Observabilidad_Auditoria_y_Reproducibilidad.md`).

## 2. Módulos conceptuales

```text
ExpertAdvisor (orquestador; implementa OnInit/OnDeinit/OnTick/OnTradeTransaction/OnTimer)
│
├── MarketState        # snapshot de precio/spread/sesión/símbolo en el instante actual
├── IndicatorManager    # calcula y cachea indicadores; no decide ni ejecuta
├── StrategySignal      # lógica pura de entrada/salida: (MarketState, params) -> señal
├── SessionFilter        # permite/bloquea operar según horario de sesión
├── SpreadFilter         # permite/bloquea operar según spread actual vs máximo admitido
├── NewsFilter (si aplica) # permite/bloquea operar cerca de eventos de alto impacto
├── RiskManager          # valida límites duros (independiente de la estrategia)
├── PositionSizer        # traduce riesgo objetivo -> volumen concreto, normalizado al símbolo
├── TradeExecutor         # construye MqlTradeRequest y llama a OrderSend/CTrade
├── PositionManager       # gestiona SL/TP, trailing, cierres parciales de posiciones abiertas
├── TradeStateTracker      # reconstruye estado real a partir de OnTradeTransaction/historial
├── Metrics                # contadores/estadísticas en vivo (para health checks futuros)
└── Logger                 # logging estructurado y consistente
```

### Responsabilidad de cada módulo

- **StrategySignal**: única pieza que conoce la hipótesis de la estrategia (cruce de medias, ruptura, RSI, etc.). Entrada: `MarketState` + `parameters`. Salida: una señal discreta (`NONE`, `BUY`, `SELL`, `CLOSE`). No conoce lotes, SL/TP en precio absoluto ni nada de ejecución.
- **RiskManager**: valida que cualquier operación propuesta respete los límites duros del proyecto (`RiskPolicy`, ver `05_Gestion_Riesgo_EAs.md`). Puede **rechazar** una señal válida de estrategia; la estrategia nunca puede saltarse esta capa.
- **PositionSizer**: calcula el volumen a partir del riesgo por operación y la distancia al SL, usando las propiedades reales del símbolo (`SYMBOL_TRADE_TICK_VALUE`, `SYMBOL_VOLUME_STEP`, etc. — nunca supuestos fijos).
- **TradeExecutor**: única pieza que llama a funciones de envío de órdenes. Aísla al resto del EA de los detalles de `MqlTradeRequest`/`retcode`.
- **PositionManager**: gestiona el ciclo de vida de una posición ya abierta (trailing stop, cierre parcial, break-even) — lógica separada de la señal de entrada.
- **TradeStateTracker**: consume `OnTradeTransaction` (y, en `OnInit`, el historial/posiciones existentes) para mantener una vista fiable del estado real, independiente de lo que el EA "cree" haber pedido. Es la pieza que impide duplicar entradas por reinicios o eventos repetidos.
- **SessionFilter / SpreadFilter / NewsFilter**: filtros independientes y componibles; cualquiera puede vetar una entrada sin que la estrategia necesite saberlo.
- **Logger / Metrics**: transversales, usados por todos los módulos anteriores con un formato común.

## 3. `OrderSend` directo vs `CTrade` [VERIFICADO]

MQL5 ofrece dos vías equivalentes en el fondo:

- **Funciones directas** `OrderSend()` / `OrderCheck()` sobre `MqlTradeRequest`/`MqlTradeResult`: control total, más verboso, exige gestionar validación y logging manualmente.
- **Clase `CTrade`** (Standard Library, `Trade/Trade.mqh`): envoltorio orientado a objetos sobre las mismas funciones; añade validaciones adicionales, normalización de parámetros y logging por defecto. Métodos como `PositionOpen()`, `PositionClose()`, `PositionModify()` son la vía "recomendada" por la propia documentación para la mayoría de casos.

**Decisión para el proyecto [INFERIDO]:** usar `CTrade` como base dentro de un **wrapper propio** (`TradeExecutor`), no `CTrade` directamente en la lógica del EA. Razones:

1. Permite inyectar nuestro propio logging estructurado y nuestra propia política de reintentos/errores sin depender de los defaults de `CTrade`.
2. Aísla el resto del código de un eventual cambio de mecanismo de envío (por ejemplo, si en el futuro se necesitara `OrderSendAsync` para algún caso específico).
3. Mantiene el principio de la sección 1: la estrategia nunca toca `CTrade` directamente.

Importante (recordatorio, detalle completo en `04_Modelo_Trading_Ordenes_Deals_Posiciones.md`): tanto con `OrderSend` como con `CTrade`, un resultado "correcto" a nivel de llamada **no implica ejecución completada** — hay que confirmar vía `OnTradeTransaction`/consulta de estado real.

## 4. Magic Number y comentarios de orden [VERIFICADO] / [INFERIDO]

- **Magic Number**: identificador entero que el EA asigna a sus propias órdenes/posiciones (`MqlTradeRequest.magic`). Es el mecanismo estándar para que un EA distinga sus operaciones de las de otro EA o de operaciones manuales del usuario en la misma cuenta.
- **Convención propuesta para el proyecto [INFERIDO]:** un Magic Number único por combinación `(estrategia, versión mayor, símbolo/timeframe si aplica)`, registrado en el `strategy.yaml` de cada versión (ver `08_Ciclo_Vida_y_Versionado_Estrategias.md`), para poder auditar en el historial de la cuenta qué versión abrió cada operación sin ambigüedad.
- **Comentario de orden** (`MqlTradeRequest.comment`, string corto): útil como metadato legible adicional (p. ej. `"v1.2.0"`), pero no debe ser la única fuente de verdad — el broker puede truncarlo o no preservarlo en todos los reportes; el Magic Number es el identificador fiable.

## 5. Estructuras para aislar estrategia de ejecución

`StrategySignal` debe devolver un objeto/estructura de señal, no ejecutar nada directamente. Ejemplo conceptual (ilustrativo, no implementación final):

```text
struct StrategyIntent {
   ENUM_INTENT   type;         // NONE, OPEN_LONG, OPEN_SHORT, CLOSE
   double        stop_loss_price;
   double        take_profit_price;
   string        reason;       // trazabilidad/logging
};
```

`ExpertAdvisor.OnTick()` orquesta: `MarketState` → `IndicatorManager` → `StrategySignal.evaluate()` → filtros (`SessionFilter`, `SpreadFilter`, `NewsFilter`) → `RiskManager.validate()` → `PositionSizer.size()` → `TradeExecutor.execute()`. Cada flecha es un punto donde la operación puede detenerse sin que las capas siguientes se enteren de por qué se originó la señal.

## 6. Plantilla estándar de EA (criterio de aceptación)

```text
MyStrategy_EA.mq5
├── #include "Trade/Trade.mqh"
├── #include "Common/Logger.mqh"
├── #include "Common/RiskManager.mqh"
├── #include "Common/PositionSizer.mqh"
├── #include "Common/TradeExecutor.mqh"
├── #include "Common/TradeStateTracker.mqh"
├── #include "Strategies/MyStrategySignal.mqh"
│
├── input group "Estrategia"      // parámetros optimizables de StrategySignal
├── input group "Riesgo"           // parámetros de RiskManager (dentro de hard limits)
├── input group "Filtros"          // SessionFilter / SpreadFilter / NewsFilter
├── input int InpMagicNumber
│
├── OnInit()   -> valida símbolo, crea instancias de módulos, restaura estado
├── OnDeinit() -> libera recursos, log de cierre
├── OnTick()   -> orquesta el flujo descrito en la sección 5
├── OnTimer()  -> tareas periódicas (si aplica: chequeo de sesión, heartbeat de métricas)
├── OnTradeTransaction() -> delega en TradeStateTracker
└── OnTester() -> métricas custom para optimización (ver 07_Backtesting_Optimizacion_y_Validacion_Quant.md)
```

Los archivos `Common/*.mqh` son compartidos entre todos los EAs del proyecto (infraestructura reutilizable); `Strategies/*.mqh` contiene únicamente la hipótesis específica de cada estrategia. Esta separación entre carpetas es la que permite añadir el EA 2 y el EA 3 (`18_Primeros_Bots_Laboratorio.md`) reutilizando toda la infraestructura común sin duplicar código de riesgo o ejecución.

> [!NOTE]
> **Modalidad de Entrega Agéntica por IA (`trading-agents-dashboard`)**:
> Para garantizar compilación 100% autónoma, headless y portable sin riesgo de rutas de include rotas en la instalación de MetaTrader 5 del usuario, el generador de código MQL5 produce archivos `.mq5` **autocontenidos** (utilizando únicamente `<Trade\Trade.mqh>` de la Standard Library oficial). La separación de capas se mantiene rigurosamente dentro del archivo mediante secciones comentadas y funciones independientes (`CheckRiskLimits()`, `CalculatePositionSize()`, `OnTick()`, `OnTradeTransaction()`).

## Fuentes consultadas

- F012 — "CTrade" / Trade Classes / Standard Library. https://www.mql5.com/en/docs/standardlibrary/tradeclasses/ctrade — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07 — rol de `CTrade` frente a `OrderSend` directo.
- Diseño propio [INFERIDO] basado en prácticas estándar de separación de responsabilidades y en las reglas del prompt maestro (`§13`), sin fuente oficial única — se marca explícitamente donde la decisión es de diseño del proyecto y no un hecho verificable en documentación de MetaQuotes.

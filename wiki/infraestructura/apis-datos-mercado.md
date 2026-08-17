---
tags: [infraestructura, api, mql5, metatrader, datos-mercado, python]
updated: 2026-08-16
fuentes: [raw/infraestructura/mql5-apis-datos-mercado-synthesis.md]
---

# APIs de datos de mercado y ejecución

## MQL5 — el lenguaje nativo de MetaTrader 5

MQL5 es el lenguaje orientado a objetos (sintaxis similar a C++) diseñado por MetaQuotes para crear Expert Advisors (EAs), indicadores y scripts en MetaTrader 5. Se compila a bytecode ejecutado dentro del terminal — no requiere infraestructura externa.

### Event handlers principales

| Handler | Cuándo se ejecuta | Uso típico |
|---|---|---|
| `OnInit()` | Al cargar el EA | Inicialización, validación de parámetros |
| `OnDeinit()` | Al descargar | Limpieza de recursos |
| `OnTick()` | Cada nuevo tick de precio | **Lógica de trading central** |
| `OnTimer()` | Periódicamente (configurable) | Tareas programadas, reporting |
| `OnTrade()` | Cambio en órdenes/posiciones | Gestión de operaciones |

### Funciones de datos de mercado

- **OHLCV**: `CopyRates()`, `CopyOpen/High/Low/Close/Volume()` — series históricas por timeframe.
- **Tick data**: `CopyTicks()`, `CopyTicksRange()` — cada cambio individual de bid/ask/last.
- **Depth of Market**: `MarketBookGet()` — instantánea del libro de órdenes (profundidad de mercado, ver [microestructura-mercado.md](../basico/microestructura-mercado.md)).
- **Propiedades del símbolo**: `SymbolInfoDouble()` — spread actual, tick size, volumen mínimo, swap rates.

### Funciones de trading

- `OrderSend()`: envía cualquier tipo de orden (market, limit, stop, stop-limit).
- `OrderCheck()`: valida una orden antes de enviarla (margen, volumen, precio).
- Tipos: `ORDER_TYPE_BUY`, `_SELL`, `_BUY_LIMIT`, `_SELL_LIMIT`, `_BUY_STOP`, `_SELL_STOP`, `_BUY_STOP_LIMIT`, `_SELL_STOP_LIMIT`.
- Modificación de SL/TP en posiciones abiertas: `TRADE_ACTION_SLTP` (fundamental para implementar [trailing stops](../gestion-riesgo/gestion-operaciones-vivo.md)).

### Strategy Tester

Backtesting integrado con múltiples modos de simulación:
- **Every tick**: máxima fidelidad, simula cada tick histórico.
- **OHLC 1 minuto**: más rápido, adecuado para estrategias de timeframes ≥ M5.
- **Open prices only**: el más rápido, solo para estrategias que operan en apertura de vela.
- Optimización: grid search o algoritmo genético.
- Forward testing integrado (separación automática IS/OOS — ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md)).

## Python Integration — paquete `MetaTrader5`

### Instalación y uso

```python
pip install MetaTrader5
import MetaTrader5 as mt5
mt5.initialize()  # conecta al terminal MT5
```

### Funcionalidades clave

- `mt5.copy_rates_from()`, `mt5.copy_ticks_from()` → DataFrames de pandas.
- `mt5.order_send()` → ejecución de órdenes desde Python.
- `mt5.positions_get()`, `mt5.orders_get()` → estado de cuenta.

### Ventaja

Permite combinar el ecosistema Python (pandas, numpy, scikit-learn, TensorFlow) para análisis y ML, con la ejecución de órdenes a través del terminal MT5.

### Limitación crítica

El paquete se comunica con el terminal MT5 via IPC local — **el terminal debe estar ejecutándose en la misma máquina Windows**. No funciona en Linux/Mac sin Wine/emulación.

## Datos tick vs. OHLC

| Aspecto | Tick data | OHLC |
|---|---|---|
| Granularidad | Cada cambio de precio individual | Resumen por vela (período fijo) |
| Tamaño de datos | Muy grande | Compacto |
| Fidelidad backtest | Máxima — captura spreads reales, slippage | Puede ocultar drawdowns intradía (ver [drawdown.md](../gestion-riesgo/drawdown.md)) |
| Acceso en MT5 | `CopyTicks()` | `CopyRates()` |

## APIs alternativas de datos

### Para forex/CFDs

| API | Tipo | Notas |
|---|---|---|
| **MetaTrader 5 nativo** | Principal para este proyecto | Event-driven, baja latencia |
| **cTrader Open API** | gRPC | Alternativa a MT5, soporta FIX |
| **FIX Protocol** | Estándar institucional | MT5 no lo expone directamente |

### Para datos complementarios y crypto

| API | Tipo | Notas |
|---|---|---|
| **Alpha Vantage** | REST, freemium | OHLCV, indicadores, fundamentales |
| **Polygon.io** | REST + WebSocket | US equities, forex, crypto. Alta calidad |
| **CCXT** | Biblioteca Python | Unifica >100 exchanges crypto |
| **Binance API** | REST + WebSocket | Order book real-time, ejecución crypto |

## Consideraciones para un bot en producción

1. **Latencia**: MQL5 nativo (`OnTick`) < Python via MT5 < APIs REST externas. Para estrategias sensibles a la latencia, MQL5 nativo es preferible.
2. **Fiabilidad**: manejo de reconexión, timeouts, validación de datos. Un bot que no gestiona desconexiones puede dejar posiciones huérfanas.
3. **Calidad de datos históricos**: los datos de MT5 vienen del broker y pueden variar entre brokers. Para backtests rigurosos, considerar fuentes independientes (Dukascopy, TrueFX para forex tick data).
4. **VPS**: para operación 24/5, el terminal MT5 debe correr en un VPS Windows — ver la documentación de despliegue de este proyecto en `docs/MetaTrader/`.

## Relación con otras páginas

Para la mecánica del libro de órdenes y cómo afecta a la ejecución real, ver [microestructura-mercado.md](../basico/microestructura-mercado.md). Para la gestión de SL/TP y trailing stops vía `TRADE_ACTION_SLTP`, ver [gestion-operaciones-vivo.md](../gestion-riesgo/gestion-operaciones-vivo.md). Para la validación de backtests realizados con el Strategy Tester, ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md).

## Fuentes

- [MQL5 y APIs de datos de mercado — síntesis](../raw/infraestructura/mql5-apis-datos-mercado-synthesis.md) — documentación oficial de MetaQuotes, paquete Python MetaTrader5, y catálogo de APIs alternativas.

# MQL5 y APIs de datos de mercado para trading algorítmico

> Fuente sintetizada a partir de la documentación oficial de MetaQuotes (mql5.com/en/docs), la referencia del paquete Python MetaTrader5, y documentación de APIs alternativas de datos de mercado. Referencia operativa para bots.

## MQL5 — el lenguaje nativo de MetaTrader 5

### Arquitectura
- **MQL5** es un lenguaje de programación orientado a objetos, sintácticamente similar a C++, diseñado específicamente para crear programas de trading automatizado en la plataforma MetaTrader 5.
- Se compila a bytecode que se ejecuta dentro del terminal MT5 — no requiere servidor externo.
- Tipos de programas: Expert Advisors (EAs, bots de trading), indicadores personalizados, scripts (ejecución única), servicios (procesos en background).

### Event handlers principales
- `OnInit()`: inicialización del EA al cargarse en un gráfico.
- `OnDeinit()`: limpieza al descargarse.
- `OnTick()`: se ejecuta en cada nuevo tick de precio — es el corazón de la lógica de trading.
- `OnTimer()`: ejecución periódica (configurable).
- `OnTrade()`: se dispara cuando cambia el estado de órdenes/posiciones.
- `OnChartEvent()`: interacciones con el gráfico.

### Funciones de datos de mercado
- `SymbolInfoDouble()`, `SymbolInfoInteger()`: propiedades del símbolo (spread, tick size, volumen mínimo).
- `CopyRates()`, `CopyTime()`, `CopyOpen/High/Low/Close/Volume()`: series históricas OHLCV.
- `CopyTicks()`, `CopyTicksRange()`: datos tick a tick (bid, ask, last, volume, flags).
- `MarketBookGet()`: instantánea del Depth of Market (DOM) — profundidad del libro de órdenes.
- `MarketBookAdd()` / `MarketBookRelease()`: suscripción/desuscripción al DOM.

### Funciones de trading
- `OrderSend()`: envía cualquier tipo de orden (market, limit, stop, stop-limit).
- `OrderCheck()`: valida una orden antes de enviarla (margen, volumen, precio).
- `PositionSelect()`, `PositionGetDouble()`: consulta posiciones abiertas.
- `HistorySelect()`, `HistoryDealGetDouble()`: historial de operaciones cerradas.
- Tipos de orden: `ORDER_TYPE_BUY`, `ORDER_TYPE_SELL`, `ORDER_TYPE_BUY_LIMIT`, `ORDER_TYPE_SELL_LIMIT`, `ORDER_TYPE_BUY_STOP`, `ORDER_TYPE_SELL_STOP`, `ORDER_TYPE_BUY_STOP_LIMIT`, `ORDER_TYPE_SELL_STOP_LIMIT`.

### Strategy Tester
- Backtesting integrado con múltiples modos: cada tick, OHLC de 1 minuto, precios de apertura.
- Optimización: grid search, algoritmo genético.
- Forward testing integrado (separación automática IS/OOS).
- Multi-currency/multi-timeframe testing.

## Python Integration — paquete `MetaTrader5`

### Instalación
```
pip install MetaTrader5
```

### Funcionalidades
- `mt5.initialize()`, `mt5.shutdown()`: conectar/desconectar al terminal MT5.
- `mt5.copy_rates_from()`, `mt5.copy_ticks_from()`: descarga de datos históricos a DataFrames de pandas.
- `mt5.order_send()`: envío de órdenes desde Python.
- `mt5.positions_get()`, `mt5.orders_get()`: consulta de estado.
- Permite usar el ecosistema Python (pandas, numpy, scikit-learn, TensorFlow) para análisis y ML, con ejecución de órdenes a través del terminal MT5.

### Limitación crítica
El paquete Python se comunica con el terminal MT5 vía IPC local — el terminal MT5 debe estar ejecutándose en la misma máquina Windows. No funciona en Linux/Mac sin emulación.

## Datos tick vs. OHLC

| Aspecto | Datos tick | Datos OHLC |
|---|---|---|
| Granularidad | Cada cambio de precio individual | Resumen por vela (período fijo) |
| Tamaño | Muy grande (miles de ticks por minuto en pares líquidos) | Compacto |
| Uso en backtest | Máxima fidelidad, captura spreads reales y slippage | Más rápido pero puede ocultar drawdowns intradía |
| Disponibilidad en MT5 | Sí, via `CopyTicks()` | Sí, via `CopyRates()` |

## APIs alternativas de datos de mercado

### Para forex/CFDs (lo que cubre MetaTrader)
- **MetaTrader 5 nativo**: la opción principal para este proyecto.
- **cTrader Open API**: alternativa a MT5 con protocolo gRPC, soporta FIX.
- **FIX Protocol**: estándar de la industria para ejecución institucional. MT5 no lo expone directamente.

### Para acciones y datos complementarios
- **Alpha Vantage**: API REST gratuita (con límites), datos OHLCV, indicadores técnicos, fundamentales.
- **Polygon.io**: datos de mercado de alta calidad para US equities, forex, crypto. WebSocket para tiempo real.
- **Yahoo Finance** (vía `yfinance`): datos gratuitos pero no oficiales, con limitaciones de fiabilidad.

### Para crypto
- **CCXT**: biblioteca Python que unifica >100 APIs de exchanges crypto (Binance, Bybit, Kraken...) bajo una interfaz común.
- **Binance API**: REST + WebSocket, datos de order book en tiempo real, ejecución.

## Consideraciones para un bot de trading

1. **Latencia**: para estrategias de alta frecuencia, la latencia de la API importa. MQL5 nativo (OnTick) < Python via MT5 < APIs REST externas.
2. **Fiabilidad**: un bot en producción necesita manejo de reconexión, timeouts, y validación de datos.
3. **Costes de datos**: muchas APIs tienen límites de rate o son de pago para datos en tiempo real.
4. **Datos de calidad para backtest**: los datos históricos de MT5 vienen del broker — pueden variar entre brokers. Para backtests rigurosos, considerar fuentes independientes (Dukascopy, TrueFX para forex tick data).

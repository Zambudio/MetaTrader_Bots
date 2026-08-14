# Strategy Tester y calidad de datos

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07

## 1. Modos de ticks [VERIFICADO]

| Modo | Qué hace | Error que introduce |
|---|---|---|
| **Every tick based on real ticks** | Descarga y reproduce los ticks reales guardados por el servidor del broker | El más fiel a la realidad; requiere que el broker tenga histórico de ticks reales disponible para el símbolo/periodo — si no lo tiene, no puede usarse tal cual (ver fallback abajo) |
| **Every tick** | Genera una secuencia de ticks sintéticos dentro de cada barra M1 (usando un modelo de generación, no ticks reales) para aproximar el movimiento intrabar | Más rápido que ticks reales, pero el camino intrabar es una aproximación, no el histórico real — puede no capturar mechas/spikes reales dentro de la barra |
| **1 Minute OHLC** | Simula usando solo los 4 precios de cada barra M1 (open, high, low, close) | Pierde toda la microestructura intrabar; una estrategia sensible al orden en que se tocan high/low dentro de la barra puede dar resultados distintos a la realidad |
| **Open prices only** | Solo usa el precio de apertura de cada barra del timeframe de la estrategia | Estimación muy rápida y muy burda; solo válido para estrategias que operan exclusivamente al cierre/apertura de barra y para cribados iniciales, nunca para validación final |

**Fallback cuando no hay ticks reales [VERIFICADO/INFERIDO]:** cuando se selecciona "Every tick based on real ticks" pero el broker no dispone de histórico de ticks reales para ese símbolo/periodo, el tester genera los ticks de forma sintética (equivalente en la práctica al modo "Every tick"), y esto debe quedar reflejado en el informe del pase. **Regla de proyecto:** antes de confiar en un backtest en modo "real ticks", verificar en el log del tester que efectivamente se usaron ticks reales y no un fallback sintético silencioso.

## 2. Datos históricos [VERIFICADO] / [DEPENDIENTE DEL BROKER]

- **Procedencia:** el servidor del broker al que se conecta el Terminal; no hay mezcla de fuentes de datos entre brokers.
- **Sincronización:** el Terminal descarga histórico bajo demanda (por símbolo/timeframe) y lo cachea en `Bases/<servidor>/history`; puede requerir "precarga adicional" (Symbols → barra de progreso) antes de un test largo.
- **Gaps:** posibles por fines de semana, festivos, cortes de conectividad del broker o símbolos con baja liquidez — deben tratarse explícitamente en el diseño del EA (no asumir continuidad de precio).
- **Diferencias broker a broker:** histórico, spreads, sesiones y calidad de datos son distintos incluso para el "mismo" símbolo nominal (p. ej. `EURUSD`) en brokers distintos — `[DEPENDIENTE DEL BROKER]`, tratado también en `13_Brokers_MetaTrader5_Espana.md`.
- **Calidad reportada:** el Strategy Tester informa un indicador de calidad de modelado (history quality) tras cada pase en modo tick — hay que registrarlo junto con los resultados (ver `07_Backtesting_Optimizacion_y_Validacion_Quant.md` y `16_Observabilidad_Auditoria_y_Reproducibilidad.md`).
- **Símbolos adicionales (estrategias multicurrency):** un EA puede necesitar datos de símbolos distintos al del gráfico donde corre; el tester los provee, pero su disponibilidad/calidad también es `[DEPENDIENTE DEL BROKER]`.
- **Timezone / DST:** el tester opera en la hora de servidor del broker simulado; los cambios de horario de verano del broker (que no tienen por qué coincidir con los de España) afectan a filtros de sesión — ver `01_Arquitectura_y_Funcionamiento_MetaTrader5.md` §4.
- **Comisiones, swaps, spreads, margen:** el tester puede simular comisiones y swaps configurados a nivel de símbolo por el broker; su exactitud frente a la cuenta real depende de que la configuración de símbolo se mantenga sincronizada `[DEPENDIENTE DEL BROKER]`.

## 3. Simulación de ejecución [VERIFICADO] / [INFERIDO]

El Strategy Tester permite configurar:

- **Latencia/delay** de ejecución simulada (ms).
- **Requotes** y comportamiento ante cambios de precio durante la ejecución simulada.
- **Comisiones** por operación (fijas o basadas en la configuración del símbolo).
- **Restricciones de cuenta** (tipo de cuenta, apalancamiento, moneda).

Estas simulaciones son necesariamente una **aproximación** del comportamiento real del broker en producción; su fiabilidad relativa (mejor cuanto más cercana a "real ticks" + parámetros realistas de latencia/comisión) es la base del capítulo de stress testing en `07_Backtesting_Optimizacion_y_Validacion_Quant.md`.

## 4. Agentes del tester [VERIFICADO]

| Tipo | Qué es | Ventajas | Coste | Privacidad | Reproducibilidad |
|---|---|---|---|---|---|
| **Local agents** | Instalados automáticamente con el Terminal; tantos como núcleos lógicos disponga la máquina; solo el usuario del Terminal puede lanzarlos | Sin configuración adicional, control total | Gratis (usa el propio hardware) | Total (no sale del equipo) | Alta — mismo hardware/entorno siempre |
| **Remote agents** | Instalados manualmente (MetaTester 5 Agent) en otras máquinas propias | Escala el paralelismo sin depender de un único equipo | Coste del hardware propio | Total si son máquinas propias | Alta, si se documenta el hardware usado |
| **MQL5 Cloud Network** | Red pública de agentes de terceros, agrupados geográficamente, coordinados automáticamente por MetaTester | Paraleliza mucho una optimización sin comprar hardware; existe modalidad de aportar CPU propia a cambio de créditos | Puede tener coste en créditos/dinero según uso | El código del EA se ejecuta en máquinas de terceros — implicación de propiedad intelectual y de que la lógica de la estrategia queda expuesta a la red | Menor — hardware heterogéneo, no controlado por el proyecto |

**Recomendación para el laboratorio [INFERIDO]:** usar agentes **locales** mientras las estrategias sean simples (EAs 1-3, `18_Primeros_Bots_Laboratorio.md`) y el volumen de combinaciones de optimización sea manejable; considerar Cloud Network solo si el tiempo de optimización se vuelve un cuello de botella real, y solo para estrategias que no requieran confidencialidad especial.

## 5. Qué modo usar según el caso (criterio de aceptación)

| Caso de uso | Modo recomendado |
|---|---|
| Pruebas rápidas de lógica (¿compila, entra/sale cuando debería?) | Open prices only o 1 Minute OHLC |
| Optimización inicial de rango de parámetros (barrido amplio) | 1 Minute OHLC (rápido) para descartar regiones, luego refinar |
| Validación final antes de forward/demo | Every tick based on real ticks (verificando quality del modelado) |
| Estrategias sensibles al intrabar (breakout, stops ajustados, scalping) | Every tick based on real ticks obligatorio — 1 Minute OHLC puede dar señales falsas de entrada/salida |
| Estrategias multicurrency | Every tick based on real ticks en todos los símbolos relevantes si es posible; si algún símbolo no tiene ticks reales, documentarlo explícitamente como limitación del resultado |

## Fuentes consultadas

- F017 — "Testing Trading Strategies" / modos de modelado. https://www.mql5.com/en/docs/runtime/testing — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07 — Every tick / real ticks / 1 Minute OHLC / Open prices only.
- F018 — "MetaTester and Remote Agents" — MetaTrader 5 Help. https://www.metatrader5.com/en/terminal/help/algotrading/metatester — MetaQuotes — OFICIAL — consultado 2026-08-07 — agentes locales/remotos.
- F019 — "How the MQL5 Cloud Network works". https://cloud.mql5.com/en/help — MetaQuotes — OFICIAL — consultado 2026-08-07 — MQL5 Cloud Network.

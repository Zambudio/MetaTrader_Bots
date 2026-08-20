# Primeros bots del laboratorio

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> Diseño conceptual de tres EAs deliberadamente simples. Su propósito es **aprender y validar el pipeline completo**, no demostrar rentabilidad. No se fijan parámetros "ganadores" en esta fase.

## 0. Criterio común a los tres

- Un único símbolo líquido de Forex (p. ej. `EURUSD`, a confirmar disponibilidad en el broker demo elegido — `13_Brokers_MetaTrader5_Espana.md`) y un único timeframe por bot, para no introducir la complejidad de multicurrency en el primer aprendizaje del pipeline.
- Cada uno usa la arquitectura estándar de `03_Arquitectura_Expert_Advisors.md` (módulos comunes reutilizados, `StrategySignal` propio).
- Cada uno se somete al pipeline completo de `07_Backtesting_Optimizacion_y_Validacion_Quant.md` antes de considerarse "aprendido", aunque el objetivo no sea que resulte rentable.
- Magic Number distinto por bot (y por versión, según convención de `03_Arquitectura...` §4).
- El **orden de desarrollo es secuencial**, no paralelo: EA 1 completo (hasta al menos `VALIDATED` en el ciclo de vida) antes de empezar EA 2, para que los problemas de infraestructura común (RiskManager, TradeExecutor, TradeStateTracker) se resuelvan una sola vez y se hereden, no se dupliquen.

## 1. EA 1 — Trend Following simple

**Familia de ejemplo:** EMA rápida / EMA lenta, con filtro opcional de tendencia de fondo (p. ej. EMA de timeframe superior) y ATR para dimensionar el riesgo.

**Objetivos de aprendizaje:**

- Uso correcto de indicadores (`IndicatorManager`) sin mezclar cálculo con decisión.
- Detección de cruce de medias sin repetición de señal dentro de la misma barra (regla 16 de `17_Estandar_Desarrollo_EAs_con_IA.md`).
- Garantizar **una operación por señal** (regla 17 del mismo estándar) — validación directa de que `TradeStateTracker` funciona.
- SL/TP calculados a partir de ATR (no valores fijos en pips) — primer ejercicio real de "consultar propiedades del símbolo, no asumir".
- Position sizing según distancia al SL (`05_Gestion_Riesgo_EAs.md` §4) con datos reales del símbolo del broker demo.
- Primer backtest end-to-end, primera vez que se completa el pipeline de validación completo.
- Primer uso real de parámetros optimizables vs hard limits, separados desde el diseño.

## 2. EA 2 — Mean Reversion

**Familia de ejemplo:** RSI o Bandas de Bollinger, con filtro de régimen (evitar operar en tendencia fuerte).

**Objetivos de aprendizaje:**

- Lógica de **entrada contraria** (comprar sobreventa/vender sobrecompra) — distinta naturaleza de riesgo que el EA 1, útil para probar que la arquitectura común no está sesgada implícitamente hacia estrategias de tendencia.
- Salida basada en reversión a la media (objetivo distinto a un TP fijo de ATR) — primer caso de `PositionManager` con lógica de salida no trivial.
- Condiciones de mercado lateral: primer uso serio de un filtro de régimen simple (aunque `RegimeDetectionAgent` como tal sea futuro, el EA 2 necesita como mínimo una heurística determinista de "no operar en tendencia fuerte", codificada en su `SessionFilter`/filtro propio).
- **Riesgo de tendencia fuerte:** este EA es el primer caso donde el `RiskManager` debe demostrar que corta pérdidas cuando la hipótesis de reversión falla sistemáticamente (mercado en tendencia) — objetivo de aprendizaje explícito sobre el comportamiento del stop-loss, no solo sobre su cálculo.

## 3. EA 3 — Breakout / Volatilidad

**Familia de ejemplo:** ruptura de rango + ATR.

**Objetivos de aprendizaje:**

- **Pending orders vs market orders:** primer EA del laboratorio que coloca órdenes pendientes (`BUY_STOP`/`SELL_STOP` en los extremos del rango), ejercitando los diagramas de secuencia de `04_Modelo_Trading...` §7.4 (activación de pendiente) y §7.5 (cancelación si no se activa a tiempo).
- **Slippage:** las rupturas suelen ejecutarse en momentos de movimiento rápido — primer caso real donde `deviation`/slippage máximo importa de verdad, y donde comparar backtest (simulado) contra demo (real) es más revelador.
- **Volatilidad:** uso de ATR no solo para SL sino para el propio criterio de ruptura válida (evitar operar rupturas triviales en baja volatilidad).
- **Trailing stop, si tiene sentido:** evaluar si añadirlo aporta valor a esta estrategia concreta o es complejidad innecesaria — decisión a documentar, no a asumir por defecto.
- **Sesiones:** las rupturas relevantes suelen concentrarse en aperturas de sesión (Londres/Nueva York) — primer uso real y justificado de `SessionFilter` con una razón de mercado concreta, no como filtro genérico.

## 4. Qué se aprende del pipeline completo (no solo de trading)

Además de los objetivos específicos de cada bot, el conjunto de los tres debe validar en la práctica:

- Que la arquitectura común (`03_Arquitectura_Expert_Advisors.md`) realmente se reutiliza sin fricción entre estrategias de naturaleza distinta (tendencia, reversión, ruptura) — si no es así, es una señal de que el diseño de esa arquitectura necesita revisión antes de escalar a más estrategias.
- Que el `RiskPolicy` común (`05_Gestion_Riesgo_EAs.md`) es suficientemente general para las tres, o si necesita parámetros adicionales por tipo de estrategia.
- Que el pipeline de validación (`07_Backtesting...`) es ejecutable en la práctica, no solo en teoría — tiempos reales de backtest/optimización, calidad real de los datos del broker demo elegido.
- Que la estructura de observabilidad (`16_Observabilidad...`) es suficiente para responder "qué pasó" en cada uno de los tres casos sin tener que releer código.

## 5. Qué queda explícitamente fuera

- No se fijan parámetros finales "ganadores" para ninguno de los tres.
- No se despliega ninguno en cuenta real (fuera de alcance, `00_Contexto_y_Objetivos_Proyecto.md`).
- No se combinan los tres en una cartera con gestión de riesgo agregada todavía — eso pertenece a una fase posterior con `PortfolioRiskAgent` (`11_Arquitectura_Multiagente_Futura.md`), cuando haya más de una estrategia candidata a `ACTIVE` simultáneamente.

## Fuentes consultadas

- Diseño propio [INFERIDO], derivado directamente de la sección 28 del prompt maestro y de las decisiones ya tomadas en `03_Arquitectura_Expert_Advisors.md`, `05_Gestion_Riesgo_EAs.md` y `07_Backtesting_Optimizacion_y_Validacion_Quant.md`. No requiere fuentes externas adicionales.

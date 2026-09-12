# Índice — Wiki de conocimiento de trading

> Catálogo de todas las páginas de esta wiki, organizado por categoría. Se lee primero al responder cualquier consulta (ver [`CLAUDE.md`](CLAUDE.md) → Operaciones → Query) y se actualiza en cada ingesta.

## Básico

- [`velas-japonesas.md`](basico/velas-japonesas.md) — anatomía de la vela, patrones de una vela (doji, martillo, estrella fugaz, marubozu...), patrones de posicionamiento (estrella, harami), comparación con gráfico de barras.
- [`tipos-grafico.md`](basico/tipos-grafico.md) — línea, barras (OHLC), velas, y formatos especializados (Heikin-Ashi, Renko, Kagi, Three Line Break).
- [`estructura-mercado.md`](basico/estructura-mercado.md) — compañías cotizadas, participantes del mercado, tipos de orden y de cuenta, posiciones largas/cortas, ejecución de órdenes.
- [`soporte-y-resistencia.md`](basico/soporte-y-resistencia.md) — qué son, dinámica de rotura vs. rechazo, rotación de roles y evidencia microeconómica de clustering de órdenes (Carol Osler, FRBNY).
- [`tendencias-y-estructura.md`](basico/tendencias-y-estructura.md) — Dow Theory, máximos/mínimos crecientes-decrecientes, regla objetiva de cambio de tendencia, fases de mercado.
- [`opciones-fundamentos.md`](basico/opciones-fundamentos.md) — modelo Black-Scholes-Merton (1973), fórmulas analíticas de calls/puts, griegas (Delta, Gamma, Vega, Theta, Rho) y extracción de la volatilidad implícita.
- [`microestructura-mercado.md`](basico/microestructura-mercado.md) — Limit Order Book, bid-ask spread (selección adversa e inventario), modelo de ejecución óptima de Almgren-Chriss (2000), slippage y Order Flow Imbalance.
- [`sesgos-cognitivos-trading.md`](basico/sesgos-cognitivos-trading.md) — Prospect Theory (Kahneman & Tversky 1979), aversión a la pérdida, efecto disposición, sesgos de confirmación/anclaje/exceso de confianza, y cómo un EA actúa como antídoto disciplinario.

## Indicadores

- [`medias-moviles.md`](indicadores/medias-moviles.md) — SMA vs. EMA, cruces (golden/death cross), soporte/resistencia dinámica, limitaciones.
- [`osciladores.md`](indicadores/osciladores.md) — RSI (fórmula, sobrecompra/sobreventa, divergencias) y Estocástico (%K/%D, diferencias prácticas con RSI).
- [`macd.md`](indicadores/macd.md) — cálculo, cruces de señal y de línea central, divergencias.
- [`bollinger.md`](indicadores/bollinger.md) — cálculo, M-Tops/W-Bottoms, "walking the bands".
- [`volumen-y-atr.md`](indicadores/volumen-y-atr.md) — ATR, OBV, Chaikin Money Flow (CMF) y Money Flow Index (MFI).
- [`adx-dmi.md`](indicadores/adx-dmi.md) — ADX/+DI/-DI de Wilder, fuerza de tendencia, uso como filtro previo a estrategias direccionales.
- [`como-combinar-indicadores.md`](indicadores/como-combinar-indicadores.md) — por qué apilar osciladores correlacionados da falsa confirmación, confluencia bien entendida, errores comunes de curve-fitting.
- [`fibonacci.md`](indicadores/fibonacci.md) — retrocesos (23.6%–78.6%) y extensiones (127.2%–261.8%), confluencia como clave de fiabilidad, implementación programática para un EA.
- [`volatilidad-implicita-vix.md`](indicadores/volatilidad-implicita-vix.md) — volatilidad implícita vs. histórica, metodología del VIX (Cboe), niveles de referencia, uso como filtro de régimen y sentimiento, estructura temporal (contango/backwardation).

## Estrategias

- [`seguimiento-tendencia.md`](estrategias/seguimiento-tendencia.md) — time-series momentum, evidencia de 137 años (AQR/Hurst-Ooi-Pedersen), Sharpe medio ~0.4.
- [`reversion-media.md`](estrategias/reversion-media.md) — value/contrarian investing (Lakonishok-Shleifer-Vishny), +7-8 pp anuales frente a "glamour".
- [`momentum.md`](estrategias/momentum.md) — momentum cross-sectional en acciones (Jegadeesh & Titman 1993), cartera ganadoras-menos-perdedoras al 12% anual.
- [`ruptura-breakout.md`](estrategias/ruptura-breakout.md) — Opening Range Breakout (Zarattini-Barbon-Aziz), filtrado a "Stocks in Play": Sharpe 2.81.
- [`scalping.md`](estrategias/scalping.md) — costes de transacción y modelos de microestructura (Almgren-Chriss), evidencia empírica de day trading retail en Taiwán (Barber-Lee-Liu-Odean).
- [`swing-trading.md`](estrategias/swing-trading.md) — holding de días-semanas, validez estadística de patrones chartistas (Lo-Mamaysky-Wang 2000), riesgo overnight/weekend.
- [`backtesting-y-validacion.md`](estrategias/backtesting-y-validacion.md) — in/out-of-sample, overfitting y su coste real en OOS, walk-forward, look-ahead bias, sesgo de supervivencia (Bailey/López de Prado et al.).
- [`metricas-rendimiento.md`](estrategias/metricas-rendimiento.md) — Sharpe, Sortino, Calmar, Profit Factor: fórmulas, interpretación, limitaciones, uso conjunto para evaluar un EA.
- [`regimenes-mercado.md`](estrategias/regimenes-mercado.md) — detección de régimen (bull/bear/rango/crisis), Hidden Markov Models (Hamilton 1989), indicadores proxy (VIX, ADX, ATR), filtro de régimen para un EA.
- [`pairs-trading.md`](estrategias/pairs-trading.md) — arbitraje estadístico market-neutral, distance approach (Gatev-Goetzmann-Rouwenhorst 2006), cointegración Engle-Granger, modelado estocástico Ornstein-Uhlenbeck (half-life).

## Análisis fundamental

- [`calendario-economico.md`](analisis-fundamental/calendario-economico.md) — qué es, cómo leer actual/previsto/consenso, eventos clave (NFP, CPI, tipos, PIB, PMI).
- [`bancos-centrales.md`](analisis-fundamental/bancos-centrales.md) — rol de la Fed y el BCE, mandatos, cómo sus decisiones mueven divisas/índices/materias primas.
- [`fuentes-datos-macro.md`](analisis-fundamental/fuentes-datos-macro.md) — catálogo de referencia rápida (FRED, BIS, Trading Economics, calendarios oficiales).
- [`correlaciones-entre-activos.md`](analisis-fundamental/correlaciones-entre-activos.md) — DXY, oro como refugio, petrodivisas, risk-on/risk-off, correlación entre pares que comparten divisa.
- [`indicadores-macro-clave.md`](analisis-fundamental/indicadores-macro-clave.md) — qué mide y cómo afecta a los mercados cada indicador macro (CPI, NFP, PIB, PMI, tipos).
- [`forward-guidance-y-lectura-de-comunicados.md`](analisis-fundamental/forward-guidance-y-lectura-de-comunicados.md) — forward guidance como herramienta de política, cómo leer comunicados y actas de bancos centrales.

## Gestión de riesgo

- [`position-sizing-kelly.md`](gestion-riesgo/position-sizing-kelly.md) — criterio de Kelly, Optimal $f$ de Ralph Vince para distribuciones empíricas continuas, fraction sizing.
- [`drawdown.md`](gestion-riesgo/drawdown.md) — drawdown máximo vs. Conditional Expected Drawdown (Goldberg-Mahmoud), sensibilidad a rachas correlacionadas.
- [`expectativa-y-ratio-rr.md`](gestion-riesgo/expectativa-y-ratio-rr.md) — expectativa matemática, ratio riesgo/beneficio, conexión con Kelly y Optimal f.
- [`riesgo-de-ruina.md`](gestion-riesgo/riesgo-de-ruina.md) — probabilidad de ruina, por qué edge positivo no evita la ruina, sensibilidad no lineal al R:R elegido (Whelan 2025).
- [`riesgo-de-cartera.md`](gestion-riesgo/riesgo-de-cartera.md) — riesgo con varias posiciones simultáneas, exposición neta por divisa, apalancamiento agregado, margen vs. riesgo real.
- [`simulacion-monte-carlo.md`](gestion-riesgo/simulacion-monte-carlo.md) — bootstrap resampling (IID y block), distribución de drawdowns, estimación empírica de riesgo de ruina, calibración de sizing.
- [`gestion-operaciones-vivo.md`](gestion-riesgo/gestion-operaciones-vivo.md) — trailing stops (fijo, ATR, estructura), breakeven (cuándo ayuda y cuándo perjudica), scaling in/out, impacto en distribución de resultados.

## Infraestructura

- [`apis-datos-mercado.md`](infraestructura/apis-datos-mercado.md) — MQL5 (event handlers, funciones de datos y trading), Python MetaTrader5, Strategy Tester, datos tick vs. OHLC, APIs alternativas (Alpha Vantage, Polygon, CCXT).

## Glosario

- [`glosario.md`](glosario.md) — más de 145 términos de referencia rápida (indicadores, estructura de mercado, estrategias, macro, modelos de ejecución, gestión de riesgo), cada uno enlazado a su página de profundidad.

## Proyecto — Ingeniería MT5 Bots

Investigación de ingeniería de *este* proyecto concreto (arquitectura y funcionamiento de MetaTrader 5, fundamentos y estándar de MQL5, arquitectura de Expert Advisors, modelo de órdenes/deals/posiciones, gestión de riesgo de EAs, Strategy Tester, backtesting/optimización/validación quant, ciclo de vida y versionado de estrategias, integración Python, MCP/agentes de IA, arquitectura multiagente futura, análisis fundamental aplicado, selección de broker, despliegue en VPS, seguridad/credenciales, observabilidad/auditoría, estándar de desarrollo de EAs con IA, primeros bots de laboratorio, plan de puesta en marcha y pipeline de validación/backtest agéntico). Corpus separado con sus propias convenciones (tabla de estados por documento, decisiones congeladas, preguntas abiertas) — ver [`proyecto-mt5-bots/00_INDEX.md`](proyecto-mt5-bots/00_INDEX.md) para el índice completo y [`CLAUDE.md`](CLAUDE.md) para las convenciones. No forma parte del catálogo de coincidencia automática que usan los agentes del dashboard (`wikiStore.ts` solo indexa viñetas con el formato exacto de arriba) — pensado para consulta humana/Claude Code, no para inyección automática de contexto en agentes.

## Proyecto — Planes de ingeniería del dashboard

Planes de implementación, specs de diseño e informes de prueba/auditoría de `trading-agents-dashboard/` (dependencias multi-padre entre agentes, esquema de 6 agentes de análisis, prueba end-to-end del ciclo agentes→MQL5→backtest con 9 problemas reales corregidos) — los planes/specs ya ejecutados quedan como registro histórico de diseño, los informes registran hallazgos verificados en vivo sobre una implementación ya hecha. Ver [`proyecto-dashboard/00_INDEX.md`](proyecto-dashboard/00_INDEX.md) para el índice completo. Igual que `proyecto-mt5-bots/`, fuera del catálogo de coincidencia automática de `wikiStore.ts`.

---

_Última actualización: 2026-08-16 (revisión de rigor académico: eliminación de referencias a cursos formativos y sustitución por papers seminales de Black-Scholes, Osler, Ralph Vince y Almgren-Chriss). Ver [`log.md`](log.md) para el detalle._

## Noticias

Agrupadas por fecha de obtención (13 fuentes premium, sondeo automático cada 60 minutos). Ver carpeta [`noticias/`](noticias/) para listado completo y diarios.

- [`noticias/2026-09-06.md`](noticias/2026-09-06.md) — 11 artículo(s) digeridos
- [`noticias/2026-09-12.md`](noticias/2026-09-12.md) — 140 artículo(s) digeridos (acumulado del día)

# MetaTrader_Bots
Configuracion multiagente para estrategias y bots en Metatrader 5

## Contenido de este repositorio

- [`wiki-Traiding/`](wiki-Traiding/index.md) — base de conocimiento única del proyecto (ver detalle abajo). Mantenida por Claude Code siguiendo el patrón [LLM Wiki de Karpathy](wiki-Traiding/METHODOLOGY.md). Ver también `Promp_InicioMetaTrader_Investigar.md`, el prompt maestro que guio la investigación original.
- [`trading-agents-dashboard/`](trading-agents-dashboard/README.md) — consola web de agentes de IA para análisis y propuesta de estrategia (indicadores, entrada, stop loss, take profit). Es una herramienta de investigación, no de ejecución: el resultado se usa manualmente para configurar Expert Advisors en MetaTrader.

## Wiki de conocimiento (`wiki-Traiding/`)

Toda la documentación del proyecto vive aquí — no hay carpeta `docs/` ni archivos de documentación sueltos en la raíz. Cada documento nuevo se indexa y se enlaza desde al menos otro documento relacionado; nada queda huérfano. Punto de entrada: [`index.md`](wiki-Traiding/index.md) (catálogo por categoría); convenciones y flujo de trabajo: [`CLAUDE.md`](wiki-Traiding/CLAUDE.md).

**Conocimiento de trading de propósito general** (reutilizable fuera de este proyecto, crece con cada fuente que se ingiere):

- [`basico/`](wiki-Traiding/basico/) — velas japonesas, marcos temporales, estructura de mercado, microestructura, sesgos cognitivos.
- [`indicadores/`](wiki-Traiding/indicadores/) — medias móviles, osciladores (RSI, Estocástico), MACD, Bollinger, ADX, Fibonacci, VIX.
- [`estrategias/`](wiki-Traiding/estrategias/) — seguimiento de tendencia, reversión a la media, ruptura, scalping, swing trading, backtesting/validación, métricas de rendimiento, regímenes de mercado, pairs trading.
- [`analisis-fundamental/`](wiki-Traiding/analisis-fundamental/) — calendario económico, bancos centrales, correlaciones entre activos, forward guidance.
- [`gestion-riesgo/`](wiki-Traiding/gestion-riesgo/) — position sizing, ratio R:R, drawdown, riesgo de ruina, riesgo de cartera, simulación Monte Carlo.
- [`infraestructura/`](wiki-Traiding/infraestructura/) — APIs de datos de mercado (MQL5, Python MetaTrader5, Strategy Tester).
- [`glosario.md`](wiki-Traiding/glosario.md) — más de 145 términos de referencia rápida.

**Investigación y planes de ingeniería de este proyecto concreto** (convenciones propias, no derivadas del flujo de ingesta de fuentes):

- [`proyecto-mt5-bots/`](wiki-Traiding/proyecto-mt5-bots/00_INDEX.md) — arquitectura y funcionamiento de MT5, MQL5, arquitectura de Expert Advisors, modelo de órdenes/deals/posiciones, gestión de riesgo de EAs, backtesting/validación quant, MCP/agentes de IA, selección de broker, despliegue en VPS, seguridad, estándar de desarrollo de EAs con IA, y el plan de puesta en marcha. 26 documentos con tabla de estados (`BORRADOR`/`REVISADO`/`VERIFICADO`), decisiones arquitectónicas congeladas (`DECISIONS/`) y preguntas abiertas (`PREGUNTAS_ABIERTAS.md`).
- [`proyecto-dashboard/`](wiki-Traiding/proyecto-dashboard/00_INDEX.md) — planes de implementación y specs de diseño de `trading-agents-dashboard/` (dependencias multi-padre entre agentes, esquema de 6 agentes de análisis), ya ejecutados; quedan como registro histórico de diseño.

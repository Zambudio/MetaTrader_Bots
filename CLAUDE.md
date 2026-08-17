# MetaTrader_Bots

Configuración multiagente para estrategias y bots en MetaTrader 5. Dos partes principales:

- [`docs/MetaTrader/`](docs/MetaTrader/00_INDEX.md) — investigación de ingeniería previa a la puesta en marcha de este proyecto concreto (arquitectura MT5, modelo de órdenes/deals/posiciones, MQL5, MCP, riesgo, backtesting, despliegue en VPS, estándar de generación de EAs con IA...). Todos los documentos están en estado `BORRADOR`, auditados y fuertemente interreferenciados. Es investigación fija ligada a decisiones de este proyecto, **no** una wiki de conocimiento de trading que crezca con el tiempo.
- [`trading-agents-dashboard/`](trading-agents-dashboard/README.md) — consola web de agentes de IA para análisis y propuesta de estrategia (indicadores, entrada, stop loss, take profit). Herramienta de investigación, no de ejecución: el resultado se usa manualmente para configurar Expert Advisors en MetaTrader. Ver también `trading-agents-dashboard/server/README.md` para el backend.

## Wiki de conocimiento de trading

Para conocimiento de trading de propósito general —velas, indicadores, estrategias, análisis fundamental, gestión de riesgo, glosario— consulta primero [`wiki/index.md`](wiki/index.md), el catálogo de páginas por categoría. Las convenciones de mantenimiento, el flujo de ingesta/consulta/lint y la distinción con `docs/MetaTrader/` están en [`wiki/CLAUDE.md`](wiki/CLAUDE.md).

`wiki/` es una base de conocimiento LLM-mantenida siguiendo el patrón de [LLM Wiki de Karpathy](wiki/METHODOLOGY.md): crece con cada fuente que se ingiere y está pensada como fuente de referencia rápida al diseñar o afinar estrategias, tanto para Claude Code como (en el futuro) para los agentes del dashboard.

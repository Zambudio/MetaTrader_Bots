# MetaTrader_Bots

Configuración multiagente para estrategias y bots en MetaTrader 5. Dos partes principales:

- [`wiki-Traiding/`](wiki-Traiding/index.md) — base de conocimiento única del proyecto (todos los documentos viven aquí, no en `docs/`), mantenida por Claude Code siguiendo el patrón [LLM Wiki de Karpathy](wiki-Traiding/METHODOLOGY.md). Combina conocimiento de trading de propósito general (velas, indicadores, estrategias, análisis fundamental, gestión de riesgo, glosario) con la investigación de ingeniería de este proyecto concreto en [`proyecto-mt5-bots/`](wiki-Traiding/proyecto-mt5-bots/00_INDEX.md) (arquitectura MT5, modelo de órdenes/deals/posiciones, MQL5, MCP, riesgo, backtesting, despliegue en VPS, estándar de generación de EAs con IA...) y los planes/specs de ingeniería del dashboard en [`proyecto-dashboard/`](wiki-Traiding/proyecto-dashboard/00_INDEX.md). Las convenciones de cada parte están en [`wiki-Traiding/CLAUDE.md`](wiki-Traiding/CLAUDE.md).
- [`trading-agents-dashboard/`](trading-agents-dashboard/README.md) — consola web de agentes de IA para análisis y propuesta de estrategia (indicadores, entrada, stop loss, take profit). Herramienta de investigación, no de ejecución: el resultado se usa manualmente para configurar Expert Advisors en MetaTrader. Ver también `trading-agents-dashboard/server/README.md` para el backend.

## Regla permanente: toda la documentación va a la wiki, indexada

Este repositorio no usa `docs/` ni archivos de documentación sueltos en la raíz. Cualquier documento que Claude Code (o cualquier otro agente) genere para este proyecto — investigación, decisiones, planes de implementación (skills `superpowers:writing-plans`/`superpowers:brainstorming`), specs de diseño, hallazgos de auditoría, notas de progreso — se escribe dentro de `wiki-Traiding/`, en la categoría que corresponda:

- Conocimiento de trading de propósito general → la categoría existente que corresponda (`basico/`, `indicadores/`, `estrategias/`, `analisis-fundamental/`, `gestion-riesgo/`, `infraestructura/`), siguiendo el flujo de Ingest de [`wiki-Traiding/CLAUDE.md`](wiki-Traiding/CLAUDE.md).
- Investigación/decisiones de ingeniería de MetaTrader 5, MQL5 o EAs → [`wiki-Traiding/proyecto-mt5-bots/`](wiki-Traiding/proyecto-mt5-bots/00_INDEX.md).
- Planes/specs de ingeniería de `trading-agents-dashboard/` → [`wiki-Traiding/proyecto-dashboard/`](wiki-Traiding/proyecto-dashboard/00_INDEX.md) (`planes/` y `specs/`).
- Si no encaja en ninguna categoría existente, se crea una nueva dentro de `wiki-Traiding/` (ver "las carpetas de categoría se crean cuando llega la primera página" en `wiki-Traiding/CLAUDE.md`) — nunca se deja como archivo suelto en la raíz o en un `docs/` ad hoc.

**Ningún documento se da por terminado sin indexarlo y relacionarlo**: actualizar el índice correspondiente (`index.md` general o el `00_INDEX.md` de la categoría de proyecto) y enlazarlo con markdown real (`[texto](ruta)`) desde al menos un documento relacionado — nunca solo mencionarlo entre backticks, porque eso no cuenta como enlace (ni para Obsidian ni para la navegación real) y lo deja huérfano aunque "aparezca" citado por todas partes.

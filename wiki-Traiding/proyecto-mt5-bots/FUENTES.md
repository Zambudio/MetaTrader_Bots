# Registro global de fuentes

> Registro único de todas las fuentes consultadas durante la investigación. Evita duplicados: si una fuente ya aparece aquí, los documentos individuales deben enlazarla por título (`F0XX`) en vez de repetir los metadatos completos.
>
> Clasificación: `OFICIAL` (MetaQuotes/MQL5/broker/regulador), `SECUNDARIA` (técnica de alta calidad), `COMUNIDAD` (foros, blogs, vídeos, comparativas de terceros).

| # | Título | URL | Entidad | Fecha publicación | Fecha consulta | Clasificación | Usado para |
|---|---|---|---|---|---|---|---|
| F001 | What's new in MetaTrader 5 (release notes index) | https://www.metatrader5.com/en/releasenotes | MetaQuotes | continuo | 2026-08-07 | OFICIAL | Verificación de build vigente |
| F002 | MetaTrader 5 Build 6060: AI Integration, Passkey, and Code Management Improvements in MetaEditor | https://www.metatrader5.com/en/releasenotes/terminal/2447 | MetaQuotes | 2026-07-23 | 2026-08-07 | OFICIAL | MCP nativo, AI Assistant, permisos IA, Passkey |
| F003 | MetaTrader 5 Build 6090: General Improvements | https://www.metatrader5.com/en/releasenotes/terminal/2450 | MetaQuotes | 2026-07-30 | 2026-08-07 | OFICIAL | Build vigente, ampliación métodos MCP, actualización paquete Python |
| F004 | Sitio oficial MetaTrader 5 (es) — varias secciones | https://www.metatrader5.com/es | MetaQuotes | continuo | 2026-08-06 | OFICIAL | Base de [`Web_METATRADER5.md`](raw/Web_METATRADER5.md), contexto general de producto |
| F005 | MetaTrader 5 Beta Adds Native AI Agents and MCP Support | https://www.financemagnates.com/forex/metatrader-5-beta-adds-native-ai-agents-and-mcp-support-identity-and-broker-tools-also-get-an-overhaul/ | Finance Magnates | 2026-07 | 2026-08-07 | SECUNDARIA | Contraste independiente del anuncio MCP |
| F006 | Files and Folders — MetaTrader 5 Help | https://www.metatrader5.com/en/terminal/help/start_advanced/structure | MetaQuotes | continuo | 2026-08-07 | OFICIAL | Estructura del Data Folder |
| F007 | Chart Timeframes / ENUM_TIMEFRAMES | https://www.mql5.com/en/docs/constants/chartconstants/enum_timeframes | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | 21 timeframes estándar |
| F008 | TimeTradeServer / TimeCurrent / TimeGMT — Date and Time | https://www.mql5.com/en/docs/dateandtime | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Semántica hora servidor vs local |
| F009 | Event Handling (índice, OnTick, OnTradeTransaction, OnBookEvent) | https://www.mql5.com/en/docs/event_handlers | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Modelo de eventos y cola |
| F010 | Overview of event handling functions (MQL5 book) | https://www.mql5.com/en/book/applications/runtime/runtime_events_overview | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Comportamiento cola de eventos |
| F011 | Trade Transaction Types / Trade Transaction Structure | https://www.mql5.com/en/docs/constants/tradingconstants/enum_trade_transaction_type | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | `OnTradeTransaction` |
| F012 | CTrade / Trade Classes / Standard Library | https://www.mql5.com/en/docs/standardlibrary/tradeclasses/ctrade | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Wrapper de ejecución |
| F013 | Order Properties / ENUM_ORDER_STATE | https://www.mql5.com/en/docs/constants/tradingconstants/orderproperties | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Estados de orden |
| F014 | Order execution modes / Symbol trading conditions (MQL5 book) | https://www.mql5.com/en/book/automation/experts/experts_execution_filling | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Execution modes, filling policies |
| F015 | Account type: netting or hedging / Account margin settings (MQL5 book) | https://www.mql5.com/en/book/automation/account/account_netting_hedge | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Netting vs hedging |
| F016 | Symbol Properties / ENUM_SYMBOL_INFO_INTEGER, _DOUBLE | https://www.mql5.com/en/docs/constants/environment_state/marketinfoconstants | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Stop level, freeze level, volume step, tick value |
| F017 | Testing Trading Strategies / modos de modelado del tester | https://www.mql5.com/en/docs/runtime/testing | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Every tick / real ticks / M1 OHLC / open prices |
| F018 | MetaTester and Remote Agents — MetaTrader 5 Help | https://www.metatrader5.com/en/terminal/help/algotrading/metatester | MetaQuotes | continuo | 2026-08-07 | OFICIAL | Agentes locales/remotos |
| F019 | How the MQL5 Cloud Network works | https://cloud.mql5.com/en/help | MetaQuotes | continuo | 2026-08-07 | OFICIAL | MQL5 Cloud Network |
| F020 | OnTester / Optimization criteria (MQL5 book) | https://www.mql5.com/en/docs/event_handlers/ontester | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Criterio de optimización personalizado |
| F021 | MetaTrader5 for Python (documentación oficial del paquete) | https://www.mql5.com/en/docs/python_metatrader5 | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Funciones del paquete, mecanismo IPC |
| F022 | GitHub ariadng/metatrader-mcp-server | https://github.com/ariadng/metatrader-mcp-server | Autor independiente | — | 2026-08-07 | COMUNIDAD | Ejemplo de puente MCP de terceros — NO usar en el proyecto |
| F023 | "How to connect AI agents to MetaTrader 5 via MCP" (MQL5 Articles) | https://www.mql5.com/en/articles/21905 | Autor de comunidad MQL5 | 2026 | 2026-08-07 | SECUNDARIA | Describe puente de terceros, no el MCP nativo |
| F024 | Economic Calendar (índice y subpáginas CalendarEventById, CalendarValueHistory, MqlCalendarValue) | https://www.mql5.com/en/docs/calendar | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | API de calendario económico |
| F025 | CNMV — marco regulatorio (ESI, passporting, FOGAIN) | https://www.cnmv.es | CNMV | continuo | 2026-08-07 | OFICIAL (verificación directa del buscador pendiente, 403 en acceso automatizado) | Marco regulatorio para brokers en España |
| F026 | Comparativas "Best CNMV & ESMA Regulated Forex Brokers in Spain" (varias) | ver `13_Brokers_MetaTrader5_Espana.md` | Autores independientes | 2025-2026 | 2026-08-07 | SECUNDARIA/COMUNIDAD | Punto de partida de candidatos, no fuente de verdad de registro |
| F027 | Capex.com — regulación CySEC 292/16, sucursal/registro España (CNMV) y Rumanía (ASF), plataforma MT5 | ver búsquedas agregadas en `13_...` | Comparativas de terceros | 2026 | 2026-08-07 | SECUNDARIA | Ficha de broker candidato |
| F028 | Confirmación de que XTB no ofrece MT5 (solo xStation 5) | xtb.com/help-center + comparativas | XTB (oficial) + terceros | 2026 | 2026-08-07 | MIXTA (oficial + secundaria) | Corrección de hallazgo inicial erróneo |
| F029 | ActivTrades — entidades del grupo (FCA, SCB, CMVM, FSC, BACEN/CVM), netting FIFO | reseñas y comparativas agregadas | Terceros | 2025-2026 | 2026-08-07 | SECUNDARIA | Ficha de broker candidato, passporting a España no confirmado |
| F030 | MQL5 Virtual Hosting — Rules | https://www.mql5.com/en/vps/rules | MetaQuotes/MQL5 | continuo | 2026-08-07 | OFICIAL | Reglas completas del VPS integrado |

## Convención de uso

Cada documento temático (`0X_*.md`) incluye su propia sección `## Fuentes consultadas` citando el ID `F0XX` de esta tabla en vez de repetir metadatos completos. Este archivo se ha mantenido actualizado de forma continua durante toda la investigación, no solo al cierre.

## Resumen

- **Fuentes OFICIALES:** 24 (F001-F004, F006-F021, F024, F025 parcial, F030).
- **Fuentes SECUNDARIAS/COMUNIDAD:** 6 (F005, F022, F023, F026, F027, F029) — usadas solo donde la documentación oficial no bastaba (brokers, puentes MCP de terceros), y siempre marcadas explícitamente como tales, nunca como base de una decisión de seguridad o ejecución.
- **Contradicciones detectadas y resueltas:** 2 — build 6090 vs 6060 (F001/F003 corrigen la hipótesis del prompt maestro); XTB con/sin MT5 (F028 corrige un hallazgo inicial erróneo de una comparativa de terceros).

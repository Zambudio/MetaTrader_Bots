# Wiki de conocimiento de trading — schema

Esta es la capa "schema" del patrón [LLM Wiki](METHODOLOGY.md) (ver atribución y texto completo del patrón en ese archivo). Define cómo está organizada esta wiki, sus convenciones, y el flujo de trabajo a seguir al ingerir fuentes, responder preguntas o mantenerla.

## Propósito

Base de conocimiento de trading de propósito general: desde lo más básico (velas, marcos temporales, estructura de mercado) hasta lo más avanzado (estrategias, análisis fundamental, gestión de riesgo). Mantenida por Claude Code en colaboración con Pedro, y pensada como fuente de referencia rápida para diseñar/afinar estrategias y, en el futuro, para que los agentes de IA del dashboard (`trading-agents-dashboard/`) la consulten.

## No confundir con `docs/MetaTrader/`

`docs/MetaTrader/` (ver [`../docs/MetaTrader/00_INDEX.md`](../docs/MetaTrader/00_INDEX.md)) es un corpus **distinto**: investigación de ingeniería para construir *este* sistema concreto de bots (arquitectura de MetaTrader 5, modelo de órdenes/deals/posiciones, MCP, despliegue en VPS, estándar de generación de EAs con IA, selección de broker...). Es una investigación fija, auditada, ligada a decisiones de este proyecto — no una wiki de conocimiento de trading que vaya creciendo con el tiempo.

Esta wiki (`wiki-Traiding/`) es lo contrario: conocimiento de trading de propósito general, reutilizable fuera de este proyecto concreto, que crece con cada fuente que se ingiere. Si una página de aquí necesita mencionar algo específico de este proyecto (p. ej. cómo se usa un indicador en el dashboard), enlaza a `docs/MetaTrader/` o a `trading-agents-dashboard/`, no dupliques ese contenido.

## Idioma y convenciones

- **Idioma**: español, coherente con el resto del repo. Los términos técnicos estándar se mantienen en inglés donde sea habitual (RSI, MACD, R:R, drawdown, take profit...).
- **Enlaces**: markdown relativo estándar (`[texto](carpeta/pagina.md)`), no wikilinks `[[...]]` — mantiene la wiki legible fuera de Obsidian aunque sea compatible con él.
- **Frontmatter de página** (sugerido, no obligatorio en páginas cortas):
  ```yaml
  ---
  tags: [indicadores, osciladores]
  updated: 2026-08-16
  fuentes: [raw/nombre-fuente.md]
  ---
  ```
  **Importante**: `fuentes:` en frontmatter es solo metadato de referencia rápida (texto plano) — Obsidian NO lo interpreta como enlace y no lo muestra en el grafo. Toda página debe tener además una sección `## Fuentes` al final del cuerpo con un enlace markdown relativo real por cada entrada (`- [Nombre legible](../raw/<categoria>/<archivo>) — qué es`), o esa fuente quedará invisible en el grafo aunque esté "documentada" (detectado y corregido el 2026-08-16, ver `log.md`).

## Estructura

```
wiki-Traiding/
  CLAUDE.md          <- este archivo (schema)
  METHODOLOGY.md      <- patrón original (Karpathy), íntegro
  index.md             <- catálogo de páginas, por categoría
  log.md                <- log cronológico de ingestas/consultas/lint
  raw/                   <- fuentes inmutables (ver raw/README.md)
  <categoría>/            <- páginas de contenido, creadas según se ingiere
```

Las carpetas de categoría se crean cuando llega la primera página de esa categoría — no hay carpetas vacías de andamiaje. Taxonomía de arranque prevista (ajustable con el uso):

- `basico/` — velas japonesas, marcos temporales, estructura de mercado, tipos de gráfico, microestructura, sesgos cognitivos.
- `indicadores/` — medias móviles, osciladores (RSI, Estocástico...), MACD, Bollinger, volumen, volatilidad (ATR, VIX), Fibonacci.
- `estrategias/` — seguimiento de tendencia, reversión a la media, ruptura, scalping, swing trading, backtesting y validación, métricas de rendimiento, regímenes de mercado, pairs trading.
- `analisis-fundamental/` — calendario económico, macroeconomía, bancos centrales, correlaciones entre activos, indicadores macro clave, forward guidance.
- `gestion-riesgo/` — position sizing, ratio riesgo/beneficio (R:R), expectativa matemática, drawdown, riesgo de ruina, riesgo de cartera, simulación Monte Carlo, gestión de operaciones en vivo.
- `infraestructura/` — APIs de datos de mercado (MQL5, Python MetaTrader5, REST/WebSocket), ejecución, Strategy Tester, plataformas.
- `glosario.md` — catálogo de más de 140 términos con definiciones rápidas y enlaces a páginas de profundidad.

## Operaciones

### Ingest (ingerir una fuente nueva)

1. Pedro deja una fuente nueva en `raw/` (artículo, notas, extracto) o la pega en la conversación.
2. Claude la lee, comenta los puntos clave con Pedro.
3. Claude escribe o actualiza la(s) página(s) de contenido correspondientes (creando la carpeta de categoría si es la primera de esa categoría).
4. Claude actualiza `index.md` (entrada nueva o descripción revisada).
5. Claude añade una entrada a `log.md`.

Por defecto, ingerir de una en una y mantener a Pedro implicado (revisar resúmenes, guiar énfasis), salvo que se pida explícitamente una ingesta por lotes.

### Query (responder una pregunta)

1. Claude lee `index.md` primero para ubicar páginas relevantes.
2. Lee las páginas concretas necesarias.
3. Sintetiza la respuesta citando las páginas usadas.
4. Si la respuesta genera contenido de valor duradero (una comparación, un análisis nuevo), se ofrece archivarlo como página nueva o actualización, siguiendo el flujo de Ingest.

### Lint (mantenimiento periódico)

Cuando se pida una revisión de salud de la wiki: buscar contradicciones entre páginas, afirmaciones desactualizadas por fuentes más nuevas, páginas huérfanas sin enlaces entrantes, conceptos mencionados que aún no tienen página propia, y enlaces cruzados que faltan.

## Cableado con los agentes del dashboard

**Hecho (2026-08-17).** Los agentes de IA en tiempo de ejecución de `trading-agents-dashboard/` leen automáticamente esta wiki como contexto de apoyo: `server/src/store/wikiStore.ts` selecciona, por relevancia (solapamiento de palabras clave ponderado por especificidad contra `index.md`, sin embeddings), 2-3 páginas para el rol/instrucciones de cada agente (`server/src/engine/realExecutor.ts`) y para la estrategia ya decidida al generar el EA en MQL5 (`server/src/engine/mql5Generator.ts`), y las concatena al `systemPrompt` correspondiente. Selección 100% automática — no hay campos nuevos en `agents.json` ni en el tipo `Agent`. Un agente sin páginas relevantes sigue funcionando igual que antes (bloque vacío).

Es un heurístico simple de primera pasada — si el matching resulta demasiado ruidoso o demasiado escaso en uso real, ajustar `minScore`/`maxPages` en las llamadas a `getWikiContextBlock(...)` (ver esos dos archivos) antes de plantearse algo más sofisticado (embeddings, `qmd`, etc.).

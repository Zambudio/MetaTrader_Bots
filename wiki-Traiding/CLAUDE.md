# Wiki de conocimiento de trading — schema

Esta es la capa "schema" del patrón [LLM Wiki](METHODOLOGY.md) (ver atribución y texto completo del patrón en ese archivo). Define cómo está organizada esta wiki, sus convenciones, y el flujo de trabajo a seguir al ingerir fuentes, responder preguntas o mantenerla.

## Propósito

Base de conocimiento única del proyecto. Combina dos tipos de contenido:

- **Conocimiento de trading de propósito general**: desde lo más básico (velas, marcos temporales, estructura de mercado) hasta lo más avanzado (estrategias, análisis fundamental, gestión de riesgo). Reutilizable fuera de este proyecto concreto, crece con cada fuente que se ingiere.
- **Investigación de ingeniería de este proyecto** (`proyecto-mt5-bots/`): cómo se construye *este* sistema concreto de bots (arquitectura de MetaTrader 5, modelo de órdenes/deals/posiciones, MQL5, MCP, despliegue en VPS, estándar de generación de EAs con IA, selección de broker...). Investigación fija ligada a decisiones de este proyecto, con sus propias convenciones (ver más abajo).

Mantenida por Claude Code en colaboración con Pedro, y pensada como fuente de referencia rápida para diseñar/afinar estrategias, para configurar y operar los EAs de este proyecto, y para que los agentes de IA del dashboard (`trading-agents-dashboard/`) la consulten.

## Dos convenciones distintas bajo un mismo techo

Las categorías generales (`basico/`, `indicadores/`, `estrategias/`, `analisis-fundamental/`, `gestion-riesgo/`, `infraestructura/`, `glosario.md`) siguen el flujo estándar de esta wiki: Ingest/Query/Lint descrito más abajo, con `raw/` como fuente inmutable y frontmatter con `fuentes:`.

`proyecto-mt5-bots/` y `proyecto-dashboard/` son distintos: son investigación/planes de ingeniería escritos directamente (no derivados de fuentes en `raw/`), cada uno con su propio índice (`00_INDEX.md`) en vez de aparecer viñeta a viñeta en `index.md`/`log.md` de la wiki general (aunque `index.md` sí enlaza a cada índice, ver Estructura).

- `proyecto-mt5-bots/` — fuertemente interreferenciado entre sus propios documentos numerados (`00`-`20`), con tabla de estados por documento (`BORRADOR`/`REVISADO`/`VERIFICADO`) en su `00_INDEX.md`, su propio glosario técnico ([`proyecto-mt5-bots/GLOSARIO.md`](proyecto-mt5-bots/GLOSARIO.md), términos de MQL5/EA/MCP — no confundir con el [`glosario.md`](glosario.md) general de trading), preguntas abiertas (`PREGUNTAS_ABIERTAS.md`), roadmap (`ROADMAP.md`), fuentes oficiales citadas (`FUENTES.md`) y decisiones arquitectónicas congeladas (`DECISIONS/`). Se edita directamente cuando cambian decisiones o se completa una fase de investigación. Tiene su propio `raw/` (una única fuente hasta ahora, `Web_METATRADER5.md`, el informe de partida de la investigación) — igual que el `raw/` general, inmutable, citado desde los documentos que lo usan, nunca editado.
- `proyecto-dashboard/` — planes de implementación (`planes/`) y specs de diseño (`specs/`) de `trading-agents-dashboard/`, escritos con el flujo de la skill `superpowers:writing-plans` antes de implementarse. Una vez ejecutado un plan, queda como registro histórico — si el código diverge, se anota la divergencia en vez de reescribir el plan como si siempre hubiera dicho eso.

Ambos se mantienen y se actualizan con el mismo cuidado (auditados, interreferenciados), pero **no** siguen el flujo de Ingest de fuentes de las categorías generales.

Si una página de conocimiento general necesita mencionar algo específico de este proyecto (p. ej. cómo se usa un indicador en el dashboard o en un EA concreto), enlaza a `proyecto-mt5-bots/`, `proyecto-dashboard/` o `trading-agents-dashboard/`, no dupliques ese contenido — y viceversa.

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
  <categoría>/            <- páginas de conocimiento general, creadas según se ingiere
  proyecto-mt5-bots/       <- investigación de ingeniería de este proyecto (convenciones propias, ver arriba)
  proyecto-dashboard/      <- planes/specs de ingeniería de trading-agents-dashboard (convenciones propias, ver arriba)
```

Las carpetas de categoría se crean cuando llega la primera página de esa categoría — no hay carpetas vacías de andamiaje. Taxonomía de arranque prevista (ajustable con el uso):

- `basico/` — velas japonesas, marcos temporales, estructura de mercado, tipos de gráfico, microestructura, sesgos cognitivos.
- `indicadores/` — medias móviles, osciladores (RSI, Estocástico...), MACD, Bollinger, volumen, volatilidad (ATR, VIX), Fibonacci.
- `estrategias/` — seguimiento de tendencia, reversión a la media, ruptura, scalping, swing trading, backtesting y validación, métricas de rendimiento, regímenes de mercado, pairs trading.
- `analisis-fundamental/` — calendario económico, macroeconomía, bancos centrales, correlaciones entre activos, indicadores macro clave, forward guidance.
- `gestion-riesgo/` — position sizing, ratio riesgo/beneficio (R:R), expectativa matemática, drawdown, riesgo de ruina, riesgo de cartera, simulación Monte Carlo, gestión de operaciones en vivo.
- `infraestructura/` — APIs de datos de mercado (MQL5, Python MetaTrader5, REST/WebSocket), ejecución, Strategy Tester, plataformas.
- `glosario.md` — catálogo de más de 140 términos con definiciones rápidas y enlaces a páginas de profundidad.
- `proyecto-mt5-bots/` — investigación de ingeniería de este proyecto concreto: arquitectura y funcionamiento de MT5, fundamentos y estándar de MQL5, arquitectura de Expert Advisors, modelo de órdenes/deals/posiciones, gestión de riesgo de EAs, Strategy Tester, backtesting/optimización/validación quant, ciclo de vida y versionado de estrategias, integración Python, MCP/agentes de IA, arquitectura multiagente futura, análisis fundamental aplicado al proyecto, selección de broker, despliegue en VPS, seguridad/credenciales, observabilidad/auditoría, estándar de desarrollo de EAs con IA, primeros bots de laboratorio, plan de puesta en marcha y pipeline de validación/backtest agéntico. Ver su propio índice: [`proyecto-mt5-bots/00_INDEX.md`](proyecto-mt5-bots/00_INDEX.md).
- `proyecto-dashboard/` — planes de implementación y specs de diseño de `trading-agents-dashboard/` (dependencias multi-padre entre agentes, esquema de 6 agentes de análisis), escritos con el flujo de la skill `superpowers:writing-plans` antes de implementarse. Ya ejecutados; quedan como registro histórico de diseño. Ver su propio índice: [`proyecto-dashboard/00_INDEX.md`](proyecto-dashboard/00_INDEX.md).

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

**`proyecto-mt5-bots/` queda fuera de este catálogo automático a propósito.** `parseIndex` en `wikiStore.ts` solo indexa viñetas de `index.md` con el formato exacto `- [`file`](path) — descripción`; la sección "Proyecto — Ingeniería MT5 Bots" de `index.md` se escribió deliberadamente como prosa sin ese formato para no aportar 20+ entradas de ingeniería al catálogo (diluiría el IDF de tokens compartidos como "riesgo" o "backtesting" y podría inyectar contexto de despliegue/VPS/broker irrelevante en agentes de diseño de estrategia). Si en el futuro se decide que algún documento concreto de `proyecto-mt5-bots/` sí debe entrar en el matching automático, añadir esa viñeta puntual con el formato exacto en `index.md`, no la carpeta entera.

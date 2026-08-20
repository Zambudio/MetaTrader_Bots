# Log — Wiki de conocimiento de trading

> Registro cronológico, append-only, de ingestas, consultas y pasadas de lint sobre esta wiki. Formato de cada entrada: `## [YYYY-MM-DD] tipo | Título`. Con este prefijo consistente el log es fácil de recorrer con herramientas simples, p. ej. `grep "^## \[" wiki/log.md | tail -5` para ver las últimas 5 entradas.

## [2026-08-16] setup | Creación de la wiki de conocimiento de trading

Montada la estructura inicial siguiendo el patrón [LLM Wiki de Karpathy](METHODOLOGY.md), a petición de Pedro. Decisiones tomadas en esta sesión:

- La wiki se mantiene **separada** de `docs/MetaTrader/` (investigación de ingeniería de este proyecto, no conocimiento de trading de propósito general) y de `trading-agents-dashboard/docs/` (documentación de producto/ingeniería del dashboard). No se movió ni se reescribió ningún documento existente.
- Enlazada desde el nuevo `CLAUDE.md` raíz y desde `README.md`, para que Claude Code la consulte automáticamente en cada sesión de este repo.
- El cableado de esta wiki hacia los agentes de IA en tiempo de ejecución del dashboard (`agents.json`, `mql5Generator.ts`) queda **aplazado** por decisión explícita de Pedro — ver la sección "Pendiente" en [`CLAUDE.md`](CLAUDE.md).
- Sin ingestas de contenido todavía: `index.md` está vacío por categorías. La siguiente sesión de trabajo será buscar e ingerir el primer contenido real (velas, indicadores, estrategias, análisis fundamental) siguiendo el flujo de Ingest documentado en `CLAUDE.md`.

## [2026-08-16] ingest | Primera ingesta masiva — 25 fuentes curadas, 18 páginas en 5 categorías

Pedro pidió una lista de fuentes de máxima calidad (papers académicos + fundamentos técnicos), y a continuación que se descargaran/copiaran todas y se construyera la wiki con ellas de una vez, sin ingerir de una en una. Se ejecutó en dos pasos:

1. **Investigación y curación**: un research pass (WebSearch + WebFetch, cada URL verificada antes de recomendarla) produjo una lista de ~25 fuentes de calidad repartidas en las 5 categorías, priorizando papers académicos/institucionales (arXiv, NBER, AQR, BIS) y fuentes educativas reconocidas (StockCharts ChartSchool, CME Group, SEC, bancos centrales) sobre blogs genéricos.
2. **Ingesta**: 4 agentes en paralelo (uno por categoría, salvo básico+indicadores que fueron juntos) descargaron cada fuente a `wiki/raw/<categoria>/` — PDFs reales vía `curl`/`Invoke-WebRequest` cuando la fuente era un paper, contenido extraído vía WebFetch guardado como `.md` cuando era una página web — y con ese material escribieron las páginas de síntesis en `wiki/<categoria>/`.

**Resultado**: 28 archivos en `raw/` (7 PDFs de papers reales — Zarattini/Barbon/Aziz ORB, AQR trend-following, NBER Lakonishok-Shleifer-Vishny, Jegadeesh-Titman momentum, BIS WP1290, Ziemba-MacLean Kelly, Goldberg-Mahmoud drawdown — más 21 páginas web) y 18 páginas de contenido nuevas: 3 en `basico/`, 5 en `indicadores/`, 4 en `estrategias/`, 3 en `analisis-fundamental/`, 3 en `gestion-riesgo/`. `index.md` actualizado con todas.

**Huecos/fallos honestos documentados** (no rellenados con contenido inventado):
- `raw/gestion-riesgo/cfa-institute-enterprising-investor.md` — la página usa un widget Coveo del lado del cliente; el HTML servido no contiene artículos citables. Sin contenido útil extraído.
- `raw/indicadores/investopedia-macd.md` — Investopedia bloquea WebFetch; no se encontró espejo del artículo, solo contenido equivalente de otras fuentes (Fidelity, IBKR, IG.com) — marcado como no confirmado como texto de Investopedia.
- `raw/indicadores/investopedia-rsi.md` y `raw/indicadores/cme-group-technical-analysis.md` — capturas parciales vía espejo/WebSearch (dominios con bloqueo anti-bot para WebFetch directo), marcadas como tales.
- `raw/basico/stockcharts-tipos-grafico.md` — StockCharts no tiene subpáginas dedicadas a línea/barras/velas básicas en su índice; cubierto solo para los formatos especializados (Heikin-Ashi, Renko, Kagi...).
- No se cubrió Estocástico en `indicadores/osciladores.md` (solo RSI) ni CMF/MFI en `indicadores/volumen-y-atr.md` (solo OBV) — quedan como huecos para una futura ingesta.
- `raw/estrategias/quantstart-articulos-indice.md`, `concretum-group-papers.md` y `cboe-options-institute.md` se guardaron como material de referencia pero no generaron página propia — son índices de catálogo, no contenido sustantivo por sí mismos.

**Siguiente paso sugerido**: revisar las páginas nuevas con Pedro, y si se quiere profundizar, ingesta dirigida a los huecos de arriba (Estocástico, CMF/MFI, tipos de gráfico básicos, artículos de Investopedia por otra vía).

## [2026-08-16] ingest | Ronda de ampliación — rellenar huecos + cobertura completa

Pedro pidió explícitamente rellenar todos los huecos detectados en la ingesta anterior y "añadir todo lo que estimes necesario para tener una gran fuente de conocimiento... para que los agentes funcionen de manera magistral". Se ejecutó como una segunda ronda de Ingest: 5 agentes en paralelo (uno por categoría existente) rellenaron los huecos pendientes y añadieron páginas nuevas donde detectaron carencias reales, seguido de un sexto agente (secuencial, tras los 5) que leyó las 30 páginas de contenido ya completas para construir `glosario.md`.

**Huecos de la ingesta anterior, todos cerrados:**
- Estocástico → añadido a `indicadores/osciladores.md`.
- CMF y MFI → añadidos a `indicadores/volumen-y-atr.md`.
- Tipos de gráfico básicos (línea, barras/OHLC) → añadidos a `basico/tipos-grafico.md`.
- Investopedia RSI/MACD (bloqueado) → no se persiguió más: el contenido ya estaba cubierto en profundidad por StockCharts; hueco cerrado por redundancia, no por reintento.

**12 páginas nuevas:**
- `basico/`: `soporte-y-resistencia.md`, `tendencias-y-estructura.md` (Dow Theory).
- `indicadores/`: `adx-dmi.md` (hueco detectado por el propio agente), `como-combinar-indicadores.md`.
- `estrategias/`: `scalping.md`, `swing-trading.md`, `backtesting-y-validacion.md`.
- `analisis-fundamental/`: `correlaciones-entre-activos.md`, `indicadores-macro-clave.md`, `forward-guidance-y-lectura-de-comunicados.md` (hueco detectado por el propio agente).
- `gestion-riesgo/`: `riesgo-de-ruina.md`, `riesgo-de-cartera.md`.
- `glosario.md` — 120 términos, cada uno enlazado a su página de profundidad.

**Nuevas fuentes en `raw/` de esta ronda** (destacan varios papers académicos rigurosos conseguidos de nuevo, más allá de la primera lista curada): Karl Whelan (2025) sobre probabilidad de ruina con pagos asimétricos; Bailey/Borwein/López de Prado/Zhu (2014, 2015) sobre pseudo-matemática y sobreajuste de backtests (CSCV/PBO); Lo/Mamaysky/Wang (2000, NBER/Journal of Finance) sobre validez estadística del análisis técnico; Barber/Lee/Liu/Odean sobre rentabilidad real de day traders retail en Taiwán; Kearns/Kulesza/Nevmyvaka sobre el techo teórico de rentabilidad del HFT ultra-corto plazo; más fuentes institucionales (ICE sobre el DXY, Chicago Fed sobre el oro, Bank of Canada, BIS) para análisis fundamental.

**Honestidad mantenida**: `estrategias/scalping.md` deja explícito que no existe literatura académica rigurosa dedicada específicamente a scalping puro (se repitió la búsqueda y sigue sin encontrarse), y construye la página como síntesis razonada apoyada en dos papers adyacentes (techo de rentabilidad HFT + evidencia empírica de day trading retail) en vez de fingir una fuente que no existe. Varias fuentes de dominios con bloqueo anti-bot (bls.gov, cmegroup.com, spglobal.com, stlouisfed.org, dol.gov) se sustituyeron por alternativas de calidad equivalente que sí fueron accesibles (Bank of Canada, ICE, Trading Economics, FOREX.com, OANDA), documentado en cada página afectada.

**Estado tras esta ronda**: 31 páginas de contenido (30 + glosario) en 5 categorías, ~53 fuentes en bruto en `raw/` (más de una decena de papers académicos reales descargados como PDF, verificados con `pdftotext`/`file`). Se corrigieron además 2 enlaces cruzados que habían quedado desincronizados por la ejecución en paralelo de la ingesta anterior (apuntaban a `gestion-riesgo/` como "pendiente" cuando ya tenía contenido).

**Nota**: apareció una carpeta `wiki/.obsidian/` (config local de la app Obsidian) — no fue creada por ningún agente de esta tarea, probablemente porque se abrió la carpeta `wiki/` como vault de Obsidian en local. No se ha tocado ni versionado.

## [2026-08-16] lint | Arreglo de interlinking — el grafo de Obsidian no mostraba las fuentes

Pedro abrió la wiki en Obsidian y detectó por el grafo que las fuentes de `raw/` aparecían como nodos aislados, sin relación con las páginas de contenido. Causa raíz diagnosticada: el campo `fuentes:` del frontmatter de cada página era una lista de texto plano (rutas sin sintaxis de enlace), así que Obsidian no dibujaba ninguna arista — de 31 páginas, solo 6 tenían algún enlace real a `raw/`, y ninguna de forma completa (69 fuentes citadas en frontmatter, ~10 enlazadas de verdad).

**Arreglo**: 5 agentes en paralelo (uno por categoría) añadieron a cada página una sección `## Fuentes` al final del cuerpo, con un enlace markdown relativo real (`../raw/<categoria>/<archivo>`) por cada entrada de su frontmatter — sin tocar el frontmatter en sí, que se mantiene como metadato de referencia rápida. Resultado: 30/30 páginas de categoría con `## Fuentes` completa, 69 enlaces reales verificados hacia `raw/`.

De paso, cada agente reforzó también los cruces entre páginas de contenido de distintas categorías donde había relación temática genuina (p. ej. `basico/tendencias-y-estructura.md` ↔ `indicadores/adx-dmi.md`, `gestion-riesgo/riesgo-de-cartera.md` ↔ `analisis-fundamental/correlaciones-entre-activos.md`, `estrategias/*` ↔ `gestion-riesgo/*`), sin forzar enlaces artificiales.

**Lección para el futuro**: al añadir nuevas páginas, la convención `fuentes:` en frontmatter (definida en `CLAUDE.md`) es solo metadato — cualquier fuente citada ahí debe enlazarse también con markdown real en una sección `## Fuentes` del cuerpo, o quedará invisible en el grafo de Obsidian aunque esté "documentada".

## [2026-08-16] lint | Segunda pasada — huérfanos reales en `raw/` no citados por ninguna página

Pedro, mirando el grafo tras el arreglo anterior, detectó más nodos sueltos y preguntó si eran normales o un fallo. Auditoría sistemática (comparar cada archivo de `raw/` contra todas las páginas de contenido, no solo mirar la captura de pantalla) encontró 3 huérfanos reales — fuentes descargadas en ingestas anteriores pero nunca citadas por ninguna página — y confirmó que un cuarto nodo aparentemente suelto (`cfa-institute-enterprising-investor.md`) está correctamente excluido, no es un fallo: documenta su propia captura fallida (widget JS sin contenido citable) y se menciona en prosa en `expectativa-y-ratio-rr.md` explicando por qué no se usó.

Los 3 huérfanos reales, resueltos:
- `raw/estrategias/cboe-options-institute.md` → nueva página **`basico/opciones-fundamentos.md`** (fundamentos de opciones: calls/puts, payoff, por qué importa la volatilidad implícita aunque este proyecto opere spot/CFDs, no opciones). Cierra parcialmente el hueco de "opciones y derivados" detectado en la auditoría de contenido de esta misma sesión.
- `raw/estrategias/quantstart-articulos-indice.md` → sección nueva "Recursos para profundizar" en `estrategias/backtesting-y-validacion.md` (puntero a implementación práctica en Python: QSTrader, series temporales, ML).
- `raw/indicadores/cme-group-technical-analysis.md` (captura parcial) → citado como corroboración institucional en `basico/soporte-y-resistencia.md`; de paso queda anotado que ese mismo curso de CME Group tiene un módulo de Fibonacci que esta wiki todavía no cubre (candidato a futura página).

Verificado tras el arreglo: 0 huérfanos en `raw/` (todos los archivos aparecen citados en al menos una página de contenido).

**Nota sobre `00_INDEX` (docs/MetaTrader) visible en el grafo**: es comportamiento correcto, no un fallo. El vault de Obsidian es `wiki/` (`.obsidian/` vive ahí), y `wiki/CLAUDE.md` y `estrategias/backtesting-y-validacion.md` enlazan deliberadamente a `../docs/MetaTrader/` (investigación de este proyecto, fuera del alcance de la wiki). Obsidian muestra esos enlaces como nodos "no resueltos" en el grafo porque el archivo existe fuera del vault — es la forma correcta de que el grafo refleje una referencia cruzada intencional a un corpus separado, no algo que deba "arreglarse" fusionando `docs/` dentro de la wiki.

## [2026-08-16] expand & audit | Expansión de 10 brechas críticas + infraestructura + auditoría de grafo al 100%

Ejecución autónoma de un pipeline completo de auditoría y expansión en 4 fases tras la aprobación del plan de implementación:

1. **Fase 1 — GAP Analysis exhaustivo**:
   - Auditoría de los 31 documentos existentes y su granularidad técnica.
   - Identificación de 10 brechas de conocimiento clave (6 críticas, 4 de alta prioridad) para la generación y diseño de EAs cuantitativos.

2. **Fase 2 & 3 — Adquisición & Creación de 10 páginas wiki + 10 fuentes `raw/`**:
   - **Brechas críticas resueltas**:
     - `gestion-riesgo/simulacion-monte-carlo.md` + raw: Bootstrap resampling (IID vs. block bootstrap), distribución empírica de drawdowns al 95% de confianza, cálculo no analítico de probabilidad de ruina y calibración de sizing.
     - `estrategias/metricas-rendimiento.md` + raw: Fórmulas, asunciones, y uso conjunto de Sharpe, Sortino, Calmar (y variantes Sterling/Burke), Profit Factor y Expectancia.
     - `basico/microestructura-mercado.md` + raw: Limit Order Book (LOB), descomposición del spread (selección adversa de Kyle/Glosten-Milgrom, costes de inventario de Stoll), ley de la raíz cuadrada de impacto de mercado y Order Flow Imbalance (Cont-Kukanov-Stoikov 2010).
     - `infraestructura/apis-datos-mercado.md` + raw (nueva categoría `infraestructura/`): MQL5 nativo (event handlers `OnTick`/`OnTimer`/`OnTrade`, `TRADE_ACTION_SLTP`, funciones de DOM y ticks), paquete Python `MetaTrader5` (IPC Windows), Strategy Tester, tick vs. OHLC y catálogo de APIs complementarias (Polygon, Alpha Vantage, CCXT).
     - `indicadores/fibonacci.md` + raw: Retrocesos (23.6%-78.6%) y extensiones (127.2%-261.8%), confluencia técnica estricta y formulación programática para EAs en MT5.
     - `gestion-riesgo/gestion-operaciones-vivo.md` + raw: Trailing stops (fijo, ATR/Chandelier, estructura swing), evidencia cuantitativa del breakeven stop (reducción de rentabilidad por whipsaw), scaling in (pyramiding) vs. averaging down, y scaling out.
   - **Brechas de alta prioridad resueltas**:
     - `indicadores/volatilidad-implicita-vix.md` + raw: Volatilidad histórica vs. implícita, metodología Cboe VIX, niveles de referencia, uso como filtro de régimen y estructura temporal (contango/backwardation).
     - `estrategias/regimenes-mercado.md` + raw: Modelos de regímenes (bull/bear/rango/crisis), Hidden Markov Models (Hamilton 1989), proxies de volatilidad/tendencia (VIX, ADX, ATR), meta-EAs con cambio dinámico de estrategia.
     - `estrategias/pairs-trading.md` + raw: Arbitraje estadístico market-neutral, distance approach (Gatev-Goetzmann-Rouwenhorst 2006, 11% exceso anual), cointegración de Engle-Granger y aplicación a pares de divisas forex.
     - `basico/sesgos-cognitivos-trading.md` + raw: Prospect Theory (Kahneman & Tversky 1979), aversión a la pérdida, efecto disposición (Shefrin-Statman, Odean 1998), y el bot como antídoto disciplinario.

3. **Mantenimiento y Catálogos**:
   - `index.md`: Actualizado con las 10 nuevas páginas y la nueva sección `## Infraestructura`.
   - `glosario.md`: Actualizado incorporando más de 20 nuevos términos clave (más de 140 términos con enlaces de retorno bidireccionales).
   - `CLAUDE.md`: Taxonomía actualizada para incluir formalmente `infraestructura/`.

4. **Fase 4 — Auditoría de Grafo e Integridad**:
   - Ejecutado script de validación sobre todos los archivos `.md` del vault:
     - **Páginas de contenido**: 41 páginas en 6 categorías + glosario.
     - **Fuentes raw**: 47 archivos fuente documentados.
     - **Enlaces rotos**: **0**.
     - **Páginas huérfanas de contenido**: **0**.
     - **Fuentes raw sin enlazar**: **0** (todas tienen enlace markdown en su sección `## Fuentes`).
     - **Conectividad**: Grafo de Obsidian 100% cohesionado y navegable.

## [2026-08-16] audit & purge | Eliminación de referencias a cursos y sustitución por papers técnicos y académicos seminales

A petición explícita de Pedro ("si algún artículo es un curso al que no se puede entrar porque es de pago, hay que quitarlo... solo queremos documentos técnicos y papers y fuentes de conocimiento que nos ayuden con los análisis"), se ejecutó una purga y enriquecimiento metodológico:

1. **Archivos eliminados de `raw/` y desvinculados de la wiki**:
   - `raw/indicadores/cme-group-technical-analysis.md` (Curso formativo de CME Group).
   - `raw/estrategias/cboe-options-institute.md` (Portal de cursos "Options 101" de Cboe).
   - `raw/gestion-riesgo/cfa-institute-enterprising-investor.md` (Widget JS vacío sin contenido).

2. **Nuevos papers seminales y documentos técnicos añadidos a `raw/`**:
   - `raw/basico/osler-support-resistance-orders.md`: Carol Osler (2000, 2003, 2005 - Federal Reserve Bank of New York / JIMF) sobre microestructura, clustering de órdenes stop-loss / take-profit en FX y física de rebotes y cascadas de precios.
   - `raw/basico/black-scholes-1973-options.md`: Fischer Black, Myron Scholes y Robert Merton (1973 - Journal of Political Economy / Bell Journal of Economics) sobre la ecuación diferencial libre de arbitraje, cálculo analítico de primas de opciones, derivación matemática de las griegas (Delta, Gamma, Vega, Theta, Rho) y extracción de la volatilidad implícita (IV).
   - `raw/gestion-riesgo/ralph-vince-optimal-f.md`: Ralph Vince (1990, 1992 - John Wiley & Sons) sobre la extensión de Kelly a distribuciones continuas empíricas de trading (*Optimal f*), maximización del Terminal Wealth Relative (TWR) y dimensionamiento por peor pérdida histórica (*WorstLoss*).
   - `raw/estrategias/almgren-chriss-optimal-execution.md`: Robert Almgren y Neil Chriss (2000 - Journal of Risk) sobre el modelo estándar de la industria de ejecución óptima de órdenes, descomposición de impacto temporal/permanente, trayectorias de liquidación y fundamentación de algoritmos TWAP y VWAP.

3. **Páginas de contenido reescritas y enriquecidas**:
   - `basico/soporte-y-resistencia.md`: Reemplazada referencia a cursos por la teoría de clustering de órdenes de Osler (FRBNY).
   - `basico/opciones-fundamentos.md`: Actualizada a fundamentos rigurosos de Black-Scholes-Merton y tabla analítica de griegas.
   - `gestion-riesgo/position-sizing-kelly.md`: Ampliada con el marco de Optimal $f$ de Ralph Vince.
   - `basico/microestructura-mercado.md`: Enriquecida con el modelo de Almgren-Chriss (2000) y trayectorias TWAP/VWAP.
   - `estrategias/scalping.md`: Actualizada con vínculos formales al impacto de mercado de Almgren-Chriss.
   - `estrategias/pairs-trading.md`: Ampliada con el proceso estocástico de Ornstein-Uhlenbeck y vida media (*half-life* $t_{1/2}$).
   - `gestion-riesgo/expectativa-y-ratio-rr.md`: Limpiadas referencias residuales.
   - `index.md` y `glosario.md`: Actualizados (>145 términos con definiciones cuantitativas).

4. **Auditoría final del grafo**:
   - **Páginas de contenido**: 41 páginas.
   - **Fuentes raw**: 48 archivos (100% papers científicos, documentos de bancos centrales y guías técnicas libres).
   - **Enlaces rotos**: **0**.
   - **Páginas huérfanas**: **0**.
   - **Fuentes raw sin enlazar**: **0**.

## [2026-08-19] restructure | Fusión de `docs/MetaTrader/` dentro de la wiki como `proyecto-mt5-bots/`

Pedro pidió explícitamente revertir la separación documentada en la sesión de setup (2026-08-16, ver primera entrada de este log): "la wiki es la base de conocimiento... quiero que muevas los documentos dentro de wiki". Confirmado el alcance como fusión completa (frente a extracción selectiva) antes de tocar archivos.

**Movido**: los 26 documentos de `docs/MetaTrader/` (incluida `DECISIONS/`) a `wiki-Traiding/proyecto-mt5-bots/` vía `git mv` (historial de git preservado; los 2 archivos con ediciones sin commitear en el working tree conservaron sus cambios).

**Reestructuración e indexado**:
- `wiki-Traiding/CLAUDE.md`: eliminada la sección "No confundir con `docs/MetaTrader/`", sustituida por "Dos convenciones distintas bajo un mismo techo" — `proyecto-mt5-bots/` mantiene sus propias convenciones (tabla de estados BORRADOR/REVISADO/VERIFICADO en su propio `00_INDEX.md`, `GLOSARIO.md` técnico propio, `DECISIONS/`, `PREGUNTAS_ABIERTAS.md`, `ROADMAP.md`, `FUENTES.md`) en vez de forzar el flujo estándar de Ingest (no deriva de fuentes en `raw/`, es investigación escrita directamente).
- `index.md`: nueva sección "Proyecto — Ingeniería MT5 Bots" enlazando a `proyecto-mt5-bots/00_INDEX.md`. Escrita deliberadamente en prosa (no con el formato exacto de viñeta `- [`file`](path) — desc`) para quedar **fuera** del catálogo de coincidencia automática de `wikiStore.ts` (evita diluir el IDF de tokens compartidos e inyectar contexto de ingeniería irrelevante — VPS, brokers, seguridad — en agentes de diseño de estrategia).
- Referencias corregidas tras el `git mv`: `CLAUDE.md` raíz, `README.md`, `wiki-Traiding/estrategias/backtesting-y-validacion.md`, `wiki-Traiding/infraestructura/apis-datos-mercado.md`, rutas internas de `proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md` (su propia plantilla de prompt se autorreferenciaba), `proyecto-mt5-bots/00_INDEX.md`, `proyecto-mt5-bots/19_Plan_Puesta_en_Marcha.md`, `trading-agents-dashboard/server/README.md`, `trading-agents-dashboard/server/src/engine/mql5Generator.ts` (comentario + texto del `MQL5_STANDARD_SYSTEM_PROMPT`), y `promp-auditoria1908.md` (23 referencias, reemplazo mecánico verificado sin falsos positivos).
- No tocadas por ser registro histórico (principio append-only): la entrada de este log del 2026-08-16 sobre la separación original, y el árbol de "Archivos creados en esta sesión" en `proyecto-mt5-bots/ESTADO_INVESTIGACION.md` (documentan el estado en su momento, no el actual).

**Sin cambios de contenido**: ningún documento de `proyecto-mt5-bots/` fue reescrito ni resumido — solo movido y con sus rutas internas corregidas.

## [2026-08-19] restructure | Eliminación completa de `docs/`, planes del dashboard movidos, huérfanos re-enlazados

Pedro señaló dos cosas pendientes de la restructuración anterior: (1) `docs/superpowers/` seguía existiendo con planes de implementación, y (2) desde Obsidian veía `PREGUNTAS_ABIERTAS.md`, `DECISIONS/README.md`, `ESTADO_INVESTIGACION.md` y `FUENTES.md` como nodos huérfanos en el grafo — "no quiero documentos sin relacionar".

**Movido y eliminado `docs/`**:
- `docs/superpowers/plans/{2026-08-15-multi-parent-dependencies,2026-08-17-esquema-agentes-analisis}.md` y `docs/superpowers/specs/2026-08-15-multi-parent-dependencies-design.md` → nueva categoría `wiki-Traiding/proyecto-dashboard/{planes,specs}/` (`git mv`, historial preservado).
- Creado `proyecto-dashboard/00_INDEX.md` (no existía ningún índice para estos 3 archivos) enlazando a los tres con descripción y estado ("ya ejecutados, registro histórico").
- Corregida la única ruta rota (`docs/superpowers/specs/...` → `../specs/...` dentro del plan de multi-parent-dependencies); la otra referencia cruzada (`trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md`) seguía resolviendo bien porque la nueva ubicación tiene la misma profundidad de carpetas que la antigua.
- `docs/` verificado vacío de archivos (`find docs -type f` sin resultados) y eliminado con `rmdir` recursivo (falla si hay algo dentro — no se usó borrado destructivo ciego).
- `index.md`, `wiki-Traiding/CLAUDE.md` (estructura + convenciones) y `CLAUDE.md` raíz actualizados con la nueva categoría. Añadida nota en `CLAUDE.md` raíz para que futuros planes de `superpowers:writing-plans` se escriban directamente en `proyecto-dashboard/` en vez de recrear `docs/`.

**Causa raíz de los huérfanos y arreglo**: `PREGUNTAS_ABIERTAS.md`, `ESTADO_INVESTIGACION.md` y `FUENTES.md` se mencionaban en más de 25 sitios del corpus `proyecto-mt5-bots/`, pero **siempre** como texto entre backticks (`` `FUENTES.md` ``), nunca como enlace markdown real — Obsidian no dibuja arista con eso, exactamente el mismo patrón de fallo que la entrada de lint del 2026-08-16 sobre `fuentes:` en frontmatter. `DECISIONS/README.md` no se mencionaba en ningún sitio salvo la carpeta `DECISIONS/` a secas.

**Arreglo**: conversión sistemática (`sed` acotado a `wiki-Traiding/proyecto-mt5-bots/`, verificado archivo por archivo) de toda mención entre backticks de esos 3 nombres de archivo a enlace markdown real, más la única mención sin backticks en `15_Seguridad_Credenciales_y_Permisos.md`. Además, nueva sección "Documentos de seguimiento y meta" en `00_INDEX.md` con enlace directo a los 4 archivos (los 3 anteriores + `DECISIONS/README.md`) para que cada uno tenga como mínimo un enlace de entrada fuerte desde el índice maestro, no solo menciones dispersas.

**Error cometido y corregido en el propio proceso**: el `sed` masivo, al aplicarse después de escribir a mano los enlaces de la nueva sección de `00_INDEX.md`, los envolvió dos veces (`[[texto](enlace)](enlace)`) porque el patrón buscaba el mismo texto entre backticks que yo ya había enlazado. Detectado con un grep de `]](` sobre todo el corpus tras la pasada masiva y corregido antes de dar la tarea por terminada — verificación explícita, no asumida.

**Verificado al cerrar**: `grep -r "docs/MetaTrader\|docs/superpowers"` sobre el repo solo devuelve menciones históricas intencionales (esta misma entrada de log, la entrada anterior, y el árbol "Archivos creados en esta sesión" de `ESTADO_INVESTIGACION.md`) — cero rutas rotas activas.

## [2026-08-19] restructure | `Web_METATRADER5.md` a `raw/`, README y `CLAUDE.md` con la regla permanente de documentación

Cierre de la restructuración: Pedro pidió mover también `Web_METATRADER5.md` (el informe de partida elaborado el 06/08/2026 desde el sitio oficial, que vivía suelto en la raíz del repo) a la wiki, indexarlo, y luego — con la wiki ya en condiciones — actualizar `README.md` y las instrucciones de Claude Code para que toda futura documentación del proyecto se añada siempre a la wiki, indexada y relacionada.

**`Web_METATRADER5.md` movido**: a `wiki-Traiding/proyecto-mt5-bots/raw/Web_METATRADER5.md` (`git mv`) — es la primera fuente `raw/` de ese corpus (hasta ahora `proyecto-mt5-bots/` no tenía subcarpeta `raw/`, era investigación escrita directamente). Se trata como fuente inmutable, igual que el `raw/` general de la wiki: no se ha editado su contenido.

**Relacionado** (5 menciones que eran texto entre backticks, convertidas a enlace markdown real hacia `raw/Web_METATRADER5.md`): `FUENTES.md` (fila F004, "Usado para"), `00_Contexto_y_Objetivos_Proyecto.md` §7, `01_Arquitectura_y_Funcionamiento_MetaTrader5.md` §1, `ESTADO_INVESTIGACION.md` (hallazgo de build vigente), `14_Despliegue_24x7_VPS.md` (límite de gráficos con EA). Añadida además entrada propia en la sección "Documentos de seguimiento y meta" de `00_INDEX.md`.

**`wiki-Traiding/CLAUDE.md`**: nota añadida sobre el nuevo `proyecto-mt5-bots/raw/` (una fuente por ahora), mismo principio de inmutabilidad que el `raw/` general.

**`README.md`**: sustituida la única línea que resumía la wiki por una sección completa "Wiki de conocimiento (`wiki-Traiding/`)" con las 7 categorías de conocimiento general y las 2 categorías de proyecto (`proyecto-mt5-bots/`, `proyecto-dashboard/`), cada una enlazada.

**`CLAUDE.md` raíz**: la nota puntual sobre dónde van los planes de `trading-agents-dashboard/` (añadida en la sesión anterior) se sustituyó por una regla permanente y más general — "Regla permanente: toda la documentación va a la wiki, indexada" — cubriendo cualquier documento futuro (investigación, decisiones, planes, specs, auditorías, notas de progreso) de cualquier agente, con la instrucción explícita de que un documento no se da por terminado sin indexarlo y sin al menos un enlace markdown real de entrada (no basta con mencionarlo entre backticks — la lección de esta sesión, repetida ya dos veces).

## [2026-08-20] audit | Prueba end-to-end real del ciclo agentes → MQL5 → backtest — 9 problemas encontrados y corregidos

Pedro pidió una prueba completa y real (sin mocks) de todo el ciclo de `trading-agents-dashboard/`: lanzar el análisis desde la pestaña principal, verificar que los 6 agentes funcionan, generar código MQL5 desde una estrategia validada, compilarlo contra MetaEditor real y probarlo con backtest real contra MetaTrader, iterando hasta conseguir buen resultado — arreglando cualquier problema encontrado por el camino, sin detenerse.

**Nueva categoría `informes/` en `proyecto-dashboard/`**: los informes de prueba/auditoría post-hoc (verificación en vivo de una implementación ya hecha) no encajaban en las convenciones existentes de `planes/`/`specs/` (documentos *previos* a implementar). Añadida como tercera subcarpeta de `proyecto-dashboard/`, indexada en su `00_INDEX.md` e ilustrada en `wiki-Traiding/index.md`.

**Informe completo**: [`proyecto-dashboard/informes/2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](proyecto-dashboard/informes/2026-08-20-prueba-e2e-agentes-mql5-backtest.md) — 9 hallazgos con reproducción y verificación en vivo contra infraestructura real (OmniRoute, MetaEditor64, MetaTrader 5 terminal), 3 críticos:

1. La detección de backtests headless estaba silenciosamente rota desde su implementación (auditoría previa de 2026-08-19): los logs de MetaTrader son UTF-16LE con BOM, pero el código intentaba leerlos como UTF-8 primero (que no lanza excepción, solo corrompe el texto) — ningún backtest, exitoso o no, se detectaba nunca correctamente.
2. El Refutador y el Razonador exigían datos (volumen OBV/CMF, profundidad de libro, flujos ETF) que el snapshot de mercado nunca puede aportar, bloqueando indefinidamente cualquier veredicto "go" en 3 de 3 análisis completos antes del fix.
3. La validación numérica determinista de la estrategia (R:R, geometría) no tenía reintento in-situ — un solo desliz de aritmética del LLM tumbaba todo el análisis.

También corregidos: `optimizeMql5` era un stub que ignoraba el código/backtest previos; runs que quedaban en `"running"` para siempre si el servidor se reiniciaba a mitad (reproducido en vivo); fallos deterministas del backtest (símbolo inexistente, crash de runtime por `array out of range`) reportados como timeout ambiguo en vez de con diagnóstico preciso; esos mismos crashes y el caso "0 operaciones" no disparaban el bucle de auto-optimización ya existente; la UI permitía generar MQL5 desde una estrategia con objeciones sin resolver.

**`server/README.md` actualizado** con el comportamiento corregido del orquestador (reintento in-situ, reconciliación de runs huérfanos) y del pipeline de backtest headless (antes no documentado en absoluto).

**Pendiente**: no se llegó a ver, dentro del presupuesto de esta sesión, un Quality Gate en verde con operaciones reales — los intentos reales llegaron a "compila limpio + backtest detectado correctamente" pero terminaron en "0 operaciones" (estrategia LLM con condiciones de entrada demasiado restrictivas para el histórico de 12 meses probado). El hallazgo 7 del informe ya conecta ese caso al bucle de auto-optimización; queda como continuación natural relanzar el ciclo ahora que la detección funciona de verdad. También queda como limitación de entorno conocida (no arreglable desde el código) que el símbolo `BTCUSD` no existe en la cuenta MetaQuotes-Demo conectada — el backtest automático de BTC/USD no puede completarse en esta máquina hasta identificar el nombre real del símbolo cripto de ese bróker.


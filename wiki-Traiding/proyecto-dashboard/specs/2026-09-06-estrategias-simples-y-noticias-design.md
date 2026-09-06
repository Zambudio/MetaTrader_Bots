# Estrategias "Simple" y sistema de noticias — diseño

Diseño aprobado en brainstorming el 2026-09-06. Escrito para poder entregarse a otro agente (p. ej. Antigravity) sin contexto previo de la conversación — cada sección da rutas de fichero, tipos y convenciones concretas del repo actual.

## Contexto y motivación

El dashboard actual (`trading-agents-dashboard/`) usa configuraciones de agentes con 8-9 agentes por mercado (FOREX, ACCIONES, CRIPTOMONEDAS), varios de ellos en paralelo dentro de un mismo nivel del grafo (ver `buildLevels()` en `server/src/engine/orchestrator.ts`). El usuario considera que esto es sobreingeniería para el objetivo real (generar una hipótesis de estrategia razonable) y que la ejecución en paralelo de tantos agentes da problemas prácticos (lentitud, errores difíciles de diagnosticar — ver informes `wiki-Traiding/proyecto-dashboard/informes/2026-09-06-*.md` de esta misma semana).

Decisión: **no tocar las configuraciones actuales** (siguen existiendo, se pueden seguir usando y editando). En paralelo, construir una vía alternativa más simple: configuraciones "Simple" con un máximo de 3 agentes encadenados **estrictamente en serie** (cada uno depende solo del anterior, cero ramas paralelas), apoyados en una wiki de conocimiento (ya existe, ver más abajo) en vez de en más agentes especializados.

Además, se añade un sistema de noticias nuevo: hoy los especialistas macro/noticias de las configuraciones actuales (`fx-macro`, `stock-corporate`, `stock-market-regime`, `crypto-derivatives`, `crypto-onchain`, `crypto-regulatory`) se abstienen siempre porque no existe ningún feed real conectado — es una limitación documentada desde el inicio de este proyecto. El sistema de noticias es la primera vía real para cerrar ese hueco, pero **solo para las configuraciones "Simple" nuevas** (fase 2) — las actuales no cambian.

## Fases y orden de entrega

1. **Fase 1A** — botón "Crear nueva estrategia" + mecanismo de desconexión de agentes en el lienzo de edición.
2. **Fase 1B** — sistema de noticias (fuentes, obtención, registro, resumen a wiki).
3. **Fase 2** — solo después de que 1A y 1B estén implementadas y probadas: las 3 configuraciones nuevas "Simple" (FOREX, CRIPTOMONEDAS, ACCIONES).

Cada fase es un incremento independiente y probable por separado; no hace falta terminar la fase 2 para que 1A/1B aporten valor.

## Decisiones ya tomadas (no reabrir sin motivo)

- El botón opera **solo en el lienzo de edición en memoria**, nunca persiste nada por sí mismo. `Restaurar` (ya existe) sigue recuperando el preset guardado tal cual.
- La wiki para los agentes "Simple" usa el mecanismo **ya existente** (`getWikiContextBlock`, ver abajo) — no se construye nada nuevo para esto.
- El sistema de noticias sirve tres propósitos: (1) futuro feed para los agentes macro/noticias — pero únicamente los de las configuraciones "Simple" nuevas, (2) resumen periódico volcado a la wiki, (3) registro/consulta humana en el dashboard.
- Fuentes soportadas en fase 1B: RSS/Atom y páginas web genéricas (scraping simple). **Telegram queda fuera de la fase 1B**, documentado como ampliación futura (ver "Fuera de alcance").
- Las configuraciones actuales (`forex_v1`, `forex_v1.1`, `stocks_v1`, `crypto_v1`, y las variantes `forex_v1.2`/`v1.2.1` ya existentes) **no se modifican** en ninguna fase de este plan: ni sus agentes, ni su activación, ni sus `DataCapability`.

---

## Fase 1A — Botón "Crear nueva estrategia"

### Comportamiento

Un botón nuevo en la barra de configuración (`trading-agents-dashboard/src/components/AgentConfigBar.tsx`, junto a "↺ Restaurar" y "Guardar como…", líneas ~94-122 en la versión actual). Al pulsarlo:

1. Los agentes actualmente cargados en el lienzo de edición (el array `agents` del store, ver `trading-agents-dashboard/src/lib/store.ts`) pierden sus relaciones: `dependsOn: []` y `optionalDependsOn: []` (o se elimina el campo) en cada agente, **en memoria únicamente**.
2. No se llama a ningún endpoint del backend. No se persiste nada.
3. El usuario puede entonces: desactivar agentes existentes (ya existe la acción `updateAgent`/toggle `enabled`), añadir agentes nuevos (ya existe `addAgent`), y reconectar dependencias a su gusto con el editor de grafo ya existente (`AgentConnections.tsx`).
4. Para persistir el resultado como una configuración nueva, se usa el flujo **ya existente** "Guardar como…" (`savePresetAs` en `store.ts`, que llama a `POST /api/agent-configs` → `createPreset()` en `server/src/store/agentConfigsStore.ts`).
5. Si el usuario no guarda y pulsa "↺ Restaurar", se recupera el preset original desde `presets` (ya cargado en el store), sin rastro del desenganche.

### Cambios necesarios

- **`trading-agents-dashboard/src/lib/store.ts`**: nueva acción, p. ej. `detachAgentRelations(): void`, que mapea `state.agents` reemplazando `dependsOn`/`optionalDependsOn` por arrays vacíos. Pura mutación de estado local (Zustand `set`), sin `await` ni llamada a `api`.
- **`trading-agents-dashboard/src/components/AgentConfigBar.tsx`**: nuevo botón "🔗‍💥 Crear nueva estrategia" (o icono equivalente a definir por quien lo implemente), deshabilitado si `isAnalysing` (mismo patrón que los botones vecinos), que llama a `detachAgentRelations()`. Sugerido: pedir confirmación (`window.confirm`, ya se usa este patrón en el mismo fichero para borrar) porque es una acción que se nota visualmente de golpe (todas las líneas de conexión desaparecen).
- **Sin cambios de backend.** Esto es puramente edición de estado en el cliente sobre una estructura de datos que el backend ya acepta tal cual (`Agent.dependsOn: string[]`, ya opcionalmente vacío en `AgentConfigPreset`).

### Testing

- Test de componente/store (Vitest + Testing Library si ya está configurado en el frontend, o test manual guiado si no): crear un preset con 3 agentes encadenados, pulsar el botón, verificar que los 3 agentes siguen presentes pero con `dependsOn: []`.
- Prueba manual: cargar `forex_v1`, pulsar el botón, verificar visualmente que desaparecen las líneas de conexión en `AgentConnections.tsx`, verificar que "Restaurar" devuelve el grafo original.

---

## Fase 1B — Sistema de noticias

### Modelo de datos

Dos entidades nuevas, persistidas como JSON siguiendo el patrón ya usado por `agentConfigs.json`/`pairs.json` (ver `server/src/paths.ts` y `server/src/store/jsonStore.ts` para `readJson`/`writeJson`):

```ts
// server/src/types.ts — añadir
export interface NewsSource {
  id: string;
  name: string;
  kind: 'rss' | 'generic_url';
  url: string;
  enabled: boolean;
  createdAt: string;
  lastFetchedAt?: string;
  lastFetchStatus?: 'ok' | 'error';
  lastFetchError?: string;
}

export interface NewsItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt?: string; // del feed, si lo trae
  fetchedAt: string;
  summary?: string; // extracto corto, no el artículo completo
  digestedToWiki?: boolean; // true una vez incluido en un resumen volcado a la wiki
}
```

- **`server/src/paths.ts`**: añadir `NEWS_SOURCES_FILE = path.join(DATA_DIR, 'newsSources.json')` y `NEWS_ITEMS_DIR = path.join(DATA_DIR, 'news-items')` (un fichero JSON por fuente dentro, `<sourceId>.json` con un array de `NewsItem`, igual que `RUNS_DIR` guarda un fichero por run — evita un único fichero gigante que crece sin límite).
- Añadir ambas rutas a `.gitignore` de `trading-agents-dashboard/` (mismo patrón que `server/src/data/*` ya gitignorado) — son datos de runtime, no código fuente.

### Backend

- **`server/src/store/newsStore.ts`** (nuevo): `listSources()`, `addSource(source)`, `updateSource(id, patch)`, `deleteSource(id)`, `listItems(sourceId, opts?)`, `appendItems(sourceId, items)` — deduplicando por `url` (una fuente no debe re-guardar el mismo artículo si ya se vio; comparar por `url` normalizada, no por `title`, porque los títulos pueden variar en re-publicaciones).
- **`server/src/engine/newsFetcher.ts`** (nuevo): una función por tipo de fuente.
  - `fetchRss(source: NewsSource): Promise<NewsItem[]>` — parsear XML de RSS/Atom. Usar una librería ligera ya popular en el ecosistema Node (p. ej. `rss-parser` o `fast-xml-parser` + mapeo manual; decisión de quien implemente, no hay una ya en el repo) en vez de escribir un parser XML a mano.
  - `fetchGenericUrl(source: NewsSource): Promise<NewsItem[]>` — fetch de la URL + extracción best-effort de titulares/enlaces (p. ej. buscar `<article>`/`<h1>`/`<h2>` con enlaces, o usar una librería de extracción de contenido tipo `@mozilla/readability` sobre el DOM parseado con `jsdom`). Es inherentemente frágil (cada web cambia su HTML); el fetch debe capturar cualquier excepción y guardarla en `lastFetchError` sin tumbar el resto del sistema — nunca debe lanzar sin capturar.
  - Ninguna de las dos debe usar un LLM para "entender" la página — es extracción mecánica de titular+URL, el resumen que se muestra al usuario es el que ya trae el feed (`<description>` de RSS) o el titular tal cual para URL genérica. Nada de fabricar contenido.
- **Disparo de la obtención**: sin programador de tareas en background por defecto — añadir un botón "Actualizar ahora" en la UI (fetch bajo demanda, `POST /api/news/sources/:id/fetch` o uno para todas `POST /api/news/fetch-all`) para la primera entrega, más simple y sin coste de infraestructura. Si más adelante se quiere polling automático, es una ampliación aislada (un `setInterval` en el arranque del servidor, o un cron de sistema que golpee el endpoint) — no bloquea esta fase.
- **Rutas** (`server/src/routes/news.ts`, nuevo, montado en `server/src/index.ts` como `app.use('/api/news', newsRouter)`):
  - `GET /api/news/sources` — lista de fuentes.
  - `POST /api/news/sources` — añadir fuente (`{name, kind, url}`).
  - `PUT /api/news/sources/:id` — editar/activar/desactivar.
  - `DELETE /api/news/sources/:id`.
  - `POST /api/news/sources/:id/fetch` — obtiene ahora mismo, devuelve items nuevos.
  - `GET /api/news/items?sourceId=&limit=` — registro/consulta (paginado simple).

### Resumen a wiki

- **`server/src/engine/newsDigest.ts`** (nuevo): toma los `NewsItem` con `digestedToWiki: false` (de cualquier fuente activa), agrupa por fecha, y genera **una sola página nueva** por ejecución del resumen (no una página por artículo) en `wiki-Traiding/noticias/YYYY-MM-DD.md`, con una entrada por artículo (título, fuente, fecha, enlace, el resumen/titular ya disponible — sin inventar análisis).
- Actualiza `wiki-Traiding/index.md` añadiendo una entrada bajo una categoría nueva `## Noticias` (crear la sección si no existe, siguiendo el formato exacto que ya usa el índice: `- [\`noticias/YYYY-MM-DD.md\`](noticias/YYYY-MM-DD.md) — descripción corta`), para que `selectRelevantPages()` (`server/src/store/wikiStore.ts`) pueda encontrarla igual que cualquier otra página.
- Tras generar la página, marca esos `NewsItem` como `digestedToWiki: true` para no duplicarlos en el siguiente resumen.
- Disparo: igual que la obtención, bajo demanda al principio — un botón "Generar resumen de wiki" en la UI de noticias, o automático justo después de cada `fetch-all` exitoso (decisión de implementación, no crítica).

### Frontend

- Nueva página/sección "Noticias" (nuevo componente `NewsPanel.tsx` o similar, con una entrada de navegación nueva junto a "Análisis anteriores" en `Dashboard.tsx`).
- Vista de gestión de fuentes: tabla con nombre/tipo/URL/activa/última obtención/estado, botones añadir/editar/borrar/activar-desactivar, botón "Actualizar ahora" por fuente y uno global.
- Vista de registro: lista de `NewsItem` recientes (todas las fuentes o filtrado por una), con título, fuente, fecha, enlace al original.
- `trading-agents-dashboard/src/lib/api.ts`: añadir los 6 métodos correspondientes a las rutas de arriba, mismo patrón que los métodos `api.listPairs`/`api.listAgentConfigs` ya existentes.

### Testing

- Backend: tests unitarios de `newsStore.ts` (añadir/listar/deduplicar por URL) con fixtures, sin red real.
- Backend: test de `fetchRss`/`fetchGenericUrl` contra un fixture local (XML/HTML guardado en `test/fixtures/`), no contra internet real en CI.
- Backend: test de `newsDigest.ts` — dado un conjunto de `NewsItem`, verifica que genera el `.md` esperado y actualiza `index.md` con la entrada correcta, sin tocar páginas de wiki no relacionadas.
- Manual: añadir una fuente RSS real (p. ej. un feed financiero conocido), pulsar "Actualizar ahora", verificar que aparecen items nuevos y que un segundo fetch no duplica los mismos.

---

## Fase 2 (a alto nivel — no fijar prompts todavía)

Tres presets nuevos en `server/src/config/baselinePresets.ts`, junto a los ya existentes (no los sustituyen):

- `preset('FOREX', 'forex_simple_v1', 'forex', 'EUR/USD', [...], forexSimpleAgents)` → id resultante `baseline-forex-forex-simple-v1`.
- `preset('ACCIONES', 'stocks_simple_v1', 'stocks', 'TSLA', [...], stocksSimpleAgents)`.
- `preset('CRIPTOMONEDAS', 'crypto_simple_v1', 'crypto', 'BTC/USD', [...], cryptoSimpleAgents)`.

Etiqueta visible "Simple" en el nombre/versión para que se distingan claramente en el selector del dashboard de las configuraciones actuales.

Restricciones de diseño (esto sí es fijo; los prompts concretos no):
- **Máximo 3 agentes**, encadenados en serie estricta: agente 2 depende únicamente del agente 1, agente 3 únicamente del agente 2. Cero agentes en el mismo nivel de `buildLevels()` — así se elimina la ejecución en paralelo que el usuario identificó como fuente de problemas.
- Modelo por defecto: `omniroute:auto/best-coding` (coherente con la migración ya hecha el 2026-09-06, ver `wiki-Traiding/proyecto-dashboard/informes/2026-09-06-migracion-a-omniroute.md`) — no `claude:sonnet`.
- Cada agente usa `getWikiContextBlock` igual que hoy (ya ocurre automáticamente para cualquier agente vía `runRealAgent` en `server/src/engine/realExecutor.ts`, no requiere cambio de código).
- El feed de noticias de la fase 1B se conecta aquí como contexto adicional para el agente que lo necesite (probablemente el primero, el que hace de "analista"), inyectando los `NewsItem` recientes relevantes al par — mecanismo de inyección exacto (qué endpoint/función expone el backend a `realExecutor.ts`) queda para el plan de implementación de esta fase, no se fija ahora.
- Los prompts, el reparto exacto de responsabilidades entre los 3 agentes, y el `riskPolicy`/`consensus` se diseñan y se iteran en vivo una vez fase 1 esté probada — **no forman parte de esta especificación**.

---

## Fuera de alcance (explícitamente, para esta ronda de trabajo)

- Integración de canales de Telegram como fuente de noticias — necesita decidir mecanismo (Bot API con el bot añadido a cada canal, vs. scraping del preview público `t.me/s/<canal>`) y probablemente autenticación propia del usuario; se deja documentado aquí como ampliación futura de `newsFetcher.ts` (un tercer `kind: 'telegram'` en `NewsSource`), no se implementa en fase 1B.
- Cualquier cambio a las configuraciones actuales (`forex_v1`, `forex_v1.1`, `stocks_v1`, `crypto_v1`, `forex_v1.2`, `forex_v1.2.1`): ni sus agentes, ni sus prompts, ni su activación, ni conectarles el feed de noticias.
- Backport de la resiliencia de CLI (`AGENT_CLI_RETRIES`/`isTransientCliError`) de la rama `validacion-real-forex` a `main` — pendiente de trabajo previo, no relacionado con este diseño.
- Polling automático programado de fuentes de noticias — la primera entrega es bajo demanda; automatizarlo es una ampliación aislada y de bajo riesgo para después.

## Riesgos conocidos

- El scraping de "URL genérica" es inherentemente frágil (cada sitio cambia su HTML sin aviso) — debe fallar de forma aislada (una fuente rota no debe tumbar el fetch de las demás) y dejar `lastFetchError` visible en la UI, nunca fallar en silencio.
- Sin programador automático en fase 1B, el registro de noticias solo se actualiza cuando alguien pulsa "Actualizar ahora" — aceptable para esta entrega según lo acordado, pero puede sorprender si se espera que esté siempre al día sin intervención.
- El resumen a wiki genera páginas nuevas con el tiempo (`wiki-Traiding/noticias/YYYY-MM-DD.md`, una por día en que se ejecute) — sin una política de retención/archivo, el índice de la wiki puede crecer bastante en meses; no es bloqueante para el arranque pero conviene vigilarlo.

## Criterios de aceptación

- **Fase 1A:** el botón existe, desconecta relaciones solo en memoria, "Restaurar" sigue recuperando el preset original tal cual, "Guardar como…" persiste correctamente un grafo reconectado desde cero.
- **Fase 1B:** se puede añadir una fuente RSS real, obtener artículos reales (no inventados) bajo demanda, verlos en el registro, generar un resumen que aparece como página nueva de la wiki y es encontrable por `getWikiContextBlock` para una consulta relacionada. Ninguna fuente rota bloquea a las demás.
- **Fase 2** (criterios para cuando se aborde, no ahora): cada preset "Simple" tiene ≤3 agentes en cadena serial verificable con `buildLevels()` (cada nivel del grafo tiene como máximo 1 agente), usa `omniroute:auto/best-coding` por defecto, y las configuraciones actuales permanecen bit a bit idénticas (mismo hash antes/después, verificable con `hashConfiguration()`).

# Implementación del botón "Crear nueva estrategia" y sistema de noticias (Fases 1A y 1B)

**Fecha:** 2026-09-06. **Estado: ✅ IMPLEMENTADO, TESTEADO Y VERIFICADO EN VIVO** en la rama local `feature/estrategias-simples-y-noticias` dentro del worktree aislado en `C:\worktrees\MetaTrader_Bots`.

## Resumen ejecutivo

Se han implementado de forma completa e integrada los dos planes diseñados y aprobados el 2026-09-06:
1. **Fase 1A:** Botón "🧩 Crear nueva estrategia" en la barra de configuración del dashboard (`AgentConfigBar.tsx`), respaldado por la acción `detachAgentRelations()` en el store de Zustand (`store.ts`), que desconecta en memoria las relaciones entre agentes sin persistir nada hasta que el usuario decida guardar con "Guardar como…".
2. **Fase 1B:** Sistema de noticias completo: almacén JSON con deduplicación por URL (`newsStore.ts`), motor de obtención para RSS/Atom (`rss-parser`) y páginas web genéricas (`newsFetcher.ts`), generador de resumen volcado a la base de conocimiento de la wiki (`newsDigest.ts`), endpoints REST (`server/src/routes/news.ts`), cliente de API frontend (`api.ts`), y panel de control e historial en la interfaz (`NewsPanel.tsx` integrado en `Dashboard.tsx`).

Toda la implementación se realizó en una copia de trabajo aislada (`git worktree`) en disco local `C:\worktrees\MetaTrader_Bots`, sin alterar los cambios locales de Pedro en `main` en `Z:\IA\02_Proyectos\MetaTrader_Bots` ni afectar al proceso de producción de pm2 (`trading-dashboard`).

---

## Qué se implementó

### Fase 1A — Botón "Crear nueva estrategia"
- **`trading-agents-dashboard/src/lib/store.ts`**:
  - Declaración del método `detachAgentRelations: () => void` en la interfaz `AgentStore`.
  - Implementación síncrona en el store que resetea `dependsOn: []` y `optionalDependsOn: []` de todos los agentes cargados en memoria.
- **`trading-agents-dashboard/src/components/AgentConfigBar.tsx`**:
  - Lectura de `agents` y `detachAgentRelations` del store.
  - Handler `handleDetach` con diálogo de confirmación explicativo (`window.confirm`).
  - Botón visual "🧩 Crear nueva estrategia" ubicado a la izquierda de "Guardar como…", con estado deshabilitado si `isAnalysing` o no hay agentes.

### Fase 1B — Sistema de noticias
- **Tipos y rutas de datos**:
  - `server/src/types.ts` y `trading-agents-dashboard/src/types/agent.ts`: interfaces espejo `NewsSource` y `NewsItem`.
  - `server/src/paths.ts`: rutas `NEWS_SOURCES_FILE` (`newsSources.json`) y `NEWS_ITEMS_DIR` (`news-items/`).
- **Persistencia y deduplicación (`server/src/store/newsStore.ts`)**:
  - Operaciones CRUD completas para fuentes (`listSources`, `addSource`, `updateSource`, `deleteSource`).
  - Almacén de artículos por fuente (`listItems`).
  - Ingesta deduplicada por URL normalizada (`appendItems`), garantizando que llamadas sucesivas a la misma fuente solo agreguen artículos nuevos.
  - Marcado de estado volcado a la wiki (`markDigested`).
- **Motor de obtención (`server/src/engine/newsFetcher.ts`)**:
  - `fetchRss`: parseo de feeds RSS y Atom utilizando la librería `rss-parser`. Mapeo seguro con `mapRssItemToNewsItem`.
  - `fetchGenericUrl`: extracción heurística de titulares y resúmenes mediante `extractTitleAndDescription` (búsqueda de etiquetas `<title>` y `<meta property="og:description">` con decodificación de entidades HTML básicas).
  - Aislamiento de excepciones: cada fetch individual captura sus propios fallos de red o parseo.
- **Resumen volcado a wiki (`server/src/engine/newsDigest.ts`)**:
  - Detección de artículos pendientes (`digestedToWiki: false`).
  - Generación de página diaria en `wiki-Traiding/noticias/YYYY-MM-DD.md`.
  - Actualización automática de `wiki-Traiding/index.md` bajo la sección `## Noticias`, enlazando la nueva página.
- **Endpoints REST (`server/src/routes/news.ts` y `server/src/index.ts`)**:
  - `GET /api/news/sources` y `POST /api/news/sources` (alta de fuentes).
  - `PUT /api/news/sources/:id` y `DELETE /api/news/sources/:id`.
  - `POST /api/news/sources/:id/fetch` (obtención individual) y `POST /api/news/fetch-all` (secuencial).
  - `GET /api/news/items` (consulta de artículos por fuente o globales ordenados cronológicamente).
  - `POST /api/news/digest` (volcado de pendientes a la wiki y marcado `digestedToWiki: true`).
- **Frontend (`trading-agents-dashboard/src/`)**:
  - Métodos clientes en `src/lib/api.ts` (`listNewsSources`, `addNewsSource`, `fetchNewsSource`, `fetchAllNews`, `listNewsItems`, `generateNewsDigest`, etc.).
  - Componente modal `src/components/NewsPanel.tsx` con formulario de alta de fuentes (RSS/URL genérica), tabla de fuentes con estado y botón de actualización/borrado, visualización de errores (`lastFetchError`), lista de artículos obtenidos y botón para generar resumen de wiki.
  - Integración en `src/components/Dashboard.tsx` con botón "📰 Noticias" en la barra superior y renderizado condicional del panel.

---

## Verificación y resultados de tests

### 1. Verificaciones automáticas de código

| Comando | Directorio | Resultado | Detalle |
|---|---|---|---|
| `npm run typecheck` | `trading-agents-dashboard/server` | **PASS (0 errores)** | Verificación limpia de tipos TypeScript en el backend (`tsc --noEmit && tsc -p tsconfig.scripts.json`). |
| `npx vitest run` | `trading-agents-dashboard/server` | **PASS (94/94 tests)** | Suite completa en verde (22 ficheros de test). Incluye `newsStore.test.ts` (5 tests), `newsFetcher.test.ts` (5 tests) y `newsDigest.test.ts` (3 tests). |
| `npx tsc -b --noEmit` | `trading-agents-dashboard` | **PASS (0 errores)** | Typecheck del frontend limpio, sin errores en store, componentes ni API client. |
| `npm run build` | `trading-agents-dashboard` | **PASS** | Compilación de producción con Vite completada con éxito (`dist/` generado correctamente). |

### 2. Verificación en vivo (End-to-End con servidor dev)

Se ejecutó una prueba de integración automatizada en vivo (`scratch/verify_e2e.mjs`) sobre el servidor levantado en modo de desarrollo (`Vite: http://localhost:5173`, `Express backend: http://localhost:5178` a través del proxy de Vite), confirmando los siguientes flujos:

1. **Botón "Crear nueva estrategia":**
   - Se leyó la configuración `FOREX · forex_v1 · EUR/USD` (8 agentes, 4 de ellos con dependencias activas).
   - Se ejecutó la desconexión: las dependencias pasaron a 0 (`dependsOn: []`), manteniéndose los 8 agentes en memoria.
   - Se comprobó la acción "Restaurar": recargó las 4 dependencias originales exactamente.
   - Se simuló la modificación (desactivación de un agente) y guardado con `POST /api/agent-configs`, verificando su correcta persistencia como preset nuevo y su posterior eliminación limpia.
2. **Fuente RSS real (MarketWatch Top Stories):**
   - URL: `https://feeds.content.dowjones.io/public/rss/mw_topstories`.
   - Se ejecutó el fetch en vivo: se obtuvieron **10 artículos reales** de MarketWatch con titulares y URLs genuinas.
   - Comprobación de deduplicación: un segundo fetch inmediato devolvió **0 artículos nuevos** (`newItems: 0`) y mantuvo el total de 10 artículos sin duplicidades.
3. **Fuente de URL genérica (Example Domain):**
   - URL: `https://example.com`.
   - Se ejecutó el fetch: extrajo correctamente el titular del documento HTML (`"Example Domain"`) como un `NewsItem`.
4. **Resumen volcado a la Wiki:**
   - Se invocó `POST /api/news/digest`: se procesaron los 11 artículos pendientes.
   - Se creó el fichero `wiki-Traiding/noticias/2026-09-06.md` (4.516 bytes) con las noticias formateadas.
   - Se actualizó el índice general `wiki-Traiding/index.md` creando la sección `## Noticias` y enlazando la nueva página.
   - Una segunda llamada a digest devolvió `pageRelPath: null` con 0 artículos (comportamiento idempotente).
5. **Resiliencia ante errores:**
   - Se añadió una fuente con dominio inexistente (`https://no-existe-de-verdad.invalid/feed.xml`).
   - El fetch falló capturando el error en `lastFetchError` (`getaddrinfo ENOTFOUND`), sin tumbar el backend ni bloquear las demás fuentes.
6. **Limpieza:**
   - Las fuentes de prueba se eliminaron a través del endpoint `DELETE /api/news/sources/:id`.

---

## Desviaciones respecto al plan original

1. **Ajuste de tipos en `newsFetcher.ts` (`fetchGenericUrl`):**
   - El plan original proponía que `fetchGenericUrl` retornase un objeto con `sourceId: source.id`. Sin embargo, TypeScript reportaba error `TS2353` por exceso de propiedades contra la firma `Omit<NewsItem, 'id' | 'sourceId' | 'fetchedAt'>`.
   - *Ajuste:* se eliminó `sourceId` del objeto devuelto por `fetchGenericUrl`, dejando que `appendItems(source.id, candidates)` se encargue de adjuntar el `sourceId` y el `id` generado, de manera consistente con el resto de fetchers.
2. **Soporte de puerto en `vite.config.ts`:**
   - En el host de trabajo, el proceso pm2 `trading-dashboard` está corriendo 24/7 en el puerto 5175. Para permitir que el entorno de desarrollo corra de forma totalmente aislada sin colisionar con producción, se parametrizó el proxy de Vite para respetar la variable de entorno `PORT`: `const backendPort = process.env.PORT || '5175'`. Al ejecutar `$env:PORT="5178"; npm run dev`, el backend de pruebas escuchó en 5178 y Vite reenvió las peticiones a ese puerto sin tocar pm2.

---

## Limitaciones conocidas

1. **Obtención bajo demanda únicamente:**
   - En esta entrega no se incluye un programador periódico (cron o intervalo en background); las noticias se obtienen únicamente al pulsar "Actualizar" o "Actualizar todas" en el panel.
2. **Extracción de URL genérica heurística:**
   - El soporte para URLs genéricas usa expresiones regulares sobre el HTML estático (`<title>` y `<meta property="og:description">`). Sitios web que dependan de renderizado por JavaScript en el cliente (SPAs pesadas) pueden no exponer el contenido completo sin un motor headless tipo Puppeteer/Playwright.
3. **Fuentes fuera de alcance:**
   - La integración de Telegram queda explícitamente aplazada para una fase futura según lo definido en la especificación.
4. **Fase 2 (Estrategias simples con noticias):**
   - Queda pendiente para cuando se definan los prompts y la estructura definitiva de los 3 agentes en serie.

---

## Estado final y ubicación de la copia de trabajo

- **Rama local:** `feature/estrategias-simples-y-noticias`
- **Ruta de la copia aislada:** `C:\worktrees\MetaTrader_Bots` (git worktree enlazado al repo principal).
- **Proceso de producción:** El proceso pm2 `trading-dashboard` (PID 54468) en `http://localhost:5175` y el árbol de trabajo en `Z:\IA\02_Proyectos\MetaTrader_Bots` permanecieron intactos durante todo el desarrollo. No se realizó ningún push a `origin` ni a `main`.

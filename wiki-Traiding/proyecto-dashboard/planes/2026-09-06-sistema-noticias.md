# Sistema de noticias — Plan de implementación

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`) para seguimiento.

**Objetivo:** Añadir un sistema de noticias: fuentes vigilables (RSS/Atom y URL genérica), un registro consultable de artículos, y un resumen periódico que se vuelca como página nueva de la wiki de conocimiento (`wiki-Traiding/`).

**Arquitectura:** Almacenamiento JSON en disco (mismo patrón que `agentConfigs.json`/`pairs.json`, vía `readJson`/`writeJson` de `server/src/store/jsonStore.ts`). Obtención bajo demanda (sin programador en segundo plano) mediante endpoints REST nuevos montados en el servidor Express existente. Separación estricta entre lógica pura (parseo/mapeo, testeable sin red) y capa de I/O (fetch real, verificada manualmente).

**Tech Stack:** Node/Express/TypeScript ya usado por el backend. Librería nueva: `rss-parser` (parseo RSS/Atom). Sin dependencias nuevas para "URL genérica" — extracción de `<title>`/`<meta property="og:description">` por regex, sin `jsdom` (mantener la huella de dependencias mínima).

**Spec:** `wiki-Traiding/proyecto-dashboard/specs/2026-09-06-estrategias-simples-y-noticias-design.md` (sección "Fase 1B")

## Restricciones globales

- **Ruta de trabajo:** todos los comandos de node/npm desde `Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server`, **nunca** desde `\\Zambu-nas\...` (cmd.exe/npm la rechazan).
- `server/src/data/*` ya está gitignorado por completo (`.gitignore:24`) salvo excepciones explícitas para `agents.json`/`pairs.json` — los ficheros nuevos de este plan (`newsSources.json`, `news-items/*.json`) quedan automáticamente fuera de git sin tocar `.gitignore`. No añadas excepciones para ellos.
- Ninguna fuente de noticias debe alimentar a los agentes de las configuraciones actuales (`forex_v1`, `forex_v1.1`, `stocks_v1`, `crypto_v1`, `forex_v1.2*`) — este plan no toca `server/src/config/baselinePresets.ts` en ningún punto. La conexión a agentes es explícitamente Fase 2 (fuera de este plan).
- Ningún fetcher debe usar un LLM para "entender" contenido — solo extracción mecánica (parseo XML/regex). Ninguna fuente rota debe tumbar el fetch de las demás: cada fetch captura sus propias excepciones.
- Tests de backend con Vitest (ya configurado, ver `server/test/*.test.ts` existentes) — comando `npx vitest run <fichero>` desde `server/`. Sin red real en los tests: la lógica de parseo se separa de la llamada `fetch()` real para poder testear con fixtures locales.
- Frontend sin framework de test (ver plan hermano `2026-09-06-boton-nueva-estrategia.md`, sección "Restricciones globales") — verificación manual con `npm run dev`.

---

### Task 1: Tipos y rutas de fichero

**Files:**
- Modify: `server/src/types.ts` (añadir al final)
- Modify: `server/src/paths.ts` (añadir al final)

**Interfaces:**
- Produces: `NewsSource`, `NewsItem` (tipos), `NEWS_SOURCES_FILE: string`, `NEWS_ITEMS_DIR: string`.

- [ ] **Step 1: Añadir los tipos**

Al final de `server/src/types.ts`, añade:

```ts
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
  publishedAt?: string;
  fetchedAt: string;
  summary?: string;
  digestedToWiki?: boolean;
}
```

- [ ] **Step 2: Añadir las rutas de fichero**

Al final de `server/src/paths.ts`, añade:

```ts
export const NEWS_SOURCES_FILE = path.join(DATA_DIR, 'newsSources.json');
export const NEWS_ITEMS_DIR = path.join(DATA_DIR, 'news-items');
```

- [ ] **Step 3: Verificar que compila**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server && npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add trading-agents-dashboard/server/src/types.ts trading-agents-dashboard/server/src/paths.ts
git commit -m "feat(news): add NewsSource/NewsItem types and data paths"
```

---

### Task 2: `newsStore.ts` — almacén de fuentes y artículos

**Files:**
- Create: `server/src/store/newsStore.ts`
- Test: `server/test/newsStore.test.ts`

**Interfaces:**
- Consumes: `readJson`/`writeJson` de `../store/jsonStore.js`, `NEWS_SOURCES_FILE`/`NEWS_ITEMS_DIR` de `../paths.js`, `NewsSource`/`NewsItem` de `../types.js`.
- Produces: `listSources(): Promise<NewsSource[]>`, `addSource(input: Omit<NewsSource,'id'|'createdAt'|'enabled'> & {enabled?: boolean}): Promise<NewsSource>`, `updateSource(id: string, patch: Partial<NewsSource>): Promise<NewsSource | null>`, `deleteSource(id: string): Promise<void>`, `listItems(sourceId: string): Promise<NewsItem[]>`, `appendItems(sourceId: string, items: Array<Omit<NewsItem,'id'|'sourceId'|'fetchedAt'>>): Promise<NewsItem[]>` (devuelve solo los items realmente nuevos, tras deduplicar por `url`).

- [ ] **Step 1: Escribir el test que falla**

Crea `server/test/newsStore.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NEWS_SOURCES_FILE, NEWS_ITEMS_DIR } from '../src/paths.js';
import { addSource, listSources, updateSource, deleteSource, appendItems, listItems } from '../src/store/newsStore.js';

async function cleanState() {
  await fs.rm(NEWS_SOURCES_FILE, { force: true });
  await fs.rm(NEWS_ITEMS_DIR, { recursive: true, force: true });
}

describe('newsStore', () => {
  beforeEach(cleanState);

  it('añade y lista fuentes', async () => {
    const created = await addSource({ name: 'Test RSS', kind: 'rss', url: 'https://example.com/feed.xml' });
    expect(created.id).toBeTruthy();
    expect(created.enabled).toBe(true);
    expect(created.createdAt).toBeTruthy();

    const sources = await listSources();
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe('Test RSS');
  });

  it('actualiza una fuente existente y devuelve null si no existe', async () => {
    const created = await addSource({ name: 'A', kind: 'rss', url: 'https://a.example/feed.xml' });
    const updated = await updateSource(created.id, { enabled: false, lastFetchStatus: 'error', lastFetchError: 'timeout' });
    expect(updated?.enabled).toBe(false);
    expect(updated?.lastFetchError).toBe('timeout');

    const missing = await updateSource('no-existe', { enabled: false });
    expect(missing).toBeNull();
  });

  it('borra una fuente', async () => {
    const created = await addSource({ name: 'A', kind: 'rss', url: 'https://a.example/feed.xml' });
    await deleteSource(created.id);
    expect(await listSources()).toHaveLength(0);
  });

  it('appendItems deduplica por url y devuelve solo los items nuevos', async () => {
    const source = await addSource({ name: 'A', kind: 'rss', url: 'https://a.example/feed.xml' });

    const firstBatch = await appendItems(source.id, [
      { title: 'Noticia 1', url: 'https://a.example/n1' },
      { title: 'Noticia 2', url: 'https://a.example/n2' },
    ]);
    expect(firstBatch).toHaveLength(2);

    const secondBatch = await appendItems(source.id, [
      { title: 'Noticia 2 (repetida)', url: 'https://a.example/n2' }, // mismo url, título distinto -> no es nueva
      { title: 'Noticia 3', url: 'https://a.example/n3' },
    ]);
    expect(secondBatch).toHaveLength(1);
    expect(secondBatch[0].title).toBe('Noticia 3');

    const all = await listItems(source.id);
    expect(all).toHaveLength(3);
  });

  it('listItems de una fuente sin artículos devuelve array vacío', async () => {
    const source = await addSource({ name: 'A', kind: 'rss', url: 'https://a.example/feed.xml' });
    expect(await listItems(source.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Verificar que el test falla**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server && npx vitest run test/newsStore.test.ts`
Expected: FAIL — `newsStore.js` no existe todavía.

- [ ] **Step 3: Implementar `newsStore.ts`**

Crea `server/src/store/newsStore.ts`:

```ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from './jsonStore.js';
import { NEWS_SOURCES_FILE, NEWS_ITEMS_DIR } from '../paths.js';
import type { NewsItem, NewsSource } from '../types.js';

function itemsFile(sourceId: string): string {
  return path.join(NEWS_ITEMS_DIR, `${sourceId}.json`);
}

export async function listSources(): Promise<NewsSource[]> {
  return readJson<NewsSource[]>(NEWS_SOURCES_FILE, []);
}

export async function addSource(
  input: Omit<NewsSource, 'id' | 'createdAt' | 'enabled'> & { enabled?: boolean }
): Promise<NewsSource> {
  const sources = await listSources();
  const source: NewsSource = {
    id: nanoid(10),
    name: input.name,
    kind: input.kind,
    url: input.url,
    enabled: input.enabled ?? true,
    createdAt: new Date().toISOString(),
  };
  sources.push(source);
  await writeJson(NEWS_SOURCES_FILE, sources);
  return source;
}

export async function updateSource(id: string, patch: Partial<NewsSource>): Promise<NewsSource | null> {
  const sources = await listSources();
  const index = sources.findIndex((s) => s.id === id);
  if (index === -1) return null;
  sources[index] = { ...sources[index], ...patch, id: sources[index].id };
  await writeJson(NEWS_SOURCES_FILE, sources);
  return sources[index];
}

export async function deleteSource(id: string): Promise<void> {
  const sources = await listSources();
  await writeJson(NEWS_SOURCES_FILE, sources.filter((s) => s.id !== id));
  await fs.rm(itemsFile(id), { force: true });
}

export async function listItems(sourceId: string): Promise<NewsItem[]> {
  return readJson<NewsItem[]>(itemsFile(sourceId), []);
}

/** Añade items nuevos deduplicando por `url` contra lo ya guardado. Devuelve solo los que
 * realmente se añadieron (para saber cuántos son "nuevos" en la respuesta del fetch). */
export async function appendItems(
  sourceId: string,
  candidates: Array<Omit<NewsItem, 'id' | 'sourceId' | 'fetchedAt'>>
): Promise<NewsItem[]> {
  const existing = await listItems(sourceId);
  const existingUrls = new Set(existing.map((i) => i.url));
  const fetchedAt = new Date().toISOString();

  const fresh: NewsItem[] = [];
  for (const candidate of candidates) {
    if (existingUrls.has(candidate.url)) continue;
    existingUrls.add(candidate.url);
    fresh.push({ ...candidate, id: nanoid(10), sourceId, fetchedAt });
  }

  if (fresh.length > 0) {
    await writeJson(itemsFile(sourceId), [...existing, ...fresh]);
  }
  return fresh;
}
```

- [ ] **Step 4: Verificar que el test pasa**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server && npx vitest run test/newsStore.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add trading-agents-dashboard/server/src/store/newsStore.ts trading-agents-dashboard/server/test/newsStore.test.ts
git commit -m "feat(news): add newsStore with source/item CRUD and URL dedup"
```

---

### Task 3: `newsFetcher.ts` — RSS y URL genérica

**Files:**
- Create: `server/src/engine/newsFetcher.ts`
- Test: `server/test/newsFetcher.test.ts`
- Modify: `server/package.json` (nueva dependencia)

**Interfaces:**
- Consumes: `NewsSource`/`NewsItem` de `../types.js`.
- Produces: `mapRssItemToNewsItem(feedItem: RssFeedItem, sourceId: string): Omit<NewsItem,'id'|'fetchedAt'>`, `extractTitleAndDescription(html: string): { title: string | null; description: string | null }`, `fetchRss(source: NewsSource): Promise<Array<Omit<NewsItem,'id'|'sourceId'|'fetchedAt'>>>`, `fetchGenericUrl(source: NewsSource): Promise<Array<Omit<NewsItem,'id'|'sourceId'|'fetchedAt'>>>`.

- [ ] **Step 1: Instalar `rss-parser`**

```bash
cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server
npm install rss-parser
```

Verifica que `server/package.json` tiene ahora `"rss-parser"` en `dependencies`.

- [ ] **Step 2: Escribir el test que falla (funciones puras primero)**

Crea `server/test/newsFetcher.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapRssItemToNewsItem, extractTitleAndDescription } from '../src/engine/newsFetcher.js';

describe('mapRssItemToNewsItem', () => {
  it('mapea un item de rss-parser a NewsItem parcial', () => {
    const feedItem = {
      title: 'El BCE mantiene los tipos',
      link: 'https://example.com/noticia-1',
      pubDate: '2026-09-06T08:00:00.000Z',
      contentSnippet: 'El Banco Central Europeo decidió mantener los tipos de interés sin cambios.',
    };
    const result = mapRssItemToNewsItem(feedItem, 'source-1');
    expect(result).toEqual({
      sourceId: 'source-1',
      title: 'El BCE mantiene los tipos',
      url: 'https://example.com/noticia-1',
      publishedAt: '2026-09-06T08:00:00.000Z',
      summary: 'El Banco Central Europeo decidió mantener los tipos de interés sin cambios.',
    });
  });

  it('usa cadenas vacías/undefined de forma segura si faltan campos', () => {
    const result = mapRssItemToNewsItem({ title: 'Solo título', link: 'https://example.com/x' }, 'source-1');
    expect(result.title).toBe('Solo título');
    expect(result.url).toBe('https://example.com/x');
    expect(result.publishedAt).toBeUndefined();
    expect(result.summary).toBeUndefined();
  });
});

describe('extractTitleAndDescription', () => {
  it('extrae title y og:description de un HTML típico', () => {
    const html = `<!doctype html><html><head>
      <title>Mercados cierran en verde</title>
      <meta property="og:description" content="Los principales índices suben tras datos de empleo." />
    </head><body></body></html>`;
    expect(extractTitleAndDescription(html)).toEqual({
      title: 'Mercados cierran en verde',
      description: 'Los principales índices suben tras datos de empleo.',
    });
  });

  it('devuelve null en los campos que no encuentra', () => {
    const html = '<html><head></head><body>sin title ni meta</body></html>';
    expect(extractTitleAndDescription(html)).toEqual({ title: null, description: null });
  });

  it('decodifica entidades HTML básicas del title', () => {
    const html = '<html><head><title>Riesgo &amp; oportunidad</title></head></html>';
    expect(extractTitleAndDescription(html).title).toBe('Riesgo & oportunidad');
  });
});
```

- [ ] **Step 3: Verificar que el test falla**

Run: `npx vitest run test/newsFetcher.test.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 4: Implementar `newsFetcher.ts`**

Crea `server/src/engine/newsFetcher.ts`:

```ts
import Parser from 'rss-parser';
import type { NewsItem, NewsSource } from '../types.js';

type PartialItem = Omit<NewsItem, 'id' | 'sourceId' | 'fetchedAt'> & { sourceId: string };

export interface RssFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
}

export function mapRssItemToNewsItem(feedItem: RssFeedItem, sourceId: string): Omit<PartialItem, 'sourceId'> & { sourceId: string } {
  return {
    sourceId,
    title: feedItem.title ?? '(sin título)',
    url: feedItem.link ?? '',
    publishedAt: feedItem.pubDate,
    summary: feedItem.contentSnippet,
  };
}

/** Decodifica solo las entidades HTML más comunes en titulares reales; no pretende ser un
 * decodificador HTML completo. */
function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractTitleAndDescription(html: string): { title: string | null; description: string | null } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeBasicEntities(titleMatch[1].trim()) : null;

  const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  const description = descMatch ? decodeBasicEntities(descMatch[1].trim()) : null;

  return { title, description };
}

const rssParser = new Parser();

export async function fetchRss(source: NewsSource): Promise<Array<Omit<NewsItem, 'id' | 'sourceId' | 'fetchedAt'>>> {
  const feed = await rssParser.parseURL(source.url);
  return (feed.items ?? []).map((item) => mapRssItemToNewsItem(item, source.id));
}

export async function fetchGenericUrl(source: NewsSource): Promise<Array<Omit<NewsItem, 'id' | 'sourceId' | 'fetchedAt'>>> {
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`GET ${source.url} respondió ${response.status}`);
  }
  const html = await response.text();
  const { title, description } = extractTitleAndDescription(html);
  if (!title) {
    return [];
  }
  // Fuente "URL genérica": no hay artículos individuales, se trata la propia página como el
  // "item" — appendItems() del store lo deduplicará por url si el título no ha cambiado y se
  // vuelve a llamar con la MISMA url; para detectar cambios de titular real, el llamador debe
  // pasar una url distintiva si quiere tratarlo como una noticia nueva (ver newsStore.appendItems).
  return [{ sourceId: source.id, title, url: source.url, summary: description ?? undefined }];
}
```

- [ ] **Step 5: Verificar que el test pasa**

Run: `npx vitest run test/newsFetcher.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. Si `rss-parser` no trae tipos, instala `npm install -D @types/rss-parser` — comprueba primero si hace falta (muchas versiones de `rss-parser` ya incluyen sus propios `.d.ts`; si `npm run typecheck` no se queja, no hace falta este paquete extra).

- [ ] **Step 7: Commit**

```bash
git add trading-agents-dashboard/server/src/engine/newsFetcher.ts trading-agents-dashboard/server/test/newsFetcher.test.ts trading-agents-dashboard/server/package.json trading-agents-dashboard/server/package-lock.json
git commit -m "feat(news): add RSS and generic-URL fetchers with pure parsing functions"
```

---

### Task 4: `newsDigest.ts` — resumen volcado a la wiki

**Files:**
- Create: `server/src/engine/newsDigest.ts`
- Test: `server/test/newsDigest.test.ts`

**Interfaces:**
- Consumes: `NewsItem` de `../types.js`.
- Produces: `generateNewsDigest(items: NewsItem[], opts: { wikiDir: string; indexFile: string; date?: string }): Promise<{ pageRelPath: string | null; digestedIds: string[] }>` — `pageRelPath: null` si no había items pendientes (`digestedToWiki !== true`), sin crear nada.

- [ ] **Step 1: Escribir el test que falla**

Crea `server/test/newsDigest.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateNewsDigest } from '../src/engine/newsDigest.js';
import type { NewsItem } from '../src/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'news-digest-test-'));
  await fs.writeFile(
    path.join(tmpDir, 'index.md'),
    '# Índice\n\n## Básico\n\n- [`basico/x.md`](basico/x.md) — algo.\n',
    'utf-8'
  );
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const items: NewsItem[] = [
  {
    id: 'i1', sourceId: 's1', title: 'BCE mantiene tipos', url: 'https://example.com/n1',
    fetchedAt: '2026-09-06T08:00:00.000Z', summary: 'Sin cambios en la reunión de septiembre.',
  },
  {
    id: 'i2', sourceId: 's2', title: 'Bitcoin supera resistencia clave', url: 'https://example.com/n2',
    fetchedAt: '2026-09-06T09:00:00.000Z',
  },
];

describe('generateNewsDigest', () => {
  it('crea una página nueva bajo noticias/ y actualiza el índice', async () => {
    const result = await generateNewsDigest(items, { wikiDir: tmpDir, indexFile: path.join(tmpDir, 'index.md'), date: '2026-09-06' });

    expect(result.pageRelPath).toBe('noticias/2026-09-06.md');
    expect(result.digestedIds).toEqual(['i1', 'i2']);

    const pageContent = await fs.readFile(path.join(tmpDir, 'noticias/2026-09-06.md'), 'utf-8');
    expect(pageContent).toContain('BCE mantiene tipos');
    expect(pageContent).toContain('https://example.com/n1');
    expect(pageContent).toContain('Bitcoin supera resistencia clave');

    const indexContent = await fs.readFile(path.join(tmpDir, 'index.md'), 'utf-8');
    expect(indexContent).toContain('## Noticias');
    expect(indexContent).toContain('[`noticias/2026-09-06.md`](noticias/2026-09-06.md)');
    // La categoría previa sigue intacta
    expect(indexContent).toContain('## Básico');
    expect(indexContent).toContain('[`basico/x.md`](basico/x.md)');
  });

  it('no crea nada si todos los items ya estaban volcados', async () => {
    const alreadyDigested: NewsItem[] = items.map((i) => ({ ...i, digestedToWiki: true }));
    const result = await generateNewsDigest(alreadyDigested, { wikiDir: tmpDir, indexFile: path.join(tmpDir, 'index.md') });
    expect(result.pageRelPath).toBeNull();
    expect(result.digestedIds).toEqual([]);
    await expect(fs.access(path.join(tmpDir, 'noticias'))).rejects.toThrow();
  });

  it('añade la categoría "## Noticias" solo una vez si se ejecuta dos veces en días distintos', async () => {
    await generateNewsDigest(items, { wikiDir: tmpDir, indexFile: path.join(tmpDir, 'index.md'), date: '2026-09-06' });
    const freshItems: NewsItem[] = [
      { id: 'i3', sourceId: 's1', title: 'Otra noticia', url: 'https://example.com/n3', fetchedAt: '2026-09-07T08:00:00.000Z' },
    ];
    await generateNewsDigest(freshItems, { wikiDir: tmpDir, indexFile: path.join(tmpDir, 'index.md'), date: '2026-09-07' });

    const indexContent = await fs.readFile(path.join(tmpDir, 'index.md'), 'utf-8');
    expect(indexContent.match(/## Noticias/g)).toHaveLength(1);
    expect(indexContent).toContain('noticias/2026-09-06.md');
    expect(indexContent).toContain('noticias/2026-09-07.md');
  });
});
```

- [ ] **Step 2: Verificar que el test falla**

Run: `npx vitest run test/newsDigest.test.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar `newsDigest.ts`**

Crea `server/src/engine/newsDigest.ts`:

```ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NewsItem } from '../types.js';

export interface GenerateDigestOptions {
  wikiDir: string;
  indexFile: string;
  /** YYYY-MM-DD; por defecto, hoy en UTC. Parametrizable para tests deterministas. */
  date?: string;
}

export interface GenerateDigestResult {
  pageRelPath: string | null;
  digestedIds: string[];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function renderPage(date: string, items: NewsItem[]): string {
  const lines = [`# Noticias — ${date}`, '', 'Resumen automático de artículos obtenidos por el sistema de noticias. No es análisis: son titulares y extractos tal como los publicó la fuente, sin interpretación añadida.', ''];
  for (const item of items) {
    lines.push(`## ${item.title}`);
    lines.push('');
    lines.push(`- Fuente: ${item.sourceId}`);
    lines.push(`- Publicado: ${item.publishedAt ?? '(no indicado por la fuente)'}`);
    lines.push(`- Enlace: ${item.url}`);
    if (item.summary) {
      lines.push('');
      lines.push(item.summary);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function upsertIndexEntry(indexContent: string, pageRelPath: string, description: string): string {
  const categoryHeading = '## Noticias';
  const bullet = `- [\`${pageRelPath}\`](${pageRelPath}) — ${description}`;

  if (indexContent.includes(categoryHeading)) {
    // Inserta el bullet justo después de la línea de cabecera de la categoría (o después del
    // último bullet de esa categoría si ya tiene alguno, para mantenerlos agrupados).
    const lines = indexContent.split('\n');
    const headingIndex = lines.findIndex((l) => l.trim() === categoryHeading);
    let insertAt = headingIndex + 1;
    while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++;
    while (insertAt < lines.length && lines[insertAt].startsWith('- ')) insertAt++;
    lines.splice(insertAt, 0, bullet);
    return lines.join('\n');
  }

  // Categoría nueva: se añade al final del fichero con una línea en blanco antes.
  const trimmed = indexContent.replace(/\n+$/, '');
  return `${trimmed}\n\n${categoryHeading}\n\n${bullet}\n`;
}

export async function generateNewsDigest(items: NewsItem[], opts: GenerateDigestOptions): Promise<GenerateDigestResult> {
  const pending = items.filter((i) => !i.digestedToWiki);
  if (pending.length === 0) {
    return { pageRelPath: null, digestedIds: [] };
  }

  const date = opts.date ?? todayUtc();
  const pageRelPath = `noticias/${date}.md`;
  const pageAbsPath = path.join(opts.wikiDir, pageRelPath);

  await fs.mkdir(path.dirname(pageAbsPath), { recursive: true });
  await fs.writeFile(pageAbsPath, renderPage(date, pending), 'utf-8');

  const indexContent = await fs.readFile(opts.indexFile, 'utf-8');
  const description = `${pending.length} artículo(s) obtenidos el ${date} — ver detalle en la página.`;
  const updatedIndex = upsertIndexEntry(indexContent, pageRelPath, description);
  await fs.writeFile(opts.indexFile, updatedIndex, 'utf-8');

  return { pageRelPath, digestedIds: pending.map((i) => i.id) };
}
```

- [ ] **Step 4: Verificar que el test pasa**

Run: `npx vitest run test/newsDigest.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add trading-agents-dashboard/server/src/engine/newsDigest.ts trading-agents-dashboard/server/test/newsDigest.test.ts
git commit -m "feat(news): add wiki digest generator for pending news items"
```

**Nota para la Task 6 (rutas):** tras generar el digest sobre la wiki real, hay que marcar en el store los items devueltos en `digestedIds` como `digestedToWiki: true` (añadir un helper `markDigested(sourceId, ids)` a `newsStore.ts` si Task 6 lo necesita, o iterar `updateSource`-style directamente — decisión de quien implemente Task 6, mientras quede cubierto).

---

### Task 5: Rutas REST + montaje en `index.ts`

**Files:**
- Create: `server/src/routes/news.ts`
- Modify: `server/src/store/newsStore.ts` (añadir `markDigested`)
- Modify: `server/src/index.ts:9` (import) y `server/src/index.ts:38` (montaje, justo después de `backtestRouter`)

**Interfaces:**
- Consumes: todo lo de Task 2/3/4 (`newsStore.ts`, `newsFetcher.ts`, `newsDigest.ts`).
- Produces: rutas HTTP `GET/POST/PUT/DELETE /api/news/sources`, `POST /api/news/sources/:id/fetch`, `POST /api/news/fetch-all`, `GET /api/news/items`, `POST /api/news/digest`.

- [ ] **Step 1: Añadir `markDigested` a `newsStore.ts`**

Al final de `server/src/store/newsStore.ts`, añade:

```ts
export async function markDigested(sourceId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const items = await listItems(sourceId);
  const updated = items.map((i) => (idSet.has(i.id) ? { ...i, digestedToWiki: true } : i));
  await writeJson(itemsFile(sourceId), updated);
}
```

- [ ] **Step 2: Crear `server/src/routes/news.ts`**

```ts
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listSources, addSource, updateSource, deleteSource, listItems, appendItems, markDigested,
} from '../store/newsStore.js';
import { fetchRss, fetchGenericUrl } from '../engine/newsFetcher.js';
import { generateNewsDigest } from '../engine/newsDigest.js';
import { WIKI_DIR, WIKI_INDEX_FILE } from '../paths.js';
import type { NewsSource } from '../types.js';

export const newsRouter = Router();

newsRouter.get('/sources', asyncHandler(async (_req, res) => {
  res.json(await listSources());
}));

newsRouter.post('/sources', asyncHandler(async (req, res) => {
  const { name, kind, url } = req.body ?? {};
  if (!name || typeof name !== 'string') { res.status(400).json({ error: 'name is required' }); return; }
  if (kind !== 'rss' && kind !== 'generic_url') { res.status(400).json({ error: 'kind must be "rss" or "generic_url"' }); return; }
  if (!url || typeof url !== 'string') { res.status(400).json({ error: 'url is required' }); return; }
  res.status(201).json(await addSource({ name, kind, url }));
}));

newsRouter.put('/sources/:id', asyncHandler(async (req, res) => {
  const updated = await updateSource(req.params.id, req.body ?? {});
  if (!updated) { res.status(404).json({ error: 'source not found' }); return; }
  res.json(updated);
}));

newsRouter.delete('/sources/:id', asyncHandler(async (req, res) => {
  await deleteSource(req.params.id);
  res.json({ ok: true });
}));

async function fetchOneSource(source: NewsSource): Promise<{ source: NewsSource; newItems: number; error?: string }> {
  try {
    const candidates = source.kind === 'rss' ? await fetchRss(source) : await fetchGenericUrl(source);
    const fresh = await appendItems(source.id, candidates);
    const updated = await updateSource(source.id, {
      lastFetchedAt: new Date().toISOString(), lastFetchStatus: 'ok', lastFetchError: undefined,
    });
    return { source: updated ?? source, newItems: fresh.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const updated = await updateSource(source.id, {
      lastFetchedAt: new Date().toISOString(), lastFetchStatus: 'error', lastFetchError: message,
    });
    return { source: updated ?? source, newItems: 0, error: message };
  }
}

newsRouter.post('/sources/:id/fetch', asyncHandler(async (req, res) => {
  const sources = await listSources();
  const source = sources.find((s) => s.id === req.params.id);
  if (!source) { res.status(404).json({ error: 'source not found' }); return; }
  res.json(await fetchOneSource(source));
}));

newsRouter.post('/fetch-all', asyncHandler(async (_req, res) => {
  const sources = (await listSources()).filter((s) => s.enabled);
  const results = [];
  for (const source of sources) {
    results.push(await fetchOneSource(source)); // secuencial a propósito: nada de ráfagas de red simultáneas
  }
  res.json(results);
}));

newsRouter.get('/items', asyncHandler(async (req, res) => {
  const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
  if (sourceId) { res.json(await listItems(sourceId)); return; }
  const sources = await listSources();
  const all = (await Promise.all(sources.map((s) => listItems(s.id)))).flat();
  all.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  res.json(all);
}));

newsRouter.post('/digest', asyncHandler(async (_req, res) => {
  const sources = await listSources();
  const allItems = (await Promise.all(sources.map((s) => listItems(s.id)))).flat();
  const result = await generateNewsDigest(allItems, { wikiDir: WIKI_DIR, indexFile: WIKI_INDEX_FILE });
  if (result.pageRelPath) {
    const bySource = new Map<string, string[]>();
    for (const item of allItems) {
      if (!result.digestedIds.includes(item.id)) continue;
      bySource.set(item.sourceId, [...(bySource.get(item.sourceId) ?? []), item.id]);
    }
    for (const [sourceId, ids] of bySource) await markDigested(sourceId, ids);
  }
  res.json(result);
}));
```

- [ ] **Step 3: Montar el router en `index.ts`**

En `server/src/index.ts`, localiza (línea ~9):

```ts
import { backtestRouter } from './routes/backtest.js';
```

Añade justo debajo:

```ts
import { backtestRouter } from './routes/backtest.js';
import { newsRouter } from './routes/news.js';
```

Localiza (línea ~38):

```ts
app.use('/api/backtest', backtestRouter);
```

Añade justo debajo:

```ts
app.use('/api/backtest', backtestRouter);
app.use('/api/news', newsRouter);
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add trading-agents-dashboard/server/src/routes/news.ts trading-agents-dashboard/server/src/store/newsStore.ts trading-agents-dashboard/server/src/index.ts
git commit -m "feat(news): add REST routes and mount in the server"
```

---

### Task 6: Frontend — `api.ts`

**Files:**
- Modify: `trading-agents-dashboard/src/lib/api.ts`

**Interfaces:**
- Consumes: `request<T>` (helper ya existente en el fichero, mismo patrón que el resto de métodos de `api`).
- Produces: `api.listNewsSources`, `api.addNewsSource`, `api.updateNewsSource`, `api.deleteNewsSource`, `api.fetchNewsSource`, `api.fetchAllNews`, `api.listNewsItems`, `api.generateNewsDigest`.

- [ ] **Step 1: Añadir los tipos de frontend**

En `trading-agents-dashboard/src/types/agent.ts` (o el fichero de tipos compartidos que ya use el frontend para espejar tipos del backend — revisa cómo `Run`/`RunSummary` están importados en `api.ts` para seguir el mismo sitio), añade:

```ts
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
  publishedAt?: string;
  fetchedAt: string;
  summary?: string;
  digestedToWiki?: boolean;
}
```

- [ ] **Step 2: Añadir los métodos a `api`**

En `trading-agents-dashboard/src/lib/api.ts`, dentro del objeto `export const api = { ... }`, añade (junto al resto de métodos, mismo estilo que `listPairs`/`resumeRun`):

```ts
  listNewsSources: () => request<NewsSource[]>('/news/sources'),
  addNewsSource: (input: { name: string; kind: 'rss' | 'generic_url'; url: string }) =>
    request<NewsSource>('/news/sources', { method: 'POST', body: JSON.stringify(input) }),
  updateNewsSource: (id: string, patch: Partial<NewsSource>) =>
    request<NewsSource>(`/news/sources/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteNewsSource: (id: string) =>
    request<{ ok: boolean }>(`/news/sources/${id}`, { method: 'DELETE' }),
  fetchNewsSource: (id: string) =>
    request<{ source: NewsSource; newItems: number; error?: string }>(`/news/sources/${id}/fetch`, { method: 'POST' }),
  fetchAllNews: () =>
    request<Array<{ source: NewsSource; newItems: number; error?: string }>>('/news/fetch-all', { method: 'POST' }),
  listNewsItems: (sourceId?: string) =>
    request<NewsItem[]>(sourceId ? `/news/items?sourceId=${encodeURIComponent(sourceId)}` : '/news/items'),
  generateNewsDigest: () =>
    request<{ pageRelPath: string | null; digestedIds: string[] }>('/news/digest', { method: 'POST' }),
```

Añade el import de los tipos nuevos junto a los demás imports de tipos al principio del fichero (revisa el patrón exacto ya usado, p. ej. `import type { Run, RunSummary, ... } from '../types/agent.js'` o el fichero que corresponda).

- [ ] **Step 3: Verificar que compila**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add trading-agents-dashboard/src/lib/api.ts trading-agents-dashboard/src/types/agent.ts
git commit -m "feat(news): add frontend API client methods for news endpoints"
```

---

### Task 7: Frontend — panel de Noticias

**Files:**
- Create: `trading-agents-dashboard/src/components/NewsPanel.tsx`
- Modify: `trading-agents-dashboard/src/components/Dashboard.tsx` (nueva entrada de navegación)

**Interfaces:**
- Consumes: los métodos de `api` de Task 6.
- Produces: componente `NewsPanel` exportado, montable como una vista/modal desde `Dashboard.tsx` (mismo patrón que `RunHistoryModal` — revisa cómo se abre con `showHistory`/`setShowHistory` en `Dashboard.tsx` y replica esa forma: un botón que activa un estado booleano, el panel se renderiza condicionalmente).

- [ ] **Step 1: Crear el componente**

Crea `trading-agents-dashboard/src/components/NewsPanel.tsx`. Sigue el estilo visual de `RunHistoryModal.tsx` (mismo overlay `fixed inset-0 bg-void/95 backdrop-blur-sm`, mismo `card-edge shadow-2xl`) para consistencia — ábrelo como referencia antes de escribir este componente. Estructura funcional mínima:

```tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { NewsSource, NewsItem } from '../types/agent';

export const NewsPanel = ({ onClose }: { onClose: () => void }) => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<'rss' | 'generic_url'>('rss');
  const [newUrl, setNewUrl] = useState('');

  const reload = async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([api.listNewsSources(), api.listNewsItems()]);
      setSources(s);
      setItems(i);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando noticias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleAddSource = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    await api.addNewsSource({ name: newName.trim(), kind: newKind, url: newUrl.trim() });
    setNewName('');
    setNewUrl('');
    await reload();
  };

  const handleFetchAll = async () => {
    setLoading(true);
    try {
      await api.fetchAllNews();
      await reload();
    } finally {
      setLoading(false);
    }
  };

  const handleDigest = async () => {
    await api.generateNewsDigest();
    await reload();
  };

  return (
    <div className="fixed inset-0 bg-void/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-panel border border-line/70 rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto space-y-5 card-edge shadow-2xl">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <h2 className="font-display font-bold text-lg text-paper tracking-wide">NOTICIAS</h2>
          <button onClick={onClose} className="text-muted hover:text-paper text-lg font-mono px-1 cursor-pointer">✕</button>
        </div>

        {error && <p className="text-sm text-bear">{error}</p>}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Añadir fuente</p>
          <div className="flex gap-2 flex-wrap">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre"
              className="flex-1 min-w-[140px] bg-void/50 border border-line/70 rounded-xl px-3 py-2 text-sm text-paper" />
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as 'rss' | 'generic_url')}
              className="bg-panel border border-line/70 rounded-xl px-3 py-2 text-sm text-paper">
              <option value="rss">RSS/Atom</option>
              <option value="generic_url">URL genérica</option>
            </select>
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..."
              className="flex-1 min-w-[200px] bg-void/50 border border-line/70 rounded-xl px-3 py-2 text-sm text-paper" />
            <button onClick={handleAddSource} className="rounded-xl border border-cyan/60 bg-cyan/10 text-cyan text-sm px-4 py-2 cursor-pointer">Añadir</button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Fuentes ({sources.length})</p>
            <div className="flex gap-2">
              <button onClick={handleFetchAll} disabled={loading} className="text-xs text-cyan hover:underline cursor-pointer disabled:opacity-40">Actualizar todas</button>
              <button onClick={handleDigest} className="text-xs text-cyan hover:underline cursor-pointer">Generar resumen de wiki</button>
            </div>
          </div>
          <ul className="divide-y divide-line/40 border border-line/70 rounded-xl overflow-hidden bg-void/40">
            {sources.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-paper truncate">{s.name} <span className="text-muted font-normal">({s.kind})</span></p>
                  <p className="text-xs text-muted truncate">{s.url}</p>
                  {s.lastFetchStatus === 'error' && <p className="text-xs text-bear">Último error: {s.lastFetchError}</p>}
                </div>
                <button onClick={async () => { await api.fetchNewsSource(s.id); await reload(); }}
                  className="text-xs text-cyan hover:underline cursor-pointer shrink-0">Actualizar</button>
                <button onClick={async () => { await api.deleteNewsSource(s.id); await reload(); }}
                  className="text-xs text-bear hover:underline cursor-pointer shrink-0">Borrar</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Registro ({items.length})</p>
          <ul className="divide-y divide-line/40 border border-line/70 rounded-xl overflow-hidden bg-void/40 max-h-64 overflow-y-auto">
            {items.map((i) => (
              <li key={i.id} className="px-4 py-3">
                <a href={i.url} target="_blank" rel="noreferrer" className="text-sm text-paper hover:text-cyan">{i.title}</a>
                <p className="text-xs text-muted">{i.fetchedAt}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Añadir la entrada de navegación en `Dashboard.tsx`**

En `trading-agents-dashboard/src/components/Dashboard.tsx`, añade el import:

```tsx
import { NewsPanel } from './NewsPanel';
```

Añade un estado nuevo junto a `showHistory` (línea ~36):

```tsx
  const [showHistory, setShowHistory] = useState(false);
  const [showNews, setShowNews] = useState(false);
```

Añade un botón junto al de "👁️ Análisis anteriores" (línea ~173-179), mismo estilo:

```tsx
            <button
              onClick={() => setShowNews(true)}
              className="h-11 rounded-xl border border-line-bright bg-panel-raised/70 backdrop-blur-md text-paper/90 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_18px_rgba(0,240,255,0.3)] font-semibold text-base px-5 transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📰</span>
              <span>Noticias</span>
            </button>
```

Y el renderizado condicional, junto a `{showHistory && <RunHistoryModal .../>}` (línea ~193-201):

```tsx
        {showNews && <NewsPanel onClose={() => setShowNews(false)} />}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add trading-agents-dashboard/src/components/NewsPanel.tsx trading-agents-dashboard/src/components/Dashboard.tsx
git commit -m "feat(news): add NewsPanel UI and wire it into the dashboard"
```

---

### Task 8: Verificación manual end-to-end con una fuente RSS real

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Arrancar el dashboard en desarrollo**

```bash
cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard
npm run dev
```

- [ ] **Step 2: Probar el flujo completo**

1. Abre el dashboard, pulsa "📰 Noticias".
2. Añade una fuente RSS real y de confianza que ya conozcas (medio financiero, blog de trading, lo que sigas habitualmente) — pega su URL de feed RSS. **Este plan no incluye una URL concreta a propósito**: usa una que tú mismo verifiques que existe y te interesa vigilar.
3. Pulsa "Actualizar" sobre esa fuente. Verifica que aparecen artículos reales en el "Registro" (títulos y enlaces que reconoces del medio real, no texto inventado).
4. Pulsa "Actualizar" una segunda vez sin que haya pasado tiempo: el número de artículos del registro no debe duplicarse (deduplicación por URL funcionando).
5. Añade una segunda fuente de tipo "URL genérica" con la portada de cualquier web (no un feed) y actualízala; verifica que aparece un único item con el `<title>` de esa página.
6. Pulsa "Generar resumen de wiki". Verifica en el sistema de ficheros que existe `wiki-Traiding/noticias/<fecha-de-hoy>.md` con el contenido de los artículos, y que `wiki-Traiding/index.md` tiene una entrada nueva bajo `## Noticias` apuntando a esa página.
7. Fuerza un error deliberado: añade una fuente RSS con una URL que no existe (p. ej. `https://no-existe-de-verdad.invalid/feed.xml`) y actualízala. Verifica que la UI muestra el error (`lastFetchError`) sin tumbar el resto del panel ni las demás fuentes.

- [ ] **Step 3: Parar el servidor de desarrollo**

`Ctrl+C`. No toques el proceso pm2 de producción (`trading-dashboard`), es un proceso distinto en otro puerto.

- [ ] **Step 4: Limpiar los datos de prueba (opcional)**

Si quieres dejar el sistema de noticias vacío tras la prueba: borra las fuentes de prueba desde la propia UI (botón "Borrar" en cada una — esto también borra sus artículos vía `deleteSource`). Si generaste una página de wiki de prueba y no la quieres conservar, bórrala manualmente (`wiki-Traiding/noticias/<fecha>.md`) y revierte la entrada añadida a `wiki-Traiding/index.md`.

---

## Self-review de este plan

- **Cobertura del spec:** Task 1-2 cubren "Modelo de datos"; Task 3 cubre "Backend → fetchRss/fetchGenericUrl"; Task 4 cubre "Resumen a wiki"; Task 5 cubre "Backend → Rutas" y "Disparo de la obtención" (bajo demanda, sin scheduler, tal como especifica la spec); Task 6-7 cubren "Frontend"; Task 8 cubre "Testing → Manual". La sección "Fuera de alcance" (Telegram, polling automático) no tiene tarea — correcto, está fuera de alcance a propósito.
- **Sin placeholders:** cada step de código tiene implementación completa, no hay "TODO"/"añadir manejo de errores apropiado" sin más.
- **Consistencia de tipos:** `NewsSource`/`NewsItem` definidos en Task 1 se usan sin cambios de forma en Task 2 (store), Task 3 (fetcher), Task 4 (digest — solo lee campos, no los redefine), Task 5 (rutas) y Task 6 (frontend, copia espejo intencionada porque frontend y backend son paquetes npm separados sin tipos compartidos en este repo — mismo patrón que `Run`/`Agent` ya duplicados hoy entre `server/src/types.ts` y `trading-agents-dashboard/src/types/agent.ts`).
- **Orden de dependencia entre tareas:** Task 2 depende de Task 1; Task 3 es independiente de Task 2 (no se cruzan); Task 4 es independiente de 2 y 3; Task 5 depende de 2, 3 y 4 (las importa todas); Task 6 depende de que Task 5 exista (mismos shapes de respuesta JSON); Task 7 depende de Task 6; Task 8 depende de todo lo anterior. Un ejecutor puede paralelizar 2/3/4 si usa subagentes, pero 5 debe esperar a las tres.

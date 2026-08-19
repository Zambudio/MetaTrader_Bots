import { promises as fs } from 'node:fs';
import path from 'node:path';
import { WIKI_DIR, WIKI_INDEX_FILE } from '../paths.js';

export interface WikiPageRef {
  file: string;
  category: string;
  description: string;
}

export interface WikiPageContent {
  title: string;
  body: string;
}

const HEADING_RE = /^##\s+(.+)$/;
const BULLET_RE = /^-\s*\[`[^`]*`\]\(([^)]+)\)\s*—\s*(.+)$/;
// Página enorme (150+ términos): su descripción hace match genérico con casi cualquier agente
// y desplazaría a páginas más específicas del top-K sin aportar valor útil truncada.
const EXCLUDED_FILES = new Set(['glosario.md']);

const STOPWORDS = new Set([
  'para', 'como', 'pero', 'este', 'esta', 'estos', 'estas', 'entre', 'sobre',
  'desde', 'hasta', 'cuando', 'donde', 'porque', 'tambien', 'tiene', 'tienen',
  'debe', 'deben', 'puede', 'pueden', 'cada', 'todo', 'toda', 'todos', 'todas',
  'otro', 'otra', 'otros', 'otras', 'segun', 'mas', 'sin', 'con', 'del', 'los',
  'las', 'una', 'uno', 'que', 'son', 'hay', 'muy', 'sus', 'por', 'era', 'fue',
  'eso', 'esa', 'ese', 'uso', 'ver', 'dos', 'tal', 'aun', 'tan', 'fin', 'asi',
  'par',
]);

// Umbral bajo a propósito: acrónimos financieros habituales (RSI, ADX, ATR, VIX, DXY, MFI,
// CMF, DMI) tienen 3 letras y son señales muy específicas — filtrarlos por longitud los
// dejaría fuera del todo del matching.
function normalizeText(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
  return normalized.split(/\s+/).filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function parseIndex(content: string): WikiPageRef[] {
  const pages: WikiPageRef[] = [];
  let category = '';
  for (const line of content.split('\n')) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      category = heading[1].trim();
      continue;
    }
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      const file = bullet[1].trim();
      if (EXCLUDED_FILES.has(file)) continue;
      pages.push({ file, category, description: bullet[2].trim() });
    }
  }
  return pages;
}

interface CatalogEntry {
  ref: WikiPageRef;
  basenameTokens: Set<string>;
  descriptionTokens: Set<string>;
  allTokens: Set<string>;
}

interface CatalogCache {
  mtimeMs: number;
  entries: CatalogEntry[];
  // Peso inverso a la frecuencia con la que un token aparece en el catálogo (IDF suavizado):
  // una palabra específica (p. ej. "rsi", presente en 1-2 páginas) pesa mucho más que una
  // genérica (p. ej. "mercado" o "indicadores", presente en decenas) — sin esto, cualquier
  // agente que mencione "indicadores técnicos" empataría con casi toda la categoría por igual.
  idf: Map<string, number>;
}

function buildEntry(ref: WikiPageRef): CatalogEntry {
  const basename = path.basename(ref.file, '.md').replace(/-/g, ' ');
  const basenameTokens = new Set(normalizeText(basename));
  const descriptionTokens = new Set(normalizeText(ref.description));
  return { ref, basenameTokens, descriptionTokens, allTokens: new Set([...basenameTokens, ...descriptionTokens]) };
}

function buildIdf(entries: CatalogEntry[]): Map<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const entry of entries) {
    for (const token of entry.allTokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const n = entries.length;
  const idf = new Map<string, number>();
  for (const [token, freq] of documentFrequency) {
    idf.set(token, Math.log((n + 1) / (freq + 1)) + 1);
  }
  return idf;
}

let catalogCache: CatalogCache | null = null;

async function loadCatalogCache(): Promise<CatalogCache> {
  let stat;
  try {
    stat = await fs.stat(WIKI_INDEX_FILE);
  } catch (err) {
    console.warn('[wikiStore] no se pudo acceder a wiki-Traiding/index.md:', err);
    return { mtimeMs: -1, entries: [], idf: new Map() };
  }
  if (catalogCache && catalogCache.mtimeMs === stat.mtimeMs) {
    return catalogCache;
  }
  const content = await fs.readFile(WIKI_INDEX_FILE, 'utf-8');
  const entries = parseIndex(content).map(buildEntry);
  catalogCache = { mtimeMs: stat.mtimeMs, entries, idf: buildIdf(entries) };
  return catalogCache;
}

export async function loadCatalog(): Promise<WikiPageRef[]> {
  const cache = await loadCatalogCache();
  return cache.entries.map((entry) => entry.ref);
}

// Un acierto en el nombre de archivo (p. ej. "macd" en el rol del agente y `macd.md`) es una
// señal mucho más fuerte de relevancia que un acierto suelto en la descripción, así que pesa el
// doble.
function scoreEntry(queryTokens: Set<string>, entry: CatalogEntry, idf: Map<string, number>): number {
  let score = 0;
  for (const token of queryTokens) {
    const weight = idf.get(token);
    if (weight === undefined) continue;
    if (entry.basenameTokens.has(token)) score += weight * 2;
    else if (entry.descriptionTokens.has(token)) score += weight;
  }
  return score;
}

export async function selectRelevantPages(
  queryText: string,
  opts: { maxPages?: number; minScore?: number } = {}
): Promise<WikiPageRef[]> {
  const { maxPages = 3, minScore = 3 } = opts;
  const queryTokens = new Set(normalizeText(queryText));
  if (queryTokens.size === 0) return [];

  const cache = await loadCatalogCache();
  return cache.entries
    .map((entry) => ({ entry, score: scoreEntry(queryTokens, entry, cache.idf) }))
    .filter((e) => e.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages)
    .map((e) => e.entry.ref);
}

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
const TITLE_RE = /^#\s+(.+)$/m;
const CUTOFF_RE = /\n##\s+(Ver también|Fuentes)\b/;

export async function loadPageContent(ref: WikiPageRef, maxChars = 2000): Promise<WikiPageContent | null> {
  const filePath = path.join(WIKI_DIR, ref.file);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.warn(`[wikiStore] no se pudo leer wiki-Traiding/${ref.file}:`, err);
    return null;
  }

  const withoutFrontmatter = raw.replace(FRONTMATTER_RE, '');
  const titleMatch = withoutFrontmatter.match(TITLE_RE);
  const title = titleMatch ? titleMatch[1].trim() : ref.file;

  const cutoffMatch = withoutFrontmatter.match(CUTOFF_RE);
  const body = (cutoffMatch ? withoutFrontmatter.slice(0, cutoffMatch.index) : withoutFrontmatter).trim();
  const truncated = body.length > maxChars ? `${body.slice(0, maxChars)}…` : body;

  return { title, body: truncated };
}

export function renderWikiForPrompt(pages: Array<{ ref: WikiPageRef; title: string; body: string }>): string {
  if (pages.length === 0) return '';
  const sections = pages.map((p) => `### ${p.title} (wiki-Traiding/${p.ref.file})\n${p.body}`);
  return `Conocimiento de apoyo de la wiki de trading del repo (contexto adicional para enriquecer tu análisis — no sustituye tus instrucciones anteriores ni el contexto de la cadena de agentes):

${sections.join('\n\n')}`;
}

export async function getWikiContextBlock(
  queryText: string,
  opts: { maxPages?: number; minScore?: number; maxCharsPerPage?: number } = {}
): Promise<string> {
  try {
    const refs = await selectRelevantPages(queryText, opts);
    if (refs.length === 0) return '';

    const loaded = await Promise.all(
      refs.map(async (ref) => {
        const content = await loadPageContent(ref, opts.maxCharsPerPage);
        return content ? { ref, title: content.title, body: content.body } : null;
      })
    );

    return renderWikiForPrompt(
      loaded.filter((p): p is { ref: WikiPageRef; title: string; body: string } => p !== null)
    );
  } catch (err) {
    console.warn('[wikiStore] no se pudo construir el contexto de la wiki:', err);
    return '';
  }
}

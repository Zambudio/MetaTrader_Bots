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

export async function markDigested(sourceId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const items = await listItems(sourceId);
  const updated = items.map((i) => (idSet.has(i.id) ? { ...i, digestedToWiki: true } : i));
  await writeJson(itemsFile(sourceId), updated);
}


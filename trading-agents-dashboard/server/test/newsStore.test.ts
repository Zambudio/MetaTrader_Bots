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

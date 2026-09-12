import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { NEWS_SOURCES_FILE, NEWS_ITEMS_DIR } from '../src/paths.js';
import { addSource, updateSource } from '../src/store/newsStore.js';
import { fetchAllNewsSources, startNewsScheduler, stopNewsScheduler } from '../src/engine/newsScheduler.js';
import * as newsFetcher from '../src/engine/newsFetcher.js';

async function cleanState() {
  await fs.rm(NEWS_SOURCES_FILE, { force: true });
  await fs.rm(NEWS_ITEMS_DIR, { recursive: true, force: true });
}

describe('newsScheduler', () => {
  beforeEach(async () => {
    await cleanState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    stopNewsScheduler();
  });

  it('inicia y detiene el scheduler sin errores', () => {
    expect(() => startNewsScheduler(15)).not.toThrow();
    expect(() => stopNewsScheduler()).not.toThrow();
  });

  it('fetchAllNewsSources procesa únicamente fuentes habilitadas y maneja errores sin abortar', async () => {
    const s1 = await addSource({ name: 'Fuente OK', kind: 'rss', url: 'https://ok.example/rss' });
    const s2 = await addSource({ name: 'Fuente Error', kind: 'rss', url: 'https://err.example/rss' });
    const s3 = await addSource({ name: 'Fuente Disabled', kind: 'rss', url: 'https://disabled.example/rss' });
    await updateSource(s3.id, { enabled: false });

    vi.spyOn(newsFetcher, 'fetchRss').mockImplementation(async (source) => {
      if (source.id === s1.id) {
        return [
          { title: 'Noticia 1', url: 'https://ok.example/1' },
          { title: 'Noticia 2', url: 'https://ok.example/2' },
        ];
      }
      throw new Error('Network timeout simulado');
    });

    const outcome = await fetchAllNewsSources(false);
    expect(outcome.results).toHaveLength(2); // s1 y s2, s3 omitida por enabled:false
    
    const r1 = outcome.results.find((r) => r.source.id === s1.id);
    expect(r1?.newItems).toBe(2);
    expect(r1?.error).toBeUndefined();
    expect(r1?.source.lastFetchStatus).toBe('ok');

    const r2 = outcome.results.find((r) => r.source.id === s2.id);
    expect(r2?.newItems).toBe(0);
    expect(r2?.error).toContain('Network timeout simulado');
    expect(r2?.source.lastFetchStatus).toBe('error');

    expect(outcome.totalNewItems).toBe(2);
  });
});

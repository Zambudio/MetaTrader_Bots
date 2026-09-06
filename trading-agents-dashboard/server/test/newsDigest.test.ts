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

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

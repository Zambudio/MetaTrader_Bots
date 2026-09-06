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
  return [{ title, url: source.url, summary: description ?? undefined }];
}

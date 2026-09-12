import { listSources, listItems, markDigested } from '../store/newsStore.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NEWS_ITEMS_DIR } from '../paths.js';

function itemsFile(sourceId: string): string {
  return path.join(NEWS_ITEMS_DIR, `${sourceId}.json`);
}

export interface RetentionOptions {
  /** Retener noticias no digeridas de los últimos N días (default: 30) */
  keepDaysUndigested?: number;
  /** Retener noticias digeridas de los últimos N días (default: 7) */
  keepDaysDigested?: number;
}

/** Limpia noticias antiguas: mantiene no-digeridas 30 días, digeridas 7 días. */
export async function cleanOldNews(opts: RetentionOptions = {}): Promise<{ removed: number }> {
  const keepDaysUndigested = opts.keepDaysUndigested ?? 30;
  const keepDaysDigested = opts.keepDaysDigested ?? 7;

  const now = new Date();
  const cutoffUndigested = new Date(now.getTime() - keepDaysUndigested * 24 * 60 * 60 * 1000);
  const cutoffDigested = new Date(now.getTime() - keepDaysDigested * 24 * 60 * 60 * 1000);

  const sources = await listSources();
  let totalRemoved = 0;

  for (const source of sources) {
    const items = await listItems(source.id);
    const filtered = items.filter((item) => {
      const itemDate = new Date(item.fetchedAt);
      if (item.digestedToWiki) {
        return itemDate > cutoffDigested;
      }
      return itemDate > cutoffUndigested;
    });

    const removed = items.length - filtered.length;
    if (removed > 0) {
      await fs.writeFile(itemsFile(source.id), JSON.stringify(filtered, null, 2), 'utf-8');
      console.log(`[newsRetention] ${source.name}: removidas ${removed} noticias antiguas`);
      totalRemoved += removed;
    }
  }

  return { removed: totalRemoved };
}

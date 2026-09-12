import { listSources, updateSource, listItems, appendItems, markDigested } from '../store/newsStore.js';
import { fetchRss, fetchGenericUrl } from './newsFetcher.js';
import { generateNewsDigest, type GenerateDigestResult } from './newsDigest.js';
import { cleanOldNews } from './newsRetention.js';
import { WIKI_DIR, WIKI_INDEX_FILE } from '../paths.js';
import type { NewsSource } from '../types.js';

export interface FetchSourceResult {
  source: NewsSource;
  newItems: number;
  error?: string;
}

export interface FetchAllResult {
  results: FetchSourceResult[];
  totalNewItems: number;
  digestResult?: GenerateDigestResult;
}

let schedulerTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

export async function fetchOneSource(source: NewsSource): Promise<FetchSourceResult> {
  try {
    const candidates = source.kind === 'rss' ? await fetchRss(source) : await fetchGenericUrl(source);
    const fresh = await appendItems(source.id, candidates);
    const updated = await updateSource(source.id, {
      lastFetchedAt: new Date().toISOString(),
      lastFetchStatus: 'ok',
      lastFetchError: undefined,
    });
    return { source: updated ?? source, newItems: fresh.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const updated = await updateSource(source.id, {
      lastFetchedAt: new Date().toISOString(),
      lastFetchStatus: 'error',
      lastFetchError: message,
    });
    return { source: updated ?? source, newItems: 0, error: message };
  }
}

export async function fetchAllNewsSources(autoDigest = true): Promise<FetchAllResult> {
  const sources = (await listSources()).filter((s) => s.enabled);
  const results: FetchSourceResult[] = [];
  let totalNewItems = 0;

  for (const source of sources) {
    const res = await fetchOneSource(source);
    results.push(res);
    totalNewItems += res.newItems;
  }

  let digestResult: GenerateDigestResult | undefined;
  if (autoDigest) {
    try {
      const allItems = (await Promise.all(sources.map((s) => listItems(s.id)))).flat();
      const digest = await generateNewsDigest(allItems, { wikiDir: WIKI_DIR, indexFile: WIKI_INDEX_FILE });
      if (digest.pageRelPath && digest.digestedIds.length > 0) {
        const bySource = new Map<string, string[]>();
        for (const item of allItems) {
          if (!digest.digestedIds.includes(item.id)) continue;
          bySource.set(item.sourceId, [...(bySource.get(item.sourceId) ?? []), item.id]);
        }
        for (const [sourceId, ids] of bySource) {
          await markDigested(sourceId, ids);
        }
        digestResult = digest;
      }
    } catch (err) {
      console.error('[newsScheduler] error generando resumen wiki automático:', err);
    }
  }

  return { results, totalNewItems, digestResult };
}

export function startNewsScheduler(customIntervalMinutes?: number): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  const envVal = process.env.NEWS_POLL_INTERVAL_MINUTES;
  const intervalMinutes = customIntervalMinutes ?? (envVal ? Number(envVal) : 60);

  if (!intervalMinutes || intervalMinutes <= 0 || isNaN(intervalMinutes)) {
    console.log('[newsScheduler] sondeo periódico deshabilitado (NEWS_POLL_INTERVAL_MINUTES=0 o no configurado)');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[newsScheduler] ✓ Sondeo periódico activo cada ${intervalMinutes} minuto(s)`);

  // Ejecutar una vez al iniciar
  (async () => {
    try {
      console.log('[newsScheduler] ejecutando actualización inicial...');
      const outcome = await fetchAllNewsSources(true);
      console.log(`[newsScheduler] ✓ Inicialización: ${outcome.totalNewItems} noticias nuevas`);
    } catch (err) {
      console.error('[newsScheduler] error en actualización inicial:', err);
    }
  })();

  schedulerTimer = setInterval(async () => {
    try {
      console.log('[newsScheduler] ejecutando actualización periódica de fuentes...');
      const outcome = await fetchAllNewsSources(true);
      console.log(`[newsScheduler] ✓ Actualización: ${outcome.totalNewItems} noticias nuevas recopiladas`);
    } catch (err) {
      console.error('[newsScheduler] error inesperado en ciclo periódico:', err);
    }
  }, intervalMs);

  if (schedulerTimer && typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  // Limpieza semanal (cada 7 días)
  startWeeklyCleanup();
}

function startWeeklyCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  console.log('[newsScheduler] ✓ Limpieza semanal de noticias antiguas activa');

  cleanupTimer = setInterval(async () => {
    try {
      console.log('[newsScheduler] ejecutando limpieza semanal de noticias antiguas...');
      const result = await cleanOldNews({ keepDaysUndigested: 30, keepDaysDigested: 7 });
      console.log(`[newsScheduler] ✓ Limpieza completada: ${result.removed} noticias antiguas removidas`);
    } catch (err) {
      console.error('[newsScheduler] error en limpieza semanal:', err);
    }
  }, ONE_WEEK_MS);

  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

export function stopNewsScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  console.log('[newsScheduler] planificador detenido.');
}

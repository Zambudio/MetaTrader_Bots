import type { Candle } from './types.js';
import { supportsKraken, fetchKrakenCandles } from './krakenAdapter.js';
import { fetchTwelveDataCandles, isTwelveDataConfigured } from './twelveDataAdapter.js';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { data: Candle[]; expiresAt: number }>();

export async function getCandles(pair: string, timeframe: string): Promise<Candle[]> {
  const cacheKey = `${pair}|${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const raw = supportsKraken(pair)
    ? await fetchKrakenCandles(pair, timeframe)
    : await fetchTwelveDataCandles(pair, timeframe);

  // lightweight-charts exige velas estrictamente ordenadas y sin timestamps repetidos;
  // un proveedor externo con un dato defectuoso rompería todo el gráfico en el cliente.
  const sorted = [...raw].sort((a, b) => a.time - b.time);
  const candles = sorted.filter((c, i) => i === 0 || c.time > sorted[i - 1].time);

  cache.set(cacheKey, { data: candles, expiresAt: Date.now() + CACHE_TTL_MS });
  return candles;
}

export function candlesAvailable(pair: string): boolean {
  return supportsKraken(pair) || isTwelveDataConfigured();
}

import type { Candle } from './types.js';
import { supportsKraken, fetchKrakenCandles } from './krakenAdapter.js';
import { fetchTwelveDataCandles, isTwelveDataConfigured } from './twelveDataAdapter.js';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { data: Candle[]; expiresAt: number }>();

export interface CandleQuery {
  /**
   * Fecha/hora de corte superior en UTC (`YYYY-MM-DD` o `YYYY-MM-DD HH:MM:SS`). Con este valor,
   * `getCandles` devuelve solo velas cuyo cierre es <= a ese instante — reconstruye la foto de
   * un periodo histórico concreto. Los proveedores que no lo soportan de forma nativa (Kraken)
   * se filtran localmente después de la descarga.
   */
  endDate?: string;
  /** Fuerza recarga ignorando la caché de 60 s (útil en scripts de validación). */
  noCache?: boolean;
}

/**
 * Convierte `YYYY-MM-DD[ HH:MM:SS]` (UTC, sin offset) o un ISO completo a epoch en segundos.
 * Devuelve `null` si no es parseable. Exportado para pruebas deterministas.
 */
export function parseEndDateToEpochSec(endDate: string): number | null {
  const trimmed = endDate.trim();
  if (!trimmed) return null;
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const iso = trimmed.includes('T')
    ? `${trimmed}${hasTz ? '' : 'Z'}`
    : trimmed.includes(' ')
      ? `${trimmed.replace(' ', 'T')}Z`
      : `${trimmed}T00:00:00Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export function candleIntervalSeconds(timeframe: string): number | null {
  return ({ M15: 15 * 60, H1: 60 * 60, H4: 4 * 60 * 60, D1: 24 * 60 * 60 } as Record<string, number>)[timeframe] ?? null;
}

/**
 * Twelve Data etiqueta cada barra por su APERTURA. Solo es utilizable si apertura + intervalo <=
 * corte; incluir una barra que abre justo en `as_of` introduciría su H/L/C futuros (look-ahead).
 */
export function filterCandlesByEndDate(candles: Candle[], endDate: string, timeframe: string): Candle[] {
  const cutoff = parseEndDateToEpochSec(endDate);
  if (cutoff === null) return candles;
  const interval = candleIntervalSeconds(timeframe);
  return candles.filter((c) => interval === null ? c.time <= cutoff : c.time + interval <= cutoff);
}

export async function getCandles(pair: string, timeframe: string, query: CandleQuery = {}): Promise<Candle[]> {
  const cacheKey = `${pair}|${timeframe}|${query.endDate ?? 'latest'}`;
  const cached = cache.get(cacheKey);
  if (!query.noCache && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const raw = supportsKraken(pair)
    ? await fetchKrakenCandles(pair, timeframe)
    : await fetchTwelveDataCandles(pair, timeframe, { endDate: query.endDate });

  // lightweight-charts exige velas estrictamente ordenadas y sin timestamps repetidos;
  // un proveedor externo con un dato defectuoso rompería todo el gráfico en el cliente.
  const sorted = [...raw].sort((a, b) => a.time - b.time);
  let candles = sorted.filter((c, i) => i === 0 || c.time > sorted[i - 1].time);

  // Kraken (y cualquier proveedor sin `end_date` nativo) se recorta aquí para que el corte
  // histórico sea consistente sea cual sea la fuente.
  if (query.endDate) {
    candles = filterCandlesByEndDate(candles, query.endDate, timeframe);
  }

  cache.set(cacheKey, { data: candles, expiresAt: Date.now() + CACHE_TTL_MS });
  return candles;
}

export function candlesAvailable(pair: string): boolean {
  return supportsKraken(pair) || isTwelveDataConfigured();
}

/** Nombre legible de la fuente de datos para trazabilidad en informes de validación. */
export function candleSourceLabel(pair: string): string {
  return supportsKraken(pair) ? 'Kraken (OHLC público)' : 'Twelve Data (time_series)';
}

import type { Candle } from './types.js';

const KRAKEN_PAIR_MAP: Record<string, string> = {
  'BTC/USD': 'XBTUSD',
  'ETH/USD': 'ETHUSD',
};

const INTERVAL_MINUTES: Record<string, number> = {
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};

export function supportsKraken(pair: string): boolean {
  return pair in KRAKEN_PAIR_MAP;
}

export async function fetchKrakenCandles(pair: string, timeframe: string): Promise<Candle[]> {
  const krakenPair = KRAKEN_PAIR_MAP[pair];
  if (!krakenPair) {
    throw new Error(`Par no soportado por Kraken: ${pair}`);
  }
  const interval = INTERVAL_MINUTES[timeframe] ?? 60;

  const url = `https://api.kraken.com/0/public/OHLC?pair=${krakenPair}&interval=${interval}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Kraken respondió ${response.status}`);
  }
  const data = (await response.json()) as {
    error?: string[];
    result?: Record<string, unknown>;
  };
  if (Array.isArray(data.error) && data.error.length > 0) {
    throw new Error(`Kraken: ${data.error.join(', ')}`);
  }
  const result = data.result ?? {};
  const resultKey = Object.keys(result).find((k) => k !== 'last');
  if (!resultKey) {
    throw new Error('Kraken no devolvió datos de velas');
  }
  const rows = result[resultKey] as Array<
    [number, string, string, string, string, string, string, number]
  >;
  return rows.map((row) => ({
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[6]),
  }));
}

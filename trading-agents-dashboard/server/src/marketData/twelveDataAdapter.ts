import type { Candle } from './types.js';

const INTERVAL_MAP: Record<string, string> = {
  M15: '15min',
  H1: '1h',
  H4: '4h',
  D1: '1day',
};

export function isTwelveDataConfigured(): boolean {
  return Boolean(process.env.TWELVEDATA_API_KEY);
}

// Twelve Data devuelve "YYYY-MM-DD HH:mm:ss" o "YYYY-MM-DD" sin offset de zona horaria.
// `new Date(...)` interpretaría eso como hora local del proceso, lo que colisiona
// timestamps distintos durante el cambio de hora (DST) del huso horario del servidor.
// Forzamos UTC explícito en la petición y al parsear para que sea determinista.
function parseTwelveDataTime(datetime: string): number {
  const iso = datetime.includes(' ') ? `${datetime.replace(' ', 'T')}Z` : `${datetime}T00:00:00Z`;
  return Math.floor(new Date(iso).getTime() / 1000);
}

export async function fetchTwelveDataCandles(pair: string, timeframe: string): Promise<Candle[]> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      `Este par necesita una API key de Twelve Data (gratis en twelvedata.com) — configura TWELVEDATA_API_KEY en server/.env`
    );
  }
  const interval = INTERVAL_MAP[timeframe] ?? '1h';
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
    pair
  )}&interval=${interval}&outputsize=5000&timezone=UTC&apikey=${apiKey}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const data = (await response.json()) as {
    status?: string;
    message?: string;
    values?: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }>;
  };
  if (data.status === 'error') {
    throw new Error(`Twelve Data: ${data.message ?? 'error desconocido'}`);
  }
  const values = data.values ?? [];
  return values
    .map((v) => ({
      time: parseTwelveDataTime(v.datetime),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume ?? 0),
    }))
    .reverse();
}

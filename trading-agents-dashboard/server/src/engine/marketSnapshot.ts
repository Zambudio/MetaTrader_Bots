import { getCandles } from '../marketData/index.js';
import type { Candle } from '../marketData/types.js';
import { computeSMA, computeRSI, computeMACD, computeBollingerBands, computeATR } from './indicators.js';

const RECENT_CANDLES_FOR_RANGE = 50;

/** Se inyecta en el prompt cuando no hay snapshot: los agentes deben saber que NO lo recibieron. */
const SNAPSHOT_UNAVAILABLE =
  'Snapshot de mercado: NO DISPONIBLE (no se pudieron descargar velas para este par/timeframe) — indícalo explícitamente en tu análisis y no inventes valores.';

function lastValue(points: { value: number }[]): number | undefined {
  return points.length > 0 ? points[points.length - 1].value : undefined;
}

function fmt(n: number | undefined, decimals = 5): string {
  return n === undefined ? 'n/d' : n.toFixed(decimals);
}

function formatSnapshot(pair: string, timeframe: string, candles: Candle[]): string {
  const last = candles[candles.length - 1];
  const sma20 = lastValue(computeSMA(candles, 20));
  const sma50 = lastValue(computeSMA(candles, 50));
  const sma200 = lastValue(computeSMA(candles, 200));
  const rsi14 = lastValue(computeRSI(candles, 14));
  const macd = computeMACD(candles);
  const bb = computeBollingerBands(candles, 20, 2);
  const atr14 = lastValue(computeATR(candles, 14));
  const recent = candles.slice(-RECENT_CANDLES_FOR_RANGE);
  const high = Math.max(...recent.map((c) => c.high));
  const low = Math.min(...recent.map((c) => c.low));

  return [
    `Snapshot de mercado — ${pair}, ${timeframe} (vela más reciente: ${new Date(last.time * 1000).toISOString()})`,
    `Precio actual (cierre): ${fmt(last.close)}`,
    `SMA20: ${fmt(sma20)} | SMA50: ${fmt(sma50)} | SMA200: ${fmt(sma200)}`,
    `RSI14: ${fmt(rsi14, 1)}`,
    `MACD: ${fmt(lastValue(macd.macd))} (señal ${fmt(lastValue(macd.signal))}, histograma ${fmt(lastValue(macd.histogram))})`,
    `Bollinger(20,2): superior ${fmt(lastValue(bb.upper))} | media ${fmt(lastValue(bb.middle))} | inferior ${fmt(lastValue(bb.lower))}`,
    `ATR14: ${fmt(atr14)}`,
    `Máximo/mínimo de las últimas ${recent.length} velas: ${fmt(high)} / ${fmt(low)}`,
  ].join('\n');
}

export async function buildMarketSnapshotBlock(pair: string, timeframe: string): Promise<string> {
  try {
    const candles = await getCandles(pair, timeframe);
    if (candles.length === 0) return SNAPSHOT_UNAVAILABLE;
    return formatSnapshot(pair, timeframe, candles);
  } catch (err) {
    console.warn(
      `[marketSnapshot] no se pudo calcular el snapshot de ${pair} ${timeframe}:`,
      err instanceof Error ? err.message : err
    );
    return SNAPSHOT_UNAVAILABLE;
  }
}

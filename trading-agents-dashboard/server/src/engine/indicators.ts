import { SMA, RSI, MACD, BollingerBands, ATR } from 'technicalindicators';
import type { Candle } from '../marketData/types.js';

export interface LinePoint {
  time: number;
  value: number;
}

function alignToTail(candles: Candle[], values: number[]): LinePoint[] {
  const offset = candles.length - values.length;
  return values.map((value, i) => ({ time: candles[i + offset].time, value }));
}

export function computeSMA(candles: Candle[], period: number): LinePoint[] {
  const values = SMA.calculate({ period, values: candles.map((c) => c.close) });
  return alignToTail(candles, values);
}

export function computeRSI(candles: Candle[], period = 14): LinePoint[] {
  const values = RSI.calculate({ period, values: candles.map((c) => c.close) });
  return alignToTail(candles, values);
}

export function computeATR(candles: Candle[], period = 14): LinePoint[] {
  const values = ATR.calculate({
    period,
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
  });
  return alignToTail(candles, values);
}

export function computeBollingerBands(candles: Candle[], period = 20, stdDev = 2) {
  const raw = BollingerBands.calculate({ period, stdDev, values: candles.map((c) => c.close) });
  const offset = candles.length - raw.length;
  return {
    upper: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.upper })),
    middle: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.middle })),
    lower: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.lower })),
  };
}

export function computeMACD(candles: Candle[]) {
  const raw = MACD.calculate({
    values: candles.map((c) => c.close),
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const offset = candles.length - raw.length;
  return {
    macd: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.MACD ?? 0 })),
    signal: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.signal ?? 0 })),
    histogram: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.histogram ?? 0 })),
  };
}

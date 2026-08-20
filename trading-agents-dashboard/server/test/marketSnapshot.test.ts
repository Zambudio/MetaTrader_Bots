import { describe, it, expect } from 'vitest';
import { computeSnapshotFromCandles, getInstrumentPipMultiplier } from '../src/engine/marketSnapshot.js';
import type { Candle } from '../src/marketData/types.js';

describe('3.4 Tests automatizados: Market Snapshot, Indicadores y Frescura', () => {
  function generateSyntheticCandles(count: number, basePrice = 1.0850, step = 0.0005, startTimeSec = 1700000000): Candle[] {
    const candles: Candle[] = [];
    for (let i = 0; i < count; i++) {
      const price = basePrice + Math.sin(i / 5) * step * 10;
      candles.push({
        time: startTimeSec + i * 3600,
        open: price,
        high: price + 0.0010,
        low: price - 0.0010,
        close: price + 0.0002,
        volume: 1000 + i * 10,
      });
    }
    return candles;
  }

  it('Calcula indicadores técnicos correctamente con 50 velas', () => {
    const candles = generateSyntheticCandles(60);
    const snap = computeSnapshotFromCandles(candles, 'EURUSD', 'H1', (candles[candles.length - 1].time + 100) * 1000);
    expect(snap).not.toBeNull();
    expect(snap?.movingAverages.sma20).toBeDefined();
    expect(snap?.movingAverages.ema20).toBeDefined();
    expect(snap?.rsi14?.value).toBeGreaterThan(0);
    expect(snap?.macd).toBeDefined();
    expect(snap?.bollinger).toBeDefined();
    expect(snap?.atr14?.value).toBeGreaterThan(0);
    expect(snap?.isStale).toBe(false);
  });

  it('Detecta snapshot con retraso/obsoleto (3.1)', () => {
    const candles = generateSyntheticCandles(60, 1.0850, 0.0005, 1600000000);
    const nowMs = 1700000000 * 1000; // Mucho tiempo después
    const snap = computeSnapshotFromCandles(candles, 'EURUSD', 'H1', nowMs);
    expect(snap?.isStale).toBe(true);
    expect(snap?.staleDetails).toMatch(/retraso/i);
  });

  it('Determina el multiplicador de pip según el tipo de instrumento (3.2)', () => {
    expect(getInstrumentPipMultiplier('EURUSD')).toBe(10000);
    expect(getInstrumentPipMultiplier('USDJPY')).toBe(100);
    expect(getInstrumentPipMultiplier('XAUUSD')).toBe(10);
    expect(getInstrumentPipMultiplier('BTCUSD')).toBe(1);
    expect(getInstrumentPipMultiplier('US30')).toBe(1);
    expect(getInstrumentPipMultiplier('WTI_OIL')).toBe(100);
  });
});

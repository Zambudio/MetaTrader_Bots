import { describe, it, expect } from 'vitest';
import {
  filterCandlesByEndDate,
  parseEndDateToEpochSec,
} from '../src/marketData/index.js';
import { computeSnapshotFromCandles } from '../src/engine/marketSnapshot.js';
import type { Candle } from '../src/marketData/types.js';

/**
 * FASE 1 — soporte mínimo reproducible para reconstruir la foto de mercado en periodos
 * históricos (tendencia clara, lateral, alta volatilidad) sin inventar velas.
 */
describe('Ventana histórica reproducible (getCandles endDate + snapshot as_of)', () => {
  function series(count: number, startSec: number): Candle[] {
    const out: Candle[] = [];
    for (let i = 0; i < count; i++) {
      const price = 1.08 + i * 0.0003;
      out.push({ time: startSec + i * 3600, open: price, high: price + 0.001, low: price - 0.001, close: price + 0.0002, volume: 1000 + i });
    }
    return out;
  }

  it('parseEndDateToEpochSec acepta YYYY-MM-DD, "YYYY-MM-DD HH:MM:SS" e ISO con Z', () => {
    expect(parseEndDateToEpochSec('2026-05-15')).toBe(Date.parse('2026-05-15T00:00:00Z') / 1000);
    expect(parseEndDateToEpochSec('2026-05-15 13:30:00')).toBe(Date.parse('2026-05-15T13:30:00Z') / 1000);
    expect(parseEndDateToEpochSec('2026-05-15T13:30:00Z')).toBe(Date.parse('2026-05-15T13:30:00Z') / 1000);
    expect(parseEndDateToEpochSec('no-es-fecha')).toBeNull();
    expect(parseEndDateToEpochSec('')).toBeNull();
  });

  it('filterCandlesByEndDate deja solo velas hasta el corte (inclusive) y no inventa nada', () => {
    const startSec = Date.parse('2026-01-01T00:00:00Z') / 1000;
    const candles = series(240, startSec); // 10 días de H1
    const cutoff = '2026-01-04 00:00:00';
    const filtered = filterCandlesByEndDate(candles, cutoff);
    const cutoffSec = parseEndDateToEpochSec(cutoff)!;
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(candles.length);
    expect(filtered.every((c) => c.time <= cutoffSec)).toBe(true);
    // no se añaden velas que no existían
    expect(filtered.every((c) => candles.includes(c))).toBe(true);
  });

  it('filterCandlesByEndDate con corte inválido devuelve la serie intacta', () => {
    const candles = series(30, 1_800_000_000);
    expect(filterCandlesByEndDate(candles, 'basura')).toBe(candles);
  });

  it('el snapshot "as of" la última vela histórica NO se marca obsoleto', () => {
    const startSec = Date.parse('2026-03-01T00:00:00Z') / 1000;
    const candles = series(120, startSec);
    const lastMs = candles[candles.length - 1].time * 1000;
    const snap = computeSnapshotFromCandles(candles, 'EUR/USD', 'H1', lastMs + 60_000);
    expect(snap?.isStale).toBe(false);
  });

  it('el mismo snapshot evaluado "ahora" (meses después) SÍ se marca obsoleto', () => {
    const startSec = Date.parse('2026-03-01T00:00:00Z') / 1000;
    const candles = series(120, startSec);
    const muchLater = Date.parse('2026-08-30T00:00:00Z');
    const snap = computeSnapshotFromCandles(candles, 'EUR/USD', 'H1', muchLater);
    expect(snap?.isStale).toBe(true);
    expect(snap?.staleDetails).toMatch(/retraso/i);
  });
});

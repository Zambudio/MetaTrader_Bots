import { afterEach, describe, expect, it } from 'vitest';
import { resolveMaxBacktestOptimizationCycles } from '../src/engine/mql5Generator.js';

describe('politica de optimizacion del pipeline MQL5', () => {
  afterEach(() => {
    delete process.env.MQL5_DISABLE_OPTIMIZATION;
  });

  it('permite desactivar toda optimizacion conservando un unico smoke backtest', () => {
    process.env.MQL5_DISABLE_OPTIMIZATION = '1';
    expect(resolveMaxBacktestOptimizationCycles()).toBe(1);
  });

  it('mantiene el comportamiento historico fuera del modo de validacion', () => {
    delete process.env.MQL5_DISABLE_OPTIMIZATION;
    expect(resolveMaxBacktestOptimizationCycles()).toBe(3);
  });
});

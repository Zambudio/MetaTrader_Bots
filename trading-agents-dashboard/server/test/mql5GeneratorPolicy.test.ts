import { afterEach, describe, expect, it } from 'vitest';
import {
  MQL5_STANDARD_SYSTEM_PROMPT,
  resolveMaxBacktestOptimizationCycles,
} from '../src/engine/mql5Generator.js';

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

  it('exige tester-only y reconoce el retcode parcial oficial en el prompt', () => {
    expect(MQL5_STANDARD_SYSTEM_PROMPT).toContain('MQLInfoInteger(MQL_TESTER)');
    expect(MQL5_STANDARD_SYSTEM_PROMPT).toContain('TRADE_RETCODE_DONE_PARTIAL (10010)');
    expect(MQL5_STANDARD_SYSTEM_PROMPT).not.toMatch(/Identificadores prohibidos[^\n]*TRADE_RETCODE_DONE_PARTIAL/);
    expect(MQL5_STANDARD_SYSTEM_PROMPT).toContain('nunca demo ni live');
  });
});

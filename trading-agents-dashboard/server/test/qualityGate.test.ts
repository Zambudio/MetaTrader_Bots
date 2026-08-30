import { describe, it, expect } from 'vitest';
import { evaluateQualityGate } from '../src/engine/qualityGate.js';
import type { Mt5LogStats } from '../src/engine/mt5LogParser.js';

describe('3.4 Tests automatizados: Quality Gate Cuantitativo (Doc 20 §4)', () => {
  it('Pasa el gate cuando todas las métricas superan los umbrales exigidos', () => {
    const stats: Mt5LogStats = {
      totalDeals: 40,
      closedTrades: 20, // >= 15
      wins: 14,
      losses: 6,
      winRatePct: 70.0,
      avgRR: 1.5,
      netProfit: 450.0, // > 0
      netProfitPct: 4.5,
      grossProfitApprox: 700.0,
      grossLossApprox: 250.0,
      profitFactorApprox: 2.8, // >= 1.20
      expectancyR: 0.75, // > 0.10 R
      maxDrawdownPct: 6.5, // <= 15%
      maxDrawdownUSD: 650.0,
      rejectedOrdersCount: 0, // == 0
      isApproximationUSD: false,
      periodStart: '2026.01.01',
      periodEnd: '2026.08.01',
      flags: [],
    };

    const verdict = evaluateQualityGate(stats);
    expect(verdict.passed).toBe(true);
    expect(verdict.score).toBe(100);
    expect(verdict.failedReasons.length).toBe(0);
    expect(verdict.recommendedAction).toBe('approve');
  });

  it('Falla el gate si el drawdown excede el 15%', () => {
    const stats: Mt5LogStats = {
      totalDeals: 40,
      closedTrades: 20,
      wins: 12,
      losses: 8,
      winRatePct: 60.0,
      avgRR: 1.5,
      netProfit: 100.0,
      netProfitPct: 1.0,
      grossProfitApprox: 600.0,
      grossLossApprox: 500.0,
      profitFactorApprox: 1.2,
      expectancyR: 0.25,
      maxDrawdownPct: 22.0, // FALLA: > 15.0%
      maxDrawdownUSD: 2200.0,
      rejectedOrdersCount: 0,
      isApproximationUSD: false,
      periodStart: '2026.01.01',
      periodEnd: '2026.08.01',
      flags: [],
    };

    const verdict = evaluateQualityGate(stats);
    expect(verdict.passed).toBe(false);
    expect(verdict.failedReasons.some((r) => r.includes('Drawdown excesivo'))).toBe(true);
    expect(verdict.recommendedAction).toBe('add_adx_filter');
  });

  it('Falla el gate si hay órdenes rechazadas por el broker', () => {
    const stats: Mt5LogStats = {
      totalDeals: 30,
      closedTrades: 15,
      wins: 10,
      losses: 5,
      winRatePct: 66.6,
      avgRR: 1.5,
      netProfit: 250.0,
      netProfitPct: 2.5,
      grossProfitApprox: 500.0,
      grossLossApprox: 250.0,
      profitFactorApprox: 2.0,
      expectancyR: 0.5,
      maxDrawdownPct: 5.0,
      maxDrawdownUSD: 500.0,
      rejectedOrdersCount: 2, // FALLA: > 0
      isApproximationUSD: false,
      periodStart: '2026.01.01',
      periodEnd: '2026.08.01',
      flags: [],
    };

    const verdict = evaluateQualityGate(stats);
    expect(verdict.passed).toBe(false);
    expect(verdict.failedReasons.some((r) => r.includes('órdenes rechazadas'))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { validateMql5SourceRun } from '../src/engine/mql5Eligibility.js';
import type { Run, StrategyProposalLite } from '../src/types.js';

const strategy: StrategyProposalLite = {
  pair: 'EUR/USD', timeframe: 'H1', resumen: 'fixture', indicadoresClave: ['ATR'],
  condicionEntrada: 'Cierre cruza EMA20', puntoEntrada: '1.1', stopLoss: '1.0985',
  takeProfit: '1.10255', direction: 'buy', entryPriceNum: 1.1, stopLossNum: 1.0985,
  takeProfitNum: 1.10255, riskPercent: 0.5,
};

function approvedRun(): Run {
  return {
    id: 'run', pair: 'EUR/USD', timeframe: 'H1', status: 'done', createdAt: '2026-08-30T00:00:00Z',
    finalState: 'validated', results: [
      { agentId: 'strategy', status: 'done', strategy: structuredClone(strategy) },
      { agentId: 'judge', status: 'done', verdict: { veredicto: 'go', razon: 'ok', unresolvedBlockers: [] } },
    ],
  };
}

describe('gate entre agentes y MQL5', () => {
  it('acepta únicamente la estrategia exacta aprobada', () => {
    expect(validateMql5SourceRun(approvedRun(), structuredClone(strategy))).toBeNull();
    expect(validateMql5SourceRun(approvedRun(), { ...strategy, riskPercent: 0.75 })).toMatch(/no coincide/i);
  });

  it('bloquea runs rechazados y blockers pendientes', () => {
    const rejected = approvedRun();
    rejected.finalState = 'rejected';
    expect(validateMql5SourceRun(rejected, strategy)).toMatch(/validado/i);
    const blocked = approvedRun();
    blocked.results[1].verdict!.unresolvedBlockers = ['DATA_NOT_AVAILABLE'];
    expect(validateMql5SourceRun(blocked, strategy)).toMatch(/objeciones/i);
  });
});

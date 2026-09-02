import { describe, expect, it } from 'vitest';
import {
  validateForexAuditQuorum,
  validateMql5SourceRun,
  validateRealForexMql5SourceRun,
} from '../src/engine/mql5Eligibility.js';
import { cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { hashConfiguration } from '../src/config/configValidation.js';
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

  it('exige una fuente FOREX real con config, hash y roster exactos', () => {
    const preset = cloneBaselinePresets().find((item) => item.id === 'baseline-forex-forex-v1-1')!;
    const hash = hashConfiguration(preset);
    const run: Run = {
      ...approvedRun(),
      executionMode: 'real',
      configuration: structuredClone(preset),
      configurationHash: hash,
      expectedAgentIds: preset.agents.map((agent) => agent.id),
      results: preset.agents.map((agent) => ({
        agentId: agent.id,
        status: agent.id === 'fx-macro' ? 'skipped' : 'done',
        omissionReason: agent.id === 'fx-macro' ? 'DATA_NOT_AVAILABLE: verified_macro_calendar, verified_news' : undefined,
        strategy: agent.id === 'fx-strategy' ? structuredClone(strategy) : undefined,
        verdict: agent.id === 'fx-judge' ? { veredicto: 'go', razon: 'ok', unresolvedBlockers: [] } : undefined,
      })),
    };
    const expected = { configurationId: preset.id, configurationHash: hash };
    expect(validateRealForexMql5SourceRun(run, strategy, expected)).toBeNull();
    expect(validateRealForexMql5SourceRun({ ...run, executionMode: 'simulation' }, strategy, expected)).toMatch(/real/i);
    expect(validateRealForexMql5SourceRun({ ...run, configurationHash: 'bad' }, strategy, expected)).toMatch(/hash/i);
    const errored = structuredClone(run);
    errored.results[0].status = 'error';
    expect(validateRealForexMql5SourceRun(errored, strategy, expected)).toMatch(/agentes/i);
  });

  it('exige R2 limpio, tres runs limpios y dos últimos consecutivos', () => {
    const key = { configurationId: 'baseline-forex-forex-v1-1', configurationHash: 'hash' };
    const clean = (run_id: string, scenario: string) => ({ run_id, scenario, ...key, ok: true });
    expect(validateForexAuditQuorum([
      clean('r2', 'r2-trend'), clean('r3', 'r3-range'), clean('r4', 'r4-highvol'),
    ], key)).toBeNull();
    expect(validateForexAuditQuorum([
      clean('r3', 'r3-range'), clean('r4', 'r4-highvol'), clean('r1', 'r1-current'),
    ], key)).toMatch(/R2/i);
    expect(validateForexAuditQuorum([
      clean('r2', 'r2-trend'), clean('r3', 'r3-range'), { ...clean('bad', 'r4-highvol'), ok: false },
    ], key)).toMatch(/consecutivas/i);
  });
});

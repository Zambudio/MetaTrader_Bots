import { describe, expect, it } from 'vitest';
import { cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { summarizeValidationRuns, validateRunIsolation } from '../src/validation/metrics.js';
import type { Run } from '../src/types.js';

function run(status: Run['status'], durationMs: number): Run {
  const config = cloneBaselinePresets()[0];
  return {
    id: `run-${status}-${durationMs}`, pair: config.referenceAsset, timeframe: 'H1', status,
    createdAt: '2026-08-30T00:00:00.000Z', durationMs, configuration: config,
    configurationHash: 'pinned', results: config.agents.map((agent) => ({ agentId: agent.id, status: status === 'done' ? 'done' : 'error' })),
    issues: status === 'done' ? [{ code: 'DATA_ERROR', severity: 'warning', message: 'stale' }] : [{ code: 'MODEL_ERROR', severity: 'error', message: 'failed' }],
  };
}

describe('métricas acumuladas del validation loop', () => {
  it('calcula éxito, warnings, errores y duración media', () => {
    const config = cloneBaselinePresets()[0];
    const metrics = summarizeValidationRuns(config, [run('done', 10), run('done', 20), run('error', 30)]);
    expect(metrics).toMatchObject({ total_runs: 3, successful_runs: 2, failed_runs: 1, runs_with_warning: 2, success_rate: 66.67, average_execution_time: 20 });
    expect(metrics.agent_errors).toBe(config.agents.length);
  });

  it('detecta agentes cruzados y ausentes', () => {
    const config = cloneBaselinePresets()[0];
    const candidate = run('done', 10);
    candidate.results.pop();
    candidate.results.push({ agentId: 'crypto-intruso', status: 'done' });
    expect(validateRunIsolation(candidate, config)).toEqual(expect.arrayContaining([
      'UNEXPECTED_AGENT:crypto-intruso', `MISSING_AGENT:${config.agents.at(-1)!.id}`,
    ]));
  });
});

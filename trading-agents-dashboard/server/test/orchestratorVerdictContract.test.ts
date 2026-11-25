import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Agent, Run } from '../src/types.js';

const runAgentMock = vi.fn();

vi.mock('../src/engine/executor.js', () => ({
  runAgent: (...args: unknown[]) => runAgentMock(...args),
}));
vi.mock('../src/store/runsStore.js', () => ({
  saveRun: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/engine/marketSnapshot.js', () => ({
  buildMarketSnapshot: vi.fn().mockResolvedValue('snapshot de prueba'),
}));

// Import DESPUÉS de los mocks.
const { executeRun } = await import('../src/engine/orchestrator.js');
const { validateMql5SourceRun } = await import('../src/engine/mql5Eligibility.js');

function judgeOnlyAgent(): Agent[] {
  return [{ id: 'judge', name: 'Juez', role: '', systemPrompt: '', dependsOn: [], outputType: 'verdict' }];
}

function makeRun(agents: Agent[]): Run {
  return {
    id: 'test-run',
    pair: 'EUR/USD',
    timeframe: 'H1',
    status: 'running',
    createdAt: new Date().toISOString(),
    results: agents.map((a) => ({ agentId: a.id, status: 'waiting' as const })),
  };
}

describe('executeRun — contrato veredicto GO + unresolvedBlockers (regresión b8ff5b6)', () => {
  beforeEach(() => {
    runAgentMock.mockReset();
  });

  it('un veredicto GO con blockers sin resolver NO debe marcar el run como validado', async () => {
    runAgentMock.mockResolvedValue({
      output: 'go con blockers',
      verdict: {
        veredicto: 'go',
        razon: 'contrato violado a propósito para el test',
        unresolvedBlockers: ['spread ausente'],
      },
    });

    const agents = judgeOnlyAgent();
    const run = makeRun(agents);
    await executeRun(run, agents);

    // El run NUNCA debe quedar en un estado que el gate de MQL5 interprete como habilitado.
    expect(run.finalState).not.toBe('validated');
    expect(run.status).toBe('error');
    expect(run.issues?.some((i) => i.code === 'CONTRACT_ERROR')).toBe(true);

    // El gate determinista de generación MQL5 debe coincidir con el estado del run: si el run
    // no está validado, el gate debe bloquear igualmente (nunca estados contradictorios).
    const strategy = run.results.find((r) => r.strategy)?.strategy;
    const rejection = validateMql5SourceRun(run, strategy as any);
    expect(rejection).not.toBeNull();
  });

  it('un veredicto GO sin blockers sí valida el run y habilita el gate de MQL5', async () => {
    const strategy = {
      pair: 'EUR/USD',
      timeframe: 'H1',
      resumen: 'Estrategia de prueba',
      indicadoresClave: ['EMA20'],
      condicionEntrada: 'Cierre cruza por encima de EMA20',
      puntoEntrada: '1.1000',
      stopLoss: '1.0950',
      takeProfit: '1.1090',
      direction: 'buy',
      entryPriceNum: 1.1,
      stopLossNum: 1.095,
      takeProfitNum: 1.109,
    } as any;
    runAgentMock.mockResolvedValue({
      output: 'go limpio',
      strategy,
      verdict: {
        veredicto: 'go',
        razon: 'sin objeciones',
        unresolvedBlockers: [],
      },
    });

    const agents = judgeOnlyAgent();
    const run = makeRun(agents);
    await executeRun(run, agents);

    expect(run.finalState).toBe('validated');
    expect(run.status).toBe('done');

    const rejection = validateMql5SourceRun(run, strategy);
    expect(rejection).toBeNull();
  });
});

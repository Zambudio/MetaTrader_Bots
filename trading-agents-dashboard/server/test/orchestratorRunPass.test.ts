import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Agent, Run } from '../src/types.js';

const runAgentMock = vi.fn();

vi.mock('../src/engine/executor.js', () => ({
  runAgent: (...args: unknown[]) => runAgentMock(...args),
}));
vi.mock('../src/store/runsStore.js', () => ({
  saveRun: vi.fn().mockResolvedValue(undefined),
}));

// Import DESPUÉS de los mocks.
const { runPass } = await import('../src/engine/orchestrator.js');

function diamondAgents(): Agent[] {
  // a1, a2 (nivel 0, independientes) -> a3 (nivel 1) -> a4 (nivel 2)
  return [
    { id: 'a1', name: 'A1', role: '', systemPrompt: '', dependsOn: [], outputType: 'text' },
    { id: 'a2', name: 'A2', role: '', systemPrompt: '', dependsOn: [], outputType: 'text' },
    { id: 'a3', name: 'A3', role: '', systemPrompt: '', dependsOn: ['a1', 'a2'], outputType: 'text' },
    { id: 'a4', name: 'A4', role: '', systemPrompt: '', dependsOn: ['a3'], outputType: 'verdict' },
  ];
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

const AGENT_MS = 60;

function timingMock(timeline: Record<string, { start: number; end: number }>, failIds: string[] = []) {
  return async (agent: Agent) => {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, AGENT_MS));
    const end = Date.now();
    timeline[agent.id] = { start, end };
    if (failIds.includes(agent.id)) throw new Error(`fallo simulado en ${agent.id}`);
    return { output: `ok-${agent.id}` };
  };
}

describe('runPass — ejecución paralela por nivel', () => {
  beforeEach(() => {
    runAgentMock.mockReset();
    delete process.env.AGENT_MAX_CONCURRENCY;
  });
  afterEach(() => {
    delete process.env.AGENT_MAX_CONCURRENCY;
  });

  it('ejecuta los agentes de un mismo nivel en paralelo y respeta las dependencias', async () => {
    const timeline: Record<string, { start: number; end: number }> = {};
    runAgentMock.mockImplementation(timingMock(timeline));

    const agents = diamondAgents();
    const run = makeRun(agents);
    const ok = await runPass(run, agents, null);

    expect(ok).toBe(true);
    expect(run.results.map((r) => r.status)).toEqual(['done', 'done', 'done', 'done']);
    expect(run.results.map((r) => r.output)).toEqual(['ok-a1', 'ok-a2', 'ok-a3', 'ok-a4']);

    // a1 y a2 (nivel 0) arrancan casi a la vez y se solapan en el tiempo.
    expect(Math.abs(timeline.a1.start - timeline.a2.start)).toBeLessThan(30);
    expect(timeline.a1.start).toBeLessThan(timeline.a2.end);
    expect(timeline.a2.start).toBeLessThan(timeline.a1.end);

    // a3 (nivel 1) no arranca hasta que a1 Y a2 han terminado.
    expect(timeline.a3.start).toBeGreaterThanOrEqual(Math.max(timeline.a1.end, timeline.a2.end) - 15);
    // a4 (nivel 2) no arranca hasta que a3 termina.
    expect(timeline.a4.start).toBeGreaterThanOrEqual(timeline.a3.end - 15);

    // El run completo tarda ~3 tramos (nivel0 ∥, nivel1, nivel2), no ~4 en serie.
    const total = timeline.a4.end - timeline.a1.start;
    expect(total).toBeLessThan(AGENT_MS * 4);
  });

  it('AGENT_MAX_CONCURRENCY=1 fuerza ejecución en serie dentro del nivel', async () => {
    process.env.AGENT_MAX_CONCURRENCY = '1';
    const timeline: Record<string, { start: number; end: number }> = {};
    runAgentMock.mockImplementation(timingMock(timeline));

    const agents: Agent[] = [
      { id: 'b1', name: 'B1', role: '', systemPrompt: '', dependsOn: [], outputType: 'text' },
      { id: 'b2', name: 'B2', role: '', systemPrompt: '', dependsOn: [], outputType: 'text' },
      { id: 'b3', name: 'B3', role: '', systemPrompt: '', dependsOn: [], outputType: 'text' },
    ];
    const run = makeRun(agents);
    await runPass(run, agents, null);

    // Sin solape: cada uno arranca cuando el anterior ha terminado.
    expect(timeline.b2.start).toBeGreaterThanOrEqual(timeline.b1.end - 15);
    expect(timeline.b3.start).toBeGreaterThanOrEqual(timeline.b2.end - 15);
  });

  it('si un agente de un nivel falla, los hermanos terminan pero no arrancan los niveles dependientes', async () => {
    const timeline: Record<string, { start: number; end: number }> = {};
    runAgentMock.mockImplementation(timingMock(timeline, ['a1']));

    const agents = diamondAgents();
    const run = makeRun(agents);
    const ok = await runPass(run, agents, null);

    expect(ok).toBe(false);
    expect(run.status).toBe('error');
    const byId = new Map(run.results.map((r) => [r.agentId, r]));
    expect(byId.get('a1')!.status).toBe('error');
    expect(byId.get('a2')!.status).toBe('done'); // el hermano sí completó
    expect(byId.get('a3')!.status).toBe('waiting'); // nunca arrancó
    expect(byId.get('a4')!.status).toBe('waiting');
    expect(timeline.a3).toBeUndefined();
  });
});

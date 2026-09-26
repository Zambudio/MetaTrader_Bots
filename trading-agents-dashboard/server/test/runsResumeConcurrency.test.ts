import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Run } from '../src/types.js';
import { releaseRunLock } from '../src/engine/runLockRegistry.js';

const loadRunMock = vi.fn();
const saveRunMock = vi.fn().mockResolvedValue(undefined);
const resumeRunMock = vi.fn();

vi.mock('../src/store/runsStore.js', () => ({
  loadRun: (...args: unknown[]) => loadRunMock(...args),
  saveRun: (...args: unknown[]) => saveRunMock(...args),
  listRuns: vi.fn(),
  deleteRun: vi.fn(),
}));
vi.mock('../src/engine/runAbortRegistry.js', () => ({ abortRun: vi.fn() }));
vi.mock('../src/store/agentConfigsStore.js', () => ({
  getActivePreset: vi.fn(),
  getPreset: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/store/agentsStore.js', () => ({ listAgents: vi.fn().mockResolvedValue([]) }));
vi.mock('../src/engine/orchestrator.js', () => ({
  executeRun: vi.fn(),
  DEFAULT_MAX_RETRIES: 2,
  resumeRun: (...args: unknown[]) => resumeRunMock(...args),
}));
vi.mock('../src/config/configValidation.js', () => ({
  hashConfiguration: () => 'HASH',
  validatePreset: () => ({ valid: true, errors: [] }),
}));

const { runsRouter } = await import('../src/routes/runs.js');

function findResumeHandler() {
  // Express expone las rutas registradas en `router.stack`; localizamos POST /:id/resume y nos
  // quedamos con el último handler de su pila (el que envuelve `asyncHandler`).
  const layer = (runsRouter as any).stack.find(
    (l: any) => l.route?.path === '/:id/resume' && l.route?.methods?.post
  );
  if (!layer) throw new Error('no se encontró la ruta POST /:id/resume en runsRouter');
  const handlers = layer.route.stack.map((s: any) => s.handle);
  return handlers[handlers.length - 1];
}

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    pair: 'EUR/USD',
    timeframe: 'H1',
    status: 'error',
    createdAt: new Date().toISOString(),
    results: [{ agentId: 'a1', status: 'error' }],
    configuration: { id: 'preset-1', agents: [] } as any,
    configurationHash: 'HASH',
    ...overrides,
  };
}

function mockRes() {
  let resolveDone!: () => void;
  const res: any = {
    statusCode: undefined,
    body: undefined,
    // `asyncHandler` no devuelve la promesa de su función interna (`fn(req,res,next).catch(next)`
    // no tiene `return`), así que el test no puede esperar a `handler(...)` directamente — espera
    // a esta promesa, que se resuelve cuando el handler llama a `res.json` (paso final de TODAS
    // las ramas de la ruta, éxito o error).
    done: new Promise<void>((resolve) => { resolveDone = resolve; }),
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    resolveDone();
    return res;
  };
  return res;
}

/** Espera a que un mockRes() reciba su respuesta, con timeout para no colgar el test si algo no llama a res.json. */
function waitFor(res: ReturnType<typeof mockRes>, ms = 2000): Promise<void> {
  return Promise.race([
    res.done,
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout esperando respuesta HTTP mockeada')), ms)),
  ]);
}

describe('POST /:id/resume — idempotencia ante peticiones concurrentes (H2)', () => {
  beforeEach(() => {
    loadRunMock.mockReset();
    saveRunMock.mockClear();
    resumeRunMock.mockReset();
    releaseRunLock('run-1');
    releaseRunLock('run-missing');
  });

  it('dos peticiones "a la vez" para el mismo run: solo una llama a resumeRun, la otra recibe 409', async () => {
    const run = makeRun();
    loadRunMock.mockImplementation(async () => structuredClone(run));

    // resumeRun no se resuelve hasta que el test lo decida — simula una ejecución en curso.
    let resolveResume!: () => void;
    resumeRunMock.mockImplementation(() => new Promise<void>((resolve) => { resolveResume = resolve; }));

    const handler = findResumeHandler();
    const req = { params: { id: 'run-1' }, body: {} };
    const res1 = mockRes();
    const res2 = mockRes();

    // Lanzadas "a la vez" (sin esperar la primera antes de disparar la segunda), como dos clics.
    handler(req, res1, (err?: unknown) => { if (err) throw err; });
    handler(req, res2, (err?: unknown) => { if (err) throw err; });
    await Promise.all([waitFor(res1), waitFor(res2)]);

    const statuses = [res1.statusCode, res2.statusCode].sort();
    expect(statuses).toEqual([202, 409]);
    expect(resumeRunMock).toHaveBeenCalledTimes(1);

    resolveResume();
    await new Promise((r) => setTimeout(r, 0)); // deja correr el .finally() que libera el lock
  });

  it('tras liberar el lock (resumeRun terminado), una nueva petición SÍ puede reanudar', async () => {
    const run = makeRun();
    loadRunMock.mockImplementation(async () => structuredClone(run));
    resumeRunMock.mockResolvedValue(undefined);

    const handler = findResumeHandler();
    const req = { params: { id: 'run-1' }, body: {} };

    const res1 = mockRes();
    handler(req, res1, (err?: unknown) => { if (err) throw err; });
    await waitFor(res1);
    expect(res1.statusCode).toBe(202);
    await new Promise((r) => setTimeout(r, 0)); // deja correr el .finally() que libera el lock

    const res2 = mockRes();
    handler(req, res2, (err?: unknown) => { if (err) throw err; });
    await waitFor(res2);
    expect(res2.statusCode).toBe(202);
    expect(resumeRunMock).toHaveBeenCalledTimes(2);
  });

  it('un run con status="running" ya persistido se rechaza con 409 aunque el lock esté libre', async () => {
    loadRunMock.mockImplementation(async () => makeRun({ status: 'running' }));

    const handler = findResumeHandler();
    const req = { params: { id: 'run-1' }, body: {} };
    const res = mockRes();
    handler(req, res, (err?: unknown) => { if (err) throw err; });
    await waitFor(res);

    expect(res.statusCode).toBe(409);
    expect(resumeRunMock).not.toHaveBeenCalled();
  });

  it('libera el lock si el run no existe (404), permitiendo reintentar después', async () => {
    loadRunMock.mockResolvedValueOnce(null);

    const handler = findResumeHandler();
    const req = { params: { id: 'run-missing' }, body: {} };
    const res1 = mockRes();
    handler(req, res1, (err?: unknown) => { if (err) throw err; });
    await waitFor(res1);
    expect(res1.statusCode).toBe(404);

    loadRunMock.mockImplementation(async () => makeRun({ id: 'run-missing' }));
    resumeRunMock.mockResolvedValue(undefined);
    const res2 = mockRes();
    handler(req, res2, (err?: unknown) => { if (err) throw err; });
    await waitFor(res2);
    expect(res2.statusCode).toBe(202);
  });
});

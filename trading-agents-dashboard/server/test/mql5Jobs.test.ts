import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reconcileOrphanedMql5Jobs } from '../src/engine/mql5Jobs.js';

// Reconciliación de arranque de los jobs de generación MQL5. El escenario real: el servidor
// se reinicia (redeploy, `update.ps1`, reinicio de PC) mientras un job de 5-25 min está en
// curso; sin esto el frontend sondea para siempre un jobId que ya no existe o recibe un 404.

describe('reconcileOrphanedMql5Jobs', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(tmpdir(), 'mql5-jobs-test-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const writeRecord = (name: string, record: unknown) =>
    fs.writeFile(path.join(dir, name), JSON.stringify(record, null, 2), 'utf-8');

  const readRecord = async (name: string) =>
    JSON.parse(await fs.readFile(path.join(dir, name), 'utf-8'));

  it('convierte un job "running" huérfano (sin run) en "error" accionable', async () => {
    await writeRecord('a.json', {
      job: { id: 'a', status: 'running', progress: { attempt: 1, maxAttempts: 3, phase: 'generating' } },
      updatedAt: new Date().toISOString(),
    });

    const count = await reconcileOrphanedMql5Jobs(dir);

    expect(count).toBe(1);
    const rec = await readRecord('a.json');
    expect(rec.job.status).toBe('error');
    expect(rec.job.message).toMatch(/reinici/i);
  });

  it('cae a "error" si el runId apunta a un run que ya no existe', async () => {
    await writeRecord('b.json', {
      job: { id: 'b', status: 'running', progress: { attempt: 1, maxAttempts: 3, phase: 'backtesting' } },
      runId: 'run-inexistente-xyz',
      updatedAt: new Date().toISOString(),
    });

    const count = await reconcileOrphanedMql5Jobs(dir);

    expect(count).toBe(1);
    expect((await readRecord('b.json')).job.status).toBe('error');
  });

  it('no toca jobs que ya están en estado terminal', async () => {
    const done = {
      job: { id: 'c', status: 'done', result: { code: '//mq5', filename: 'EA.mq5' } },
      updatedAt: new Date().toISOString(),
    };
    await writeRecord('c.json', done);

    const count = await reconcileOrphanedMql5Jobs(dir);

    expect(count).toBe(0);
    expect(await readRecord('c.json')).toEqual(done);
  });

  it('borra ficheros de job caducados (más viejos que el TTL)', async () => {
    await writeRecord('old.json', {
      job: { id: 'old', status: 'running', progress: { attempt: 1, maxAttempts: 3, phase: 'generating' } },
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 h atrás
    });

    await reconcileOrphanedMql5Jobs(dir);

    await expect(fs.access(path.join(dir, 'old.json'))).rejects.toThrow();
  });

  it('borra ficheros corruptos / vacíos', async () => {
    await fs.writeFile(path.join(dir, 'bad.json'), '{ no es json', 'utf-8');

    await reconcileOrphanedMql5Jobs(dir);

    await expect(fs.access(path.join(dir, 'bad.json'))).rejects.toThrow();
  });

  it('devuelve 0 si el directorio no existe', async () => {
    await fs.rm(dir, { recursive: true, force: true });
    expect(await reconcileOrphanedMql5Jobs(dir)).toBe(0);
  });
});

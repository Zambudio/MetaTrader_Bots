import { describe, expect, it } from 'vitest';
import { spawnCli } from '../src/engine/cliClients/shared.js';

// Proceso hijo real (node) que duerme para poder probar el abort/timeout sin depender de que
// `claude`/`codex` estén instalados en la máquina que corre los tests.
const SLEEP_5S = ['-e', 'setTimeout(() => process.exit(0), 5000)'];

describe('spawnCli — soporte de AbortSignal (botón "Detener análisis")', () => {
  it('termina normalmente y con aborted:false cuando no se dispara nada', async () => {
    const result = await spawnCli(process.execPath, ['-e', 'process.stdout.write("ok")'], { timeoutMs: 10_000 });
    expect(result.code).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.aborted).toBe(false);
    expect(result.stdout).toBe('ok');
  });

  it('mata el proceso y marca aborted:true cuando se dispara el signal externo, sin esperar al timeout', async () => {
    const controller = new AbortController();
    const startedAt = Date.now();
    setTimeout(() => controller.abort(), 200);

    const result = await spawnCli(process.execPath, SLEEP_5S, { timeoutMs: 10_000, signal: controller.signal });

    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(4_000); // muy por debajo de los 5s del sleep y los 10s de timeout
  });

  it('respeta un signal ya abortado antes de lanzar el proceso', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await spawnCli(process.execPath, SLEEP_5S, { timeoutMs: 10_000, signal: controller.signal });
    expect(result.aborted).toBe(true);
  });

  it('sigue distinguiendo un timeout real (aborted:false, timedOut:true) de un abort de usuario', async () => {
    const result = await spawnCli(process.execPath, SLEEP_5S, { timeoutMs: 300 });
    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
  });
});

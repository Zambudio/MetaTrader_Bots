import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const spawnCliMock = vi.fn();

vi.mock('../src/engine/cliClients/shared.js', async () => {
  const actual = await vi.importActual<typeof import('../src/engine/cliClients/shared.js')>('../src/engine/cliClients/shared.js');
  return {
    ...actual,
    spawnCli: (...args: unknown[]) => spawnCliMock(...args),
  };
});

const { claudeCliChatCompletion } = await import('../src/engine/cliClients/claudeCli.js');

function envelope(result: string) {
  return JSON.stringify({ result, is_error: false, subtype: 'success' });
}

describe('claudeCliChatCompletion — reintento ante fallo transitorio', () => {
  beforeEach(() => {
    spawnCliMock.mockReset();
    process.env.AGENT_CLI_RETRIES = '2';
  });
  afterEach(() => {
    delete process.env.AGENT_CLI_RETRIES;
  });

  it('reintenta tras una salida vacía transitoria y termina en éxito', async () => {
    spawnCliMock
      .mockResolvedValueOnce({ code: 1, stdout: '', stderr: '', timedOut: false, aborted: false })
      .mockResolvedValueOnce({ code: 0, stdout: envelope('ok'), stderr: '', timedOut: false, aborted: false });

    const result = await claudeCliChatCompletion('sonnet', [{ role: 'user', content: 'hola' }]);
    expect(result.choices[0].message.content).toBe('ok');
    expect(spawnCliMock).toHaveBeenCalledTimes(2);
  });

  it('NO reintenta si el usuario abortó — falla inmediatamente', async () => {
    spawnCliMock.mockResolvedValueOnce({ code: null, stdout: '', stderr: '', timedOut: false, aborted: true });

    await expect(claudeCliChatCompletion('sonnet', [{ role: 'user', content: 'hola' }])).rejects.toThrow(/detenido por el usuario/);
    expect(spawnCliMock).toHaveBeenCalledTimes(1);
  });

  it('NO reintenta un timeout — falla inmediatamente', async () => {
    spawnCliMock.mockResolvedValueOnce({ code: null, stdout: '', stderr: '', timedOut: true, aborted: false });

    await expect(claudeCliChatCompletion('sonnet', [{ role: 'user', content: 'hola' }])).rejects.toThrow(/timeout/);
    expect(spawnCliMock).toHaveBeenCalledTimes(1);
  });

  it('agota los reintentos y lanza el último error si el fallo transitorio persiste', async () => {
    spawnCliMock.mockResolvedValue({ code: 1, stdout: '', stderr: '', timedOut: false, aborted: false });

    await expect(claudeCliChatCompletion('sonnet', [{ role: 'user', content: 'hola' }])).rejects.toThrow();
    // AGENT_CLI_RETRIES=2 -> 1 intento inicial + 2 reintentos = 3 llamadas.
    expect(spawnCliMock).toHaveBeenCalledTimes(3);
  }, 15_000); // el backoff real entre reintentos (2s + 4s) supera el timeout por defecto de vitest.
});

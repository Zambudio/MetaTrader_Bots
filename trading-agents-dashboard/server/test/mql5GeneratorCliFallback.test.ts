import { describe, it, expect, vi, beforeEach } from 'vitest';

const chatCompletionMock = vi.fn();

vi.mock('../src/engine/llmRouter.js', () => ({
  routeChatCompletion: (...args: unknown[]) => chatCompletionMock(...args),
}));

const { requestEaCompletion } = await import('../src/engine/mql5Generator.js');

describe('requestEaCompletion — fallback automático a CLI cuando OmniRoute se agota (H6)', () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
  });

  it('si OmniRoute (modelo sin fuente) falla, reintenta automáticamente vía claude:sonnet', async () => {
    chatCompletionMock
      .mockRejectedValueOnce(new Error('[CircuitBreaker] Servicio OmniRoute temporalmente suspendido tras 6 fallos consecutivos.'))
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"code":"ok"}' } }] });

    const result = await requestEaCompletion('auto/best-reasoning', [{ role: 'user', content: 'hola' }]);

    expect(result.choices[0].message.content).toBe('{"code":"ok"}');
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
    expect(chatCompletionMock.mock.calls[0][0]).toBe('auto/best-reasoning');
    expect(chatCompletionMock.mock.calls[1][0]).toBe('claude:sonnet');
  });

  it('si el modelo "" (por defecto de OmniRoute) falla, también cae a claude:sonnet', async () => {
    chatCompletionMock
      .mockRejectedValueOnce(new Error('OmniRoute respondió 403'))
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"code":"ok"}' } }] });

    await requestEaCompletion('', [{ role: 'user', content: 'hola' }]);

    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
    expect(chatCompletionMock.mock.calls[1][0]).toBe('claude:sonnet');
  });

  it('NUNCA hace fallback si el usuario ya eligió explícitamente una fuente CLI (respeta la elección)', async () => {
    chatCompletionMock.mockRejectedValueOnce(new Error('claude salió con código 1'));

    await expect(requestEaCompletion('claude:opus', [{ role: 'user', content: 'hola' }])).rejects.toThrow('claude salió con código 1');
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);
  });

  it('NUNCA hace fallback si el usuario ya eligió explícitamente openai/codex', async () => {
    chatCompletionMock.mockRejectedValueOnce(new Error('codex falló'));

    await expect(requestEaCompletion('openai:gpt-5.6-sol', [{ role: 'user', content: 'hola' }])).rejects.toThrow('codex falló');
    expect(chatCompletionMock).toHaveBeenCalledTimes(1);
  });

  it('si OmniRoute funciona a la primera, no hay fallback ni llamada extra', async () => {
    chatCompletionMock.mockResolvedValueOnce({ choices: [{ message: { content: '{"code":"ok"}' } }] });

    await requestEaCompletion('auto/best-coding', [{ role: 'user', content: 'hola' }]);

    expect(chatCompletionMock).toHaveBeenCalledTimes(1);
  });

  it('si el propio fallback (claude:sonnet) también falla, propaga ese error sin loop infinito', async () => {
    chatCompletionMock.mockRejectedValue(new Error('todo falla'));

    await expect(requestEaCompletion('auto/best-reasoning', [{ role: 'user', content: 'hola' }])).rejects.toThrow('todo falla');
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
  });
});

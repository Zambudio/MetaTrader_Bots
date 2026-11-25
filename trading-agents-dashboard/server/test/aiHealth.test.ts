import { describe, expect, it, vi } from 'vitest';
import { classifyErrorText } from '../src/engine/aiHealth/errorTaxonomy.js';
import { buildSmokeTestPrompt, generateNonce, parseSmokeTestResponse } from '../src/engine/aiHealth/smokeTest.js';
import { createStatusCache, isSnapshotExpired } from '../src/engine/aiHealth/statusCache.js';
import { CHECK_EXPIRY_MS, effectiveCheckState, type ModelCheckResult } from '../src/engine/aiHealth/modelCheckStore.js';
import { parseLoginOutput, stripAnsi } from '../src/engine/aiHealth/loginSessions.js';
import { describeClaudeFailure } from '../src/engine/cliClients/claudeCli.js';

describe('classifyErrorText', () => {
  it.each([
    ['[claudeCli] claude salió con código 1. stdout: Claude AI usage limit reached|1758000000', 'QUOTA_EXCEEDED'],
    ['Invalid API key · Please run /login', 'AUTH_REQUIRED'],
    ['[claudeCli] timeout (90s) esperando a claude', 'DEADLINE_EXCEEDED'],
    ['[claudeCli] detenido por el usuario', 'CANCELLED'],
    ['[claudeCli] no se pudo lanzar claude: spawn ENOENT', 'ENGINE_UNAVAILABLE'],
    ['OmniRoute respondió 429: too many requests', 'RATE_LIMITED'],
    ['OmniRoute respondió 404: model not found', 'MODEL_NOT_FOUND'],
    ['not supported when using Codex with a ChatGPT account', 'MODEL_ACCESS_DENIED'],
    ['fetch failed', 'NETWORK_ERROR'],
    ['algo totalmente inesperado', 'INVALID_RESPONSE'],
  ])('%s → %s', (text, expected) => {
    expect(classifyErrorText(text)).toBe(expected);
  });
});

describe('smoke test con nonce', () => {
  it('genera nonces distintos y los incluye en el prompt', () => {
    const a = generateNonce();
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(generateNonce()).not.toBe(a);
    expect(buildSmokeTestPrompt(a)).toContain(a);
  });

  it('valida una respuesta correcta, con fences o texto alrededor', () => {
    const nonce = 'abc123abc123';
    const json = `{"status":"ready","nonce":"${nonce}","message":"preparado"}`;
    expect(parseSmokeTestResponse(json, nonce)).toEqual({ valid: true, nonceValidated: true });
    expect(parseSmokeTestResponse('```json\n' + json + '\n```', nonce).nonceValidated).toBe(true);
    expect(parseSmokeTestResponse(`Claro: ${json} ¡listo!`, nonce).nonceValidated).toBe(true);
  });

  it('rechaza nonce distinto, status distinto y texto libre', () => {
    const nonce = 'abc123abc123';
    expect(parseSmokeTestResponse('{"status":"ready","nonce":"otro"}', nonce)).toEqual({ valid: true, nonceValidated: false });
    expect(parseSmokeTestResponse(`{"status":"error","nonce":"${nonce}"}`, nonce).nonceValidated).toBe(false);
    expect(parseSmokeTestResponse('hola, estoy listo', nonce)).toEqual({ valid: false, nonceValidated: false });
    expect(parseSmokeTestResponse('', nonce).valid).toBe(false);
  });
});

describe('caché de estado con TTL', () => {
  it('isSnapshotExpired respeta el TTL', () => {
    const now = Date.parse('2026-09-19T10:00:00Z');
    expect(isSnapshotExpired(null, now)).toBe(true);
    expect(isSnapshotExpired('2026-09-19T09:58:00Z', now, 5 * 60_000)).toBe(false);
    expect(isSnapshotExpired('2026-09-19T09:50:00Z', now, 5 * 60_000)).toBe(true);
  });

  it('reutiliza el snapshot vigente, fuerza refresco e invalida', async () => {
    const refresh = vi.fn(async () => [{ id: 'x' }]);
    const cache = createStatusCache(refresh);
    await cache.get();
    await cache.get();
    expect(refresh).toHaveBeenCalledTimes(1);
    await cache.get(true);
    expect(refresh).toHaveBeenCalledTimes(2);
    cache.invalidate();
    await cache.get();
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('comparte un único refresco si hay llamadas concurrentes', async () => {
    const refresh = vi.fn(async () => [{ id: 'x' }]);
    const cache = createStatusCache(refresh);
    await Promise.all([cache.get(true), cache.get(true), cache.get(true)]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('caducidad de comprobaciones de modelo', () => {
  const base: ModelCheckResult = { state: 'operational', errorCode: null, errorDetail: null, durationMs: 800, checkedAt: '2026-09-19T10:00:00Z' };
  const t0 = Date.parse(base.checkedAt);

  it('operativo dentro de 24 h y expirado después', () => {
    expect(effectiveCheckState(base, t0 + 1000)).toBe('operational');
    expect(effectiveCheckState(base, t0 + CHECK_EXPIRY_MS + 1)).toBe('expired');
  });

  it('un fallo no caduca', () => {
    expect(effectiveCheckState({ ...base, state: 'failed', errorCode: 'AUTH_REQUIRED' }, t0 + CHECK_EXPIRY_MS * 3)).toBe('failed');
  });
});

describe('parseo de la salida del login', () => {
  it('claude: extrae la URL y no inventa código', () => {
    const out =
      "Opening browser to sign in…\nIf the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&state=Q5Wm3BiF5Aiva8-qpc\nPaste code here if prompted > ";
    expect(parseLoginOutput('claude', out)).toEqual({
      url: 'https://claude.com/cai/oauth/authorize?code=true&state=Q5Wm3BiF5Aiva8-qpc',
      userCode: null,
    });
  });

  it('codex: extrae la URL y el código de un solo uso sin códigos ANSI', () => {
    const out =
      '1. Open this link\n   \x1b[94mhttps://auth.openai.com/codex/device\x1b[0m\n2. Enter this one-time code\n   \x1b[94mLQZX-4JAHP\x1b[0m\n';
    expect(parseLoginOutput('openai', out)).toEqual({ url: 'https://auth.openai.com/codex/device', userCode: 'LQZX-4JAHP' });
    expect(stripAnsi('\x1b[90mhola\x1b[0m')).toBe('hola');
  });
});

describe('describeClaudeFailure', () => {
  it('muestra el error real del sobre JSON de stdout (antes salía "stderr: (vacío)")', () => {
    const stdout = JSON.stringify({ is_error: true, subtype: 'success', result: 'Claude AI usage limit reached|1758000000' });
    const text = describeClaudeFailure(stdout, '');
    expect(text).toContain('usage limit reached');
    expect(classifyErrorText(text)).toBe('QUOTA_EXCEEDED');
  });

  it('incluye stderr y tolera stdout que no es JSON', () => {
    expect(describeClaudeFailure('boom', 'trace')).toBe('stdout: boom | stderr: trace');
  });

  it('avisa si no hay salida', () => {
    expect(describeClaudeFailure('', '')).toBe('stdout y stderr vacíos');
  });
});

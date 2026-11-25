import { describe, it, expect, afterEach } from 'vitest';
import { resolveAgentCliRetries, isTransientCliError } from '../src/engine/cliClients/shared.js';

describe('resolveAgentCliRetries', () => {
  const ORIGINAL = process.env.AGENT_CLI_RETRIES;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.AGENT_CLI_RETRIES;
    else process.env.AGENT_CLI_RETRIES = ORIGINAL;
  });

  it('usa el fallback si la env var no está definida', () => {
    delete process.env.AGENT_CLI_RETRIES;
    expect(resolveAgentCliRetries(2)).toBe(2);
  });

  it('usa el fallback si la env var es basura o negativa', () => {
    process.env.AGENT_CLI_RETRIES = 'abc';
    expect(resolveAgentCliRetries(3)).toBe(3);
    process.env.AGENT_CLI_RETRIES = '-1';
    expect(resolveAgentCliRetries(3)).toBe(3);
  });

  it('respeta un valor explícito válido, con tope 5', () => {
    process.env.AGENT_CLI_RETRIES = '1';
    expect(resolveAgentCliRetries(2)).toBe(1);
    process.env.AGENT_CLI_RETRIES = '99';
    expect(resolveAgentCliRetries(2)).toBe(5);
  });
});

describe('isTransientCliError', () => {
  it('NUNCA reintenta una detención deliberada del usuario', () => {
    expect(isTransientCliError(new Error('[claudeCli] detenido por el usuario'))).toBe(false);
  });

  it('NUNCA reintenta un timeout', () => {
    expect(isTransientCliError(new Error('[claudeCli] timeout (180s) esperando a claude'))).toBe(false);
  });

  it('NUNCA reintenta un límite de sesión/uso de la suscripción', () => {
    expect(isTransientCliError(new Error('[claudeCli] claude salió con código 1. stdout: subtype=error: Claude AI usage limit reached'))).toBe(false);
  });

  it('NUNCA reintenta un JSON de RESPUESTA del modelo mal formado (se repetiría igual)', () => {
    expect(isTransientCliError(new Error('la salida del CLI no contiene ningún objeto JSON'))).toBe(false);
    expect(isTransientCliError(new Error('la salida del CLI tiene un objeto JSON sin cerrar'))).toBe(false);
  });

  it('SÍ reintenta una salida rápida con stdout/stderr vacíos (hipo transitorio real)', () => {
    expect(isTransientCliError(new Error('[claudeCli] claude salió con código 1. stdout y stderr vacíos'))).toBe(true);
  });

  it('SÍ reintenta si el sobre JSON del propio CLI no es parseable', () => {
    expect(isTransientCliError(new Error('[claudeCli] stdout no es JSON parseable: <html>...'))).toBe(true);
  });

  it('SÍ reintenta si .result viene vacío o subtype de error, o si no se pudo lanzar el proceso', () => {
    expect(isTransientCliError(new Error('[claudeCli] claude no devolvió texto en .result'))).toBe(true);
    expect(isTransientCliError(new Error('[claudeCli] claude devolvió error (subtype=error_during_execution): algo'))).toBe(true);
    expect(isTransientCliError(new Error("[claudeCli] no se pudo lanzar 'claude': ENOENT"))).toBe(true);
  });

  it('SÍ reintenta cualquier fallo reportado por codex', () => {
    expect(isTransientCliError(new Error('[codexCli] codex falló (código 1): rate limited'))).toBe(true);
  });

  it('por defecto (mensaje desconocido) NO reintenta — falla cerrado', () => {
    expect(isTransientCliError(new Error('algo completamente inesperado'))).toBe(false);
  });
});

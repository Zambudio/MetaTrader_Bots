import { afterEach, describe, expect, it } from 'vitest';
import {
  extractBalancedJson,
  flattenMessages,
  formatCliFailureDetail,
  isTransientCliError,
  resolveAgentCliRetries,
  resolveAgentCliTimeoutMs,
  stripPaidApiKeys,
  toChoicesResponse,
} from './shared.js';
import { buildJsonSchemaSystemMessage, type ToolDefinition } from '../omniClient.js';
import { buildModelString, parseModelString } from '../../utils/modelString.js';

describe('modelString', () => {
  it('trata strings sin prefijo de fuente como omniroute (compat hacia atrás)', () => {
    expect(parseModelString('')).toEqual({ source: 'omniroute', model: '' });
    expect(parseModelString('auto/best-reasoning')).toEqual({ source: 'omniroute', model: 'auto/best-reasoning' });
    expect(parseModelString('cerebras/gpt-oss-120b')).toEqual({ source: 'omniroute', model: 'cerebras/gpt-oss-120b' });
  });

  it('parsea fuente:modelo:esfuerzo', () => {
    expect(parseModelString('omniroute:cerebras/gpt-oss-120b')).toEqual({ source: 'omniroute', model: 'cerebras/gpt-oss-120b' });
    expect(parseModelString('claude:sonnet')).toEqual({ source: 'claude', model: 'sonnet' });
    expect(parseModelString('openai:gpt-5.6-sol:high')).toEqual({ source: 'openai', model: 'gpt-5.6-sol', effort: 'high' });
  });

  it('prefijo desconocido -> omniroute con el string entero', () => {
    expect(parseModelString('groq:llama')).toEqual({ source: 'omniroute', model: 'groq:llama' });
  });

  it('buildModelString es la inversa y omniroute no lleva prefijo', () => {
    expect(buildModelString('omniroute', 'auto/best-reasoning')).toBe('auto/best-reasoning');
    expect(buildModelString('omniroute', '')).toBe('');
    expect(buildModelString('claude', 'sonnet')).toBe('claude:sonnet');
    expect(buildModelString('openai', 'gpt-5.6-sol', 'low')).toBe('openai:gpt-5.6-sol:low');
    const round = 'openai:gpt-5.6-sol:medium';
    const p = parseModelString(round);
    expect(buildModelString(p.source, p.model, p.effort)).toBe(round);
  });
});

describe('flattenMessages', () => {
  const messages = [
    { role: 'system' as const, content: 'Eres un analista.' },
    { role: 'user' as const, content: 'Par: EUR/USD' },
    { role: 'assistant' as const, content: 'Entendido.' },
  ];

  it('incluye el system por defecto', () => {
    const out = flattenMessages(messages);
    expect(out).toContain('INSTRUCCIONES DEL SISTEMA:\nEres un analista.');
    expect(out).toContain('USUARIO:\nPar: EUR/USD');
    expect(out).toContain('ASISTENTE:\nEntendido.');
  });

  it('puede excluir el system (para --system-prompt nativo)', () => {
    const out = flattenMessages(messages, { includeSystem: false });
    expect(out).not.toContain('INSTRUCCIONES DEL SISTEMA');
    expect(out).toContain('USUARIO:\nPar: EUR/USD');
  });
});

describe('extractBalancedJson', () => {
  it('extrae el objeto aunque venga envuelto en prosa/markdown', () => {
    expect(JSON.parse(extractBalancedJson('Aquí tienes: {"ok": true, "n": 42} — listo'))).toEqual({ ok: true, n: 42 });
    expect(JSON.parse(extractBalancedJson('{"a": {"b": 1}, "c": "}"}'))).toEqual({ a: { b: 1 }, c: '}' });
  });

  it('lanza si no hay objeto JSON', () => {
    expect(() => extractBalancedJson('sin json aquí')).toThrow();
    expect(() => extractBalancedJson('{"roto": ')).toThrow();
  });
});

describe('stripPaidApiKeys', () => {
  it('quita ANTHROPIC_API_KEY / OPENAI_API_KEY / ANTHROPIC_AUTH_TOKEN', () => {
    const clean = stripPaidApiKeys({
      ANTHROPIC_API_KEY: 'sk-ant-xxx',
      OPENAI_API_KEY: 'sk-xxx',
      ANTHROPIC_AUTH_TOKEN: 'tok',
      PATH: '/usr/bin',
    });
    expect(clean.ANTHROPIC_API_KEY).toBeUndefined();
    expect(clean.OPENAI_API_KEY).toBeUndefined();
    expect(clean.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(clean.PATH).toBe('/usr/bin');
  });
});

describe('toChoicesResponse', () => {
  it('produce la forma que espera parseToolArgs', () => {
    const r = toChoicesResponse('{"x":1}');
    expect(r.choices[0].message.content).toBe('{"x":1}');
  });
});

describe('resolveAgentCliTimeoutMs', () => {
  afterEach(() => {
    delete process.env.AGENT_CLI_TIMEOUT_MS;
  });

  it('usa el fallback cuando AGENT_CLI_TIMEOUT_MS no está definido', () => {
    delete process.env.AGENT_CLI_TIMEOUT_MS;
    expect(resolveAgentCliTimeoutMs(180_000)).toBe(180_000);
    expect(resolveAgentCliTimeoutMs(240_000)).toBe(240_000);
  });

  it('respeta un AGENT_CLI_TIMEOUT_MS válido (regresión: fx-risk/fx-critic morían a los 180 s)', () => {
    process.env.AGENT_CLI_TIMEOUT_MS = '420000';
    expect(resolveAgentCliTimeoutMs(180_000)).toBe(420_000);
  });

  it('ignora valores no numéricos o irrazonablemente bajos y cae al fallback', () => {
    process.env.AGENT_CLI_TIMEOUT_MS = 'abc';
    expect(resolveAgentCliTimeoutMs(180_000)).toBe(180_000);
    process.env.AGENT_CLI_TIMEOUT_MS = '250';
    expect(resolveAgentCliTimeoutMs(180_000)).toBe(180_000);
  });
});

describe('resolveAgentCliRetries', () => {
  afterEach(() => {
    delete process.env.AGENT_CLI_RETRIES;
  });

  it('usa el fallback sin env y respeta un valor válido', () => {
    delete process.env.AGENT_CLI_RETRIES;
    expect(resolveAgentCliRetries(2)).toBe(2);
    process.env.AGENT_CLI_RETRIES = '0';
    expect(resolveAgentCliRetries(2)).toBe(0);
    process.env.AGENT_CLI_RETRIES = '3';
    expect(resolveAgentCliRetries(2)).toBe(3);
  });

  it('acota a 5 e ignora basura / negativos', () => {
    process.env.AGENT_CLI_RETRIES = '99';
    expect(resolveAgentCliRetries(2)).toBe(5);
    process.env.AGENT_CLI_RETRIES = '-1';
    expect(resolveAgentCliRetries(2)).toBe(2);
    process.env.AGENT_CLI_RETRIES = 'x';
    expect(resolveAgentCliRetries(2)).toBe(2);
  });
});

describe('isTransientCliError (regresión: fx-judge exit 1 stderr vacío tumbó un run entero)', () => {
  it('trata como transitorios los hipos de suscripción', () => {
    expect(isTransientCliError(new Error('[claudeCli] claude salió con código 1. stderr: (vacío)'))).toBe(true);
    expect(isTransientCliError(new Error('[claudeCli] stdout no es JSON parseable: '))).toBe(true);
    expect(isTransientCliError(new Error('[claudeCli] claude no devolvió texto en .result'))).toBe(true);
    expect(isTransientCliError(new Error('[claudeCli] claude devolvió error (subtype=error_during_execution): x'))).toBe(true);
    expect(isTransientCliError(new Error('[codexCli] codex falló (código 1): rate limit'))).toBe(true);
  });

  it('NO reintenta timeouts ni errores de formato del JSON del modelo', () => {
    expect(isTransientCliError(new Error('[claudeCli] timeout (600s) esperando a claude'))).toBe(false);
    expect(isTransientCliError(new Error('la salida del CLI no contiene ningún objeto JSON'))).toBe(false);
    expect(isTransientCliError(new Error('[claudeCli] claude salió con código 2. stderr: Error: modelo no permitido'))).toBe(false);
  });
});

describe('formatCliFailureDetail', () => {
  it('conserva stdout cuando Claude Code reporta alli el limite de sesion', () => {
    const stdout = JSON.stringify({
      usage: { padding: 'x'.repeat(700) },
      result: "You've hit your session limit - resets 2:40am",
      is_error: true,
    });
    expect(formatCliFailureDetail('', stdout)).toBe(
      "You've hit your session limit - resets 2:40am"
    );
  });

  it('prioriza stderr y acota la salida para no volcar respuestas completas', () => {
    expect(formatCliFailureDetail('error concreto', 'salida secundaria')).toBe('error concreto');
    expect(formatCliFailureDetail('', 'x'.repeat(600))).toHaveLength(500);
  });

  it('no reintenta un limite de sesion aunque Claude salga con codigo 1', () => {
    expect(isTransientCliError(new Error(
      "[claudeCli] claude salio con codigo 1: You've hit your session limit - resets 2:40am"
    ))).toBe(false);
  });
});

describe('buildJsonSchemaSystemMessage', () => {
  it('exige JSON puro y refleja el esquema de la tool', () => {
    const tool: ToolDefinition = {
      type: 'function',
      function: {
        name: 'propose_strategy',
        description: 'x',
        parameters: { type: 'object', properties: { resumen: { type: 'string' } } },
      },
    };
    const msg = buildJsonSchemaSystemMessage(tool);
    expect(msg).toContain('primer carácter');
    expect(msg).toContain('propose_strategy');
    expect(msg).toContain('resumen');
  });
});

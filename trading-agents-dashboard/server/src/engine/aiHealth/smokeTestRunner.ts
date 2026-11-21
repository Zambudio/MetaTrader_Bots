import { chatCompletionOnce } from '../omniClient.js';
import { routeChatCompletion } from '../llmRouter.js';
import { buildModelString, type LlmSource } from '../../utils/modelString.js';
import { classifyErrorText, type AiErrorCode } from './errorTaxonomy.js';
import { recordModelCheck, type ModelCheckResult } from './modelCheckStore.js';
import { buildSmokeTestPrompt, generateNonce, parseSmokeTestResponse, SMOKE_TEST_SYSTEM_PROMPT } from './smokeTest.js';

/** Timeout por defecto del smoke test según la fuente (los CLIs tardan más que un router HTTP). */
const DEFAULT_TIMEOUT_MS: Record<'claude' | 'openai' | 'omniroute', number> = {
  claude: 90_000,
  openai: 90_000,
  omniroute: 60_000,
};

export const TESTABLE_SOURCES = ['claude', 'openai', 'omniroute'] as const;
export type TestableSource = (typeof TESTABLE_SOURCES)[number];

export interface SmokeTestRequest {
  source: TestableSource;
  model: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function contentOf(response: any): string {
  return String(response?.choices?.[0]?.message?.content ?? '');
}

/** Llama al modelo una sola vez, sin cadena de fallback (un fallback daría un falso "operativo"). */
async function callModel(source: TestableSource, model: string, prompt: string, timeoutMs: number, signal?: AbortSignal): Promise<string> {
  const messages = [
    { role: 'system' as const, content: SMOKE_TEST_SYSTEM_PROMPT },
    { role: 'user' as const, content: prompt },
  ];
  if (source === 'omniroute') {
    const omniModel = model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-fast';
    return contentOf(await chatCompletionOnce(omniModel, messages, null, { timeoutMs, maxRetries: 0, maxTokens: 1024, signal, bypassCircuitBreaker: true }));
  }
  // Esfuerzo bajo en codex: solo se comprueba que el modelo responde, no su calidad.
  const modelString = buildModelString(source as LlmSource, model, source === 'openai' ? 'low' : undefined);
  return contentOf(await routeChatCompletion(modelString, messages, null, { timeoutMs, signal }));
}

/**
 * Ejecuta el smoke test L2 (inferencia mínima con nonce), guarda el resultado y lo devuelve.
 * `modelKey` es el mismo string que usa la app en `Agent.model` (`claude:sonnet`, `auto/best-fast`).
 */
export async function runModelSmokeTest(req: SmokeTestRequest): Promise<{ modelKey: string; result: ModelCheckResult }> {
  const modelKey = buildModelString(req.source as LlmSource, req.model);
  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS[req.source];
  const nonce = generateNonce();
  const startedAt = Date.now();

  const finish = async (fields: Pick<ModelCheckResult, 'state' | 'errorCode' | 'errorDetail'>) => {
    const result: ModelCheckResult = { ...fields, durationMs: Date.now() - startedAt, checkedAt: new Date().toISOString() };
    // Una prueba cancelada por el usuario no es un fallo del modelo: no se persiste.
    if (result.errorCode !== 'CANCELLED') await recordModelCheck(modelKey, result);
    return { modelKey, result };
  };

  try {
    const text = await callModel(req.source, req.model, buildSmokeTestPrompt(nonce), timeoutMs, req.signal);
    const parsed = parseSmokeTestResponse(text, nonce);
    if (!parsed.valid || !parsed.nonceValidated) {
      return finish({
        state: 'failed',
        errorCode: 'INVALID_RESPONSE',
        errorDetail: `El modelo respondió pero no devolvió el nonce esperado en JSON. Respuesta: ${text.slice(0, 200) || '(vacía)'}`,
      });
    }
    return finish({ state: 'operational', errorCode: null, errorDetail: null });
  } catch (err: any) {
    const message = String(err?.message ?? err);
    const errorCode: AiErrorCode = req.signal?.aborted ? 'CANCELLED' : classifyErrorText(message);
    return finish({ state: 'failed', errorCode, errorDetail: message.slice(0, 600) });
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface OmniClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  maxTokens?: number;
  /** Aborta la llamada en curso (botón "Detener análisis") — también respetado por los CLIs. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.OMNIROUTE_TIMEOUT_MS) || 180_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 2000;

// 3.5 Circuit Breaker simple
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeoutMs = 30_000; // 30 segundos en open state

  public check(): void {
    if (this.failureCount >= this.failureThreshold) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.resetTimeoutMs) {
        const waitSec = Math.ceil((this.resetTimeoutMs - elapsed) / 1000);
        throw new Error(
          `[CircuitBreaker] Servicio OmniRoute temporalmente suspendido tras ${this.failureCount} fallos consecutivos. Reintentando en ${waitSec}s...`
        );
      }
      // Half-open: permitir un intento
      this.failureCount = Math.floor(this.failureThreshold / 2);
    }
  }

  public recordSuccess(): void {
    this.failureCount = 0;
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }
}

const globalCircuitBreaker = new CircuitBreaker();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code fences if present (```json ... ``` o ```mql5 ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|mql5)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  // Strip SSE prefix if present
  if (cleaned.startsWith('data: ')) {
    cleaned = cleaned.replace(/^data:\s*/, '').trim();
  }
  return cleaned;
}

/**
 * Bloque de instrucciones que fuerza a un modelo SIN soporte nativo de function-calling a
 * devolver exclusivamente el JSON que cumple el esquema de la tool. Se inyecta como mensaje
 * `system` (fallback de OmniRoute ante 400) o al final del prompt aplanado (adaptadores CLI).
 * Endurecido (lección del plan del selector CLI): exigir que el primer carácter sea `{` y el
 * último `}`, sin prosa ni markdown, para que `sanitizeJsonResponse` + `JSON.parse` no fallen.
 */
export function buildJsonSchemaSystemMessage(tool: ToolDefinition): string {
  const schemaStr = JSON.stringify(tool.function.parameters?.properties || tool.function.parameters, null, 2);
  return [
    'IMPORTANTE: Devuelve tu respuesta EXCLUSIVAMENTE como un único objeto JSON válido que cumpla este esquema.',
    'SIN texto explicativo antes ni después. SIN bloques markdown (nada de ```). El primer carácter de tu',
    'respuesta debe ser `{` y el último `}`.',
    '',
    `Esquema (propiedades del objeto "${tool.function.name}"):`,
    schemaStr,
  ].join('\n');
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Cadena de modelos de reserva. Si el modelo pedido agota sus reintentos (OmniRoute 404 por
 * enrutar a un modelo archivado, 503 de endpoint free, timeout), se reintenta con el siguiente.
 * Lección del bucle /loop 2026-08-29: `cerebras/gpt-oss-120b` hace 404 intermitente
 * ("Model zai-glm-4.7 is archived") y tumbaba los jobs largos de generación MQL5.
 */
const FALLBACK_MODELS = (process.env.OMNIROUTE_FALLBACK_MODELS ?? 'auto/pro-coding,mistral/codestral-latest,auto/smart')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isPermanentModelError(err: any): boolean {
  const msg = String(err?.message ?? err).toLowerCase();
  return (
    msg.includes('not available in your subscription tier') ||
    msg.includes('is archived') ||
    msg.includes('is no longer available') ||
    msg.includes('does not exist') ||
    msg.includes('model_not_found')
  );
}

export async function chatCompletion(
  rawModel: string,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
): Promise<any> {
  const model = rawModel.replace(/^omniroute:/, '');
  const chain = [model, ...FALLBACK_MODELS.map((m) => m.replace(/^omniroute:/, '')).filter((m) => m !== model)];
  let lastError: unknown;
  for (let i = 0; i < chain.length; i++) {
    try {
      return await chatCompletionOnce(chain[i], messages, tool, options);
    } catch (err: any) {
      lastError = err;
      if (i < chain.length - 1) {
        console.warn(
          `[omniClient] modelo ${chain[i]} agotó reintentos (${String(err?.message ?? err).slice(0, 140)}); probando fallback ${chain[i + 1]}...`
        );
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function chatCompletionOnce(
  model: string,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
): Promise<any> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('OMNIROUTE_BASE_URL/OMNIROUTE_API_KEY no están configurados');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  globalCircuitBreaker.check();

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (options.signal?.aborted) {
      throw new Error('[omniClient] detenido por el usuario');
    }
    if (attempt > 0) {
      console.warn(`[omniClient] Reintentando llamada a ${model} tras error previo (intento ${attempt + 1}/${maxRetries + 1})...`);
      await delay(retryDelayMs * attempt);
    }

    try {
      const payload: any = {
        model,
        messages,
        stream: false,
        max_tokens: options.maxTokens ?? 8192,
      };

      if (tool) {
        payload.tools = [tool];
        payload.tool_choice = { type: 'function', function: { name: tool.function.name } };
      }

      const response = await fetchWithTimeout(
        `${baseUrl}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        timeoutMs,
        options.signal
      );

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        // Fallback ante 400 por incompatibilidad de function calling / tool_choice
        if (response.status === 400 && tool) {
          console.warn(`[omniClient] Proveedor upstream falló con 400 ante tool_choice en ${model}. Activando fallback a JSON prompt...`);
          const fallbackRes = await chatCompletionJsonFallback(baseUrl, apiKey, model, messages, tool, timeoutMs, options.signal);
          globalCircuitBreaker.recordSuccess();
          return fallbackRes;
        }
        throw new Error(`OmniRoute respondió ${response.status}: ${body.slice(0, 300)}`);
      }

      const text = await response.text();
      try {
        const parsed = JSON.parse(sanitizeJsonResponse(text));
        globalCircuitBreaker.recordSuccess();
        return parsed;
      } catch {
        throw new Error(`Respuesta inválida de OmniRoute: ${text.slice(0, 200)}`);
      }
    } catch (err: any) {
      if (options.signal?.aborted) {
        throw new Error('[omniClient] detenido por el usuario');
      }
      if (isPermanentModelError(err)) {
        lastError = err;
        console.warn(`[omniClient] Error permanente de modelo para ${model}: ${String(err?.message ?? err).slice(0, 120)}. Saltando reintentos...`);
        break;
      }
      const errText = String(err?.message ?? err).toLowerCase();
      const isRateLimit = errText.includes('rate limit') || errText.includes('rate-limit') || errText.includes('429') || errText.includes('cooling down') || errText.includes('503');
      if (isRateLimit) {
        console.warn(`[omniClient] Limitación de tasa o cola temporal en ${model}. Pausando 4s...`);
        await delay(4000);
      } else {
        globalCircuitBreaker.recordFailure();
      }
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        lastError = new Error(`Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s) al consultar modelo ${model}`);
      } else {
        lastError = err;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function chatCompletionJsonFallback(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tool: ToolDefinition,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<any> {
  const fallbackMessages: ChatMessage[] = [
    ...messages,
    {
      role: 'system',
      content: buildJsonSchemaSystemMessage(tool),
    },
  ];

  const response = await fetchWithTimeout(
    `${baseUrl}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fallbackMessages,
        stream: false,
        max_tokens: 8192,
      }),
    },
    timeoutMs,
    signal
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OmniRoute respondió ${response.status}: ${body.slice(0, 300)}`);
  }

  const text = await response.text();
  return JSON.parse(sanitizeJsonResponse(text));
}

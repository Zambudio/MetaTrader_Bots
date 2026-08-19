import type { Agent, StrategyProposalLite } from '../types.js';
import { getWikiContextBlock } from '../store/wikiStore.js';

const REQUEST_TIMEOUT_MS = Number(process.env.OMNIROUTE_TIMEOUT_MS) || 120_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

export interface RealExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
}

const STRATEGY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'propose_strategy',
    description: 'Propone una estrategia de trading concreta y accionable para el par y timeframe indicados.',
    parameters: {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Resumen ejecutivo de la propuesta.' },
        indicadoresClave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Indicadores/factores clave usados para la propuesta.',
        },
        puntoEntrada: { type: 'string', description: 'Zona o nivel de entrada sugerido.' },
        stopLoss: { type: 'string', description: 'Nivel de stop loss sugerido.' },
        takeProfit: { type: 'string', description: 'Nivel de take profit sugerido.' },
        entradasEscalonadas: { type: 'string', description: 'Plan de entradas escalonadas, si procede.' },
        confianza: { type: 'string', description: 'Nivel de confianza de la propuesta.' },
      },
      required: ['resumen', 'indicadoresClave', 'puntoEntrada', 'stopLoss', 'takeProfit'],
    },
  },
};

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code fences if present (```json ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  // Strip SSE prefix if present
  if (cleaned.startsWith('data: ')) {
    cleaned = cleaned.replace(/^data:\s*/, '').trim();
  }
  return cleaned;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function chatCompletion(model: string, messages: ChatMessage[], forceStrategyTool: boolean): Promise<any> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('OMNIROUTE_BASE_URL/OMNIROUTE_API_KEY no están configurados');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(`[realExecutor] Reintentando llamada a ${model} tras error previo (intento ${attempt + 1}/${MAX_RETRIES + 1})...`);
      await delay(RETRY_DELAY_MS * attempt);
    }

    try {
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
            messages,
            stream: false,
            ...(forceStrategyTool
              ? { tools: [STRATEGY_TOOL], tool_choice: { type: 'function', function: { name: 'propose_strategy' } } }
              : {}),
          }),
        },
        REQUEST_TIMEOUT_MS
      );

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`OmniRoute respondió ${response.status}: ${body.slice(0, 300)}`);
      }

      const text = await response.text();
      try {
        return JSON.parse(sanitizeJsonResponse(text));
      } catch (parseErr) {
        throw new Error(`Respuesta inválida de OmniRoute: ${text.slice(0, 200)}`);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        lastError = new Error(`Tiempo de espera agotado (${Math.round(REQUEST_TIMEOUT_MS / 1000)}s) al consultar modelo ${model}`);
      } else {
        lastError = err;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildUserPrompt(pair: string, timeframe: string, context: string, snapshot?: string | null): string {
  return [
    `Par: ${pair}`,
    `Timeframe: ${timeframe}`,
    snapshot ? snapshot : null,
    context ? `Contexto de agentes anteriores:\n${context}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n');
}

export async function runRealAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  snapshot?: string | null
): Promise<RealExecutionResult> {
  const model = agent.model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-reasoning';
  const baseSystemPrompt = agent.systemPrompt || `Eres ${agent.name}, ${agent.role}.`;
  const wikiBlock = await getWikiContextBlock(`${agent.role}\n${agent.systemPrompt}`, { maxPages: 3 });
  const messages: ChatMessage[] = [
    { role: 'system', content: wikiBlock ? `${baseSystemPrompt}\n\n${wikiBlock}` : baseSystemPrompt },
    { role: 'user', content: buildUserPrompt(pair, timeframe, context, snapshot) },
  ];

  if (agent.outputType === 'strategy') {
    const data = await chatCompletion(model, messages, true);
    const message = data?.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    let args: any;
    if (toolCall?.function?.arguments) {
      const sanitized = sanitizeJsonResponse(toolCall.function.arguments);
      args = JSON.parse(sanitized);
    } else if (typeof message?.content === 'string' && message.content.trim()) {
      // Fallback: some models return JSON directly in content instead of a tool call.
      const sanitized = sanitizeJsonResponse(message.content);
      args = JSON.parse(sanitized);
    } else {
      throw new Error('El modelo no devolvió la estrategia estructurada esperada');
    }

    const strategy: StrategyProposalLite = {
      pair,
      timeframe,
      resumen: typeof args.resumen === 'string' ? args.resumen : '',
      indicadoresClave: Array.isArray(args.indicadoresClave) ? args.indicadoresClave : [],
      puntoEntrada: typeof args.puntoEntrada === 'string' ? args.puntoEntrada : '',
      stopLoss: typeof args.stopLoss === 'string' ? args.stopLoss : '',
      takeProfit: typeof args.takeProfit === 'string' ? args.takeProfit : '',
      entradasEscalonadas: typeof args.entradasEscalonadas === 'string' ? args.entradasEscalonadas : undefined,
      confianza: typeof args.confianza === 'string' ? args.confianza : undefined,
    };
    return { strategy };
  }

  const data = await chatCompletion(model, messages, false);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('El modelo no devolvió contenido');
  }
  return { output: content };
}

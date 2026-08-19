import type { Agent, StrategyProposalLite, VerdictResult } from '../types.js';
import { getWikiContextBlock } from '../store/wikiStore.js';

const REQUEST_TIMEOUT_MS = Number(process.env.OMNIROUTE_TIMEOUT_MS) || 120_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

export interface RealExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
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

const VERDICT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'emitir_veredicto',
    description: 'Emite el veredicto final sobre la propuesta de estrategia tras revisar las críticas de los validadores.',
    parameters: {
      type: 'object',
      properties: {
        veredicto: {
          type: 'string',
          enum: ['go', 'ajustar', 'no_operar'],
          description:
            "'go' si la propuesta es sólida y las críticas no la invalidan, 'ajustar' si hay objeciones concretas y corregibles, 'no_operar' si las condiciones u objeciones son serias y ninguna propuesta de entrada tiene sentido ahora mismo.",
        },
        razon: { type: 'string', description: 'Explicación breve del veredicto.' },
        objeciones: {
          type: 'array',
          items: { type: 'string' },
          description: "Objeciones concretas y corregibles. Rellenar siempre que veredicto sea 'ajustar'.",
        },
      },
      required: ['veredicto', 'razon'],
    },
  },
};

type Tool = typeof STRATEGY_TOOL | typeof VERDICT_TOOL;

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

async function chatCompletion(model: string, messages: ChatMessage[], tool: Tool | null): Promise<any> {
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
            ...(tool ? { tools: [tool], tool_choice: { type: 'function', function: { name: tool.function.name } } } : {}),
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

function parseToolArgs(data: any): any {
  const message = data?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(sanitizeJsonResponse(toolCall.function.arguments));
  if (typeof message?.content === 'string' && message.content.trim()) return JSON.parse(sanitizeJsonResponse(message.content));
  throw new Error('El modelo no devolvió la respuesta estructurada esperada');
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
    const data = await chatCompletion(model, messages, STRATEGY_TOOL);
    const args = parseToolArgs(data);
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

  if (agent.outputType === 'verdict') {
    const data = await chatCompletion(model, messages, VERDICT_TOOL);
    const args = parseToolArgs(data);
    if (args.veredicto !== 'go' && args.veredicto !== 'ajustar' && args.veredicto !== 'no_operar') {
      throw new Error(`Veredicto inválido devuelto por el modelo: ${String(args.veredicto)}`);
    }
    const verdict: VerdictResult = {
      veredicto: args.veredicto,
      razon: typeof args.razon === 'string' ? args.razon : '',
      objeciones: Array.isArray(args.objeciones) ? args.objeciones : undefined,
    };
    return { verdict };
  }

  const data = await chatCompletion(model, messages, null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('El modelo no devolvió contenido');
  }
  return { output: content };
}

import type { Agent, StrategyProposalLite } from '../types.js';

const REQUEST_TIMEOUT_MS = 60_000;

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

async function chatCompletion(model: string, messages: ChatMessage[], forceStrategyTool: boolean): Promise<any> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('OMNIROUTE_BASE_URL/OMNIROUTE_API_KEY no están configurados');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OmniRoute respondió ${response.status}: ${body.slice(0, 300)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildUserPrompt(pair: string, timeframe: string, context: string): string {
  return [`Par: ${pair}`, `Timeframe: ${timeframe}`, context ? `Contexto de agentes anteriores:\n${context}` : null]
    .filter((part): part is string => Boolean(part))
    .join('\n\n');
}

export async function runRealAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string
): Promise<RealExecutionResult> {
  const model = agent.model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-reasoning';
  const messages: ChatMessage[] = [
    { role: 'system', content: agent.systemPrompt || `Eres ${agent.name}, ${agent.role}.` },
    { role: 'user', content: buildUserPrompt(pair, timeframe, context) },
  ];

  if (agent.outputType === 'strategy') {
    const data = await chatCompletion(model, messages, true);
    const message = data?.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    let args: any;
    if (toolCall?.function?.arguments) {
      args = JSON.parse(toolCall.function.arguments);
    } else if (typeof message?.content === 'string' && message.content.trim()) {
      // Fallback: some models return the JSON directly in content instead of a tool call.
      args = JSON.parse(message.content);
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

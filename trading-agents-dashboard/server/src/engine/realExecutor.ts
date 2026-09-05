import type { Agent, AgentAnalysis, StrategyProposalLite, VerdictResult } from '../types.js';
import { getWikiContextBlock } from '../store/wikiStore.js';
import { sanitizeJsonResponse, type ChatMessage } from './omniClient.js';
import { routeChatCompletion as chatCompletion } from './llmRouter.js';
import { parsePriceFromText } from './strategyValidator.js';

export interface RealExecutionResult {
  output?: string;
  analysis?: AgentAnalysis;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}

const ANALYSIS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'emitir_analisis',
    description: 'Devuelve análisis verificable separando hechos, inferencias, hipótesis y conclusión.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['valid', 'data_not_available', 'abstain'] },
        bias: { type: 'string', enum: ['bullish', 'bearish', 'neutral', 'mixed', 'not_applicable'] },
        confidence: { type: 'number' },
        dataQuality: { type: 'string', enum: ['good', 'stale', 'insufficient', 'unavailable'] },
        facts: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, source: { type: 'string' } }, required: ['claim', 'source'] } },
        inferences: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, basedOn: { type: 'array', items: { type: 'string' } } }, required: ['claim', 'basedOn'] } },
        hypotheses: { type: 'array', items: { type: 'string' } },
        conclusion: { type: 'string' },
        risks: { type: 'array', items: { type: 'string' } },
        invalidations: { type: 'array', items: { type: 'string' } },
        blockers: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string', enum: ['approve', 'revise', 'reject', 'not_applicable'] },
      },
      required: ['status', 'bias', 'confidence', 'dataQuality', 'facts', 'inferences', 'hypotheses', 'conclusion', 'risks', 'invalidations'],
    },
  },
};

const STRATEGY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'propose_strategy',
    description: 'Propone una estrategia de trading concreta y accionable para el par y timeframe indicados con coherencia numérica verificable.',
    parameters: {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Resumen ejecutivo de la propuesta (no puede estar vacío).' },
        indicadoresClave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Indicadores/factores clave usados para la propuesta.',
        },
        direction: {
          type: 'string',
          enum: ['buy', 'sell'],
          description: "Dirección de la operación: 'buy' para compra (largo) o 'sell' para venta (corto).",
        },
        puntoEntrada: { type: 'string', description: 'Zona o nivel de entrada sugerido en texto.' },
        condicionEntrada: {
          type: 'string',
          description:
            'Regla MECÁNICA y REPETIBLE que dispara la entrada, en relaciones entre indicadores/precio verificables en cualquier vela futura (p. ej. "EMA20 cruza por encima de EMA50 Y RSI(14) > 50"). NUNCA un nivel de precio anecdótico válido solo hoy — se codifica literalmente como señal del EA y se prueba contra un año de histórico.',
        },
        stopLoss: { type: 'string', description: 'Nivel de stop loss sugerido en texto.' },
        takeProfit: { type: 'string', description: 'Nivel de take profit sugerido en texto.' },
        entryPriceNum: { type: 'number', description: 'Precio numérico exacto de entrada (p. ej. 1.0850).' },
        stopLossNum: { type: 'number', description: 'Precio numérico exacto de Stop Loss (p. ej. 1.0820).' },
        takeProfitNum: { type: 'number', description: 'Precio numérico exacto de Take Profit (p. ej. 1.0910).' },
        riskPercent: { type: 'number', description: '% de riesgo de cuenta sugerido por trade (p. ej. 1.0 o 0.5).' },
        entradasEscalonadas: { type: 'string', description: 'Plan de entradas escalonadas, si procede.' },
        confianza: { type: 'string', description: 'Nivel de confianza de la propuesta.' },
        confidence: { type: 'number', description: 'Confianza calibrada entre 0 y 1.' },
        evidence: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, source: { type: 'string' } }, required: ['claim', 'source'] } },
        risks: { type: 'array', items: { type: 'string' } },
        invalidations: { type: 'array', items: { type: 'string' } },
        dataQuality: { type: 'string', enum: ['good', 'stale', 'insufficient', 'unavailable'] },
      },
      required: ['resumen', 'indicadoresClave', 'condicionEntrada', 'puntoEntrada', 'stopLoss', 'takeProfit', 'direction', 'entryPriceNum', 'stopLossNum', 'takeProfitNum'],
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
        razon: { type: 'string', description: 'Explicación breve del veredicto (no puede estar vacía).' },
        objeciones: {
          type: 'array',
          items: { type: 'string' },
          description: "Objeciones concretas y corregibles. Rellenar siempre que veredicto sea 'ajustar'.",
        },
        confidence: { type: 'number' },
        dataQuality: { type: 'string', enum: ['good', 'stale', 'insufficient', 'unavailable'] },
        resolvedConflicts: { type: 'array', items: { type: 'string' } },
        unresolvedBlockers: { type: 'array', items: { type: 'string' } },
      },
      required: ['veredicto', 'razon'],
    },
  },
};

// 1.8: Aviso explícito cuando el snapshot de mercado es null en modo real
function buildUserPrompt(pair: string, timeframe: string, context: string, snapshot?: string | null): string {
  const snapshotBlock = snapshot
    ? snapshot
    : 'Snapshot de mercado recibido: no (sin velas disponibles). IMPORTANTE: No inventes datos de precio ni niveles de indicadores específicos no provistos; señala explícitamente esta limitación en tu análisis.';

  return [
    `Par: ${pair}`,
    `Timeframe: ${timeframe}`,
    snapshotBlock,
    context ? `Contexto de agentes anteriores:\n${context}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n');
}

function parseToolArgs(data: any): any {
  const message = data?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(sanitizeJsonResponse(toolCall.function.arguments));
  }
  if (typeof message?.content === 'string' && message.content.trim()) {
    return JSON.parse(sanitizeJsonResponse(message.content));
  }
  throw new Error('El modelo no devolvió la respuesta estructurada esperada');
}

export async function runRealAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  snapshot?: string | null,
  signal?: AbortSignal
): Promise<RealExecutionResult> {
  // 4.5: Se usa 'auto/best-reasoning' por diseño para agentes de análisis estratégico y validación lógica
  const model = agent.model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-reasoning';
  const baseSystemPrompt = agent.systemPrompt || `Eres ${agent.name}, ${agent.role}.`;
  const wikiBlock = await getWikiContextBlock(`${agent.role}\n${agent.systemPrompt}`, { maxPages: 3 });
  const messages: ChatMessage[] = [
    { role: 'system', content: wikiBlock ? `${baseSystemPrompt}\n\n${wikiBlock}` : baseSystemPrompt },
    { role: 'user', content: buildUserPrompt(pair, timeframe, context, snapshot) },
  ];

  if (agent.outputType === 'strategy') {
    const data = await chatCompletion(model, messages, STRATEGY_TOOL, { signal });
    const args = parseToolArgs(data);

    // 2.5: Validar no-vacío en campos críticos
    const resumen = typeof args.resumen === 'string' ? args.resumen.trim() : '';
    const condicionEntrada = typeof args.condicionEntrada === 'string' ? args.condicionEntrada.trim() : '';
    const puntoEntrada = typeof args.puntoEntrada === 'string' ? args.puntoEntrada.trim() : '';
    const stopLoss = typeof args.stopLoss === 'string' ? args.stopLoss.trim() : '';
    const takeProfit = typeof args.takeProfit === 'string' ? args.takeProfit.trim() : '';

    if (!resumen || !condicionEntrada || !puntoEntrada || !stopLoss || !takeProfit) {
      throw new Error(`El agente de estrategia devolvió campos esenciales vacíos (resumen, condicionEntrada, puntoEntrada, stopLoss o takeProfit).`);
    }

    const direction = args.direction === 'buy' || args.direction === 'sell' ? args.direction : undefined;
    const entryPriceNum = typeof args.entryPriceNum === 'number' && Number.isFinite(args.entryPriceNum)
      ? args.entryPriceNum
      : parsePriceFromText(puntoEntrada) ?? undefined;
    const stopLossNum = typeof args.stopLossNum === 'number' && Number.isFinite(args.stopLossNum)
      ? args.stopLossNum
      : parsePriceFromText(stopLoss) ?? undefined;
    const takeProfitNum = typeof args.takeProfitNum === 'number' && Number.isFinite(args.takeProfitNum)
      ? args.takeProfitNum
      : parsePriceFromText(takeProfit) ?? undefined;
    const riskPercent = typeof args.riskPercent === 'number' && Number.isFinite(args.riskPercent)
      ? args.riskPercent
      : 1.0;

    const strategy: StrategyProposalLite = {
      pair,
      timeframe,
      resumen,
      indicadoresClave: Array.isArray(args.indicadoresClave) ? args.indicadoresClave : [],
      direction,
      condicionEntrada,
      puntoEntrada,
      stopLoss,
      takeProfit,
      entryPriceNum,
      stopLossNum,
      takeProfitNum,
      riskPercent,
      entradasEscalonadas: typeof args.entradasEscalonadas === 'string' ? args.entradasEscalonadas : undefined,
      confianza: typeof args.confianza === 'string' ? args.confianza : undefined,
      confidence: typeof args.confidence === 'number' ? Math.max(0, Math.min(1, args.confidence)) : undefined,
      evidence: Array.isArray(args.evidence) ? args.evidence : [],
      risks: Array.isArray(args.risks) ? args.risks : [],
      invalidations: Array.isArray(args.invalidations) ? args.invalidations : [],
      dataQuality: args.dataQuality,
    };
    return { strategy };
  }

  if (agent.outputType === 'verdict') {
    const data = await chatCompletion(model, messages, VERDICT_TOOL, { signal });
    const args = parseToolArgs(data);
    if (args.veredicto !== 'go' && args.veredicto !== 'ajustar' && args.veredicto !== 'no_operar') {
      throw new Error(`Veredicto inválido devuelto por el modelo: ${String(args.veredicto)}`);
    }

    // 2.5: Validar no-vacío en razón del veredicto
    const razon = typeof args.razon === 'string' ? args.razon.trim() : '';
    if (!razon) {
      throw new Error('El agente de veredicto devolvió una razón vacía.');
    }

    const verdict: VerdictResult = {
      veredicto: args.veredicto,
      razon,
      objeciones: Array.isArray(args.objeciones) ? args.objeciones : undefined,
      confidence: typeof args.confidence === 'number' ? Math.max(0, Math.min(1, args.confidence)) : undefined,
      dataQuality: args.dataQuality,
      resolvedConflicts: Array.isArray(args.resolvedConflicts) ? args.resolvedConflicts : [],
      unresolvedBlockers: Array.isArray(args.unresolvedBlockers) ? args.unresolvedBlockers : [],
    };
    return { verdict };
  }

  if (agent.outputType === 'analysis') {
    const data = await chatCompletion(model, messages, ANALYSIS_TOOL, { signal });
    const args = parseToolArgs(data);
    const validStatuses = new Set(['valid', 'data_not_available', 'abstain']);
    const validBiases = new Set(['bullish', 'bearish', 'neutral', 'mixed', 'not_applicable']);
    const validQualities = new Set(['good', 'stale', 'insufficient', 'unavailable']);
    if (!validStatuses.has(args.status) || !validBiases.has(args.bias) || !validQualities.has(args.dataQuality)) {
      throw new Error('El agente devolvió un contrato AgentAnalysis inválido.');
    }
    const conclusion = typeof args.conclusion === 'string' ? args.conclusion.trim() : '';
    if (!conclusion) throw new Error('El agente devolvió una conclusión vacía.');
    const analysis: AgentAnalysis = {
      status: args.status,
      bias: args.bias,
      confidence: typeof args.confidence === 'number' ? Math.max(0, Math.min(1, args.confidence)) : 0,
      dataQuality: args.dataQuality,
      facts: Array.isArray(args.facts) ? args.facts : [],
      inferences: Array.isArray(args.inferences) ? args.inferences : [],
      hypotheses: Array.isArray(args.hypotheses) ? args.hypotheses : [],
      conclusion,
      risks: Array.isArray(args.risks) ? args.risks : [],
      invalidations: Array.isArray(args.invalidations) ? args.invalidations : [],
      blockers: Array.isArray(args.blockers) ? args.blockers : [],
      recommendation: args.recommendation,
    };
    return { analysis };
  }

  const data = await chatCompletion(model, messages, null, { signal });
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('El modelo no devolvió contenido');
  }
  return { output: content };
}

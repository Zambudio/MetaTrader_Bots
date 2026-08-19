import type { Agent, StrategyProposalLite, VerdictResult } from '../types.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MockExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}

export async function runMockAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  snapshot?: string | null
): Promise<MockExecutionResult> {
  await delay(600 + Math.floor(Math.random() * 600));

  if (agent.outputType === 'strategy') {
    return { strategy: buildMockStrategy(agent, pair, timeframe) };
  }
  if (agent.outputType === 'verdict') {
    return { verdict: buildMockVerdict(context) };
  }
  return { output: buildMockText(agent, context, pair, timeframe, snapshot) };
}

function buildMockText(agent: Agent, context: string, pair: string, timeframe: string, snapshot?: string | null): string {
  const snapshotNote = snapshot ? `\n\n${snapshot}` : '\n\nSnapshot de mercado recibido: no (sin velas disponibles).';
  const contextNote = context ? `\n\nContexto recibido de agentes anteriores:\n${context}` : '';
  return `[SIMULADO] ${agent.name} (${agent.role}) analizando ${pair} en ${timeframe}.\n\nPrompt configurado: "${
    agent.systemPrompt || '(sin prompt configurado)'
  }"${snapshotNote}${contextNote}\n\nEsta es una salida de relleno para probar el flujo — conecta un LLM real para obtener un análisis de verdad.`;
}

function buildMockStrategy(agent: Agent, pair: string, timeframe: string): StrategyProposalLite {
  return {
    pair,
    timeframe,
    resumen: `[SIMULADO] Propuesta de ${agent.name} para ${pair} en ${timeframe}, combinando el análisis de los agentes anteriores de la cadena.`,
    indicadoresClave: ['Media móvil (mock)', 'RSI (mock)', 'Estructura de mercado (mock)'],
    puntoEntrada: 'Zona de entrada simulada — pendiente de LLM real',
    stopLoss: 'Nivel de stop loss simulado',
    takeProfit: 'Nivel de take profit simulado',
    entradasEscalonadas: 'Ejemplo: 3 entradas parciales al 33% cada una (simulado)',
    confianza: 'media (simulado)',
  };
}

function buildMockVerdict(context: string): VerdictResult {
  const isRetry = context.includes('Objeciones del Razonador');
  if (isRetry) {
    return { veredicto: 'go', razon: '[SIMULADO] La propuesta corregida resuelve las objeciones planteadas.' };
  }
  return {
    veredicto: 'ajustar',
    razon: '[SIMULADO] La propuesta necesita ajustes antes de darse por buena.',
    objeciones: [
      '[SIMULADO] Objeción de ejemplo del Validador de Coherencia Técnica.',
      '[SIMULADO] Objeción de ejemplo del Refutador.',
    ],
  };
}

import type { Agent, StrategyProposalLite } from '../types.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MockExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
}

export async function runMockAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string
): Promise<MockExecutionResult> {
  await delay(600 + Math.floor(Math.random() * 600));

  if (agent.outputType === 'strategy') {
    return { strategy: buildMockStrategy(agent, pair, timeframe) };
  }
  return { output: buildMockText(agent, context, pair, timeframe) };
}

function buildMockText(agent: Agent, context: string, pair: string, timeframe: string): string {
  const contextNote = context ? `\n\nContexto recibido de agentes anteriores:\n${context}` : '';
  return `[SIMULADO] ${agent.name} (${agent.role}) analizando ${pair} en ${timeframe}.\n\nPrompt configurado: "${
    agent.systemPrompt || '(sin prompt configurado)'
  }"${contextNote}\n\nEsta es una salida de relleno para probar el flujo — conecta un LLM real para obtener un análisis de verdad.`;
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

import type { Agent, AgentAnalysis, StrategyProposalLite, VerdictResult } from '../types.js';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface MockExecutionResult {
  output?: string;
  analysis?: AgentAnalysis;
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
  await delay(5);
  if (agent.outputType === 'strategy') return { strategy: buildMockStrategy(agent, pair, timeframe, snapshot) };
  if (agent.outputType === 'verdict') return { verdict: buildMockVerdict(context) };
  if (agent.outputType === 'analysis') return { analysis: buildMockAnalysis(agent, snapshot) };
  return { output: `[SIMULADO] ${agent.name} analizó ${pair} ${timeframe}.` };
}

function extractNumber(snapshot: string | null | undefined, pattern: RegExp): number | undefined {
  const match = snapshot?.match(pattern);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

function buildMockStrategy(agent: Agent, pair: string, timeframe: string, snapshot?: string | null): StrategyProposalLite {
  const entry = extractNumber(snapshot, /Precio Actual \(Cierre\):\s*([0-9.]+)/i) ?? (pair.includes('BTC') ? 80_000 : pair.includes('/') ? 1.1 : 300);
  const atr = extractNumber(snapshot, /ATR \(14[^)]*\):\s*([0-9.]+)/i) ?? entry * 0.005;
  const sma200 = extractNumber(snapshot, /SMA\(200\):\s*([0-9.]+)/i);
  const direction: 'buy' | 'sell' = sma200 !== undefined && entry < sma200 ? 'sell' : 'buy';
  const riskDistance = atr * 1.5;
  const rewardDistance = riskDistance * 1.7;
  const stop = direction === 'buy' ? entry - riskDistance : entry + riskDistance;
  const take = direction === 'buy' ? entry + rewardDistance : entry - rewardDistance;
  return {
    status: 'valid', pair, timeframe,
    resumen: `[SIMULADO] Propuesta de ${agent.name} para validar el flujo.`,
    indicadoresClave: ['EMA20', 'SMA200', 'ATR14'],
    condicionEntrada: direction === 'buy' ? 'Cierre cruza por encima de EMA20' : 'Cierre cruza por debajo de EMA20',
    puntoEntrada: entry.toFixed(5), stopLoss: stop.toFixed(5), takeProfit: take.toFixed(5),
    direction, entryPriceNum: entry, stopLossNum: stop, takeProfitNum: take, riskPercent: 0.5,
    confianza: 'media (simulado)', confidence: 0.6,
    evidence: [{ claim: 'Precios derivados del snapshot de simulación', source: 'market_snapshot' }],
    risks: ['Resultado simulado; no demuestra rentabilidad'], invalidations: ['Snapshot no disponible'],
    dataQuality: snapshot?.includes('AVISO DE FRESCURA') ? 'stale' : 'good',
  };
}

function buildMockAnalysis(agent: Agent, snapshot?: string | null): AgentAnalysis {
  const stale = Boolean(snapshot?.includes('AVISO DE FRESCURA'));
  const reviewer = agent.interventionType === 'validator' || agent.interventionType === 'adversarial';
  return {
    status: snapshot ? 'valid' : 'data_not_available',
    bias: reviewer ? 'not_applicable' : 'neutral', confidence: snapshot ? (stale ? 0.4 : 0.65) : 0,
    dataQuality: snapshot ? (stale ? 'stale' : 'good') : 'unavailable',
    facts: snapshot ? [{ claim: 'Snapshot recibido por el agente', source: 'market_snapshot' }] : [],
    inferences: snapshot ? [{ claim: 'Sin conflicto estructural en la simulación', basedOn: ['market_snapshot'] }] : [],
    hypotheses: ['Hipótesis simulada para validar el flujo, no el rendimiento'],
    conclusion: snapshot ? `[SIMULADO] ${agent.name}: contrato válido.` : 'DATA_NOT_AVAILABLE',
    risks: ['La simulación no sustituye datos reales ni backtest'], invalidations: [], blockers: [],
    recommendation: reviewer ? 'approve' : 'not_applicable',
  };
}

function buildMockVerdict(context: string): VerdictResult {
  return {
    veredicto: 'go',
    razon: '[SIMULADO] Contratos, dependencias y gate determinista válidos; elegible únicamente para backtest.',
    objeciones: [], confidence: 0.6,
    dataQuality: context.includes('AVISO DE FRESCURA') ? 'stale' : 'good',
    resolvedConflicts: [], unresolvedBlockers: [],
  };
}

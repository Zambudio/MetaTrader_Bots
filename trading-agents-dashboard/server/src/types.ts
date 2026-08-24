export type OutputType = 'text' | 'strategy' | 'verdict';
export type AgentRunStatus = 'waiting' | 'running' | 'done' | 'error';
export type Veredicto = 'go' | 'ajustar' | 'no_operar';

export interface Agent {
  id: string;
  name: string;
  role: string;
  photo?: string;
  systemPrompt: string;
  dependsOn: string[];
  outputType: OutputType;
  model?: string;
  enabled?: boolean;
}

export interface AgentConfigPreset {
  id: string;
  name: string;
  agents: Agent[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyProposalLite {
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
  /**
   * Regla mecánica y repetible que dispara la entrada (p. ej. "EMA20 cruza por encima de EMA50
   * Y RSI(14) cruza por encima de 50"), en términos de relaciones entre indicadores/precio — NO
   * un nivel de precio anecdótico atado al snapshot del momento. Es lo que mql5Generator debe
   * codificar literalmente como señal del EA; sin esto, el LLM de código tiene que inventar su
   * propia lógica de entrada a partir de `puntoEntrada` (texto libre), y esa invención nunca
   * vuelve a pasar por el Validador/Refutador/Razonador que dieron el visto bueno.
   */
  condicionEntrada: string;
  puntoEntrada: string;
  stopLoss: string;
  takeProfit: string;
  direction?: 'buy' | 'sell';
  entryPriceNum?: number;
  stopLossNum?: number;
  takeProfitNum?: number;
  riskPercent?: number;
  entradasEscalonadas?: string;
  confianza?: string;
}

export interface VerdictResult {
  veredicto: Veredicto;
  razon: string;
  objeciones?: string[];
}

import type { Mt5LogSession } from './engine/mt5LogParser.js';

export interface Mql5GenerationResult {
  code: string;
  filename: string;
  assumptionsToVerify: string[];
  compileStatus: 'ok' | 'errors' | 'unverified';
  compileErrors: string[];
  compileWarnings: string[];
  attempts: number;
  iteration?: number;
  backtestSession?: Mt5LogSession;
  optimizationNotes?: string[];
  /** Estrategia realmente codificada — puede diferir de la propuesta original si el panel de
   * agentes la replanteó tras un fallo de Quality Gate (ver `strategyFeedbackCycles`). */
  finalStrategy?: StrategyProposalLite;
  /** Nº de veces que el resultado de un backtest real hizo que el panel de agentes (no solo el
   * LLM de código) reconsiderara la estrategia — 0 si nunca hizo falta o no se solicitó. */
  strategyFeedbackCycles?: number;
  /** El Razonador, ya informado del fallo real de backtest, emitió NO_OPERAR — la estrategia se
   * descarta en vez de seguir generando código. */
  discarded?: boolean;
  discardReason?: string;
}

export interface AgentRunResult {
  agentId: string;
  status: AgentRunStatus;
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
  attempt?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface Run {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  results: AgentRunResult[];
  retryCount?: number;
  maxRetries?: number;
  mql5Result?: Mql5GenerationResult;
  /** Nº de veces que este run reejecutó agente-riesgo→razonador porque un backtest real falló
   * el Quality Gate — contador independiente de `retryCount` (que cubre los "ajustar" previos
   * a que exista ningún código). Ver `retryStrategyForBacktestFailure` en orchestrator.ts. */
  backtestFeedbackCount?: number;
}

export interface RunSummary {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  hasStrategy: boolean;
}

export interface SavedPair {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  favorite: boolean;
}

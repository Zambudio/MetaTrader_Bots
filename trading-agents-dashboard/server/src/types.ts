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

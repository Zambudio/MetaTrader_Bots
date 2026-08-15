export type OutputType = 'text' | 'strategy';
export type AgentRunStatus = 'idle' | 'waiting' | 'running' | 'done' | 'error';

export interface Agent {
  id: string;
  name: string;
  role: string;
  photo?: string;
  systemPrompt: string;
  dependsOn: string[];
  outputType: OutputType;
  model?: string;
}

export interface StrategyProposalLite {
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
  puntoEntrada: string;
  stopLoss: string;
  takeProfit: string;
  entradasEscalonadas?: string;
  confianza?: string;
}

export interface AgentRunResult {
  agentId: string;
  status: AgentRunStatus;
  output?: string;
  strategy?: StrategyProposalLite;
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
}

export interface SavedPair {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  favorite: boolean;
}

import type { StrategyProposalLite } from './strategy';

export type AgentRunStatus = 'idle' | 'waiting' | 'running' | 'done' | 'error';

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

export interface RunSummary {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  hasStrategy: boolean;
}

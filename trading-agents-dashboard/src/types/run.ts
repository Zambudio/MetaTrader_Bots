import type { StrategyProposalLite } from './strategy';
import type { VerdictResult } from './verdict';

export type AgentRunStatus = 'idle' | 'waiting' | 'running' | 'done' | 'error';

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

import type { Mql5GenerationResult } from './strategy';

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

import type { StrategyProposalLite, Mql5GenerationResult } from './strategy';
import type { VerdictResult } from './verdict';
import type { AgentConfigPreset, DataCapability } from './agent';

export type AgentRunStatus = 'idle' | 'waiting' | 'running' | 'done' | 'skipped' | 'error';
export interface AgentAnalysis {
  status: 'valid' | 'data_not_available' | 'abstain';
  bias: 'bullish' | 'bearish' | 'neutral' | 'mixed' | 'not_applicable';
  confidence: number; dataQuality: 'good' | 'stale' | 'insufficient' | 'unavailable';
  facts: Array<{ claim: string; source: string }>;
  inferences: Array<{ claim: string; basedOn: string[] }>;
  hypotheses: string[]; conclusion: string; risks: string[]; invalidations: string[];
  blockers?: string[]; recommendation?: 'approve' | 'revise' | 'reject' | 'not_applicable';
}
export interface AgentRunResult {
  agentId: string; status: AgentRunStatus; output?: string; analysis?: AgentAnalysis;
  strategy?: StrategyProposalLite; verdict?: VerdictResult; attempt?: number;
  startedAt?: string; finishedAt?: string; error?: string; activationReason?: string;
  omissionReason?: string; durationMs?: number;
}
export interface RunIssue { code: string; severity: 'warning' | 'error'; message: string; agentId?: string }
export interface Run {
  id: string; pair: string; timeframe: string; status: 'running' | 'done' | 'error'; createdAt: string;
  startedAt?: string; finishedAt?: string; durationMs?: number; results: AgentRunResult[];
  retryCount?: number; maxRetries?: number; mql5Result?: Mql5GenerationResult;
  configuration?: AgentConfigPreset; configurationHash?: string; executionMode?: 'real' | 'simulation';
  validationScenario?: string; expectedAgentIds?: string[];
  marketSnapshot?: string | null; dataQuality?: 'good' | 'stale' | 'insufficient' | 'unavailable';
  dataCapabilities?: DataCapability[]; issues?: RunIssue[];
  finalState?: 'validated' | 'rejected' | 'insufficient_data' | 'invalid_result' | 'error';
}
export interface RunSummary {
  id: string; pair: string; timeframe: string; status: 'running' | 'done' | 'error'; createdAt: string; hasStrategy: boolean;
}

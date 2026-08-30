import type { Agent, AgentAnalysis, StrategyProposalLite, VerdictResult } from '../types.js';
import { runMockAgent } from './mockExecutor.js';
import { runRealAgent } from './realExecutor.js';

export interface ExecutionResult {
  output?: string;
  analysis?: AgentAnalysis;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}

export async function runAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  snapshot?: string | null,
  executionMode?: 'real' | 'simulation'
): Promise<ExecutionResult> {
  const useReal = executionMode === 'real' || (executionMode !== 'simulation' && Boolean(process.env.OMNIROUTE_API_KEY && process.env.OMNIROUTE_BASE_URL));
  if (useReal) {
    return runRealAgent(agent, context, pair, timeframe, snapshot);
  }
  return runMockAgent(agent, context, pair, timeframe, snapshot);
}

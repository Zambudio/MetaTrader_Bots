import type { Agent, StrategyProposalLite } from '../types.js';
import { runMockAgent } from './mockExecutor.js';
import { runRealAgent } from './realExecutor.js';

export interface ExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
}

export async function runAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string
): Promise<ExecutionResult> {
  const useReal = Boolean(process.env.OMNIROUTE_API_KEY && process.env.OMNIROUTE_BASE_URL);
  if (useReal) {
    return runRealAgent(agent, context, pair, timeframe);
  }
  return runMockAgent(agent, context, pair, timeframe);
}

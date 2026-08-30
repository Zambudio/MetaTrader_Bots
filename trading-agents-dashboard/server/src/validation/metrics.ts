import type { AgentConfigPreset, Run, RunIssueCode } from '../types.js';
import { hashConfiguration } from '../config/configValidation.js';

export interface ValidationMetrics {
  configuration: string;
  version: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  runs_with_warning: number;
  agent_errors: number;
  tool_errors: number;
  contract_errors: number;
  hallucination_detected: number;
  invalid_results: number;
  unexpected_agents: number;
  missing_agents: number;
  average_execution_time: number;
  success_rate: number;
}

function issueCount(runs: Run[], code: RunIssueCode): number {
  return runs.reduce((total, run) => total + (run.issues ?? []).filter((issue) => issue.code === code).length, 0);
}

export function validateRunIsolation(run: Run, config: AgentConfigPreset): string[] {
  const expected = new Set(config.agents.map((agent) => agent.id));
  const actual = new Set(run.results.map((result) => result.agentId));
  const errors: string[] = [];
  for (const id of actual) if (!expected.has(id)) errors.push(`UNEXPECTED_AGENT:${id}`);
  for (const id of expected) if (!actual.has(id)) errors.push(`MISSING_AGENT:${id}`);
  if (run.configurationHash && run.configuration && run.configurationHash !== hashConfiguration(run.configuration)) errors.push('CONFIGURATION_HASH_MISMATCH');
  if (run.configuration?.id !== config.id || run.configuration?.version !== config.version) errors.push('CONFIGURATION_MISMATCH');
  return errors;
}

export function summarizeValidationRuns(config: AgentConfigPreset, runs: Run[]): ValidationMetrics {
  const successful = runs.filter((run) => run.status === 'done').length;
  const durations = runs.map((run) => run.durationMs).filter((duration): duration is number => Number.isFinite(duration));
  return {
    configuration: config.key,
    version: config.version,
    total_runs: runs.length,
    successful_runs: successful,
    failed_runs: runs.length - successful,
    runs_with_warning: runs.filter((run) => (run.issues ?? []).some((issue) => issue.severity === 'warning') || run.dataQuality === 'stale' || run.dataQuality === 'unavailable').length,
    agent_errors: runs.reduce((total, run) => total + run.results.filter((result) => result.status === 'error').length, 0),
    tool_errors: issueCount(runs, 'TOOL_ERROR'),
    contract_errors: issueCount(runs, 'CONTRACT_ERROR'),
    hallucination_detected: issueCount(runs, 'HALLUCINATION'),
    invalid_results: issueCount(runs, 'INVALID_RESULT'),
    unexpected_agents: issueCount(runs, 'UNEXPECTED_AGENT'),
    missing_agents: issueCount(runs, 'MISSING_AGENT'),
    average_execution_time: durations.length === 0 ? 0 : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    success_rate: runs.length === 0 ? 0 : Number(((successful / runs.length) * 100).toFixed(2)),
  };
}

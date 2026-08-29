import type { Agent, AgentConfigPreset } from '../types/agent';
import type { Run, RunSummary } from '../types/run';
import type { Candle } from '../types/candle';
import type { SavedPair, SymbolSearchResult } from '../types/pair';
import type { Mql5GenerationProgress, Mql5GenerationResult, Mql5Job, StrategyProposalLite } from '../types/strategy';
import type { Mt5LogSession } from '../types/backtest';
import type { ModelsResponse } from '../types/model';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  listAgents: () => request<Agent[]>('/agents'),
  createAgent: (agent: Partial<Agent>) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(agent) }),
  updateAgent: (id: string, updates: Partial<Agent>) =>
    request<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteAgent: (id: string) =>
    request<{ ok: boolean }>(`/agents/${id}`, { method: 'DELETE' }),
  listAgentConfigs: () =>
    request<{ presets: AgentConfigPreset[]; activePresetId: string | null }>('/agent-configs'),
  createAgentConfig: (name: string) =>
    request<AgentConfigPreset>('/agent-configs', { method: 'POST', body: JSON.stringify({ name }) }),
  updateAgentConfig: (id: string) =>
    request<AgentConfigPreset>(`/agent-configs/${id}`, { method: 'PUT' }),
  loadAgentConfig: (id: string) =>
    request<{ agents: Agent[]; activePresetId: string }>(`/agent-configs/${id}/load`, { method: 'POST' }),
  deleteAgentConfig: (id: string) =>
    request<{ ok: boolean }>(`/agent-configs/${id}`, { method: 'DELETE' }),
  listPairs: () => request<SavedPair[]>('/pairs'),
  listModels: () => request<ModelsResponse>('/models'),
  startRun: (pair: string, timeframe: string, maxRetries?: number) =>
    request<Run>('/runs', { method: 'POST', body: JSON.stringify({ pair, timeframe, maxRetries }) }),
  resumeRun: (id: string, agentId?: string) =>
    request<Run>(`/runs/${id}/resume`, { method: 'POST', body: JSON.stringify({ agentId }) }),
  getRun: (id: string) => request<Run>(`/runs/${id}`),
  listRuns: () => request<RunSummary[]>('/runs'),
  deleteRun: (id: string) => request<{ ok: boolean }>(`/runs/${id}`, { method: 'DELETE' }),
  listCandles: (pair: string, timeframe: string) =>
    request<Candle[]>(`/candles?pair=${encodeURIComponent(pair)}&timeframe=${encodeURIComponent(timeframe)}`),
  toggleFavorite: (symbol: string, favorite: boolean) =>
    request<SavedPair[]>(`/pairs/${encodeURIComponent(symbol)}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ favorite }),
    }),
  removePair: (symbol: string) =>
    request<SavedPair[]>(`/pairs/${encodeURIComponent(symbol)}`, { method: 'DELETE' }),
  searchSymbols: (query: string) => request<SymbolSearchResult[]>(`/symbols/search?q=${encodeURIComponent(query)}`),
  startMql5Generation: (strategy: StrategyProposalLite, model?: string, runId?: string) =>
    request<{ jobId: string }>('/mql5/generate', { method: 'POST', body: JSON.stringify({ strategy, model, runId }) }),
  startMql5Optimization: (
    strategy: StrategyProposalLite,
    previousCode: string,
    previousBacktest: Mt5LogSession | null,
    iteration: number,
    model?: string,
    runId?: string,
    previousNotes?: string[]
  ) =>
    request<{ jobId: string }>('/mql5/optimize', {
      method: 'POST',
      body: JSON.stringify({ strategy, previousCode, previousBacktest, iteration, model, runId, previousNotes }),
    }),
  getMql5Job: (jobId: string) => request<Mql5Job>(`/mql5/generate/${jobId}`),
  generateMql5: (
    strategy: StrategyProposalLite,
    model: string | undefined,
    runId?: string,
    onProgress?: (progress: Mql5GenerationProgress) => void
  ) => generateMql5WithPolling(strategy, model, runId, onProgress),
  optimizeMql5: (
    strategy: StrategyProposalLite,
    previousCode: string,
    previousBacktest: Mt5LogSession | null,
    iteration: number,
    model: string | undefined,
    runId?: string,
    onProgress?: (progress: Mql5GenerationProgress) => void,
    previousNotes?: string[]
  ) => optimizeMql5WithPolling(strategy, previousCode, previousBacktest, iteration, model, runId, onProgress, previousNotes),
  analyzeBacktestLog: (logText: string) =>
    request<{ sessions: Mt5LogSession[] }>('/backtest/analyze', { method: 'POST', body: JSON.stringify({ logText }) }),
};

const MQL5_POLL_INTERVAL_MS = 2000;
const MQL5_MAX_CONSECUTIVE_NETWORK_FAILURES = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollJob(
  jobId: string,
  onProgress?: (progress: Mql5GenerationProgress) => void
): Promise<Mql5GenerationResult> {
  let consecutiveNetworkFailures = 0;

  while (true) {
    await sleep(MQL5_POLL_INTERVAL_MS);
    let job: Mql5Job;
    try {
      job = await api.getMql5Job(jobId);
      consecutiveNetworkFailures = 0;
    } catch (err) {
      if (err instanceof TypeError) {
        consecutiveNetworkFailures += 1;
        if (consecutiveNetworkFailures >= MQL5_MAX_CONSECUTIVE_NETWORK_FAILURES) {
          throw new Error('No se pudo contactar con el servidor tras varios intentos');
        }
        continue;
      }
      throw err;
    }

    if (job.status === 'running') {
      onProgress?.(job.progress);
    } else if (job.status === 'done') {
      return job.result;
    } else if (job.status === 'error') {
      throw new Error(job.message);
    }
  }
}

async function generateMql5WithPolling(
  strategy: StrategyProposalLite,
  model: string | undefined,
  runId?: string,
  onProgress?: (progress: Mql5GenerationProgress) => void
): Promise<Mql5GenerationResult> {
  const { jobId } = await api.startMql5Generation(strategy, model, runId);
  return pollJob(jobId, onProgress);
}

async function optimizeMql5WithPolling(
  strategy: StrategyProposalLite,
  previousCode: string,
  previousBacktest: Mt5LogSession | null,
  iteration: number,
  model: string | undefined,
  runId?: string,
  onProgress?: (progress: Mql5GenerationProgress) => void,
  previousNotes?: string[]
): Promise<Mql5GenerationResult> {
  const { jobId } = await api.startMql5Optimization(strategy, previousCode, previousBacktest, iteration, model, runId, previousNotes);
  return pollJob(jobId, onProgress);
}

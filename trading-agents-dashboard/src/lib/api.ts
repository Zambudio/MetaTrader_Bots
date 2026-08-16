import type { Agent } from '../types/agent';
import type { Run, RunSummary } from '../types/run';
import type { Candle } from '../types/candle';
import type { SavedPair, SymbolSearchResult } from '../types/pair';
import type { Mql5GenerationProgress, Mql5GenerationResult, Mql5Job, StrategyProposalLite } from '../types/strategy';
import type { Mt5LogSession } from '../types/backtest';

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
  listPairs: () => request<SavedPair[]>('/pairs'),
  listModels: () => request<string[]>('/models'),
  startRun: (pair: string, timeframe: string) =>
    request<Run>('/runs', { method: 'POST', body: JSON.stringify({ pair, timeframe }) }),
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
  startMql5Generation: (strategy: StrategyProposalLite, model?: string) =>
    request<{ jobId: string }>('/mql5/generate', { method: 'POST', body: JSON.stringify({ strategy, model }) }),
  getMql5Job: (jobId: string) => request<Mql5Job>(`/mql5/generate/${jobId}`),
  generateMql5: (strategy: StrategyProposalLite, model: string | undefined, onProgress?: (progress: Mql5GenerationProgress) => void) =>
    generateMql5WithPolling(strategy, model, onProgress),
  analyzeBacktestLog: (logText: string) =>
    request<{ sessions: Mt5LogSession[] }>('/backtest/analyze', { method: 'POST', body: JSON.stringify({ logText }) }),
};

const MQL5_POLL_INTERVAL_MS = 2000;
const MQL5_MAX_CONSECUTIVE_NETWORK_FAILURES = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The generation itself (LLM + up to 3 MetaEditor compiles) can take minutes, so it runs as a
// server-side job (api.startMql5Generation) that we poll instead of one long blocking request —
// a multi-minute single fetch dies outright on any dev-server restart or network blip
// ("Failed to fetch"), while a poll tick that fails just retries on the next tick. A definitive
// HTTP error (e.g. 404 "job not found", which happens if the server restarted mid-job) is not
// retried — only raw network failures (TypeError) are, since those are the transient kind.
async function generateMql5WithPolling(
  strategy: StrategyProposalLite,
  model: string | undefined,
  onProgress?: (progress: Mql5GenerationProgress) => void
): Promise<Mql5GenerationResult> {
  const { jobId } = await api.startMql5Generation(strategy, model);
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
      continue;
    }
    if (job.status === 'done') return job.result;
    throw new Error(job.message);
  }
}

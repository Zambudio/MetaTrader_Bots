import type { Agent, AgentConfigPreset } from '../types/agent';
import type { Run, RunSummary } from '../types/run';
import type { Candle } from '../types/candle';
import type { SavedPair, SymbolSearchResult } from '../types/pair';
import type { Mql5GenerationProgress, Mql5GenerationResult, Mql5Job, StrategyProposalLite } from '../types/strategy';
import type { Mt5LogSession } from '../types/backtest';
import type { ModelsResponse } from '../types/model';

/** Error de una respuesta HTTP no-OK. Lleva el `status` para que quien llama pueda distinguir
 *  un fallo transitorio de gateway (502/503/504 del túnel de Cloudflare) de un error real. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed: ${response.status}`, response.status);
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
  startRun: (pair: string, timeframe: string, maxRetries?: number, configurationId?: string, executionMode?: 'real' | 'simulation') =>
    request<Run>('/runs', { method: 'POST', body: JSON.stringify({ pair, timeframe, maxRetries, configurationId, executionMode }) }),
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
// El pipeline MQL5 dura hasta ~25 min y se sondea sobre el túnel de Cloudflare. Un reinicio del
// servidor, un redeploy o un simple parpadeo del túnel devuelven 502/503/504 en algún sondeo
// suelto; antes CUALQUIER fallo que no fuera un `TypeError` de red abortaba toda la generación
// aunque el job del backend siguiera vivo. Ahora se toleran fallos transitorios durante una
// ventana amplia y solo se abandona si son sostenidos.
const MQL5_TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MQL5_MAX_CONSECUTIVE_POLL_FAILURES = 30; // ~90 s de fallos seguidos antes de rendirse
// Tope duro por si el job del backend se quedara colgado en 'running' para siempre. Generoso:
// el peor caso real (bucle de re-estrategia × ciclos de optimización) puede pasar de una hora.
const MQL5_ABSOLUTE_POLL_TIMEOUT_MS = 90 * 60 * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientPollError(err: unknown): boolean {
  // `TypeError` = fetch rechazado a nivel de red (DNS, conexión, CORS); ApiError con status de
  // gateway = el túnel llegó pero el origen no respondió a tiempo (reinicio, redeploy).
  if (err instanceof TypeError) return true;
  if (err instanceof ApiError) return MQL5_TRANSIENT_HTTP_STATUSES.has(err.status);
  return false;
}

async function pollJob(
  jobId: string,
  onProgress?: (progress: Mql5GenerationProgress) => void
): Promise<Mql5GenerationResult> {
  let consecutiveFailures = 0;
  const startedAt = Date.now();

  while (true) {
    await sleep(MQL5_POLL_INTERVAL_MS + consecutiveFailures * 500);

    if (Date.now() - startedAt > MQL5_ABSOLUTE_POLL_TIMEOUT_MS) {
      throw new Error(
        'La generación lleva demasiado tiempo sin terminar. Puede seguir en curso en el servidor — recarga la página en unos minutos para ver si el resultado ya está.'
      );
    }

    let job: Mql5Job;
    try {
      job = await api.getMql5Job(jobId);
      consecutiveFailures = 0;
    } catch (err) {
      if (isTransientPollError(err)) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MQL5_MAX_CONSECUTIVE_POLL_FAILURES) {
          throw new Error(
            'No se pudo contactar con el servidor tras varios intentos seguidos. La generación puede seguir en curso — recarga la página en un minuto.'
          );
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

import type { Agent } from '../types/agent';
import type { Run } from '../types/run';
import type { Candle } from '../types/candle';
import type { SavedPair, SymbolSearchResult } from '../types/pair';

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
};

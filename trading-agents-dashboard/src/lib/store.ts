import { create } from 'zustand';
import type { Agent } from '../types/agent';
import type { Run } from '../types/run';
import type { SavedPair } from '../types/pair';
import { api } from './api';

export const TIMEFRAME_OPTIONS = ['M15', 'H1', 'H4', 'D1'];

interface AgentStore {
  agents: Agent[];
  pairs: SavedPair[];
  models: string[];
  selectedPair: string;
  timeframe: string;
  currentRun: Run | null;
  isLoading: boolean;
  isAnalysing: boolean;
  error: string | null;
  loadInitialData: () => Promise<void>;
  addAgent: (agent: Partial<Agent>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  setSelectedPair: (pair: string) => void;
  setTimeframe: (timeframe: string) => void;
  runWorkflow: () => Promise<void>;
  loadRun: (id: string) => Promise<void>;
  toggleFavorite: (symbol: string, favorite: boolean) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  pairs: [],
  models: [],
  selectedPair: 'EUR/USD',
  timeframe: 'H1',
  currentRun: null,
  isLoading: true,
  isAnalysing: false,
  error: null,

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [agents, pairs, models] = await Promise.all([api.listAgents(), api.listPairs(), api.listModels()]);
      set((state) => ({
        agents,
        pairs,
        models,
        selectedPair: pairs.some((p) => p.symbol === state.selectedPair)
          ? state.selectedPair
          : (pairs[0]?.symbol ?? state.selectedPair),
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Error cargando agentes' });
    }
  },

  addAgent: async (agent) => {
    const created = await api.createAgent(agent);
    set((state) => ({ agents: [...state.agents, created] }));
  },

  updateAgent: async (id, updates) => {
    const updated = await api.updateAgent(id, updates);
    set((state) => ({ agents: state.agents.map((a) => (a.id === id ? updated : a)) }));
  },

  removeAgent: async (id) => {
    await api.deleteAgent(id);
    const agents = await api.listAgents();
    set({ agents });
  },

  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setTimeframe: (timeframe) => set({ timeframe }),

  toggleFavorite: async (symbol, favorite) => {
    const pairs = await api.toggleFavorite(symbol, favorite);
    set({ pairs });
  },

  runWorkflow: async () => {
    const { selectedPair, timeframe } = get();
    set({ isAnalysing: true, error: null });
    try {
      const run = await api.startRun(selectedPair, timeframe);
      set({ currentRun: run });

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const latest = await api.getRun(run.id);
        set({ currentRun: latest });
        if (latest.status !== 'running') break;
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error ejecutando el análisis' });
    } finally {
      set({ isAnalysing: false });
    }
  },

  loadRun: async (id) => {
    const run = await api.getRun(id);
    set({ currentRun: run, selectedPair: run.pair, timeframe: run.timeframe });
  },
}));

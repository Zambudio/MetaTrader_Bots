import { create } from 'zustand';
import type { Agent, AgentConfigPreset } from '../types/agent';
import type { Run } from '../types/run';
import type { SavedPair } from '../types/pair';
import { api } from './api';

export const TIMEFRAME_OPTIONS = ['M15', 'H1', 'H4', 'D1'];
export const MAX_RETRIES_OPTIONS = [0, 1, 2, 3];
const MAX_POLL_ATTEMPTS = 600; // 10 minutos máximo de polling para permitir razonamiento profundo de múltiples agentes

export type ErrorDomain = 'initial' | 'run' | 'agent' | 'pair' | 'preset' | null;

interface AgentStore {
  agents: Agent[];
  pairs: SavedPair[];
  models: string[];
  presets: AgentConfigPreset[];
  activePresetId: string | null;
  selectedPair: string;
  timeframe: string;
  maxRetries: number;
  currentRun: Run | null;
  isLoading: boolean;
  isAnalysing: boolean;
  error: string | null;
  errorDomain: ErrorDomain;
  loadInitialData: () => Promise<void>;
  addAgent: (agent: Partial<Agent>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  savePresetAs: (name: string) => Promise<void>;
  overwriteActivePreset: () => Promise<void>;
  loadPreset: (id: string) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  setSelectedPair: (pair: string) => void;
  setTimeframe: (timeframe: string) => void;
  setMaxRetries: (maxRetries: number) => void;
  runWorkflow: () => Promise<void>;
  resumeWorkflow: (agentId?: string) => Promise<void>;
  loadRun: (id: string) => Promise<void>;
  toggleFavorite: (symbol: string, favorite: boolean) => Promise<void>;
  clearError: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  pairs: [],
  models: [],
  presets: [],
  activePresetId: null,
  selectedPair: 'EUR/USD',
  timeframe: 'H1',
  maxRetries: 2,
  currentRun: null,
  isLoading: true,
  isAnalysing: false,
  error: null,
  errorDomain: null,

  clearError: () => set({ error: null, errorDomain: null }),

  loadInitialData: async () => {
    set({ isLoading: true, error: null, errorDomain: null });
    try {
      const [agents, pairs, models, configState] = await Promise.all([
        api.listAgents(),
        api.listPairs(),
        api.listModels(),
        api.listAgentConfigs(),
      ]);
      set((state) => ({
        agents,
        pairs,
        models,
        presets: configState.presets,
        activePresetId: configState.activePresetId,
        selectedPair: pairs.some((p) => p.symbol === state.selectedPair)
          ? state.selectedPair
          : (pairs[0]?.symbol ?? state.selectedPair),
        isLoading: false,
      }));
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error cargando datos iniciales',
        errorDomain: 'initial',
      });
    }
  },

  addAgent: async (agent) => {
    try {
      const created = await api.createAgent(agent);
      set((state) => ({ agents: [...state.agents, created], error: null, errorDomain: null }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al crear agente',
        errorDomain: 'agent',
      });
      throw err;
    }
  },

  updateAgent: async (id, updates) => {
    try {
      const updated = await api.updateAgent(id, updates);
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? updated : a)),
        error: null,
        errorDomain: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al actualizar agente',
        errorDomain: 'agent',
      });
      throw err;
    }
  },

  removeAgent: async (id) => {
    try {
      await api.deleteAgent(id);
      const agents = await api.listAgents();
      set({ agents, error: null, errorDomain: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al eliminar agente',
        errorDomain: 'agent',
      });
      throw err;
    }
  },

  savePresetAs: async (name) => {
    try {
      const preset = await api.createAgentConfig(name);
      set((state) => ({
        presets: [...state.presets, preset],
        activePresetId: preset.id,
        error: null,
        errorDomain: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al guardar la configuración',
        errorDomain: 'preset',
      });
      throw err;
    }
  },

  overwriteActivePreset: async () => {
    const { activePresetId } = get();
    if (!activePresetId) return;
    try {
      const preset = await api.updateAgentConfig(activePresetId);
      set((state) => ({
        presets: state.presets.map((p) => (p.id === preset.id ? preset : p)),
        error: null,
        errorDomain: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al sobrescribir la configuración',
        errorDomain: 'preset',
      });
      throw err;
    }
  },

  loadPreset: async (id) => {
    try {
      const { agents, activePresetId } = await api.loadAgentConfig(id);
      set({ agents, activePresetId, error: null, errorDomain: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar la configuración',
        errorDomain: 'preset',
      });
      throw err;
    }
  },

  deletePreset: async (id) => {
    try {
      await api.deleteAgentConfig(id);
      set((state) => ({
        presets: state.presets.filter((p) => p.id !== id),
        activePresetId: state.activePresetId === id ? null : state.activePresetId,
        error: null,
        errorDomain: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al borrar la configuración',
        errorDomain: 'preset',
      });
      throw err;
    }
  },

  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setMaxRetries: (maxRetries) => set({ maxRetries: Math.min(3, Math.max(0, maxRetries)) }),

  toggleFavorite: async (symbol, favorite) => {
    try {
      const pairs = await api.toggleFavorite(symbol, favorite);
      set({ pairs, error: null, errorDomain: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al actualizar favorito',
        errorDomain: 'pair',
      });
    }
  },

  runWorkflow: async () => {
    const { selectedPair, timeframe, maxRetries } = get();
    set({ isAnalysing: true, error: null, errorDomain: null });
    try {
      const run = await api.startRun(selectedPair, timeframe, maxRetries);
      set({ currentRun: run });

      let attempts = 0;
      while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const latest = await api.getRun(run.id);
        set({ currentRun: latest });
        if (latest.status !== 'running') break;
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        set({
          error: 'Tiempo límite de espera alcanzado (10 min). Puedes reanudar o reejecutar el análisis desde la tarjeta del agente que quedó pendiente.',
          errorDomain: 'run',
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error ejecutando el análisis',
        errorDomain: 'run',
      });
    } finally {
      set({ isAnalysing: false });
    }
  },

  resumeWorkflow: async (agentId?: string) => {
    const { currentRun } = get();
    if (!currentRun) return;
    set({ isAnalysing: true, error: null, errorDomain: null });
    try {
      const run = await api.resumeRun(currentRun.id, agentId);
      set({ currentRun: run });

      let attempts = 0;
      while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const latest = await api.getRun(run.id);
        set({ currentRun: latest });
        if (latest.status !== 'running') break;
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        set({
          error: 'Tiempo límite de espera alcanzado reanudando el análisis (10 min). Puedes reintentar desde la tarjeta de cualquier agente.',
          errorDomain: 'run',
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error reanudando el análisis',
        errorDomain: 'run',
      });
    } finally {
      set({ isAnalysing: false });
    }
  },

  loadRun: async (id: string) => {
    try {
      const run = await api.getRun(id);
      set({
        currentRun: run,
        selectedPair: run.pair,
        timeframe: run.timeframe,
        error: null,
        errorDomain: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error cargando el análisis',
        errorDomain: 'run',
      });
    }
  },
}));

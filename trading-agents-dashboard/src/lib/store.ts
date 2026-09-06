import { create } from 'zustand';
import type { Agent, AgentConfigPreset } from '../types/agent';
import type { Run } from '../types/run';
import type { SavedPair } from '../types/pair';
import type { LlmSourceInfo } from '../types/model';
import { api } from './api';

export const TIMEFRAME_OPTIONS = ['M15', 'H1', 'H4', 'D1'];
export const MAX_RETRIES_OPTIONS = [0, 1, 2, 3];
// 30 minutos. Medido en real 2026-09-06 con OmniRoute (auto/best-coding): la cola secuencial
// estrategia->riesgo->crítico->juez de un análisis completo puede tardar 12-13 min ella sola
// (un único agente, crypto-strategy, tardó 363s en una corrida real), muy por encima de los 10
// min que tenía antes esta constante. Con el límite corto, el frontend dejaba de sondear y
// mostraba "tiempo límite alcanzado" mientras el backend seguía trabajando y terminaba bien
// (veredicto real, no un fallo) segundos o minutos después — parecía un fallo sin serlo.
const MAX_POLL_ATTEMPTS = 1800;

// Motor de generación de MQL5 elegido por el usuario (string "<fuente>:<modelo>[:<esfuerzo>]").
// `null` = usar el modelo del agente de estrategia (comportamiento por defecto). Persistido en
// localStorage porque es una preferencia estable de la máquina, no del run.
const MQL5_MODEL_KEY = 'tad:mql5Model';
function readStoredMql5Model(): string | null {
  try {
    return localStorage.getItem(MQL5_MODEL_KEY);
  } catch {
    return null;
  }
}
function persistMql5Model(value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(MQL5_MODEL_KEY);
    else localStorage.setItem(MQL5_MODEL_KEY, value);
  } catch {
    /* localStorage no disponible — la preferencia solo vivirá en memoria */
  }
}

export type ErrorDomain = 'initial' | 'run' | 'agent' | 'pair' | 'preset' | null;

interface AgentStore {
  agents: Agent[];
  pairs: SavedPair[];
  /** Fuentes de LLM disponibles (OmniRoute / Claude CLI / OpenAI codex CLI). */
  sources: LlmSourceInfo[];
  /** Modelos disponibles por fuente, indexados por `LlmSourceInfo.id`. */
  modelsBySource: Record<string, string[]>;
  presets: AgentConfigPreset[];
  activePresetId: string | null;
  selectedPair: string;
  timeframe: string;
  maxRetries: number;
  /** Motor de generación de MQL5. `null` = usar el modelo del agente de estrategia. */
  mql5Model: string | null;
  setMql5Model: (value: string | null) => void;
  currentRun: Run | null;
  isLoading: boolean;
  isAnalysing: boolean;
  error: string | null;
  errorDomain: ErrorDomain;
  loadInitialData: () => Promise<void>;
  addAgent: (agent: Partial<Agent>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  /** Limpia dependsOn/optionalDependsOn de TODOS los agentes cargados, solo en memoria (no llama
   * al backend, no persiste). Para empezar a rediseñar una cadena desde cero reutilizando agentes
   * existentes. Ver wiki-Traiding/proyecto-dashboard/specs/2026-09-06-estrategias-simples-y-noticias-design.md */
  detachAgentRelations: () => void;
  savePresetAs: (name: string) => Promise<void>;
  overwriteActivePreset: () => Promise<void>;
  loadPreset: (id: string) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  setSelectedPair: (pair: string) => void;
  setTimeframe: (timeframe: string) => void;
  setMaxRetries: (maxRetries: number) => void;
  runWorkflow: () => Promise<void>;
  resumeWorkflow: (agentId?: string) => Promise<void>;
  stopWorkflow: () => Promise<void>;
  loadRun: (id: string) => Promise<void>;
  toggleFavorite: (symbol: string, favorite: boolean) => Promise<void>;
  clearError: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  pairs: [],
  sources: [],
  modelsBySource: {},
  presets: [],
  activePresetId: null,
  selectedPair: 'EUR/USD',
  timeframe: 'H1',
  maxRetries: 2,
  mql5Model: readStoredMql5Model(),
  currentRun: null,
  isLoading: true,
  isAnalysing: false,
  error: null,
  errorDomain: null,

  clearError: () => set({ error: null, errorDomain: null }),

  loadInitialData: async () => {
    set({ isLoading: true, error: null, errorDomain: null });
    try {
      const [loadedAgents, pairs, modelsData, configState] = await Promise.all([
        api.listAgents(),
        api.listPairs(),
        api.listModels(),
        api.listAgentConfigs(),
      ]);
      const activeConfig = configState.presets.find((preset) => preset.id === configState.activePresetId);
      const agents = activeConfig ? (await api.loadAgentConfig(activeConfig.id)).agents : loadedAgents;
      set((state) => ({
        agents,
        pairs,
        sources: modelsData.sources,
        modelsBySource: modelsData.modelsBySource,
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

  detachAgentRelations: () => {
    set((state) => ({
      agents: state.agents.map((a) => ({ ...a, dependsOn: [], optionalDependsOn: [] })),
    }));
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
      const preset = get().presets.find((item) => item.id === id);
      set({
        agents,
        activePresetId,
        selectedPair: preset?.referenceAsset ?? get().selectedPair,
        timeframe: preset?.defaultTimeframe ?? get().timeframe,
        maxRetries: preset?.consensus.maxRevisionRounds ?? get().maxRetries,
        mql5Model: preset?.mql5Model ?? get().mql5Model,
        error: null,
        errorDomain: null,
      });
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
  setMql5Model: (value) => {
    persistMql5Model(value);
    set({ mql5Model: value });
  },

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
    const { selectedPair, timeframe, maxRetries, activePresetId } = get();
    set({ isAnalysing: true, error: null, errorDomain: null });
    try {
      const run = await api.startRun(selectedPair, timeframe, maxRetries, activePresetId ?? undefined, 'real');
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

  stopWorkflow: async () => {
    const { currentRun } = get();
    if (!currentRun) return;
    try {
      const run = await api.stopRun(currentRun.id);
      set({ currentRun: run });
      // Da un respiro a que el proceso CLI matado termine de propagar el error "Detenido por el
      // usuario" hasta la tarjeta del agente antes de refrescar una última vez.
      await new Promise((resolve) => setTimeout(resolve, 500));
      const latest = await api.getRun(currentRun.id);
      set({ currentRun: latest });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error deteniendo el análisis',
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

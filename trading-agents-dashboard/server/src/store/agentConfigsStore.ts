import { readJson, writeJson } from './jsonStore.js';
import { AGENT_CONFIGS_FILE } from '../paths.js';
import type { Agent, AgentConfigPreset } from '../types.js';

interface AgentConfigsFile {
  presets: AgentConfigPreset[];
  activePresetId: string | null;
}

const EMPTY_STATE: AgentConfigsFile = { presets: [], activePresetId: null };

export async function loadAgentConfigsState(): Promise<AgentConfigsFile> {
  return readJson<AgentConfigsFile>(AGENT_CONFIGS_FILE, EMPTY_STATE);
}

async function saveAgentConfigsState(state: AgentConfigsFile): Promise<void> {
  await writeJson(AGENT_CONFIGS_FILE, state);
}

export async function createPreset(name: string, agents: Agent[]): Promise<AgentConfigPreset> {
  const state = await loadAgentConfigsState();
  const now = new Date().toISOString();
  const preset: AgentConfigPreset = {
    id: `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    agents,
    createdAt: now,
    updatedAt: now,
  };
  state.presets.push(preset);
  state.activePresetId = preset.id;
  await saveAgentConfigsState(state);
  return preset;
}

export async function overwritePreset(id: string, agents: Agent[]): Promise<AgentConfigPreset | null> {
  const state = await loadAgentConfigsState();
  const preset = state.presets.find((p) => p.id === id);
  if (!preset) return null;
  preset.agents = agents;
  preset.updatedAt = new Date().toISOString();
  await saveAgentConfigsState(state);
  return preset;
}

export async function setActivePreset(id: string | null): Promise<void> {
  const state = await loadAgentConfigsState();
  state.activePresetId = id;
  await saveAgentConfigsState(state);
}

export async function deletePreset(id: string): Promise<boolean> {
  const state = await loadAgentConfigsState();
  const index = state.presets.findIndex((p) => p.id === id);
  if (index === -1) return false;
  state.presets.splice(index, 1);
  if (state.activePresetId === id) state.activePresetId = null;
  await saveAgentConfigsState(state);
  return true;
}

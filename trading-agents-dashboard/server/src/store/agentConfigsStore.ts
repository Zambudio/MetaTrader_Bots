import { readJson, writeJson } from './jsonStore.js';
import { AGENT_CONFIGS_FILE } from '../paths.js';
import type { Agent, AgentConfigPreset } from '../types.js';
import { cloneBaselinePresets } from '../config/baselinePresets.js';

interface AgentConfigsFile {
  presets: AgentConfigPreset[];
  activePresetId: string | null;
}

const EMPTY_STATE: AgentConfigsFile = { presets: [], activePresetId: null };

export function isProtectedPreset(id: string): boolean {
  const baselines = cloneBaselinePresets();
  return baselines.some((baseline) => baseline.id === id);
}

export async function loadAgentConfigsState(): Promise<AgentConfigsFile> {
  const state = await readJson<AgentConfigsFile>(AGENT_CONFIGS_FILE, EMPTY_STATE);
  const baselines = cloneBaselinePresets();
  const baselineIds = new Set(baselines.map((b) => b.id));
  let changed = false;

  for (const baseline of baselines) {
    const index = state.presets.findIndex((preset) => preset.id === baseline.id);
    if (index === -1) {
      state.presets.push(baseline);
      changed = true;
    }
  }

  for (const preset of state.presets) {
    const isProtected = baselineIds.has(preset.id);
    if (preset.isProtected !== isProtected) {
      preset.isProtected = isProtected;
      changed = true;
    }
  }

  const active = state.presets.find((preset) => preset.id === state.activePresetId);
  if (!active || active.schemaVersion !== 'multiagent-config.v1') {
    state.activePresetId = baselines[0]?.id ?? state.presets[0]?.id ?? null;
    changed = true;
  }

  if (changed) await saveAgentConfigsState(state);
  return state;
}

async function saveAgentConfigsState(state: AgentConfigsFile): Promise<void> {
  await writeJson(AGENT_CONFIGS_FILE, state);
}

export async function createPreset(name: string, agents: Agent[]): Promise<AgentConfigPreset> {
  const state = await loadAgentConfigsState();
  const now = new Date().toISOString();
  const template = state.presets.find((item) => item.id === state.activePresetId) ?? cloneBaselinePresets()[0];
  const preset: AgentConfigPreset = {
    id: `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    schemaVersion: 'multiagent-config.v1',
    key: name.toUpperCase().replace(/\s+/g, '_'),
    version: `${template.marketType}_custom_${Date.now()}`,
    marketType: template.marketType,
    referenceAsset: template.referenceAsset,
    defaultTimeframe: template.defaultTimeframe,
    agents,
    dataPolicy: structuredClone(template.dataPolicy),
    consensus: structuredClone(template.consensus),
    validation: structuredClone(template.validation),
    riskPolicy: structuredClone(template.riskPolicy),
    mql5Model: template.mql5Model,
    isProtected: false,
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
  if (isProtectedPreset(preset.id)) {
    return null;
  }
  preset.agents = agents;
  preset.updatedAt = new Date().toISOString();
  await saveAgentConfigsState(state);
  return preset;
}

export async function getPreset(id: string): Promise<AgentConfigPreset | null> {
  const state = await loadAgentConfigsState();
  return state.presets.find((preset) => preset.id === id) ?? null;
}

export async function getActivePreset(): Promise<AgentConfigPreset | null> {
  const state = await loadAgentConfigsState();
  return state.presets.find((preset) => preset.id === state.activePresetId) ?? null;
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
  if (isProtectedPreset(state.presets[index].id)) return false;
  state.presets.splice(index, 1);
  if (state.activePresetId === id) {
    state.activePresetId = state.presets[0]?.id ?? null;
  }
  await saveAgentConfigsState(state);
  return true;
}


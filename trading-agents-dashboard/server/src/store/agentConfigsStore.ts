import { readJson, writeJson } from './jsonStore.js';
import { AGENT_CONFIGS_FILE } from '../paths.js';
import type { Agent, AgentConfigPreset } from '../types.js';
import { cloneBaselinePresets } from '../config/baselinePresets.js';

interface AgentConfigsFile {
  presets: AgentConfigPreset[];
  activePresetId: string | null;
}

const EMPTY_STATE: AgentConfigsFile = { presets: [], activePresetId: null };

/**
 * Las baselines son código versionado e inmutable por API. Si una versión publicada conserva su
 * ID pero recibe una corrección de prompt autorizada, la copia persistida debe refrescarse; los
 * presets custom y la selección activa permanecen intactos.
 */
export function mergeBaselinesIntoState(
  state: AgentConfigsFile,
  baselines: AgentConfigPreset[],
): boolean {
  let changed = false;
  for (const baseline of baselines) {
    const index = state.presets.findIndex((preset) => preset.id === baseline.id);
    if (index === -1) {
      state.presets.push(structuredClone(baseline));
      changed = true;
    } else if (JSON.stringify(state.presets[index]) !== JSON.stringify(baseline)) {
      state.presets[index] = structuredClone(baseline);
      changed = true;
    }
  }
  return changed;
}

export async function loadAgentConfigsState(): Promise<AgentConfigsFile> {
  const state = await readJson<AgentConfigsFile>(AGENT_CONFIGS_FILE, EMPTY_STATE);
  const baselines = cloneBaselinePresets();
  let changed = mergeBaselinesIntoState(state, baselines);
  const active = state.presets.find((preset) => preset.id === state.activePresetId);
  const activeIsDeprecatedBaseline = Boolean(active?.id.startsWith('baseline-') && !baselines.some((baseline) => baseline.id === active.id));
  if (!active || active.schemaVersion !== 'multiagent-config.v1' || activeIsDeprecatedBaseline) {
    state.activePresetId = baselines.find((baseline) => baseline.key === active?.key)?.id ?? baselines[0].id;
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
  if (preset.id.startsWith('baseline-')) {
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
  if (state.presets[index].id.startsWith('baseline-')) return false;
  state.presets.splice(index, 1);
  if (state.activePresetId === id) state.activePresetId = null;
  await saveAgentConfigsState(state);
  return true;
}

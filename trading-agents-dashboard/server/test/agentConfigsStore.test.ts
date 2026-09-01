import { describe, expect, it } from 'vitest';
import { cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { mergeBaselinesIntoState } from '../src/store/agentConfigsStore.js';

describe('sincronización de baselines persistidas', () => {
  it('refresca una baseline por ID sin tocar presets custom ni el preset activo', () => {
    const baselines = cloneBaselinePresets();
    const current = baselines.find((preset) => preset.version === 'forex_v1.1')!;
    const stale = structuredClone(current);
    stale.agents[0].systemPrompt = 'prompt persistido obsoleto';
    const custom = { ...structuredClone(current), id: 'preset-custom-user', version: 'forex_custom_1' };
    const state = {
      presets: [stale, custom],
      activePresetId: 'preset-custom-user',
    };

    expect(mergeBaselinesIntoState(state, baselines)).toBe(true);
    expect(state.presets.find((preset) => preset.id === current.id)).toEqual(current);
    expect(state.presets.find((preset) => preset.id === custom.id)).toEqual(custom);
    expect(state.activePresetId).toBe('preset-custom-user');
  });

  it('no marca cambios cuando las baselines ya coinciden', () => {
    const baselines = cloneBaselinePresets();
    const state = { presets: structuredClone(baselines), activePresetId: baselines[2].id };
    expect(mergeBaselinesIntoState(state, baselines)).toBe(false);
  });
});

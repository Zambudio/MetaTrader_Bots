import { describe, expect, it } from 'vitest';
import { BASELINE_PRESETS, cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { hashConfiguration, validatePreset } from '../src/config/configValidation.js';

describe('baselines multiagente por mercado', () => {
  it('define tres configuraciones independientes, válidas y versionadas', () => {
    expect(BASELINE_PRESETS.map((preset) => preset.key)).toEqual(['FOREX', 'ACCIONES', 'CRIPTOMONEDAS']);
    expect(BASELINE_PRESETS.map((preset) => preset.version)).toEqual(['forex_v1', 'stocks_v1', 'crypto_v1']);
    expect(BASELINE_PRESETS.map((preset) => preset.referenceAsset)).toEqual(['EUR/USD', 'TSLA', 'BTC/USD']);
    for (const preset of BASELINE_PRESETS) expect(validatePreset(preset)).toEqual({ valid: true, errors: [] });
  });

  it('no comparte IDs, prompts ni referencias entre mercados', () => {
    const [forex, stocks, crypto] = BASELINE_PRESETS;
    const ids = BASELINE_PRESETS.map((preset) => new Set(preset.agents.map((agent) => agent.id)));
    expect([...ids[0]].some((id) => ids[1].has(id) || ids[2].has(id))).toBe(false);
    expect([...ids[1]].some((id) => ids[2].has(id))).toBe(false);
    expect(forex.agents.some((agent) => agent.id === 'fx-macro')).toBe(true);
    expect(stocks.agents.some((agent) => agent.id === 'stock-corporate')).toBe(true);
    expect(crypto.agents.some((agent) => agent.id === 'crypto-derivatives')).toBe(true);
  });

  it('sobrevive a round-trip y mantiene hash estable sin referencias mutables compartidas', () => {
    const clones = cloneBaselinePresets();
    const roundTrip = JSON.parse(JSON.stringify(clones));
    expect(roundTrip).toEqual(clones);
    expect(roundTrip.map(hashConfiguration)).toEqual(clones.map(hashConfiguration));
    clones[0].agents[0].name = 'mutado';
    expect(BASELINE_PRESETS[0].agents[0].name).not.toBe('mutado');
  });
});

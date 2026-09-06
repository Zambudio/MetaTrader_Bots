import { describe, expect, it } from 'vitest';
import { BASELINE_PRESETS, cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { hashConfiguration, validatePreset } from '../src/config/configValidation.js';
import { buildLevels } from '../src/engine/orchestrator.js';
import { isProtectedPreset, deletePreset, loadAgentConfigsState } from '../src/store/agentConfigsStore.js';

describe('baselines multiagente por mercado', () => {
  it('define configuraciones estándar y simples independientes, válidas y versionadas', () => {
    expect(BASELINE_PRESETS.map((preset) => preset.version)).toEqual([
      'forex_v1',
      'stocks_v1',
      'crypto_v1',
      'forex_simple_v1',
      'stocks_simple_v1',
      'crypto_simple_v1',
    ]);
    expect(BASELINE_PRESETS.map((preset) => preset.referenceAsset)).toEqual([
      'EUR/USD',
      'TSLA',
      'BTC/USD',
      'EUR/USD',
      'TSLA',
      'BTC/USD',
    ]);
    for (const preset of BASELINE_PRESETS) {
      expect(validatePreset(preset)).toEqual({ valid: true, errors: [] });
    }
  });

  it('configuraciones simples tienen como máximo 3 agentes en serie estricta (1 por nivel)', () => {
    const simplePresets = BASELINE_PRESETS.filter((p) => p.version.includes('simple'));
    expect(simplePresets).toHaveLength(3);

    for (const preset of simplePresets) {
      expect(preset.agents.length).toBeLessThanOrEqual(3);
      expect(preset.name).toContain('Simple');
      // Todos los agentes usan omniroute:auto/best-coding
      expect(preset.agents.every((a) => a.model === 'omniroute:auto/best-coding')).toBe(true);

      // Verificación de cadena serial estricta con buildLevels
      const levels = buildLevels(preset.agents);
      expect(levels).toHaveLength(preset.agents.length);
      for (const level of levels) {
        expect(level).toHaveLength(1);
      }

      // Secuencia de contratos: analysis -> strategy -> verdict
      expect(preset.agents[0].outputType).toBe('analysis');
      expect(preset.agents[1].outputType).toBe('strategy');
      expect(preset.agents[2].outputType).toBe('verdict');
    }
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

  it('protege las plantillas base de borrado y permite borrar presets personalizados', async () => {
    const baselines = cloneBaselinePresets();
    for (const b of baselines) {
      expect(isProtectedPreset(b.id)).toBe(true);
      const deleted = await deletePreset(b.id);
      expect(deleted).toBe(false);
    }
    expect(isProtectedPreset('custom-preset-id')).toBe(false);
    expect(isProtectedPreset('baseline-forex-forex-v1-1')).toBe(false);
  });
});

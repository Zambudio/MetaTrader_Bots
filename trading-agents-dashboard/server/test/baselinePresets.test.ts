import { describe, expect, it } from 'vitest';
import { BASELINE_PRESETS, cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { hashConfiguration, validatePreset } from '../src/config/configValidation.js';

describe('baselines multiagente por mercado', () => {
  it('publica forex_v1.1 y v1.2 sin sobrescribir las baselines reproducibles', () => {
    const forexV1 = BASELINE_PRESETS.find((preset) => preset.version === 'forex_v1');
    const forexV11 = BASELINE_PRESETS.find((preset) => preset.version === 'forex_v1.1');
    const forexV12 = BASELINE_PRESETS.find((preset) => preset.version === 'forex_v1.2');
    const forexV121 = BASELINE_PRESETS.find((preset) => preset.version === 'forex_v1.2.1');

    expect(forexV1).toBeDefined();
    expect(hashConfiguration(forexV1!)).toBe('504e6f2ac86fd05a321e99049b489654f48524f776b7bcf54e679fb70429bb8c');
    expect(forexV11).toBeDefined();
    expect(forexV11?.id).toBe('baseline-forex-forex-v1-1');
    expect(hashConfiguration(forexV11!)).toBe('64c35dc7e78d558c4329d58c1ba62f733c0dc28bef248db358527d2cabe9d135');
    expect(forexV11?.agents.map((agent) => agent.model)).toEqual(Array(8).fill('claude:sonnet'));
    expect(validatePreset(forexV11!)).toEqual({ valid: true, errors: [] });
    expect(forexV12).toBeDefined();
    expect(forexV12?.id).toBe('baseline-forex-forex-v1-2');
    expect(hashConfiguration(forexV12!)).toBe('feddf9d404020de68e6884a519cb6b558292e98e846e1e77bd5bf35145434cdc');
    expect(forexV12?.agents.map((agent) => agent.model)).toEqual(Array(8).fill('omniroute:auto/best-fast'));
    expect(forexV12?.agents.map((agent) => agent.systemPrompt)).toEqual(
      forexV11?.agents.map((agent) => agent.systemPrompt)
    );
    expect(validatePreset(forexV12!)).toEqual({ valid: true, errors: [] });
    expect(forexV121).toBeDefined();
    expect(forexV121?.id).toBe('baseline-forex-forex-v1-2-1');
    expect(hashConfiguration(forexV121!)).toBe('e84b3d40062a9dc84f86f45b550f165bbb68341f4695b8d2c0c83a2bc50ad9a2');
    expect(forexV121?.agents.slice(0, 4).map((agent) => agent.model)).toEqual(
      Array(4).fill('omniroute:auto/best-fast')
    );
    expect(forexV121?.agents.slice(4).map((agent) => agent.model)).toEqual(
      Array(4).fill('omniroute:auto/best-reasoning')
    );
    expect(forexV121?.agents.map((agent) => agent.systemPrompt)).toEqual(
      forexV11?.agents.map((agent) => agent.systemPrompt)
    );
    expect(validatePreset(forexV121!)).toEqual({ valid: true, errors: [] });

    const prompts = new Map(forexV11?.agents.map((agent) => [agent.id, agent.systemPrompt]));
    expect(prompts.get('fx-session')).toContain('HISTORICAL_AS_OF');
    expect(prompts.get('fx-session')).toContain('dia de la semana');
    expect(prompts.get('fx-session')).toContain('No infieras liquidez');
    expect(prompts.get('fx-session')).toContain('1 pip = 0.0001');
    expect(prompts.get('fx-session')).toContain('No calcules ni menciones antiguedad');
    expect(prompts.get('fx-strategy')).toContain('un evento y como maximo un filtro');
    expect(prompts.get('fx-strategy')).toContain('misma referencia de precio ejecutable');
    expect(prompts.get('fx-strategy')).toContain('No inventes cifras de spread ni slippage');
    expect(prompts.get('fx-strategy')).toContain('no predice la apertura futura');
    expect(prompts.get('fx-risk')).toContain('no es blocker por si sola');
    expect(prompts.get('fx-risk')).toContain('misma referencia de precio ejecutable');
    expect(prompts.get('fx-critic')).toContain('no es blocker por si sola');
    expect(prompts.get('fx-critic')).toContain('misma referencia de precio ejecutable');
    expect(prompts.get('fx-judge')).toContain('no exijas rentabilidad ni optimizacion');
    expect(prompts.get('fx-judge')).toContain('misma referencia de precio ejecutable');
  });

  it('define tres mercados independientes con baselines válidas y versionadas', () => {
    expect(BASELINE_PRESETS.map((preset) => preset.key)).toEqual(['FOREX', 'FOREX', 'FOREX', 'FOREX', 'ACCIONES', 'CRIPTOMONEDAS']);
    expect(BASELINE_PRESETS.map((preset) => preset.version)).toEqual(['forex_v1', 'forex_v1.1', 'forex_v1.2', 'forex_v1.2.1', 'stocks_v1', 'crypto_v1']);
    expect(BASELINE_PRESETS.map((preset) => preset.referenceAsset)).toEqual(['EUR/USD', 'EUR/USD', 'EUR/USD', 'EUR/USD', 'TSLA', 'BTC/USD']);
    for (const preset of BASELINE_PRESETS) expect(validatePreset(preset)).toEqual({ valid: true, errors: [] });
  });

  it('no comparte IDs, prompts ni referencias entre mercados', () => {
    const forex = BASELINE_PRESETS.find((preset) => preset.version === 'forex_v1.2.1')!;
    const stocks = BASELINE_PRESETS.find((preset) => preset.version === 'stocks_v1')!;
    const crypto = BASELINE_PRESETS.find((preset) => preset.version === 'crypto_v1')!;
    const ids = [forex, stocks, crypto].map((preset) => new Set(preset.agents.map((agent) => agent.id)));
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

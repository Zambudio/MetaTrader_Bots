import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentConfigPreset, Run } from '../src/types.js';
import { cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { hashConfiguration } from '../src/config/configValidation.js';

const saveRunMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/store/runsStore.js', () => ({ saveRun: (...args: unknown[]) => saveRunMock(...args) }));
const { executeRun } = await import('../src/engine/orchestrator.js');

const SNAPSHOTS: Record<string, string> = {
  'EUR/USD': '=== SNAPSHOT DE MERCADO REAL (EUR/USD · H1) ===\nSesión determinista: FX_WEEKEND_CLOSED\nPrecio Actual (Cierre): 1.15850 | Apertura: 1.15840 | Máx: 1.15900 | Mín: 1.15800\nMedias Móviles: EMA(20): 1.15820 | EMA(50): 1.15700 | SMA(200): 1.15000\nATR (14 periodos / Volatilidad): 0.00100\nVolumen OHLCV: último 100 | media20 90 | ratio 1.11x',
  TSLA: '=== SNAPSHOT DE MERCADO REAL (TSLA · H1) ===\nSesión determinista: US_CASH_CLOSED\nPrecio Actual (Cierre): 350 | Apertura: 345 | Máx: 352 | Mín: 344\nMedias Móviles: EMA(20): 348 | EMA(50): 340 | SMA(200): 320\nATR (14 periodos / Volatilidad): 8\nVolumen OHLCV: último 1200000 | media20 1000000 | ratio 1.2x\nGap vs cierre anterior: 3 (0.86%)',
  'BTC/USD': '=== SNAPSHOT DE MERCADO REAL (BTC/USD · H1) ===\nSesión determinista: 24x7\nPrecio Actual (Cierre): 78000 | Apertura: 77500 | Máx: 78500 | Mín: 77000\nMedias Móviles: EMA(20): 77600 | EMA(50): 76000 | SMA(200): 70000\nATR (14 periodos / Volatilidad): 1000\nVolumen OHLCV: último 250 | media20 200 | ratio 1.25x',
};

function makeRun(config: AgentConfigPreset, sequence: number): Run {
  return {
    id: `validation-${config.key}-${sequence}`,
    pair: config.referenceAsset,
    timeframe: config.defaultTimeframe,
    status: 'running',
    createdAt: new Date(2026, 7, 30, 10, sequence).toISOString(),
    results: config.agents.map((agent) => ({ agentId: agent.id, status: 'waiting' })),
    configuration: structuredClone(config), configurationHash: hashConfiguration(config),
    executionMode: 'simulation', marketSnapshot: SNAPSHOTS[config.referenceAsset], issues: [],
    retryCount: 0, maxRetries: config.consensus.maxRevisionRounds,
  };
}

describe('validation loop simulado y aislamiento', () => {
  beforeEach(() => saveRunMock.mockClear());

  it('ejecuta tres ciclos consecutivos válidos por configuración y omite solo especialistas sin datos', async () => {
    for (const config of cloneBaselinePresets()) {
      for (let sequence = 1; sequence <= 3; sequence++) {
        const run = makeRun(config, sequence);
        await executeRun(run, config.agents);
        expect(run.status).toBe('done');
        expect(run.finalState).toBe('validated');
        expect(run.results.filter((result) => result.status === 'error')).toHaveLength(0);
        expect(run.results.filter((result) => result.status === 'waiting')).toHaveLength(0);
        const optional = config.agents.filter((agent) => agent.activation?.requiredData?.some((item) => config.dataPolicy.unavailableCapabilities.includes(item)));
        expect(run.results.filter((result) => result.status === 'skipped').map((result) => result.agentId).sort())
          .toEqual(optional.map((agent) => agent.id).sort());
        expect(run.results.find((result) => result.verdict)?.verdict?.veredicto).toBe('go');
      }
    }
  });

  it('alterna FOREX → CRIPTO → ACCIONES → FOREX sin contaminación', async () => {
    const configs = cloneBaselinePresets();
    const order = [configs[0], configs[2], configs[1], configs[0]];
    for (const [index, config] of order.entries()) {
      const run = makeRun(config, index + 20);
      await executeRun(run, config.agents);
      expect(run.configuration?.key).toBe(config.key);
      expect(run.configurationHash).toBe(hashConfiguration(config));
      expect(run.results.map((result) => result.agentId).sort()).toEqual(config.agents.map((agent) => agent.id).sort());
      expect(run.results.every((result) => result.agentId.startsWith(config.marketType === 'stocks' ? 'stock-' : config.marketType === 'crypto' ? 'crypto-' : 'fx-'))).toBe(true);
    }
  });
});

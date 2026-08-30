import path from 'node:path';
import { cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { hashConfiguration, validatePreset } from '../src/config/configValidation.js';
import { executeRun } from '../src/engine/orchestrator.js';
import { DATA_DIR } from '../src/paths.js';
import { loadAgentConfigsState, setActivePreset } from '../src/store/agentConfigsStore.js';
import { writeJson } from '../src/store/jsonStore.js';
import type { AgentConfigPreset, Run } from '../src/types.js';
import { summarizeValidationRuns, validateRunIsolation } from '../src/validation/metrics.js';

type Scenario = { name: string; snapshot: string | null };

const snapshots: Record<string, { bullish: string; bearish: string; sideways: string }> = {
  'EUR/USD': {
    bullish: snapshot('EUR/USD', 1.1585, 1.15, 0.001, 'FX_WEEKEND_CLOSED', 1.11),
    bearish: snapshot('EUR/USD', 1.08, 1.1, 0.0012, 'FX_WEEKEND_CLOSED', 1.35),
    sideways: snapshot('EUR/USD', 1.1, 1.1, 0.0007, 'FX_WEEKEND_CLOSED', 0.72, true),
  },
  TSLA: {
    bullish: snapshot('TSLA', 350, 320, 8, 'US_CASH_CLOSED', 1.2),
    bearish: snapshot('TSLA', 280, 320, 11, 'US_CASH_CLOSED', 1.55),
    sideways: snapshot('TSLA', 320, 320, 5, 'US_CASH_CLOSED', 0.68, true),
  },
  'BTC/USD': {
    bullish: snapshot('BTC/USD', 78_000, 70_000, 1_000, '24x7', 1.25),
    bearish: snapshot('BTC/USD', 62_000, 70_000, 1_900, '24x7', 1.8),
    sideways: snapshot('BTC/USD', 70_000, 70_000, 700, '24x7', 0.75, true),
  },
};

function snapshot(asset: string, close: number, sma200: number, atr: number, session: string, volumeRatio: number, stale = false): string {
  return `=== SNAPSHOT DE MERCADO DE VALIDACIÓN (${asset} · H1) ===
Sesion determinista: ${session}
Precio Actual (Cierre): ${close} | Apertura: ${close - atr * 0.2} | Max: ${close + atr * 0.5} | Min: ${close - atr * 0.5}
Medias Moviles: EMA(20): ${close - atr * 0.1} | EMA(50): ${close - atr * 0.3} | SMA(200): ${sma200}
RSI(14): 50 | MACD: 0 | Senal: 0 | Histograma: 0
ATR (14 periodos / Volatilidad): ${atr}
Volumen OHLCV: ultimo ${Math.round(1000 * volumeRatio)} | media20 1000 | ratio ${volumeRatio}x
${stale ? 'AVISO DE FRESCURA: snapshot obsoleto usado para probar degradacion controlada.' : ''}`;
}

function scenariosFor(config: AgentConfigPreset): Scenario[] {
  const source = snapshots[config.referenceAsset];
  return [
    { name: 'trend_bullish', snapshot: source.bullish },
    { name: 'trend_bearish_high_volatility', snapshot: source.bearish },
    { name: 'sideways_stale', snapshot: source.sideways },
    { name: 'data_unavailable', snapshot: null },
  ];
}

function makeRun(config: AgentConfigPreset, scenario: Scenario, suffix: string): Run {
  return {
    id: `baseline-validation-${suffix}-${config.key.toLowerCase()}-${scenario.name}`,
    pair: config.referenceAsset,
    timeframe: config.defaultTimeframe,
    status: 'running',
    createdAt: new Date().toISOString(),
    results: config.agents.map((agent) => ({ agentId: agent.id, status: 'waiting' })),
    configuration: structuredClone(config),
    configurationHash: hashConfiguration(config),
    executionMode: 'simulation',
    validationScenario: scenario.name,
    expectedAgentIds: config.agents.map((agent) => agent.id),
    marketSnapshot: scenario.snapshot,
    issues: [],
    retryCount: 0,
    maxRetries: config.consensus.maxRevisionRounds,
  };
}

async function main(): Promise<void> {
  const configs = cloneBaselinePresets();
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const persisted: Array<{ key: string; id: string; version: string; hash: string; recovered: boolean }> = [];

  await loadAgentConfigsState();
  for (const config of configs) {
    const validation = validatePreset(config);
    if (!validation.valid) throw new Error(`${config.key}: ${validation.errors.join('; ')}`);
    await setActivePreset(config.id);
    const reloaded = await loadAgentConfigsState();
    const recovered = reloaded.presets.find((preset) => preset.id === config.id);
    persisted.push({
      key: config.key, id: config.id, version: config.version, hash: hashConfiguration(config),
      recovered: Boolean(recovered && hashConfiguration(recovered) === hashConfiguration(config)),
    });
  }

  const runsByConfig = new Map(configs.map((config) => [config.key, [] as Run[]]));
  for (const config of configs) {
    for (const scenario of scenariosFor(config)) {
      const run = makeRun(config, scenario, suffix);
      await executeRun(run, config.agents);
      for (const isolationError of validateRunIsolation(run, config)) {
        const code = isolationError.startsWith('UNEXPECTED_AGENT') ? 'UNEXPECTED_AGENT' : isolationError.startsWith('MISSING_AGENT') ? 'MISSING_AGENT' : 'CONFIGURATION_ERROR';
        run.issues!.push({ code, severity: 'error', message: isolationError });
        run.status = 'error';
        run.finalState = 'error';
      }
      runsByConfig.get(config.key)!.push(run);
    }
  }

  const isolationOrder = [configs[0], configs[2], configs[1], configs[0]];
  const isolationRuns: string[] = [];
  for (const [index, config] of isolationOrder.entries()) {
    const scenario = scenariosFor(config)[index % 3];
    const run = makeRun(config, { ...scenario, name: `isolation_${index + 1}_${scenario.name}` }, suffix);
    await executeRun(run, config.agents);
    const isolationErrors = validateRunIsolation(run, config);
    if (isolationErrors.length > 0) throw new Error(`${run.id}: ${isolationErrors.join(', ')}`);
    runsByConfig.get(config.key)!.push(run);
    isolationRuns.push(run.id);
  }

  // El estado global queda deliberadamente en la baseline Forex; cada run sigue fijado a su copia/hash.
  await setActivePreset(configs[0].id);
  const allRuns = [...runsByConfig.values()].flat();
  const report = {
    schemaVersion: 'baseline-validation.v1', generatedAt: new Date().toISOString(),
    executionMode: 'simulation', liveOrdersExecuted: false,
    persistence: persisted,
    isolationOrder: isolationOrder.map((config) => config.key), isolationRuns,
    metrics: configs.map((config) => summarizeValidationRuns(config, runsByConfig.get(config.key)!)),
    runs: allRuns.map((run) => ({
      run_id: run.id, timestamp: run.createdAt, configuration: run.configuration?.key,
      version: run.configuration?.version, asset: run.pair, scenario: run.validationScenario,
      expected_agents: run.expectedAgentIds,
      executed_agents: run.results.filter((result) => result.status === 'done').map((result) => result.agentId),
      omitted_agents: run.results.filter((result) => result.status === 'skipped').map((result) => ({ agentId: result.agentId, reason: result.omissionReason })),
      duration_ms: run.durationMs, errors: run.issues?.filter((issue) => issue.severity === 'error'),
      warnings: run.issues?.filter((issue) => issue.severity === 'warning'), data_quality: run.dataQuality,
      final_state: run.finalState, status: run.status,
    })),
  };
  await writeJson(path.join(DATA_DIR, 'validation-loop-latest.json'), report);
  if (persisted.some((item) => !item.recovered) || allRuns.some((run) => run.status !== 'done')) {
    throw new Error('La baseline no superó persistencia o ejecución funcional. Consulta validation-loop-latest.json.');
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();

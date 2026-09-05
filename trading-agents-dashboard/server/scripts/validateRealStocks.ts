/**
 * Matriz REDUCIDA de ejecuciones REALES de la baseline ACCIONES `stocks_v1` sobre TSLA H1.
 *
 * Mirror deliberadamente minimalista de `validateRealForex.ts` (misma infraestructura: timeouts,
 * reintentos, cap de rondas de revisión, orquestador real con `executionMode:'real'`). A
 * diferencia de la matriz de 6 escenarios usada en FOREX, aquí solo se corren 2: la cuota de
 * Claude/Codex se agotó rápido durante esa validación y esta se hará "una por una en vivo
 * afinando" después de este bloque mínimo, así que solo se justifican los dos escenarios que
 * aportan una señal distinta:
 *   - s1-absent: gratis (0 llamadas LLM esperadas) — confirma abstención fail-closed cuando no
 *     hay snapshot, igual que R5a en FOREX.
 *   - s2-trend: un run histórico real para ejercitar la cadena completa (especialistas →
 *     estrategia → riesgo/crítico → juez) al menos una vez y observar defectos reales de stocks_v1
 *     (que NO tiene las correcciones de prompt de forex_v1.1 — es la baseline original sin parchear).
 *
 * Seguridad: NO envía órdenes, NO usa capital, NO toca MetaTrader. Solo análisis.
 *
 * Uso:  npx tsx --env-file-if-exists=.env scripts/validateRealStocks.ts <scenarioId|all>
 *   scenarioId ∈ s1-absent | s2-trend
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPreset, loadAgentConfigsState } from '../src/store/agentConfigsStore.js';
import { hashConfiguration, validatePreset } from '../src/config/configValidation.js';
import { executeRun } from '../src/engine/orchestrator.js';
import { buildMarketSnapshot, buildMarketSnapshotFromCandles } from '../src/engine/marketSnapshot.js';
import { getCandles, candleSourceLabel } from '../src/marketData/index.js';
import { loadRun } from '../src/store/runsStore.js';
import { readJson, writeJson } from '../src/store/jsonStore.js';
import { DATA_DIR } from '../src/paths.js';
import type { AgentConfigPreset, Run } from '../src/types.js';

// --- Ajustes de infraestructura para ejecución real (mismos que validateRealForex.ts) ---
process.env.AGENT_CLI_TIMEOUT_MS = process.env.AGENT_CLI_TIMEOUT_MS || '600000';
process.env.AGENT_MAX_CONCURRENCY = process.env.AGENT_MAX_CONCURRENCY || '1';
process.env.AGENT_CLI_RETRIES = process.env.AGENT_CLI_RETRIES || '0';

const STOCK_ID = 'baseline-acciones-stocks-v1';
const EXPECTED_HASH = 'bff0aef503604f82da45945d332b0c411319fc7f47196672a78c20fe14c44c3d';
const SYMBOL = 'TSLA';
const TF = 'H1';
const REPORT_FILE = path.join(DATA_DIR, 'validation-real-stocks-latest.json');

/**
 * Cap fail-fast de rondas de revisión "AJUSTAR", mismo mecanismo que
 * `resolveForexMaxRevisionRounds` en `validateRealForex.ts`. Controla `run.maxRetries` sin tocar
 * `preset.consensus.maxRevisionRounds` (el hash del preset no se ve afectado).
 */
export function resolveStockMaxRevisionRounds(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2) {
    throw new Error(`STOCKS_VALIDATION_MAX_REVISION_ROUNDS inválido: "${raw}" (permitido 0..2)`);
  }
  return parsed;
}

interface ScenarioSpec {
  id: string;
  label: string;
  /** as_of histórico (UTC) para reconstruir la ventana; null/undefined = snapshot en vivo. */
  asOf?: string | null;
  /** fuerza snapshot ausente. */
  absent?: boolean;
}

const SCENARIOS: ScenarioSpec[] = [
  { id: 's1-absent', label: 'Prueba negativa: datos de mercado ausentes', absent: true },
  { id: 's2-trend', label: 'Periodo histórico real (cadena completa especialistas→estrategia→riesgo/crítico→juez)', asOf: '2026-06-15 20:00:00' },
];

function short(h: string) { return `${h.slice(0, 10)}…${h.slice(-4)}`; }

async function buildScenarioSnapshot(spec: ScenarioSpec): Promise<{ snapshot: string | null; provenance: Record<string, unknown> }> {
  if (spec.absent) {
    return { snapshot: null, provenance: { mode: 'absent', note: 'marketSnapshot forzado a null' } };
  }
  if (spec.asOf) {
    const candles = await getCandles(SYMBOL, TF, { endDate: spec.asOf, noCache: true });
    const snapshot = buildMarketSnapshotFromCandles(candles, SYMBOL, TF, { asOf: spec.asOf });
    return {
      snapshot,
      provenance: {
        mode: 'historical', source: candleSourceLabel(SYMBOL), symbol: SYMBOL, timeframe: TF,
        asOf: spec.asOf, candles: candles.length,
        range: candles.length ? [new Date(candles[0].time * 1000).toISOString(), new Date(candles[candles.length - 1].time * 1000).toISOString()] : null,
        lastCandle: candles.length ? new Date(candles[candles.length - 1].time * 1000).toISOString() : null,
      },
    };
  }
  // live
  const snapshot = await buildMarketSnapshot(SYMBOL, TF, { noCache: true });
  return {
    snapshot,
    provenance: { mode: 'live', source: candleSourceLabel(SYMBOL), symbol: SYMBOL, timeframe: TF, fetchedAt: new Date().toISOString() },
  };
}

function makeRun(preset: AgentConfigPreset, spec: ScenarioSpec, snapshot: string | null, suffix: string, maxRevisionRounds: number): Run {
  return {
    id: `real-stocks-${suffix}-${spec.id}`,
    pair: SYMBOL,
    timeframe: TF,
    status: 'running',
    createdAt: new Date().toISOString(),
    results: preset.agents.map((a) => ({ agentId: a.id, status: 'waiting' })),
    configuration: structuredClone(preset),
    configurationHash: hashConfiguration(preset),
    executionMode: 'real',
    validationScenario: spec.id,
    expectedAgentIds: preset.agents.map((a) => a.id),
    marketSnapshot: snapshot,
    issues: [],
    retryCount: 0,
    maxRetries: maxRevisionRounds,
  };
}

function summarizeRun(run: Run, provenance: Record<string, unknown>) {
  return {
    run_id: run.id,
    scenario: run.validationScenario,
    pair: run.pair,
    timeframe: run.timeframe,
    executionMode: run.executionMode,
    configurationId: run.configuration?.id,
    configurationVersion: run.configuration?.version,
    configurationHash: run.configurationHash,
    dataProvenance: provenance,
    dataQuality: run.dataQuality,
    dataCapabilities: run.dataCapabilities,
    marketSnapshotUsed: run.marketSnapshot ?? null,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    status: run.status,
    finalState: run.finalState,
    retryCount: run.retryCount,
    expectedAgents: run.expectedAgentIds,
    executedAgents: run.results.filter((r) => r.status === 'done').map((r) => r.agentId),
    skippedAgents: run.results.filter((r) => r.status === 'skipped').map((r) => ({ agentId: r.agentId, reason: r.omissionReason })),
    erroredAgents: run.results.filter((r) => r.status === 'error').map((r) => ({ agentId: r.agentId, error: r.error })),
    agents: run.results.map((r) => ({
      agentId: r.agentId,
      status: r.status,
      activationReason: r.activationReason,
      omissionReason: r.omissionReason,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      attempt: r.attempt,
      error: r.error,
      analysis: r.analysis,
      strategy: r.strategy,
      verdict: r.verdict,
    })),
    issues: run.issues,
  };
}

async function main() {
  const which = process.argv[2] || 'all';
  const wanted = which.split(',').map((s) => s.trim()).filter(Boolean);
  const specs = which === 'all' ? SCENARIOS : SCENARIOS.filter((s) => wanted.includes(s.id));
  if (specs.length === 0) {
    console.error(`Escenario(s) desconocido(s): ${which}. Válidos: ${SCENARIOS.map((s) => s.id).join(', ')}, all`);
    process.exit(1);
  }

  await loadAgentConfigsState();
  const preset = await getPreset(STOCK_ID);
  if (!preset) throw new Error(`No se encontró el preset ${STOCK_ID}`);
  const presetHash = hashConfiguration(preset);
  const val = validatePreset(preset);
  console.log(`preset ${preset.id} v${preset.version} hash ${short(presetHash)} valid=${val.valid}`);
  if (!val.valid) throw new Error(`preset inválido: ${val.errors.join('; ')}`);
  if (presetHash !== EXPECTED_HASH) throw new Error(`HASH INESPERADO: ${presetHash} != ${EXPECTED_HASH}`);

  const maxRevisionRounds = resolveStockMaxRevisionRounds(process.env.STOCKS_VALIDATION_MAX_REVISION_ROUNDS, preset.consensus.maxRevisionRounds);
  console.log(
    `infra: AGENT_CLI_RETRIES=${process.env.AGENT_CLI_RETRIES} STRATEGY_VALIDATION_RETRIES=${process.env.STRATEGY_VALIDATION_RETRIES ?? '(default)'} ` +
    `AGENT_MAX_CONCURRENCY=${process.env.AGENT_MAX_CONCURRENCY} STOCKS_VALIDATION_MAX_REVISION_ROUNDS=${maxRevisionRounds}`
  );

  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const existing = await readJson<{ runs?: unknown[] }>(REPORT_FILE, { runs: [] });
  const report = {
    schemaVersion: 'validation-real-stocks.v1',
    generatedAt: new Date().toISOString(),
    executionMode: 'real',
    liveOrdersExecuted: false,
    capitalUsed: false,
    validationScope: 'analysis_and_strategy_minimal',
    preset: { id: preset.id, version: preset.version, hash: presetHash, expectedHash: EXPECTED_HASH, hashMatches: presetHash === EXPECTED_HASH },
    infra: {
      AGENT_CLI_TIMEOUT_MS: process.env.AGENT_CLI_TIMEOUT_MS,
      AGENT_MAX_CONCURRENCY: process.env.AGENT_MAX_CONCURRENCY,
      AGENT_CLI_RETRIES: process.env.AGENT_CLI_RETRIES,
      STRATEGY_VALIDATION_RETRIES: process.env.STRATEGY_VALIDATION_RETRIES,
      STOCKS_VALIDATION_MAX_REVISION_ROUNDS: process.env.STOCKS_VALIDATION_MAX_REVISION_ROUNDS,
      maxRevisionRounds,
    },
    runs: [...((existing.runs as unknown[]) ?? [])],
  };

  for (const spec of specs) {
    console.log(`\n=== ${spec.id} — ${spec.label} ===`);
    const { snapshot, provenance } = await buildScenarioSnapshot(spec);
    console.log(`snapshot: ${snapshot ? `${snapshot.length} chars` : 'null (ausente)'}  provenance=${JSON.stringify(provenance)}`);
    const run = makeRun(preset, spec, snapshot, suffix, maxRevisionRounds);
    const started = Date.now();
    await executeRun(run, structuredClone(preset.agents));
    const persisted = (await loadRun(run.id)) ?? run;
    console.log(
      `-> status=${persisted.status} finalState=${persisted.finalState} ` +
      `done=[${persisted.results.filter((r) => r.status === 'done').map((r) => r.agentId).join(',')}] ` +
      `skipped=[${persisted.results.filter((r) => r.status === 'skipped').map((r) => r.agentId).join(',')}] ` +
      `error=[${persisted.results.filter((r) => r.status === 'error').map((r) => r.agentId).join(',')}] ` +
      `(${((Date.now() - started) / 1000).toFixed(0)}s)`
    );
    report.runs = report.runs.filter((r) => (r as { run_id?: string }).run_id !== persisted.id);
    report.runs.push(summarizeRun(persisted, provenance));
    await writeJson(REPORT_FILE, report);
  }

  console.log(`\nInforme máquina: ${REPORT_FILE}`);
}

function isDirectEntrypoint(argv1: string | undefined, moduleUrl: string): boolean {
  return argv1 !== undefined && moduleUrl === pathToFileURL(argv1).href;
}

if (isDirectEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

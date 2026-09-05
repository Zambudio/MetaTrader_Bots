/**
 * FASE 1 — Matriz de ejecuciones REALES de la baseline FOREX `forex_v1` sobre EUR/USD H1.
 *
 * A diferencia de `validateBaselines.ts` (ejecutor simulado, determinista), este script corre el
 * orquestador real con `executionMode: 'real'` → los agentes llaman a la fuente configurada en
 * `Agent.model`. `forex_v1.2` usa exclusivamente OmniRoute para validación estructural y no
 * consume las suscripciones Claude/Codex. Persistencia real: cada run se guarda con `runsStore`.
 *
 * Seguridad: NO envía órdenes, NO usa capital, NO toca MetaTrader. Solo análisis + (opcional)
 * generación/compilación/backtest headless en fases posteriores.
 *
 * Uso:  npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts <scenarioId|all>
 *   scenarioId ∈ r1-current | r2-trend | r3-range | r4-highvol | r5a-absent | r5b-stale
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPreset, loadAgentConfigsState } from '../src/store/agentConfigsStore.js';
import { hashConfiguration, validatePreset } from '../src/config/configValidation.js';
import { executeRun } from '../src/engine/orchestrator.js';
import {
  buildMarketSnapshot,
  buildMarketSnapshotFromCandles,
  computeSnapshotFromCandles,
} from '../src/engine/marketSnapshot.js';
import { getCandles, candleSourceLabel } from '../src/marketData/index.js';
import { loadRun } from '../src/store/runsStore.js';
import { readJson, writeJson } from '../src/store/jsonStore.js';
import { DATA_DIR } from '../src/paths.js';
import type { AgentConfigPreset, Run } from '../src/types.js';

const FOREX_ID = process.env.FOREX_VALIDATION_PRESET_ID || 'baseline-forex-forex-v1';
const STRUCTURAL_ONLY = new Set([
  'baseline-forex-forex-v1-2',
  'baseline-forex-forex-v1-2-1',
]).has(FOREX_ID);

// --- Ajustes de infraestructura para ejecución real (evidencia: run _rWt37-Ku2 timeout 180s) ---
process.env.AGENT_CLI_TIMEOUT_MS = process.env.AGENT_CLI_TIMEOUT_MS || '600000';
process.env.AGENT_MAX_CONCURRENCY = STRUCTURAL_ONLY ? '1' : (process.env.AGENT_MAX_CONCURRENCY || '2');
process.env.AGENT_CLI_RETRIES = process.env.AGENT_CLI_RETRIES || '2';
if (STRUCTURAL_ONLY) {
  // Smoke estructural deliberadamente fail-fast: una petición por agente, un único modelo y sin
  // rondas de revisión. Nunca cambia un rechazo por GO ni altera el preset persistido.
  process.env.OMNIROUTE_MAX_RETRIES = '0';
  process.env.OMNIROUTE_FALLBACK_MODELS = '';
  process.env.STRATEGY_VALIDATION_RETRIES = '0';
}

/**
 * Cap fail-fast de rondas de revisión "AJUSTAR" (juez → reejecutar estrategia→revisores→juez).
 * Controla `run.maxRetries` sin tocar `preset.consensus.maxRevisionRounds` (el hash del preset no
 * se ve afectado). `0` corta en la primera pasada del juez; el rango permitido es 0..2 porque el
 * propio orquestador limita `maxRetries` a ese tope operativo (`MAX_RETRIES_CAP` en orchestrator.ts
 * es 3, pero esta validación nunca debe superar las 2 rondas que ya autorizaba el preset).
 */
export function resolveForexMaxRevisionRounds(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2) {
    throw new Error(`FOREX_VALIDATION_MAX_REVISION_ROUNDS inválido: "${raw}" (permitido 0..2)`);
  }
  return parsed;
}

const EXPECTED_HASHES: Record<string, string> = {
  'baseline-forex-forex-v1': '504e6f2ac86fd05a321e99049b489654f48524f776b7bcf54e679fb70429bb8c',
  'baseline-forex-forex-v1-1': '64c35dc7e78d558c4329d58c1ba62f733c0dc28bef248db358527d2cabe9d135',
  'baseline-forex-forex-v1-2': 'feddf9d404020de68e6884a519cb6b558292e98e846e1e77bd5bf35145434cdc',
  'baseline-forex-forex-v1-2-1': 'e84b3d40062a9dc84f86f45b550f165bbb68341f4695b8d2c0c83a2bc50ad9a2',
};
const EXPECTED_HASH = EXPECTED_HASHES[FOREX_ID];
const PAIR = 'EUR/USD';
const TF = 'H1';
const REPORT_FILE = path.join(DATA_DIR, 'validation-real-forex-latest.json');

interface ScenarioSpec {
  id: string;
  label: string;
  /** as_of histórico (UTC) para reconstruir la ventana; null = snapshot en vivo. */
  asOf?: string | null;
  /** fuerza snapshot ausente. */
  absent?: boolean;
  /** reconstruye la ventana as_of pero evalúa la frescura respecto a "ahora" → obsoleto. */
  staleFrom?: string;
}

const SCENARIOS: ScenarioSpec[] = [
  { id: 'r1-current', label: 'Snapshot actual disponible (cierre de fin de semana FX)', asOf: null },
  { id: 'r2-trend', label: 'Periodo histórico con tendencia clara (momentum alcista)', asOf: '2026-03-25 00:00:00' },
  { id: 'r3-range', label: 'Periodo lateral / de menor momentum (compresión)', asOf: '2026-08-25 00:00:00' },
  { id: 'r4-highvol', label: 'Periodo de volatilidad elevada (abril 2025)', asOf: '2025-04-10 00:00:00' },
  { id: 'r5a-absent', label: 'Prueba negativa: datos de mercado ausentes', absent: true },
  { id: 'r5b-stale', label: 'Prueba negativa: snapshot obsoleto (ventana de marzo evaluada hoy)', staleFrom: '2026-03-25 00:00:00' },
];

function short(h: string) { return `${h.slice(0, 10)}…${h.slice(-4)}`; }

async function buildScenarioSnapshot(spec: ScenarioSpec): Promise<{ snapshot: string | null; provenance: Record<string, unknown> }> {
  if (spec.absent) {
    return { snapshot: null, provenance: { mode: 'absent', note: 'marketSnapshot forzado a null' } };
  }
  if (spec.staleFrom) {
    const candles = await getCandles(PAIR, TF, { endDate: spec.staleFrom, noCache: true });
    const data = computeSnapshotFromCandles(candles, PAIR, TF, Date.now()); // frescura = ahora → stale
    const { formatSnapshotText } = await import('../src/engine/marketSnapshot.js');
    const snapshot = data ? formatSnapshotText(data) : null;
    return {
      snapshot,
      provenance: {
        mode: 'stale', source: candleSourceLabel(PAIR), symbol: PAIR, timeframe: TF,
        windowEnd: spec.staleFrom, candles: candles.length,
        range: candles.length ? [new Date(candles[0].time * 1000).toISOString(), new Date(candles[candles.length - 1].time * 1000).toISOString()] : null,
        freshnessEvaluatedAt: new Date().toISOString(),
      },
    };
  }
  if (spec.asOf) {
    const candles = await getCandles(PAIR, TF, { endDate: spec.asOf, noCache: true });
    const snapshot = buildMarketSnapshotFromCandles(candles, PAIR, TF, { asOf: spec.asOf });
    return {
      snapshot,
      provenance: {
        mode: 'historical', source: candleSourceLabel(PAIR), symbol: PAIR, timeframe: TF,
        asOf: spec.asOf, candles: candles.length,
        range: candles.length ? [new Date(candles[0].time * 1000).toISOString(), new Date(candles[candles.length - 1].time * 1000).toISOString()] : null,
        lastCandle: candles.length ? new Date(candles[candles.length - 1].time * 1000).toISOString() : null,
      },
    };
  }
  // live
  const snapshot = await buildMarketSnapshot(PAIR, TF, { noCache: true });
  return {
    snapshot,
    provenance: { mode: 'live', source: candleSourceLabel(PAIR), symbol: PAIR, timeframe: TF, fetchedAt: new Date().toISOString() },
  };
}

function makeRun(preset: AgentConfigPreset, spec: ScenarioSpec, snapshot: string | null, suffix: string, maxRevisionRounds: number): Run {
  return {
    id: `real-forex-${suffix}-${spec.id}`,
    pair: PAIR,
    timeframe: TF,
    status: 'running',
    createdAt: new Date().toISOString(),
    results: preset.agents.map((a) => ({ agentId: a.id, status: 'waiting' })),
    configuration: structuredClone(preset),
    configurationHash: hashConfiguration(preset),
    executionMode: 'real',
    validationScenario: spec.id,
    expectedAgentIds: preset.agents.map((a) => a.id),
    marketSnapshot: snapshot, // pre-fijado (undefined dejaría al orquestador buscarlo en vivo)
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
  if (!EXPECTED_HASH) throw new Error(`Preset FOREX no autorizado para esta validacion: ${FOREX_ID}`);
  const preset = await getPreset(FOREX_ID);
  if (!preset) throw new Error(`No se encontró el preset ${FOREX_ID}`);
  const presetHash = hashConfiguration(preset);
  const val = validatePreset(preset);
  console.log(`preset ${preset.id} v${preset.version} hash ${short(presetHash)} valid=${val.valid}`);
  if (!val.valid) throw new Error(`preset inválido: ${val.errors.join('; ')}`);
  if (presetHash !== EXPECTED_HASH) throw new Error(`HASH INESPERADO: ${presetHash} != ${EXPECTED_HASH}`);

  const maxRevisionRounds = STRUCTURAL_ONLY
    ? 0
    : resolveForexMaxRevisionRounds(process.env.FOREX_VALIDATION_MAX_REVISION_ROUNDS, preset.consensus.maxRevisionRounds);
  console.log(
    `infra: AGENT_CLI_RETRIES=${process.env.AGENT_CLI_RETRIES} STRATEGY_VALIDATION_RETRIES=${process.env.STRATEGY_VALIDATION_RETRIES ?? '(default)'} ` +
    `AGENT_MAX_CONCURRENCY=${process.env.AGENT_MAX_CONCURRENCY} FOREX_VALIDATION_MAX_REVISION_ROUNDS=${maxRevisionRounds}`
  );

  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const existing = await readJson<{ runs?: unknown[] }>(REPORT_FILE, { runs: [] });
  const report = {
    schemaVersion: 'validation-real-forex.v1',
    generatedAt: new Date().toISOString(),
    executionMode: 'real',
    liveOrdersExecuted: false,
    capitalUsed: false,
    validationScope: STRUCTURAL_ONLY ? 'structural_only' : 'analysis_and_strategy',
    preset: { id: preset.id, version: preset.version, hash: presetHash, expectedHash: EXPECTED_HASH, hashMatches: presetHash === EXPECTED_HASH },
    infra: {
      AGENT_CLI_TIMEOUT_MS: process.env.AGENT_CLI_TIMEOUT_MS,
      AGENT_MAX_CONCURRENCY: process.env.AGENT_MAX_CONCURRENCY,
      AGENT_CLI_RETRIES: process.env.AGENT_CLI_RETRIES,
      OMNIROUTE_MAX_RETRIES: process.env.OMNIROUTE_MAX_RETRIES,
      OMNIROUTE_FALLBACK_MODELS: process.env.OMNIROUTE_FALLBACK_MODELS,
      STRATEGY_VALIDATION_RETRIES: process.env.STRATEGY_VALIDATION_RETRIES,
      FOREX_VALIDATION_MAX_REVISION_ROUNDS: process.env.FOREX_VALIDATION_MAX_REVISION_ROUNDS,
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
    // reemplaza cualquier entrada previa del mismo run_id
    report.runs = report.runs.filter((r) => (r as { run_id?: string }).run_id !== persisted.id);
    report.runs.push(summarizeRun(persisted, provenance));
    await writeJson(REPORT_FILE, report);
  }

  console.log(`\nInforme máquina: ${REPORT_FILE}`);
}

// Guard de entrypoint: permite importar `resolveForexMaxRevisionRounds` desde tests sin disparar
// el run real (llamadas a agentes/CLI reales) al cargar el módulo.
//
// BUG real detectado y corregido en esta misma validación: una primera versión comparaba
// `import.meta.url` contra `` `file://${argv1.replace(/\\/g,'/')}` `` construido a mano. En Windows
// `import.meta.url` para una ruta con letra de unidad lleva TRES barras (`file:///C:/...`), no dos
// (`file://C:/...`), así que la comparación era SIEMPRE falsa y `main()` nunca se invocaba al
// ejecutar el script de verdad (`npx tsx scripts/validateRealForex.ts ...` terminaba con exit 0 sin
// tocar ningún agente ni persistir ningún run). `pathToFileURL` normaliza esto correctamente.
export function isDirectEntrypoint(argv1: string | undefined, moduleUrl: string): boolean {
  return argv1 !== undefined && moduleUrl === pathToFileURL(argv1).href;
}

if (isDirectEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

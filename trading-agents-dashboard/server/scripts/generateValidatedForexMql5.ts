/**
 * Genera el EA FOREX solo desde una estrategia aprobada por un run real y exacto.
 *
 * Seguridad: laboratorio/backtest unicamente. No envia ordenes live, no cambia cuentas y no
 * cierra MetaTrader. En esta validacion se desactiva expresamente cualquier optimizacion por
 * rentabilidad o numero de operaciones: se conserva un unico smoke backtest.
 *
 * Uso: npx tsx --env-file-if-exists=.env scripts/generateValidatedForexMql5.ts [run-id]
 */
import path from 'node:path';
import {
  validateForexAuditQuorum,
  validateRealForexMql5SourceRun,
  type ForexAuditEntry,
} from '../src/engine/mql5Eligibility.js';
import { generateMql5 } from '../src/engine/mql5Generator.js';
import { isTerminalRunning } from '../src/engine/mql5Backtester.js';
import { DATA_DIR } from '../src/paths.js';
import { readJson, writeJson } from '../src/store/jsonStore.js';
import { loadRun } from '../src/store/runsStore.js';

process.env.MQL5_DISABLE_OPTIMIZATION = '1';

const VALIDATION_REPORT = path.join(DATA_DIR, 'validation-real-forex-latest.json');
const AUDIT_REPORT = path.join(DATA_DIR, 'validation-real-forex-audit.json');
const MQL5_REPORT = path.join(DATA_DIR, 'validation-real-forex-mql5.json');
const DEFAULT_TERMINAL_PATH = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe';
const EXPECTED_CONFIGURATION_ID = 'baseline-forex-forex-v1-1';
const EXPECTED_CONFIGURATION_HASH = 'c3d6b2b00627115ddaf10d740db8bdbf8e1b65f93ab6fb6edefe08fbe1809a77';

interface ValidationRunSummary {
  run_id: string;
  finalState?: string;
  configurationId?: string;
  configurationHash?: string;
  agents?: Array<{
    verdict?: { veredicto?: string; unresolvedBlockers?: string[] };
  }>;
}

async function resolveRunId(explicit?: string): Promise<string> {
  const report = await readJson<{ generatedAt?: string; runs?: ValidationRunSummary[] }>(VALIDATION_REPORT, { runs: [] });
  const audit = await readJson<{ generatedAt?: string; audits?: ForexAuditEntry[] }>(AUDIT_REPORT, { audits: [] });
  const reportTime = Date.parse(report.generatedAt ?? '');
  const auditTime = Date.parse(audit.generatedAt ?? '');
  if (!Number.isFinite(reportTime) || !Number.isFinite(auditTime) || auditTime < reportTime) {
    throw new Error('MQL5_BLOCKED: la auditoría FOREX falta o está obsoleta respecto al informe de runs.');
  }
  const expected = {
    configurationId: EXPECTED_CONFIGURATION_ID,
    configurationHash: EXPECTED_CONFIGURATION_HASH,
  };
  const quorumError = validateForexAuditQuorum(audit.audits ?? [], expected);
  if (quorumError) throw new Error(`MQL5_BLOCKED: ${quorumError}`);
  const auditedOkIds = new Set((audit.audits ?? []).filter((entry) => entry.ok
    && entry.configurationId === expected.configurationId
    && entry.configurationHash === expected.configurationHash).map((entry) => entry.run_id));
  if (explicit) {
    if (!auditedOkIds.has(explicit)) throw new Error(`MQL5_BLOCKED: el run ${explicit} no tiene auditoría limpia para el preset/hash autorizado.`);
    return explicit;
  }
  const eligible = [...(report.runs ?? [])].reverse().find((entry) => {
    const verdict = entry.agents?.find((agent) => agent.verdict)?.verdict;
    return entry.finalState === 'validated'
      && verdict?.veredicto === 'go'
      && (verdict.unresolvedBlockers?.length ?? 0) === 0
      && entry.configurationId === expected.configurationId
      && entry.configurationHash === expected.configurationHash
      && auditedOkIds.has(entry.run_id);
  });
  if (!eligible) throw new Error('No existe ningun run FOREX validated + GO + 0 blockers.');
  return eligible.run_id;
}

async function main(): Promise<void> {
  const runId = await resolveRunId(process.argv[2]);
  const run = await loadRun(runId);
  if (!run) throw new Error(`No se encontro el run persistido ${runId}.`);

  const strategy = run.results.find((result) => result.strategy)?.strategy;
  if (!strategy) throw new Error(`El run ${runId} no contiene estrategia.`);

  const eligibilityError = validateRealForexMql5SourceRun(run, strategy, {
    configurationId: EXPECTED_CONFIGURATION_ID,
    configurationHash: EXPECTED_CONFIGURATION_HASH,
  });
  if (eligibilityError) throw new Error(`MQL5_BLOCKED: ${eligibilityError}`);

  const terminalPath = process.env.MT5_TERMINAL_PATH || DEFAULT_TERMINAL_PATH;
  const terminalWasRunning = await isTerminalRunning(terminalPath);
  if (terminalWasRunning) {
    console.warn('BLOCKED_EXTERNAL_MT5_RUNNING: se compilara y auditara, sin cerrar MetaTrader.');
  }

  const result = await generateMql5(strategy, run.configuration?.mql5Model, (progress) => {
    console.log(`[${progress.phase}] ${progress.details}`);
  });

  await writeJson(MQL5_REPORT, {
    generatedAt: new Date().toISOString(),
    sourceRunId: run.id,
    configurationId: run.configuration?.id,
    configurationVersion: run.configuration?.version,
    exactStrategy: strategy,
    eligibility: 'PASS',
    liveOrdersExecuted: false,
    capitalUsed: false,
    optimizationDisabled: true,
    terminalWasRunning,
    result,
  });

  console.log(JSON.stringify({
    sourceRunId: run.id,
    filename: result.filename,
    compileStatus: result.compileStatus,
    compileErrors: result.compileErrors,
    compileWarnings: result.compileWarnings,
    attempts: result.attempts,
    backtestCompleted: Boolean(result.backtestSession),
    terminalWasRunning,
    report: MQL5_REPORT,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

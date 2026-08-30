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
import { validateMql5SourceRun } from '../src/engine/mql5Eligibility.js';
import { generateMql5 } from '../src/engine/mql5Generator.js';
import { isTerminalRunning } from '../src/engine/mql5Backtester.js';
import { DATA_DIR } from '../src/paths.js';
import { readJson, writeJson } from '../src/store/jsonStore.js';
import { loadRun } from '../src/store/runsStore.js';

process.env.MQL5_DISABLE_OPTIMIZATION = '1';

const VALIDATION_REPORT = path.join(DATA_DIR, 'validation-real-forex-latest.json');
const MQL5_REPORT = path.join(DATA_DIR, 'validation-real-forex-mql5.json');
const DEFAULT_TERMINAL_PATH = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe';

interface ValidationRunSummary {
  run_id: string;
  finalState?: string;
  agents?: Array<{
    verdict?: { veredicto?: string; unresolvedBlockers?: string[] };
  }>;
}

async function resolveRunId(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const report = await readJson<{ runs?: ValidationRunSummary[] }>(VALIDATION_REPORT, { runs: [] });
  const eligible = [...(report.runs ?? [])].reverse().find((entry) => {
    const verdict = entry.agents?.find((agent) => agent.verdict)?.verdict;
    return entry.finalState === 'validated'
      && verdict?.veredicto === 'go'
      && (verdict.unresolvedBlockers?.length ?? 0) === 0;
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

  const eligibilityError = validateMql5SourceRun(run, strategy);
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

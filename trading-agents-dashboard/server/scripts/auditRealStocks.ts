/**
 * Auditoría determinista de los runs reales de ACCIONES (`stocks_v1`, TSLA).
 *
 * Mirror reducido de `auditRealForex.ts`: lee `validation-real-stocks-latest.json` y, sin volver a
 * llamar a ningún modelo, contrasta cada run contra reglas mecánicas equivalentes a las de FOREX
 * (contratos, selección de agentes, alucinaciones, gate determinista, coherencia del veredicto).
 * Reutiliza las reglas de texto genéricas de `forexAuditRules.ts` (no son específicas de EUR/USD
 * salvo `findForexPipArithmeticMismatch`, que aquí NO se usa: TSLA cotiza en dólares, no en pips).
 *
 * IMPORTANTE: `stocks_v1` es la baseline ORIGINAL sin las correcciones de prompt que sí tiene
 * `forex_v1.1` (HISTORICAL_AS_OF, liquidez sin métrica, condicionEntrada sobrecargada, etc.). Es
 * esperable reproducir aquí los mismos defectos ya documentados en `forex_v1` antes de v1.1; este
 * audit debe detectarlos, no ocultarlos.
 *
 * Salida: `validation-real-stocks-audit.json` + resumen por consola.
 */
import path from 'node:path';
import { readJson, writeJson } from '../src/store/jsonStore.js';
import { DATA_DIR } from '../src/paths.js';
import { validateStrategyProposal } from '../src/engine/strategyValidator.js';
import {
  hasHistoricalTemporalContextError,
  hasOverloadedEntryCondition,
  hasInconsistentEntryReference,
  hasUnsupportedNumericExecutionCosts,
  hasUnsupportedLiquidityClaim,
  hasPredictedFutureFill,
  findWeekdayMismatch,
} from '../src/validation/forexAuditRules.js';
import type { AgentAnalysis, StrategyProposalLite, VerdictResult } from '../src/types.js';

const REPORT_FILE = path.join(DATA_DIR, 'validation-real-stocks-latest.json');
const AUDIT_FILE = path.join(DATA_DIR, 'validation-real-stocks-audit.json');

const RISK_POLICY = { maxRiskPercent: 1, minRrRatio: 1.6, minStopAtr: 1.25, maxStopAtr: 2.5 };
const REQUIRED_SPECIALISTS = ['stock-structure', 'stock-volume-gap'];
const OPTIONAL_SPECIALISTS = ['stock-corporate', 'stock-market-regime'];
const STRATEGY_ID = 'stock-strategy';
const JUDGE_ID = 'stock-judge';

interface AgentEntry {
  agentId: string;
  status: string;
  activationReason?: string;
  omissionReason?: string;
  durationMs?: number;
  attempt?: number;
  error?: string;
  analysis?: AgentAnalysis;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}
interface RunEntry {
  run_id: string;
  scenario: string;
  configurationId?: string;
  configurationVersion?: string;
  configurationHash: string;
  dataProvenance: Record<string, unknown>;
  dataQuality?: string;
  dataCapabilities?: string[];
  status: string;
  finalState?: string;
  retryCount?: number;
  expectedAgents: string[];
  executedAgents: string[];
  skippedAgents: Array<{ agentId: string; reason?: string }>;
  erroredAgents: Array<{ agentId: string; error?: string }>;
  agents: AgentEntry[];
  issues?: Array<{ code: string; severity: string; message: string }>;
  marketSnapshotUsed?: string | null;
}

function snapshotNumbers(snapshot: string): Set<string> {
  const nums = new Set<string>();
  for (const m of snapshot.matchAll(/-?\d+\.\d+/g)) nums.add(m[0]);
  for (const m of snapshot.matchAll(/\b\d{2,}\b/g)) nums.add(m[0]);
  return nums;
}

function numberAppears(v: number, snapshot: string, snapNums: Set<string>): boolean {
  if (!Number.isFinite(v)) return false;
  const candidates = new Set<string>([
    String(v), v.toFixed(5), v.toFixed(4), v.toFixed(3), v.toFixed(2), v.toFixed(1),
    String(Math.round(v)),
  ]);
  for (const c of candidates) if (snapNums.has(c) || snapshot.includes(c)) return true;
  for (const s of snapNums) {
    const n = Number(s);
    if (Number.isFinite(n) && n !== 0 && Math.abs(n - v) / Math.abs(n) < 0.002) return true;
  }
  return false;
}

const FORBIDDEN_CLAIMS = [
  /\bspread\b/i, /bid[\s-]?ask/i, /profundidad|order\s?book|order\s?flow|libro de órdenes/i,
  /liquidez/i, /slippage|deslizamiento/i, /short interest/i,
];
// Capacidades declaradas DATA_NOT_AVAILABLE en stocks_v1: corporate_fundamentals, sec_filings,
// verified_news, benchmark_data. Mencionarlas sin declararlas ausentes es alucinación.
const UNAVAILABLE_CORPORATE_OR_BENCHMARK = [
  /earnings|resultados trimestrales|beneficio por acci[oó]n|\bEPS\b/i,
  /guidance|previsi[oó]n de la compa[nñ]ía/i,
  /\b10-K\b|\b10-Q\b|filing|\bSEC\b/i,
  /Nasdaq|S&P\s?500|sector tecnol[oó]gico|comparaci[oó]n (?:con|frente a) el mercado/i,
  /\bBCE\b|\bECB\b|\bFed\b|Reserva Federal|diferencial de tipos/i,
];

function auditContract(a: AgentAnalysis | undefined): string[] {
  const errs: string[] = [];
  if (!a) return ['analysis ausente'];
  if (!['valid', 'data_not_available', 'abstain'].includes(a.status)) errs.push(`status inválido: ${a.status}`);
  if (!['bullish', 'bearish', 'neutral', 'mixed', 'not_applicable'].includes(a.bias)) errs.push(`bias inválido: ${a.bias}`);
  if (typeof a.confidence !== 'number' || a.confidence < 0 || a.confidence > 1) errs.push(`confidence fuera de rango: ${a.confidence}`);
  if (!['good', 'stale', 'insufficient', 'unavailable'].includes(a.dataQuality)) errs.push(`dataQuality inválido: ${a.dataQuality}`);
  if (!Array.isArray(a.facts)) errs.push('facts no es array');
  else for (const f of a.facts) if (!f || !f.claim || !f.source) errs.push(`fact sin claim/source: ${JSON.stringify(f)}`);
  if (!Array.isArray(a.inferences)) errs.push('inferences no es array');
  if (typeof a.conclusion !== 'string' || !a.conclusion.trim()) errs.push('conclusion vacía');
  return errs;
}

function auditRun(run: RunEntry) {
  const findings: Array<{ severity: 'error' | 'warn' | 'info'; code: string; msg: string }> = [];
  const push = (severity: 'error' | 'warn' | 'info', code: string, msg: string) => findings.push({ severity, code, msg });

  const snapshot = run.marketSnapshotUsed ?? '';
  const snapNums = snapshot ? snapshotNumbers(snapshot) : new Set<string>();
  const byId = new Map(run.agents.map((a) => [a.agentId, a]));

  const expectedAbsentResult = run.scenario === 's1-absent'
    && run.status === 'done'
    && run.finalState === 'insufficient_data';
  if (run.status !== 'done' && !expectedAbsentResult) {
    push('error', 'RUN_NOT_FUNCTIONAL', `run status=${run.status} finalState=${run.finalState ?? 'n/a'}`);
  }

  if (run.dataProvenance?.mode === 'historical' && run.dataQuality === 'good') {
    for (const agent of run.agents) {
      if (!agent.analysis) continue;
      const text = JSON.stringify(agent.analysis);
      if (hasHistoricalTemporalContextError(text, snapshot, agent.analysis.dataQuality)) {
        push('error', 'TEMPORAL_CONTEXT_ERROR', `${agent.agentId} comparo una ventana HISTORICAL_AS_OF valida con la fecha actual.`);
      }
    }
  }

  // --- selección de agentes ---
  const unexpected = run.executedAgents.filter((id) => !run.expectedAgents.includes(id));
  if (unexpected.length) push('error', 'UNEXPECTED_AGENT', `agentes no previstos ejecutados: ${unexpected.join(', ')}`);
  for (const id of run.expectedAgents) if (!byId.has(id)) push('error', 'MISSING_AGENT', `agente previsto ausente del run: ${id}`);
  const nonStock = run.expectedAgents.filter((id) => id.startsWith('fx-') || id.startsWith('crypto-'));
  if (nonStock.length) push('error', 'CROSS_CONFIGURATION_CONTAMINATION', `agentes de otro mercado: ${nonStock.join(', ')}`);

  // especialistas opcionales (corporate/market-regime): deben omitirse DATA_NOT_AVAILABLE si no
  // hay feeds verificados de fundamentales/filings/benchmark en el escenario.
  for (const optId of OPTIONAL_SPECIALISTS) {
    const opt = byId.get(optId);
    if (opt) {
      if (opt.status !== 'skipped' && run.dataProvenance?.mode !== 'absent') {
        // No es un error automático: si algún día se inyecta el feed, podría activarse. Pero en
        // esta validación ningún escenario aporta corporate_fundamentals/sec_filings/verified_news
        // ni benchmark_data, así que se espera omisión.
        push('warn', 'AGENT_SELECTION_ERROR', `${optId} no se omitió (status=${opt.status}) pese a no haber feeds verificados en este escenario`);
      } else if (opt.status === 'skipped' && !/DATA_NOT_AVAILABLE/.test(opt.omissionReason ?? '')) {
        push('warn', 'AGENT_SELECTION_ERROR', `${optId} omitido con razón inesperada: ${opt.omissionReason}`);
      }
    }
  }

  const dataAbsent = run.dataQuality === 'unavailable' || run.marketSnapshotUsed === null;

  // --- por agente ---
  for (const a of run.agents) {
    if (a.status === 'error') {
      const code = /\[(?:claude|codex)Cli\]/i.test(a.error ?? '') ? 'TOOL_ERROR' : 'MODEL_ERROR';
      push('error', code, `${a.agentId} en error: ${a.error}`);
    }
    if (a.status === 'skipped') {
      if (!a.omissionReason) push('warn', 'ORCHESTRATION_ERROR', `${a.agentId} omitido sin razón`);
      continue;
    }
    if (a.status !== 'done') continue;

    if (a.analysis) {
      const cErrs = auditContract(a.analysis);
      if (cErrs.length) push('error', 'CONTRACT_ERROR', `${a.agentId}: ${cErrs.join(' | ')}`);

      if (snapshot) {
        for (const f of a.analysis.facts ?? []) {
          const claim = String(f.claim);
          const orphan: string[] = [];
          for (const m of claim.matchAll(/(?<![\d.:T-])-?\d+\.\d{2,}(?![\d:])/g)) {
            const v = Number(m[0]);
            if (!numberAppears(v, snapshot, snapNums) && Math.abs(v) >= 0.01) orphan.push(m[0]);
          }
          if (orphan.length) {
            push('warn', 'HALLUCINATION', `${a.agentId} DATO con número(s) sin origen en snapshot [${[...new Set(orphan)].join(', ')}]: "${claim.slice(0, 120)}"`);
          }
        }
      }
      const txt = JSON.stringify(a.analysis);
      for (const re of FORBIDDEN_CLAIMS) {
        if (re.test(txt) && !/no (?:disponible|se dispone|hay|proporciona|aporta)|DATA_NOT_AVAILABLE|sin datos de|no medid/i.test(txt)) {
          push('warn', 'HALLUCINATION', `${a.agentId} menciona ${re.source} sin declararlo no disponible`);
        }
      }
      if (!OPTIONAL_SPECIALISTS.includes(a.agentId)) {
        for (const re of UNAVAILABLE_CORPORATE_OR_BENCHMARK) {
          if (re.test(txt) && !/no (?:disponible|verificad|aportad|hay)|DATA_NOT_AVAILABLE|sin (?:calendario|fuente|feed)/i.test(txt)) {
            push('warn', 'HALLUCINATION', `${a.agentId} apela a datos corporativos/benchmark (${re.source}) sin feed verificado`);
          }
        }
      }
      if (dataAbsent && a.analysis.status === 'valid' && (a.analysis.facts?.length ?? 0) > 0) {
        push('warn', 'INVALID_RESULT', `${a.agentId} status=valid con datos ausentes`);
      }
      if (hasUnsupportedNumericExecutionCosts(JSON.stringify(a.analysis))) {
        push('error', 'HALLUCINATION', `${a.agentId} asigna cifras a spread/slippage declarados DATA_NOT_AVAILABLE`);
      }
      if (hasUnsupportedLiquidityClaim(JSON.stringify(a.analysis))) {
        push('error', 'HALLUCINATION', `${a.agentId} afirma un nivel de liquidez sin metrica aportada`);
      }
      const mismatch = findWeekdayMismatch(JSON.stringify(a.analysis));
      if (mismatch) {
        push('error', 'MODEL_ERROR', `${a.agentId} dice ${mismatch.stated} para ${mismatch.date}; el calendario UTC da ${mismatch.expected}`);
      }
    }

    if (a.strategy) {
      const atrMatch = snapshot.match(/ATR \(14[^)]*\):\s*([0-9.]+)/i);
      const atr = atrMatch ? Number(atrMatch[1]) : undefined;
      const v = validateStrategyProposal(a.strategy, {
        minRrRatio: RISK_POLICY.minRrRatio,
        maxRiskPercent: RISK_POLICY.maxRiskPercent,
        atrValue: Number.isFinite(atr) ? atr : undefined,
        minStopAtr: RISK_POLICY.minStopAtr,
        maxStopAtr: RISK_POLICY.maxStopAtr,
      });
      if (!v.valid) push('error', 'STRATEGY_ERROR', `${a.agentId} estrategia NO pasa gate determinista: ${v.error}`);
      else push('info', 'STRATEGY_OK', `${a.agentId} gate OK: ${a.strategy.direction} entry ${v.normalized?.entryPriceNum} SL ${v.normalized?.stopLossNum} TP ${v.normalized?.takeProfitNum} R:R ${v.normalized?.rrRatio.toFixed(2)}`);
      const cond = String(a.strategy.condicionEntrada ?? '');
      if (hasOverloadedEntryCondition(cond)) {
        push('error', 'STRATEGY_ERROR', `${a.agentId} condicionEntrada anade restricciones fuera del maximo de 1 evento + 1 filtro: "${cond}"`);
      }
      if (hasInconsistentEntryReference(cond, a.strategy.puntoEntrada, a.strategy.stopLoss, a.strategy.takeProfit)) {
        push('error', 'STRATEGY_ERROR', `${a.agentId} entra en la apertura siguiente pero ancla SL/TP al cierre de la vela de senal; el R:R ejecutado no queda garantizado`);
      }
      if (hasUnsupportedNumericExecutionCosts(JSON.stringify(a.strategy))) {
        push('error', 'HALLUCINATION', `${a.agentId} asigna cifras a spread/slippage declarados DATA_NOT_AVAILABLE`);
      }
      if (hasUnsupportedLiquidityClaim(JSON.stringify(a.strategy))) {
        push('error', 'HALLUCINATION', `${a.agentId} afirma un nivel de liquidez sin metrica aportada`);
      }
      if (hasPredictedFutureFill(`${a.strategy.resumen} ${a.strategy.puntoEntrada} ${(a.strategy.evidence ?? []).map((e) => e.claim).join(' ')}`)) {
        push('error', 'STRATEGY_ERROR', `${a.agentId} usa un gap pasado para predecir la apertura/fill futuro`);
      }
      for (const [k, val] of [['entry', a.strategy.entryPriceNum], ['SL', a.strategy.stopLossNum], ['TP', a.strategy.takeProfitNum]] as const) {
        if (typeof val === 'number' && !numberAppears(val, snapshot, snapNums)) {
          const closeMatch = snapshot.match(/Cierre\):\s*([0-9.]+)/i);
          const close = closeMatch ? Number(closeMatch[1]) : undefined;
          if (close && Math.abs(val - close) / close > 0.05) {
            push('warn', 'HALLUCINATION', `${a.agentId} ${k}=${val} a >5% del cierre ${close} del snapshot`);
          }
        }
      }
    }

    if (a.verdict) {
      const vd = a.verdict;
      if (!['go', 'ajustar', 'no_operar'].includes(vd.veredicto)) push('error', 'CONTRACT_ERROR', `${a.agentId} veredicto inválido: ${vd.veredicto}`);
      if (!vd.razon?.trim()) push('error', 'CONTRACT_ERROR', `${a.agentId} veredicto sin razón`);
      if (vd.veredicto === 'go' && (vd.unresolvedBlockers?.length ?? 0) > 0) {
        push('error', 'CONTRACT_ERROR', `${a.agentId} GO con blockers sin resolver: ${vd.unresolvedBlockers?.join('; ')}`);
      }
      if (vd.veredicto === 'ajustar' && (vd.objeciones?.length ?? 0) === 0) {
        push('warn', 'CONTRACT_ERROR', `${a.agentId} AJUSTAR sin objeciones concretas`);
      }
      if (hasUnsupportedNumericExecutionCosts(JSON.stringify(vd))) {
        push('error', 'HALLUCINATION', `${a.agentId} asigna cifras a spread/slippage declarados DATA_NOT_AVAILABLE`);
      }
      if (hasUnsupportedLiquidityClaim(JSON.stringify(vd))) {
        push('error', 'HALLUCINATION', `${a.agentId} afirma un nivel de liquidez sin metrica aportada`);
      }
    }
  }

  const strat = byId.get(STRATEGY_ID)?.strategy;
  if (strat && strat.direction) {
    for (const revId of ['stock-risk', 'stock-critic']) {
      const rev = byId.get(revId);
      if (rev?.status === 'done' && rev.analysis) {
        const t = JSON.stringify(rev.analysis).toLowerCase();
        const mentionsGeom = t.includes(String(strat.entryPriceNum ?? '')) || t.includes(String(strat.stopLossNum ?? '')) ||
          t.includes(String(strat.takeProfitNum ?? '')) || /r:?r|riesgo\/beneficio|risk\/reward|atr/.test(t);
        if (!mentionsGeom) push('warn', 'CONTRACT_ERROR', `${revId} no referencia geometría/RR de la propuesta (¿transferencia de contexto?)`);
      }
    }
  }

  if (run.finalState === 'validated') {
    const verdict = byId.get(JUDGE_ID)?.verdict;
    if (verdict?.veredicto !== 'go') push('error', 'INVALID_RESULT', `finalState=validated pero veredicto=${verdict?.veredicto}`);
    if ((verdict?.unresolvedBlockers?.length ?? 0) > 0) push('error', 'INVALID_RESULT', `finalState=validated con blockers`);
  }

  const errors = findings.filter((f) => f.severity === 'error');
  return {
    run_id: run.run_id,
    scenario: run.scenario,
    configurationId: run.configurationId,
    configurationVersion: run.configurationVersion,
    configurationHash: run.configurationHash,
    status: run.status,
    finalState: run.finalState,
    verdict: byId.get(JUDGE_ID)?.verdict?.veredicto ?? null,
    strategyGate: findings.find((f) => f.code === 'STRATEGY_OK') ? 'PASS' : (findings.find((f) => f.code === 'STRATEGY_ERROR') ? 'FAIL' : 'N/A'),
    ok: errors.length === 0,
    findings,
  };
}

async function main() {
  const report = await readJson<{ runs?: RunEntry[] }>(REPORT_FILE, { runs: [] });
  const runs = report.runs ?? [];
  if (!runs.length) { console.error('No hay runs en el informe.'); process.exit(1); }

  const audits = runs.map(auditRun);
  await writeJson(AUDIT_FILE, { generatedAt: new Date().toISOString(), audits });

  for (const a of audits) {
    console.log(`\n### ${a.run_id} (${a.scenario}) — ${a.ok ? 'OK' : 'CON HALLAZGOS'} | status=${a.status} finalState=${a.finalState} verdict=${a.verdict} gate=${a.strategyGate}`);
    for (const f of a.findings) console.log(`  [${f.severity.toUpperCase()}] ${f.code}: ${f.msg}`);
  }
  const totalErr = audits.reduce((n, a) => n + a.findings.filter((f) => f.severity === 'error').length, 0);
  const totalWarn = audits.reduce((n, a) => n + a.findings.filter((f) => f.severity === 'warn').length, 0);
  console.log(`\nTOTAL: ${audits.length} runs, ${totalErr} errores, ${totalWarn} warnings. Audit -> ${AUDIT_FILE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

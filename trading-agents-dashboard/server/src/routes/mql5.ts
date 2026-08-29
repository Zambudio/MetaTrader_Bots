import { Router } from 'express';
import { generateMql5, optimizeMql5 } from '../engine/mql5Generator.js';
import { createMql5Job, updateMql5JobProgress, completeMql5Job, failMql5Job, getMql5JobPersisted } from '../engine/mql5Jobs.js';
import { loadRun, saveRun } from '../store/runsStore.js';
import { listAgents } from '../store/agentsStore.js';
import { retryStrategyForBacktestFailure, MAX_BACKTEST_STRATEGY_RETRIES } from '../engine/orchestrator.js';
import { evaluateQualityGate } from '../engine/qualityGate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Mql5GenerationResult, StrategyProposalLite } from '../types.js';

export const mql5Router = Router();

import { validateStrategyProposal } from '../engine/strategyValidator.js';

function qualityGatePassed(result: Mql5GenerationResult): boolean {
  if (!result.backtestSession?.stats) return false;
  return evaluateQualityGate(result.backtestSession.stats).passed;
}

/** Diagnóstico en términos de trading (no de código) para agente-riesgo/agente-razonador — ver
 * `retryStrategyForBacktestFailure` en orchestrator.ts: esto es lo que doc 20 §5.1 llama
 * "Inyección de Contexto al Agente Razonador" y que hasta ahora solo llegaba al LLM de código. */
function buildStrategyFeedbackText(result: Mql5GenerationResult): string {
  const lines = [
    'RESULTADO DE UN BACKTEST REAL (MetaTrader 5, ~12 meses de histórico) para la estrategia que propusiste y que este panel dio por buena (GO):',
  ];
  const s = result.backtestSession?.stats;
  if (s) {
    lines.push(
      `- Operaciones cerradas: ${s.closedTrades}`,
      `- Win rate: ${s.winRatePct !== null ? s.winRatePct.toFixed(1) + '%' : 'N/A'}`,
      `- R:R medio real: ${s.avgRR !== null ? s.avgRR.toFixed(2) : 'N/A'}`,
      `- Esperanza matemática: ${s.expectancyR !== null ? s.expectancyR.toFixed(2) + ' R' : 'N/A'}`,
      `- Profit factor: ${s.profitFactorApprox !== null ? s.profitFactorApprox.toFixed(2) : 'N/A'}`,
      `- Resultado neto: ${s.netProfit !== null ? s.netProfit.toFixed(2) + ' USD' : 'N/A'}`,
      `- Drawdown máximo: ${s.maxDrawdownPct !== null ? s.maxDrawdownPct.toFixed(1) + '%' : 'N/A'}`
    );
  }
  if (result.optimizationNotes?.length) {
    lines.push('', 'Notas del Quality Gate tras varios intentos de ajuste de código (SL/TP, filtros):', ...result.optimizationNotes);
  }
  lines.push(
    '',
    'IMPORTANTE: esto NO es un fallo de código — ya se intentó ajustar SL/TP/filtros varias veces sobre la MISMA condición de entrada y no alcanza el Quality Gate. Reconsidera la tesis en sí: otra condición de entrada, otros indicadores, otra dirección, u otro par/timeframe si nada razonable tiene sentido aquí. No propongas la misma condición de entrada con otro R:R o multiplicador de ATR — eso ya se probó. Si tras este diagnóstico ninguna propuesta razonable tiene ventaja estadística real en estos datos, usa NO_OPERAR en vez de forzar un GO.'
  );
  return lines.join('\n');
}

async function generateWithStrategyFeedbackLoop(
  strategy: StrategyProposalLite,
  model: string | undefined,
  runId: string | undefined,
  jobId: string
): Promise<Mql5GenerationResult> {
  let currentStrategy = strategy;
  let result = await generateMql5(currentStrategy, model, (progress) => updateMql5JobProgress(jobId, progress));

  let cycles = 0;
  if (typeof runId === 'string' && runId) {
    while (
      cycles < MAX_BACKTEST_STRATEGY_RETRIES &&
      result.compileStatus !== 'errors' &&
      result.backtestSession?.stats &&
      !qualityGatePassed(result)
    ) {
      const run = await loadRun(runId);
      if (!run) break;
      const agents = await listAgents();

      updateMql5JobProgress(jobId, {
        attempt: 1,
        maxAttempts: 1,
        phase: 'restrategizing',
        details: `El backtest real no pasó el Quality Gate — el panel de agentes reconsidera la estrategia (ciclo ${cycles + 1}/${MAX_BACKTEST_STRATEGY_RETRIES})...`,
      });

      const retryResult = await retryStrategyForBacktestFailure(run, agents, buildStrategyFeedbackText(result));
      cycles++;

      if (!retryResult.ok) break;
      if (retryResult.discarded) {
        result = { ...result, discarded: true, discardReason: retryResult.verdict?.razon };
        break;
      }
      if (!retryResult.strategy) break;

      currentStrategy = retryResult.strategy;
      result = await generateMql5(currentStrategy, model, (progress) => updateMql5JobProgress(jobId, progress));
    }
  }

  if (cycles > 0) {
    result = {
      ...result,
      strategyFeedbackCycles: cycles,
      finalStrategy: currentStrategy !== strategy ? currentStrategy : undefined,
    };
  }

  return result;
}

function isValidStrategy(value: unknown): value is StrategyProposalLite {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  const hasFields =
    typeof s.pair === 'string' && s.pair.trim().length > 0 &&
    typeof s.timeframe === 'string' && s.timeframe.trim().length > 0 &&
    typeof s.resumen === 'string' && s.resumen.trim().length > 0 &&
    Array.isArray(s.indicadoresClave) &&
    typeof s.condicionEntrada === 'string' && s.condicionEntrada.trim().length > 0 &&
    typeof s.puntoEntrada === 'string' && s.puntoEntrada.trim().length > 0 &&
    typeof s.stopLoss === 'string' && s.stopLoss.trim().length > 0 &&
    typeof s.takeProfit === 'string' && s.takeProfit.trim().length > 0;

  if (!hasFields) return false;
  const val = validateStrategyProposal(s as unknown as StrategyProposalLite);
  return val.valid;
}

mql5Router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { strategy, model, runId } = req.body ?? {};
    if (!isValidStrategy(strategy)) {
      res.status(400).json({ error: 'strategy inválida o incompleta' });
      return;
    }

    const jobId = createMql5Job(typeof runId === 'string' ? runId : undefined);
    res.status(202).json({ jobId });

    void generateWithStrategyFeedbackLoop(strategy, typeof model === 'string' ? model : undefined, typeof runId === 'string' ? runId : undefined, jobId)
      .then(async (result) => {
        completeMql5Job(jobId, result);
        if (typeof runId === 'string' && runId) {
          const run = await loadRun(runId);
          if (run) {
            run.mql5Result = result;
            await saveRun(run).catch(() => {});
          }
        }
      })
      .catch((err) => failMql5Job(jobId, err instanceof Error ? err.message : 'Error desconocido'));
  })
);

mql5Router.post(
  '/optimize',
  asyncHandler(async (req, res) => {
    const { strategy, previousCode, previousBacktest, iteration, model, runId, previousNotes } = req.body ?? {};
    if (!isValidStrategy(strategy) || typeof previousCode !== 'string') {
      res.status(400).json({ error: 'Parámetros de optimización incompletos' });
      return;
    }

    const jobId = createMql5Job(typeof runId === 'string' ? runId : undefined);
    res.status(202).json({ jobId });

    const iterNumber = typeof iteration === 'number' ? iteration : 2;
    const notes = Array.isArray(previousNotes) ? previousNotes.filter((n): n is string => typeof n === 'string') : undefined;

    void optimizeMql5(
      strategy,
      previousCode,
      previousBacktest ?? null,
      iterNumber,
      typeof model === 'string' ? model : undefined,
      (progress) => updateMql5JobProgress(jobId, progress),
      notes
    )
      .then(async (result) => {
        completeMql5Job(jobId, result);
        if (typeof runId === 'string' && runId) {
          const run = await loadRun(runId);
          if (run) {
            run.mql5Result = result;
            await saveRun(run).catch(() => {});
          }
        }
      })
      .catch((err) => failMql5Job(jobId, err instanceof Error ? err.message : 'Error desconocido'));
  })
);

mql5Router.get(
  '/generate/:jobId',
  asyncHandler(async (req, res) => {
    const job = await getMql5JobPersisted(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job no encontrado — probablemente el servidor se reinició durante la generación. Vuelve a intentarlo.' });
      return;
    }
    res.json(job);
  })
);

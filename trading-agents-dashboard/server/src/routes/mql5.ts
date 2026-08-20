import { Router } from 'express';
import { generateMql5, optimizeMql5 } from '../engine/mql5Generator.js';
import { createMql5Job, updateMql5JobProgress, completeMql5Job, failMql5Job, getMql5Job } from '../engine/mql5Jobs.js';
import { loadRun, saveRun } from '../store/runsStore.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { StrategyProposalLite } from '../types.js';

export const mql5Router = Router();

import { validateStrategyProposal } from '../engine/strategyValidator.js';

function isValidStrategy(value: unknown): value is StrategyProposalLite {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  const hasFields =
    typeof s.pair === 'string' && s.pair.trim().length > 0 &&
    typeof s.timeframe === 'string' && s.timeframe.trim().length > 0 &&
    typeof s.resumen === 'string' && s.resumen.trim().length > 0 &&
    Array.isArray(s.indicadoresClave) &&
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

    const jobId = createMql5Job();
    res.status(202).json({ jobId });

    void generateMql5(strategy, typeof model === 'string' ? model : undefined, (progress) =>
      updateMql5JobProgress(jobId, progress)
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

mql5Router.post(
  '/optimize',
  asyncHandler(async (req, res) => {
    const { strategy, previousCode, previousBacktest, iteration, model, runId, previousNotes } = req.body ?? {};
    if (!isValidStrategy(strategy) || typeof previousCode !== 'string') {
      res.status(400).json({ error: 'Parámetros de optimización incompletos' });
      return;
    }

    const jobId = createMql5Job();
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
    const job = getMql5Job(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job no encontrado — probablemente el servidor se reinició durante la generación. Vuelve a intentarlo.' });
      return;
    }
    res.json(job);
  })
);

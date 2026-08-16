import { Router } from 'express';
import { generateMql5 } from '../engine/mql5Generator.js';
import { createMql5Job, updateMql5JobProgress, completeMql5Job, failMql5Job, getMql5Job } from '../engine/mql5Jobs.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { StrategyProposalLite } from '../types.js';

export const mql5Router = Router();

function isValidStrategy(value: unknown): value is StrategyProposalLite {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.pair === 'string' &&
    typeof s.timeframe === 'string' &&
    typeof s.resumen === 'string' &&
    Array.isArray(s.indicadoresClave) &&
    typeof s.puntoEntrada === 'string' &&
    typeof s.stopLoss === 'string' &&
    typeof s.takeProfit === 'string'
  );
}

mql5Router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { strategy, model } = req.body ?? {};
    if (!isValidStrategy(strategy)) {
      res.status(400).json({ error: 'strategy inválida o incompleta' });
      return;
    }

    // La generación real (LLM + hasta 3 compilaciones en MetaEditor) puede tardar varios
    // minutos. Devolver eso como una única respuesta HTTP bloqueante es fragil: cualquier
    // reinicio del dev server (tsx watch, al editar código mientras se genera) o cualquier
    // corte de red de más de unos segundos tumba la conexión en curso — el navegador lo ve
    // como "Failed to fetch" pese a que el trabajo en el servidor suele completarse igual.
    // Por eso el POST solo arranca el job y devuelve un id; el cliente hace polling a
    // GET /generate/:jobId, donde un corte solo afecta a un tick de sondeo, no a los minutos
    // de trabajo ya invertidos.
    const jobId = createMql5Job();
    res.status(202).json({ jobId });

    void generateMql5(strategy, typeof model === 'string' ? model : undefined, (progress) =>
      updateMql5JobProgress(jobId, progress)
    )
      .then((result) => completeMql5Job(jobId, result))
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

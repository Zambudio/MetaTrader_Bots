import { Router } from 'express';
import { nanoid } from 'nanoid';
import { saveRun, loadRun, listRuns, deleteRun } from '../store/runsStore.js';
import { executeRun, DEFAULT_MAX_RETRIES } from '../engine/orchestrator.js';
import { getActivePreset, getPreset } from '../store/agentConfigsStore.js';
import { hashConfiguration, validatePreset } from '../config/configValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Run } from '../types.js';

export const runsRouter = Router();

runsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const runs = await listRuns();
    res.json(runs);
  })
);

runsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { pair, timeframe, maxRetries, configurationId, executionMode } = req.body ?? {};
    if (!pair || typeof pair !== 'string') {
      res.status(400).json({ error: 'pair is required' });
      return;
    }

    const preset = typeof configurationId === 'string' ? await getPreset(configurationId) : await getActivePreset();
    if (!preset) {
      res.status(400).json({ error: 'no hay configuración activa' });
      return;
    }
    const presetValidation = validatePreset(preset);
    if (!presetValidation.valid) {
      res.status(400).json({ error: `configuración inválida: ${presetValidation.errors.join('; ')}` });
      return;
    }
    if (preset.id.startsWith('baseline-') && pair !== preset.referenceAsset) {
      res.status(400).json({ error: `La baseline ${preset.name} requiere el activo de referencia ${preset.referenceAsset}; recibido ${pair}.` });
      return;
    }
    const agents = structuredClone(preset.agents);
    if (agents.length === 0) {
      res.status(400).json({ error: 'no hay agentes configurados' });
      return;
    }

    const run: Run = {
      id: nanoid(10),
      pair,
      timeframe: typeof timeframe === 'string' && timeframe ? timeframe : 'H1',
      status: 'running',
      createdAt: new Date().toISOString(),
      results: agents.map((a) => ({ agentId: a.id, status: 'waiting' })),
      configuration: structuredClone(preset),
      configurationHash: hashConfiguration(preset),
      executionMode: executionMode === 'simulation' ? 'simulation' : 'real',
      expectedAgentIds: agents.map((agent) => agent.id),
      issues: [],
      retryCount: 0,
      maxRetries: typeof maxRetries === 'number' && Number.isFinite(maxRetries)
        ? maxRetries
        : preset.consensus.maxRevisionRounds ?? DEFAULT_MAX_RETRIES,
    };
    await saveRun(run);

    executeRun(run, agents).catch(async (err) => {
      console.error('[runs] execution failed', err);
      run.status = 'error';
      await saveRun(run).catch(() => {});
    });

    res.status(202).json(run);
  })
);

runsRouter.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const run = await loadRun(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'run not found' });
      return;
    }

    if (!run.configuration) {
      res.status(409).json({ error: 'El run histórico no contiene una configuración inmutable y no puede reanudarse de forma segura.' });
      return;
    }
    if (run.configurationHash !== hashConfiguration(run.configuration)) {
      res.status(409).json({ error: 'El snapshot de configuración del run no supera la verificación de integridad.' });
      return;
    }
    const agents = structuredClone(run.configuration.agents);
    const { agentId } = req.body ?? {};

    const { resumeRun } = await import('../engine/orchestrator.js');
    resumeRun(run, agents, typeof agentId === 'string' ? agentId : undefined).catch(async (err) => {
      console.error('[runs] resume failed', err);
      run.status = 'error';
      await saveRun(run).catch(() => {});
    });

    res.status(202).json(run);
  })
);

runsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const run = await loadRun(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'run not found' });
      return;
    }
    res.json(run);
  })
);

runsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteRun(req.params.id);
    res.json({ ok: true });
  })
);

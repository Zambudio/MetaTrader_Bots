import { Router } from 'express';
import { nanoid } from 'nanoid';
import { listAgents } from '../store/agentsStore.js';
import { saveRun, loadRun } from '../store/runsStore.js';
import { executeRun } from '../engine/orchestrator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Run } from '../types.js';

export const runsRouter = Router();

runsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { pair, timeframe } = req.body ?? {};
    if (!pair || typeof pair !== 'string') {
      res.status(400).json({ error: 'pair is required' });
      return;
    }

    const agents = await listAgents();
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
    };
    await saveRun(run);

    executeRun(run, agents).catch((err) => {
      console.error('[runs] execution failed', err);
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

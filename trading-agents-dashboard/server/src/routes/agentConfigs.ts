import { Router } from 'express';
import { listAgents, saveAgents } from '../store/agentsStore.js';
import {
  loadAgentConfigsState,
  createPreset,
  overwritePreset,
  setActivePreset,
  deletePreset,
} from '../store/agentConfigsStore.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const agentConfigsRouter = Router();

agentConfigsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const state = await loadAgentConfigsState();
    res.json(state);
  })
);

agentConfigsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const state = await loadAgentConfigsState();
    if (state.presets.some((p) => p.name === name)) {
      res.status(400).json({ error: `Ya existe una configuración llamada "${name}".` });
      return;
    }
    const agents = await listAgents();
    const preset = await createPreset(name, agents);
    res.status(201).json(preset);
  })
);

agentConfigsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const preset = await overwritePreset(req.params.id, agents);
    if (!preset) {
      res.status(404).json({ error: 'preset not found' });
      return;
    }
    res.json(preset);
  })
);

agentConfigsRouter.post(
  '/:id/load',
  asyncHandler(async (req, res) => {
    const state = await loadAgentConfigsState();
    const preset = state.presets.find((p) => p.id === req.params.id);
    if (!preset) {
      res.status(404).json({ error: 'preset not found' });
      return;
    }
    await saveAgents(preset.agents);
    await setActivePreset(preset.id);
    res.json({ agents: preset.agents, activePresetId: preset.id });
  })
);

agentConfigsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await deletePreset(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'preset not found' });
      return;
    }
    res.json({ ok: true });
  })
);

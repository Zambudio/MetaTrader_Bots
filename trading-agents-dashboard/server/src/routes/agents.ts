import { Router } from 'express';
import { nanoid } from 'nanoid';
import { listAgents, saveAgents } from '../store/agentsStore.js';
import { detectCycle } from '../engine/orchestrator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Agent } from '../types.js';

export const agentsRouter = Router();

agentsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listAgents());
  })
);

agentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const { name, role, systemPrompt, dependsOn, outputType, photo, model } = req.body ?? {};

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const dependsOnList: string[] = Array.isArray(dependsOn) ? dependsOn : [];
    for (const parentId of dependsOnList) {
      if (!agents.some((a) => a.id === parentId)) {
        res.status(400).json({ error: 'dependsOn does not reference an existing agent' });
        return;
      }
    }

    const newAgent: Agent = {
      id: nanoid(8),
      name,
      role: typeof role === 'string' && role ? role : 'Agente',
      systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : '',
      dependsOn: dependsOnList,
      outputType: outputType === 'strategy' ? 'strategy' : 'text',
      photo: typeof photo === 'string' && photo ? photo : undefined,
      model: typeof model === 'string' && model ? model : undefined,
    };

    await saveAgents([...agents, newAgent]);
    res.status(201).json(newAgent);
  })
);

agentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const index = agents.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'agent not found' });
      return;
    }

    const updates = req.body ?? {};
    if ('dependsOn' in updates) {
      const newDependsOn = updates.dependsOn;
      if (!Array.isArray(newDependsOn) || !newDependsOn.every((id) => typeof id === 'string')) {
        res.status(400).json({ error: 'dependsOn must be an array of agent ids' });
        return;
      }
      for (const parentId of newDependsOn) {
        if (parentId === req.params.id) {
          res.status(400).json({ error: 'an agent cannot depend on itself' });
          return;
        }
        if (!agents.some((a) => a.id === parentId)) {
          res.status(400).json({ error: 'dependsOn does not reference an existing agent' });
          return;
        }
        if (detectCycle(agents, req.params.id, parentId)) {
          res.status(400).json({ error: 'this dependency would create a cycle' });
          return;
        }
      }
    }

    const updated: Agent = { ...agents[index], ...updates, id: agents[index].id };
    agents[index] = updated;
    await saveAgents(agents);
    res.json(updated);
  })
);

agentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const exists = agents.some((a) => a.id === req.params.id);
    if (!exists) {
      res.status(404).json({ error: 'agent not found' });
      return;
    }

    const remaining = agents
      .filter((a) => a.id !== req.params.id)
      .map((a) => ({ ...a, dependsOn: a.dependsOn.filter((id) => id !== req.params.id) }));

    await saveAgents(remaining);
    res.json({ ok: true });
  })
);

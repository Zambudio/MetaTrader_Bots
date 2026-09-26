import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { listAgents, saveAgents } from '../store/agentsStore.js';
import { detectCycle } from '../engine/orchestrator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Agent } from '../types.js';

const AgentUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  systemPrompt: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  outputType: z.enum(['text', 'analysis', 'strategy', 'verdict']).optional(),
  photo: z.string().optional(),
  model: z.string().optional(),
  activation: z.object({
    mode: z.enum(['always', 'data_available', 'on_conflict']),
    requiredData: z.array(z.enum([
      'market_snapshot', 'ohlcv', 'session_clock', 'verified_macro_calendar', 'verified_news',
      'corporate_fundamentals', 'sec_filings', 'benchmark_data', 'derivatives_metrics', 'on_chain_metrics',
    ])).optional(),
    description: z.string(),
  }).optional(),
  abstentionConditions: z.array(z.string()).optional(),
  weight: z.number().min(0).max(1).optional(),
  interventionType: z.enum(['specialist', 'synthesizer', 'validator', 'judge', 'adversarial']).optional(),
}).strict();

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

    const resolvedOutputType = outputType === 'analysis' || outputType === 'strategy' || outputType === 'verdict' ? outputType : 'text';

    // 4.3 Protección de unicidad para 'verdict' y 'strategy'
    if (resolvedOutputType === 'verdict' && agents.some((a) => a.outputType === 'verdict')) {
      res.status(400).json({ error: 'Solo puede existir un único agente con outputType "verdict" en el flujo.' });
      return;
    }
    if (resolvedOutputType === 'strategy' && agents.some((a) => a.outputType === 'strategy')) {
      res.status(400).json({ error: 'Solo puede existir un único agente con outputType "strategy" en el flujo.' });
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
      outputType: resolvedOutputType,
      photo: typeof photo === 'string' && photo ? photo : undefined,
      model: typeof model === 'string' && model ? model : undefined,
      activation: { mode: 'always', description: 'Configuración manual: ejecutar siempre.' },
      abstentionConditions: ['Datos obligatorios ausentes'],
      tools: [],
      inputs: [],
      outputs: [resolvedOutputType],
      weight: resolvedOutputType === 'verdict' ? 1 : 0.1,
      interventionType: resolvedOutputType === 'verdict' ? 'judge' : resolvedOutputType === 'strategy' ? 'synthesizer' : 'specialist',
    };

    await saveAgents([...agents, newAgent]);
    res.status(201).json(newAgent);
  })
);

agentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    // Validar que el payload solo contiene campos permitidos
    const parseResult = AgentUpdateSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid agent update fields',
        details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      return;
    }
    const updates = parseResult.data;

    const agents = await listAgents();
    const index = agents.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'agent not found' });
      return;
    }

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

    if ('outputType' in updates) {
      const newOutputType = updates.outputType;
      if (newOutputType !== 'text' && newOutputType !== 'analysis' && newOutputType !== 'strategy' && newOutputType !== 'verdict') {
        res.status(400).json({ error: "outputType must be one of 'text', 'analysis', 'strategy', 'verdict'" });
        return;
      }
      // 4.3 Protección de unicidad para 'verdict' y 'strategy'
      if (
        (newOutputType === 'verdict' || newOutputType === 'strategy') &&
        agents.some((a) => a.id !== req.params.id && a.outputType === newOutputType)
      ) {
        res.status(400).json({
          error: `Solo puede existir un único agente con outputType "${newOutputType}" en el flujo.`,
        });
        return;
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

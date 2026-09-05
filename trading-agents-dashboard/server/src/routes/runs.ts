import { Router } from 'express';
import { nanoid } from 'nanoid';
import { saveRun, loadRun, listRuns, deleteRun } from '../store/runsStore.js';
import { executeRun, DEFAULT_MAX_RETRIES } from '../engine/orchestrator.js';
import { getActivePreset, getPreset } from '../store/agentConfigsStore.js';
import { hashConfiguration, validatePreset } from '../config/configValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Agent, Run } from '../types.js';

export const runsRouter = Router();

export interface ModelOverride {
  agentId: string;
  from: string;
  to: string;
}

/**
 * Un run congela su `configuration` al crearse (para que el hash de integridad sea reproducible),
 * pero eso significa que editar el modelo de un agente DESPUÉS de crear el run y pulsar
 * "Reintentar" reejecutaba silenciosamente con el modelo antiguo — el usuario veía el selector
 * mostrando p. ej. `openai:gpt-5.6-sol:medium` en la tarjeta del agente mientras el reintento
 * seguía llamando a `claudeCli` y agotando cuota de Claude. Sincroniza en sitio el campo `model`
 * (única fuente/motor, no el DAG/prompts) de los agentes que van a reejecutarse con lo que esté
 * configurado AHORA en el preset vivo; deja constancia del cambio en `overrides` para que la ruta
 * lo registre como `RunIssue` y no quede un cambio de motor sin rastro.
 */
export function syncLiveModelsForRetry(
  configAgents: Agent[],
  liveAgents: Agent[] | undefined,
  retryTargets: ReadonlySet<string>
): ModelOverride[] {
  if (!liveAgents || retryTargets.size === 0) return [];
  const liveModelById = new Map(liveAgents.map((a) => [a.id, a.model]));
  const overrides: ModelOverride[] = [];
  for (const agent of configAgents) {
    if (!retryTargets.has(agent.id)) continue;
    const liveModel = liveModelById.get(agent.id);
    if (liveModel && liveModel !== agent.model) {
      overrides.push({ agentId: agent.id, from: agent.model ?? '', to: liveModel });
      agent.model = liveModel;
    }
  }
  return overrides;
}

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
    const { agentId } = req.body ?? {};
    const targetAgentId = typeof agentId === 'string' ? agentId : undefined;

    const retryTargets = new Set(
      run.results
        .filter((r) => r.status === 'error' || (targetAgentId !== undefined && r.agentId === targetAgentId))
        .map((r) => r.agentId)
    );
    const livePreset = await getPreset(run.configuration.id);
    const overrides = syncLiveModelsForRetry(run.configuration.agents, livePreset?.agents, retryTargets);
    if (overrides.length > 0) {
      run.issues = run.issues ?? [];
      for (const o of overrides) {
        run.issues.push({
          code: 'MODEL_OVERRIDE_ON_RESUME',
          severity: 'warning',
          message: `${o.agentId}: modelo actualizado de "${o.from}" a "${o.to}" al reintentar (sincronizado con la configuración vigente).`,
          agentId: o.agentId,
        });
      }
      run.configurationHash = hashConfiguration(run.configuration);
    }

    const agents = structuredClone(run.configuration.agents);

    const { resumeRun } = await import('../engine/orchestrator.js');
    resumeRun(run, agents, targetAgentId).catch(async (err) => {
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

import { describe, expect, it } from 'vitest';
import { syncLiveModelsForRetry } from '../src/routes/runs.js';
import type { Agent } from '../src/types.js';

function agent(id: string, model: string): Agent {
  return { id, name: id, role: id, systemPrompt: 'x', dependsOn: [], outputType: 'analysis', model };
}

describe('syncLiveModelsForRetry (fix: reintentar usaba el modelo congelado del run, no el vivo)', () => {
  it('actualiza el modelo de un agente que va a reintentarse cuando difiere del preset vivo', () => {
    const configAgents = [agent('critic', 'claude:sonnet'), agent('structure', 'claude:sonnet')];
    const liveAgents = [agent('critic', 'openai:gpt-5.6-sol:medium'), agent('structure', 'claude:sonnet')];
    const overrides = syncLiveModelsForRetry(configAgents, liveAgents, new Set(['critic']));

    expect(overrides).toEqual([{ agentId: 'critic', from: 'claude:sonnet', to: 'openai:gpt-5.6-sol:medium' }]);
    // mutación en sitio: el propio array pasado queda con el modelo nuevo
    expect(configAgents.find((a) => a.id === 'critic')?.model).toBe('openai:gpt-5.6-sol:medium');
  });

  it('no toca agentes fuera del conjunto de reintento aunque su modelo vivo también haya cambiado', () => {
    const configAgents = [agent('critic', 'claude:sonnet'), agent('structure', 'claude:sonnet')];
    const liveAgents = [agent('critic', 'openai:gpt-5.6-sol:medium'), agent('structure', 'omniroute:auto/best-fast')];
    const overrides = syncLiveModelsForRetry(configAgents, liveAgents, new Set(['critic']));

    expect(overrides).toHaveLength(1);
    expect(configAgents.find((a) => a.id === 'structure')?.model).toBe('claude:sonnet');
  });

  it('no reporta cambio cuando el modelo vivo es igual al congelado', () => {
    const configAgents = [agent('critic', 'claude:sonnet')];
    const liveAgents = [agent('critic', 'claude:sonnet')];
    expect(syncLiveModelsForRetry(configAgents, liveAgents, new Set(['critic']))).toEqual([]);
  });

  it('no falla ni cambia nada si el preset vivo ya no existe (undefined)', () => {
    const configAgents = [agent('critic', 'claude:sonnet')];
    expect(syncLiveModelsForRetry(configAgents, undefined, new Set(['critic']))).toEqual([]);
    expect(configAgents[0].model).toBe('claude:sonnet');
  });

  it('no hace nada si no hay objetivos de reintento', () => {
    const configAgents = [agent('critic', 'claude:sonnet')];
    const liveAgents = [agent('critic', 'openai:gpt-5.6-sol:medium')];
    expect(syncLiveModelsForRetry(configAgents, liveAgents, new Set())).toEqual([]);
  });

  it('ignora agentes del reintento que ya no existen en el preset vivo (renombrado/eliminado)', () => {
    const configAgents = [agent('critic', 'claude:sonnet')];
    const liveAgents = [agent('other-agent', 'openai:gpt-5.6-sol:medium')];
    expect(syncLiveModelsForRetry(configAgents, liveAgents, new Set(['critic']))).toEqual([]);
  });
});

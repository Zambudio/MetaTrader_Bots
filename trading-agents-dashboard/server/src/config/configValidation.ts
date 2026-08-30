import { createHash } from 'node:crypto';
import type { Agent, AgentConfigPreset } from '../types.js';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  }
  return value;
}

export function hashConfiguration(config: AgentConfigPreset): string {
  return createHash('sha256').update(JSON.stringify(stable(config))).digest('hex');
}

export function allDependencies(agent: Agent): string[] {
  return [...new Set([...agent.dependsOn, ...(agent.optionalDependsOn ?? [])])];
}

export function validatePreset(config: AgentConfigPreset): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (config.schemaVersion !== 'multiagent-config.v1') errors.push('schemaVersion no soportada');
  if (!config.version.trim()) errors.push('version vacía');
  if (!config.referenceAsset.trim()) errors.push('referenceAsset vacío');
  const ids = config.agents.map((agent) => agent.id);
  if (new Set(ids).size !== ids.length) errors.push('IDs de agente duplicados');
  const byId = new Set(ids);
  for (const agent of config.agents) {
    for (const dependency of allDependencies(agent)) {
      if (!byId.has(dependency)) errors.push(`${agent.id} depende de ${dependency}, que no existe`);
    }
    if (!agent.systemPrompt.trim()) errors.push(`${agent.id} no tiene prompt`);
    if (!agent.activation) errors.push(`${agent.id} no tiene regla de activación`);
    if (agent.weight !== undefined && (agent.weight < 0 || agent.weight > 1)) errors.push(`${agent.id} tiene peso fuera de 0..1`);
  }
  if (config.agents.filter((agent) => agent.outputType === 'strategy').length !== 1) errors.push('Debe existir exactamente un agente strategy');
  if (config.agents.filter((agent) => agent.outputType === 'verdict').length !== 1) errors.push('Debe existir exactamente un agente verdict');
  const judge = config.agents.find((agent) => agent.id === config.consensus.judgeAgentId);
  if (!judge || judge.outputType !== 'verdict') errors.push('consensus.judgeAgentId no referencia al agente verdict');
  if (config.riskPolicy.maxRiskPercent <= 0 || config.riskPolicy.maxRiskPercent > 5) errors.push('maxRiskPercent fuera de límites');
  if (config.riskPolicy.minRrRatio < 1) errors.push('minRrRatio inválido');
  if (config.riskPolicy.minStopAtr <= 0 || config.riskPolicy.maxStopAtr <= config.riskPolicy.minStopAtr) errors.push('límites ATR inválidos');
  return { valid: errors.length === 0, errors };
}

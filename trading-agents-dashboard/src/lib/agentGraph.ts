import type { Agent } from '../types/agent';

export function buildLevels(agents: Agent[]): Agent[][] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const childrenOf = new Map<string, Agent[]>();
  const inDegree = new Map<string, number>();

  for (const agent of agents) {
    const validParents = agent.dependsOn.filter((id) => byId.has(id));
    inDegree.set(agent.id, validParents.length);
    for (const parentId of validParents) {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(agent);
    }
  }

  const levels: Agent[][] = [];
  const seen = new Set<string>();
  let currentLevel = agents.filter((agent) => inDegree.get(agent.id) === 0);

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    for (const agent of currentLevel) seen.add(agent.id);
    const nextLevel: Agent[] = [];
    for (const agent of currentLevel) {
      for (const child of childrenOf.get(agent.id) ?? []) {
        const remaining = (inDegree.get(child.id) ?? 0) - 1;
        inDegree.set(child.id, remaining);
        if (remaining === 0) nextLevel.push(child);
      }
    }
    currentLevel = nextLevel;
  }

  const orphaned = agents.filter((agent) => !seen.has(agent.id));
  if (orphaned.length > 0) levels.push(orphaned);
  return levels;
}

/**
 * Quita los agentes desactivados (`enabled === false`) y, transitivamente,
 * cualquier agente que dependa de uno ya quitado. Duplicado del mismo
 * cálculo en `server/src/engine/orchestrator.ts` (mismo patrón que
 * `buildLevels` arriba); se usa para atenuar en la UI los agentes activos
 * pero huérfanos, sin llamar al servidor.
 */
export function filterEnabledAgents(agents: Agent[]): Agent[] {
  const removed = new Set<string>(agents.filter((a) => a.enabled === false).map((a) => a.id));

  let changed = true;
  while (changed) {
    changed = false;
    for (const agent of agents) {
      if (removed.has(agent.id)) continue;
      if (agent.dependsOn.some((depId) => removed.has(depId))) {
        removed.add(agent.id);
        changed = true;
      }
    }
  }

  return agents.filter((a) => !removed.has(a.id));
}

/** ¿Añadir candidateParentId como padre de agentId crearía un ciclo (incluye autoreferencia)? */
export function wouldCreateCycle(agents: Agent[], agentId: string, candidateParentId: string): boolean {
  if (candidateParentId === agentId) return true;
  const byId = new Map(agents.map((a) => [a.id, a]));
  const visited = new Set<string>();
  const queue: string[] = [candidateParentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === agentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const agent = byId.get(current);
    if (agent) queue.push(...agent.dependsOn);
  }
  return false;
}

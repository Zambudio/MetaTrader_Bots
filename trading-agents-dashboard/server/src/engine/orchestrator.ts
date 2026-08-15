import type { Agent, Run } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';

export function detectCycle(agents: Agent[], agentId: string, candidateParentId: string): boolean {
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

  const orphaned = agents.filter((a) => !seen.has(a.id));
  if (orphaned.length > 0) levels.push(orphaned);

  return levels;
}

/** Conjunto de todos los antecesores (unión de todas las ramas de padres, sin duplicados), en orden topológico. */
export function ancestorChain(agents: Agent[], agentId: string): Agent[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const order = buildLevels(agents).flat();
  const orderIndex = new Map(order.map((a, i) => [a.id, i]));

  const visited = new Set<string>();
  const queue = [...(byId.get(agentId)?.dependsOn ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const agent = byId.get(current);
    if (agent) queue.push(...agent.dependsOn);
  }

  return [...visited]
    .map((id) => byId.get(id))
    .filter((a): a is Agent => a !== undefined)
    .sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
}

export async function executeRun(run: Run, agents: Agent[]): Promise<void> {
  const levels = buildLevels(agents);
  const resultsById = new Map(run.results.map((r) => [r.agentId, r]));

  for (const level of levels) {
    await Promise.all(
      level.map(async (agent) => {
        const result = resultsById.get(agent.id);
        if (!result) return;

        result.status = 'running';
        result.startedAt = new Date().toISOString();
        await saveRun(run);

        try {
          const context = ancestorChain(agents, agent.id)
            .map((ancestor) => {
              const ancestorResult = resultsById.get(ancestor.id);
              const text =
                ancestorResult?.output ?? (ancestorResult?.strategy ? JSON.stringify(ancestorResult.strategy) : '');
              return `${ancestor.name}: ${text}`;
            })
            .join('\n\n');

          const { output, strategy } = await runAgent(agent, context, run.pair, run.timeframe);
          result.output = output;
          result.strategy = strategy;
          result.status = 'done';
        } catch (err) {
          result.status = 'error';
          result.error = err instanceof Error ? err.message : 'error desconocido';
        } finally {
          result.finishedAt = new Date().toISOString();
          await saveRun(run);
        }
      })
    );
  }

  run.status = run.results.some((r) => r.status === 'error') ? 'error' : 'done';
  await saveRun(run);
}

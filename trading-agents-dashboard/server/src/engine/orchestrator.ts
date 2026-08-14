import type { Agent, Run } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';

export function detectCycle(agents: Agent[], agentId: string, newDependsOn: string | null): boolean {
  const byId = new Map(agents.map((a) => [a.id, a]));
  let current = newDependsOn;
  const visited = new Set<string>([agentId]);
  while (current) {
    if (visited.has(current)) return true;
    visited.add(current);
    current = byId.get(current)?.dependsOn ?? null;
  }
  return false;
}

export function buildLevels(agents: Agent[]): Agent[][] {
  const children = new Map<string | null, Agent[]>();
  for (const agent of agents) {
    const key = agent.dependsOn;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(agent);
  }

  const levels: Agent[][] = [];
  const seen = new Set<string>();
  let currentLevel = children.get(null) ?? [];

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    for (const agent of currentLevel) seen.add(agent.id);
    currentLevel = currentLevel.flatMap((agent) => children.get(agent.id) ?? []);
  }

  const orphaned = agents.filter((a) => !seen.has(a.id));
  if (orphaned.length > 0) levels.push(orphaned);

  return levels;
}

export function ancestorChain(agents: Agent[], agentId: string): Agent[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const chain: Agent[] = [];
  let current = byId.get(agentId)?.dependsOn ?? null;
  while (current) {
    const agent = byId.get(current);
    if (!agent) break;
    chain.unshift(agent);
    current = agent.dependsOn;
  }
  return chain;
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

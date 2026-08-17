import type { Agent, AgentRunResult, Run, VerdictResult } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';
import { buildMarketSnapshotBlock } from './marketSnapshot.js';

export const DEFAULT_MAX_RETRIES = 2;
export const MAX_RETRIES_CAP = 3;

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

/**
 * Subgrafo a reejecutar cuando el agente de veredicto pide ajustar: el propio agente de
 * veredicto más los ancestros que sí dependen de otro agente. Los especialistas de nivel 0
 * (dependsOn vacío) quedan fuera porque su análisis no cambia entre reintentos.
 */
export function computeRetrySubgraph(agents: Agent[], verdictAgentId: string): Set<string> {
  const ancestors = ancestorChain(agents, verdictAgentId);
  const ids = new Set(ancestors.filter((a) => a.dependsOn.length > 0).map((a) => a.id));
  ids.add(verdictAgentId);
  return ids;
}

/** ids del subgrafo cuya entrada depende de un agente FUERA del subgrafo — reciben las objeciones. */
export function retryEntryPoints(agents: Agent[], subgraph: Set<string>): string[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  return [...subgraph].filter((id) => {
    const agent = byId.get(id);
    return agent ? agent.dependsOn.some((depId) => !subgraph.has(depId)) : false;
  });
}

function resultText(result: AgentRunResult | undefined): string {
  if (!result) return '';
  if (result.status === 'error') return '[ERROR: este agente falló y no produjo salida — no asumas su contenido]';
  if (result.output) return result.output;
  if (result.strategy) return JSON.stringify(result.strategy);
  if (result.verdict) return JSON.stringify(result.verdict);
  return '';
}

function formatObjections(verdict: VerdictResult, attemptNumber: number): string {
  const items = verdict.objeciones && verdict.objeciones.length > 0 ? verdict.objeciones : [verdict.razon];
  return `Objeciones del Razonador (intento ${attemptNumber}):\n${items.map((o) => `- ${o}`).join('\n')}`;
}

interface RunPassOptions {
  onlyAgentIds?: Set<string>;
  extraContextByAgentId?: Map<string, string>;
}

async function runPass(run: Run, agents: Agent[], marketSnapshot: string, options: RunPassOptions = {}): Promise<void> {
  const levels = buildLevels(agents);
  const resultsById = new Map(run.results.map((r) => [r.agentId, r]));

  for (const level of levels) {
    const toRun = options.onlyAgentIds ? level.filter((a) => options.onlyAgentIds!.has(a.id)) : level;
    if (toRun.length === 0) continue;

    await Promise.all(
      toRun.map(async (agent) => {
        const result = resultsById.get(agent.id);
        if (!result) return;

        result.status = 'running';
        result.startedAt = new Date().toISOString();
        await saveRun(run);

        try {
          let context = ancestorChain(agents, agent.id)
            .map((ancestor) => `${ancestor.name}: ${resultText(resultsById.get(ancestor.id))}`)
            .join('\n\n');

          const extra = options.extraContextByAgentId?.get(agent.id);
          if (extra) context = context ? `${extra}\n\n${context}` : extra;

          const { output, strategy, verdict } = await runAgent(agent, context, run.pair, run.timeframe, marketSnapshot);
          result.output = output;
          result.strategy = strategy;
          result.verdict = verdict;
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
}

function resetForRetry(run: Run, subgraph: Set<string>): void {
  run.results = run.results.map((r) => (subgraph.has(r.agentId) ? { agentId: r.agentId, status: 'waiting', attempt: (r.attempt ?? 1) + 1 } : r));
}

export async function executeRun(run: Run, agents: Agent[]): Promise<void> {
  run.maxRetries = Math.min(MAX_RETRIES_CAP, Math.max(0, run.maxRetries ?? DEFAULT_MAX_RETRIES));
  run.retryCount = run.retryCount ?? 0;

  const marketSnapshot = await buildMarketSnapshotBlock(run.pair, run.timeframe);

  await runPass(run, agents, marketSnapshot);

  const verdictAgent = agents.find((a) => a.outputType === 'verdict');
  while (verdictAgent) {
    const verdictResult = run.results.find((r) => r.agentId === verdictAgent.id);
    const verdict = verdictResult?.verdict;
    if (!verdict || verdict.veredicto !== 'ajustar') break;
    if (run.retryCount >= run.maxRetries) break;

    const subgraph = computeRetrySubgraph(agents, verdictAgent.id);
    // Si algún agente del subgrafo ha fallado con error técnico, reintentar solo repetiría
    // el mismo fallo (el run terminará en 'error' igualmente): no gastamos más llamadas.
    if (run.results.some((r) => subgraph.has(r.agentId) && r.status === 'error')) break;

    run.retryCount += 1;
    const entryIds = retryEntryPoints(agents, subgraph);
    const objectionsText = formatObjections(verdict, run.retryCount);
    const extraContextByAgentId = new Map(entryIds.map((id) => [id, objectionsText]));

    resetForRetry(run, subgraph);
    await saveRun(run);

    await runPass(run, agents, marketSnapshot, { onlyAgentIds: subgraph, extraContextByAgentId });
  }

  run.status = run.results.some((r) => r.status === 'error') ? 'error' : 'done';
  await saveRun(run);
}

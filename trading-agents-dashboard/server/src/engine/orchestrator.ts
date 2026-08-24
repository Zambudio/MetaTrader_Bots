import type { Agent, AgentRunResult, Run, StrategyProposalLite, VerdictResult } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';
import { buildMarketSnapshot } from './marketSnapshot.js';
import { validateStrategyProposal } from './strategyValidator.js';

export const DEFAULT_MAX_RETRIES = 2;
export const MAX_RETRIES_CAP = 3;

/**
 * Reintentos in-situ del propio agente cuando su estrategia falla la validación numérica
 * determinista (p. ej. R:R por debajo del mínimo). Es un fallo de aritmética del LLM, no una
 * objeción del Razonador — no tiene sentido tumbar todo el run por un desliz corregible
 * reenviando el error exacto al mismo agente, igual que ya hace mql5Generator con los errores
 * de compilación.
 */
const MAX_STRATEGY_VALIDATION_RETRIES = 2;

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

/**
 * Quita los agentes desactivados (`enabled === false`) y, transitivamente,
 * cualquier agente que dependa de uno ya quitado — aunque él mismo esté
 * activo, se queda sin input y no puede ejecutarse.
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

export function validateGraphIntegrity(agents: Agent[]): { valid: boolean; error?: string } {
  const byId = new Map(agents.map((a) => [a.id, a]));

  // 1. Validar que no haya dependencias huérfanas
  for (const agent of agents) {
    for (const depId of agent.dependsOn) {
      if (!byId.has(depId)) {
        return {
          valid: false,
          error: `El agente "${agent.name}" (${agent.id}) depende de un agente inexistente (${depId}).`,
        };
      }
    }
  }

  // 2. Validar que no haya ciclos
  for (const agent of agents) {
    for (const depId of agent.dependsOn) {
      if (detectCycle(agents, agent.id, depId)) {
        return {
          valid: false,
          error: `Dependencia cíclica detectada involucrando al agente "${agent.name}" (${agent.id}) y "${depId}".`,
        };
      }
    }
  }

  return { valid: true };
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
  let currentLevel = agents.filter((agent) => (inDegree.get(agent.id) ?? 0) === 0);

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

export async function runPass(run: Run, agents: Agent[], snapshot: string | null, options: RunPassOptions = {}): Promise<boolean> {
  const levels = buildLevels(agents);
  const resultsById = new Map(run.results.map((r) => [r.agentId, r]));

  for (const level of levels) {
    const toRun = options.onlyAgentIds ? level.filter((a) => options.onlyAgentIds!.has(a.id)) : level;
    if (toRun.length === 0) continue;

    for (const agent of toRun) {
      const result = resultsById.get(agent.id);
      if (!result) continue;

      // Si ya está completado con éxito y no se forzó su reintento explícito, no repetir
      if (result.status === 'done' && !options.onlyAgentIds?.has(agent.id)) continue;

      // Si alguno de sus ancestros directos falló o no está completado, no puede ejecutarse
      const ancestorsIncomplete = agent.dependsOn.some((depId) => {
        const depResult = resultsById.get(depId);
        return !depResult || depResult.status !== 'done';
      });

      if (ancestorsIncomplete) {
        result.status = 'waiting';
        await saveRun(run);
        continue;
      }

      result.status = 'running';
      result.startedAt = new Date().toISOString();
      result.error = undefined;
      await saveRun(run);

      try {
        let context = ancestorChain(agents, agent.id)
          .map((ancestor) => `${ancestor.name}: ${resultText(resultsById.get(ancestor.id))}`)
          .join('\n\n');

        const extra = options.extraContextByAgentId?.get(agent.id);
        if (extra) context = context ? `${extra}\n\n${context}` : extra;

        let output: string | undefined;
        let strategy: typeof result.strategy;
        let verdict: typeof result.verdict;
        let lastValidationError: string | undefined;

        for (let validationAttempt = 0; validationAttempt <= MAX_STRATEGY_VALIDATION_RETRIES; validationAttempt++) {
          const attemptContext = lastValidationError
            ? `${context}\n\nTu propuesta anterior fue rechazada por incoherencia numérica: ${lastValidationError}\nCorrige los precios de entrada/stop loss/take profit para que sean matemáticamente coherentes con la dirección y cumplan el R:R mínimo exigido.`
            : context;

          ({ output, strategy, verdict } = await runAgent(agent, attemptContext, run.pair, run.timeframe, snapshot));

          // 1.1: Validación determinista de coherencia numérica tras generación de estrategia
          if (!strategy) break;

          const valResult = validateStrategyProposal(strategy);
          if (valResult.valid) {
            if (valResult.normalized) {
              strategy.direction = valResult.normalized.direction;
              strategy.entryPriceNum = valResult.normalized.entryPriceNum;
              strategy.stopLossNum = valResult.normalized.stopLossNum;
              strategy.takeProfitNum = valResult.normalized.takeProfitNum;
            }
            lastValidationError = undefined;
            break;
          }

          lastValidationError = valResult.error;
          if (validationAttempt === MAX_STRATEGY_VALIDATION_RETRIES) {
            throw new Error(`Incoherencia numérica en estrategia tras ${MAX_STRATEGY_VALIDATION_RETRIES + 1} intentos: ${valResult.error}`);
          }
        }

        result.output = output;
        result.strategy = strategy;
        result.verdict = verdict;
        result.status = 'done';
        result.finishedAt = new Date().toISOString();
        await saveRun(run);
      } catch (err) {
        result.status = 'error';
        result.error = err instanceof Error ? err.message : 'error desconocido';
        result.finishedAt = new Date().toISOString();
        run.status = 'error';
        await saveRun(run);

        // DETENCIÓN INMEDIATA: no continuar con agentes dependientes ni niveles posteriores
        console.warn(`[orchestrator] Agente ${agent.name} (${agent.id}) falló. Flujo detenido.`);
        return false;
      }
    }
  }

  return true;
}

export function resetForRetry(run: Run, subgraph: Set<string>): void {
  run.results = run.results.map((r) => (subgraph.has(r.agentId) ? { agentId: r.agentId, status: 'waiting', attempt: (r.attempt ?? 1) + 1 } : r));
}

export async function executeRun(run: Run, agents: Agent[]): Promise<void> {
  // 2.1: Validar integridad del grafo antes de iniciar
  const graphValidation = validateGraphIntegrity(agents);
  if (!graphValidation.valid) {
    run.status = 'error';
    const firstResult = run.results[0];
    if (firstResult) {
      firstResult.status = 'error';
      firstResult.error = `Error de grafo de agentes: ${graphValidation.error}`;
    }
    await saveRun(run);
    return;
  }

  run.maxRetries = Math.min(MAX_RETRIES_CAP, Math.max(0, run.maxRetries ?? DEFAULT_MAX_RETRIES));
  run.retryCount = run.retryCount ?? 0;

  // 1. Obtener snapshot de mercado real para el par y timeframe
  const snapshot = await buildMarketSnapshot(run.pair, run.timeframe);

  const passed = await runPass(run, agents, snapshot);
  if (!passed) {
    run.status = 'error';
    await saveRun(run);
    return;
  }

  const verdictAgent = agents.find((a) => a.outputType === 'verdict');
  while (verdictAgent) {
    const verdictResult = run.results.find((r) => r.agentId === verdictAgent.id);
    const verdict = verdictResult?.verdict;
    if (!verdict || verdict.veredicto !== 'ajustar') break;
    if (run.retryCount >= run.maxRetries) break;

    const subgraph = computeRetrySubgraph(agents, verdictAgent.id);
    if (run.results.some((r) => subgraph.has(r.agentId) && r.status === 'error')) break;

    run.retryCount += 1;
    const entryIds = retryEntryPoints(agents, subgraph);
    const objectionsText = formatObjections(verdict, run.retryCount);
    const extraContextByAgentId = new Map(entryIds.map((id) => [id, objectionsText]));

    resetForRetry(run, subgraph);
    await saveRun(run);

    const retryPassed = await runPass(run, agents, snapshot, { onlyAgentIds: subgraph, extraContextByAgentId });
    if (!retryPassed) {
      run.status = 'error';
      await saveRun(run);
      return;
    }
  }

  // 2.1: Si quedan agentes en waiting o running que no se pudieron ejecutar, marcar como error en vez de colgado
  const hasErrors = run.results.some((r) => r.status === 'error');
  const hasPending = run.results.some((r) => r.status === 'waiting' || r.status === 'running');

  if (hasErrors || hasPending) {
    run.status = 'error';
    // Si quedaron en waiting sin error explícito, marcarlos
    for (const r of run.results) {
      if (r.status === 'waiting' || r.status === 'running') {
        r.status = 'error';
        r.error = r.error || 'Flujo interrumpido antes de completar la ejecución.';
      }
    }
  } else {
    run.status = 'done';
  }

  await saveRun(run);
}

/**
 * Límite de veces que un backtest real (no una objeción del propio Razonador) puede forzar a
 * agente-riesgo/agente-razonador a reconsiderar la tesis. Cada ciclo implica una generación de
 * MQL5 + compilación + backtest real completos (varios minutos), así que se mantiene bajo aun
 * cuando doc 20 §5.3 habla de "3 a 5 ciclos completos" en términos generales.
 */
export const MAX_BACKTEST_STRATEGY_RETRIES = 2;

export interface StrategyFeedbackRetryResult {
  ok: boolean;
  discarded?: boolean;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
  error?: string;
}

/**
 * Cierra el bucle que doc 20 §5.1 describe pero que hasta ahora no existía: cuando un backtest
 * real (no la propia crítica del Razonador) revela que la estrategia no gana dinero, esto
 * reejecuta agente-riesgo → validador → refutador → razonador con ese diagnóstico como contexto
 * — para que puedan reconsiderar indicadores/dirección/condición de entrada, no solo para que el
 * LLM de código retoque multiplicadores de ATR dentro de la misma tesis (eso ya lo hace
 * mql5Generator.optimizeMql5 y sigue pasando primero). Reutiliza el mismo subgrafo y mecanismo de
 * reintento por "ajustar" que ya usa executeRun, solo que el primer contexto inyectado es el
 * resultado del backtest en vez de una objeción del propio Razonador.
 */
export async function retryStrategyForBacktestFailure(
  run: Run,
  agents: Agent[],
  feedbackText: string
): Promise<StrategyFeedbackRetryResult> {
  const verdictAgent = agents.find((a) => a.outputType === 'verdict');
  if (!verdictAgent) return { ok: false, error: 'No hay agente de veredicto configurado.' };

  run.backtestFeedbackCount = run.backtestFeedbackCount ?? 0;
  if (run.backtestFeedbackCount >= MAX_BACKTEST_STRATEGY_RETRIES) {
    return { ok: false, error: 'Se agotaron los reintentos de estrategia tras fallos de backtest real.' };
  }
  run.backtestFeedbackCount += 1;

  const subgraph = computeRetrySubgraph(agents, verdictAgent.id);
  if (run.results.some((r) => subgraph.has(r.agentId) && r.status === 'error')) {
    return { ok: false, error: 'Alguno de los agentes de estrategia quedó en estado de error en el run original.' };
  }

  const entryIds = retryEntryPoints(agents, subgraph);
  const backtestContext = new Map(entryIds.map((id) => [id, feedbackText]));

  resetForRetry(run, subgraph);
  await saveRun(run);

  const snapshot = await buildMarketSnapshot(run.pair, run.timeframe);
  let passed = await runPass(run, agents, snapshot, { onlyAgentIds: subgraph, extraContextByAgentId: backtestContext });

  // A partir de aquí, cualquier "ajustar" adicional lo resuelve el mismo mecanismo que
  // executeRun ya usa para objeciones del propio Razonador (no las del backtest).
  while (passed) {
    const verdictResult = run.results.find((r) => r.agentId === verdictAgent.id);
    const verdict = verdictResult?.verdict;
    if (!verdict || verdict.veredicto !== 'ajustar') break;
    if ((run.retryCount ?? 0) >= (run.maxRetries ?? 0)) break;

    run.retryCount = (run.retryCount ?? 0) + 1;
    const objectionContext = new Map(entryIds.map((id) => [id, formatObjections(verdict, run.retryCount!)]));

    resetForRetry(run, subgraph);
    await saveRun(run);
    passed = await runPass(run, agents, snapshot, { onlyAgentIds: subgraph, extraContextByAgentId: objectionContext });
  }

  if (!passed) {
    run.status = 'error';
    await saveRun(run);
    return { ok: false, error: 'Fallo al reejecutar el panel de agentes tras el diagnóstico de backtest.' };
  }

  const strategyAgent = agents.find((a) => a.outputType === 'strategy');
  const verdictResult = run.results.find((r) => r.agentId === verdictAgent.id);
  const strategyResult = strategyAgent ? run.results.find((r) => r.agentId === strategyAgent.id) : undefined;

  const hasErrors = run.results.some((r) => r.status === 'error');
  const hasPending = run.results.some((r) => r.status === 'waiting' || r.status === 'running');
  run.status = hasErrors || hasPending ? 'error' : 'done';
  await saveRun(run);

  if (hasErrors || hasPending) {
    return { ok: false, error: 'El panel de agentes no terminó de reejecutarse correctamente.' };
  }

  return {
    ok: true,
    discarded: verdictResult?.verdict?.veredicto === 'no_operar',
    strategy: strategyResult?.strategy,
    verdict: verdictResult?.verdict,
  };
}

export async function resumeRun(run: Run, agents: Agent[], specificAgentId?: string): Promise<void> {
  run.status = 'running';
  for (const r of run.results) {
    if (r.status === 'error' || (specificAgentId && r.agentId === specificAgentId)) {
      r.status = 'waiting';
      r.error = undefined;
      r.attempt = (r.attempt ?? 1) + 1;
    }
  }
  await saveRun(run);
  return executeRun(run, agents);
}

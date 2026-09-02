import type { Agent, AgentRunResult, DataCapability, Run, StrategyProposalLite, VerdictResult } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';
import { buildMarketSnapshot } from './marketSnapshot.js';
import { validateStrategyProposal } from './strategyValidator.js';
import { allDependencies } from '../config/configValidation.js';

export const DEFAULT_MAX_RETRIES = 2;
export const MAX_RETRIES_CAP = 3;

/**
 * Reintentos in-situ del propio agente cuando su estrategia falla la validación numérica
 * determinista (p. ej. R:R por debajo del mínimo). Es un fallo de aritmética del LLM, no una
 * objeción del Razonador — no tiene sentido tumbar todo el run por un desliz corregible
 * reenviando el error exacto al mismo agente, igual que ya hace mql5Generator con los errores
 * de compilación.
 */
const DEFAULT_STRATEGY_VALIDATION_RETRIES = 2;

export function resolveStrategyValidationRetries(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_STRATEGY_VALIDATION_RETRIES;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 2 ? parsed : DEFAULT_STRATEGY_VALIDATION_RETRIES;
}

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
    if (agent) queue.push(...allDependencies(agent));
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

  if (byId.size !== agents.length) return { valid: false, error: 'Existen IDs de agente duplicados.' };

  // 1. Validar que no haya dependencias huérfanas
  for (const agent of agents) {
    for (const depId of allDependencies(agent)) {
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
    for (const depId of allDependencies(agent)) {
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
    const validParents = allDependencies(agent).filter((id) => byId.has(id));
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
  const queue = byId.get(agentId) ? allDependencies(byId.get(agentId)!) : [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const agent = byId.get(current);
    if (agent) queue.push(...allDependencies(agent));
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
  if (result.status === 'skipped') return `[OMITIDO: ${result.omissionReason ?? 'sin motivo'}]`;
  if (result.status === 'error') return '[ERROR: este agente falló y no produjo salida — no asumas su contenido]';
  if (result.output) return result.output;
  if (result.analysis) return JSON.stringify(result.analysis);
  if (result.strategy) return JSON.stringify(result.strategy);
  if (result.verdict) return JSON.stringify(result.verdict);
  return '';
}

export function evaluateAgentActivation(
  agent: Agent,
  capabilities: DataCapability[],
  resultsById: Map<string, AgentRunResult>,
  agents: Agent[] = []
): { active: boolean; reason: string } {
  if (agent.enabled === false) return { active: false, reason: 'AGENT_DISABLED' };
  const rule = agent.activation;
  if (!rule || rule.mode === 'always') return { active: true, reason: rule?.description ?? 'ALWAYS' };
  if (rule.mode === 'data_available') {
    const missing = (rule.requiredData ?? []).filter((item) => !capabilities.includes(item));
    return missing.length === 0
      ? { active: true, reason: rule.description }
      : { active: false, reason: `DATA_NOT_AVAILABLE: ${missing.join(', ')}` };
  }
  const biases = ancestorChain(agents, agent.id)
    .map((ancestor) => resultsById.get(ancestor.id)?.analysis?.bias)
    .filter((bias) => bias && bias !== 'neutral' && bias !== 'not_applicable');
  return new Set(biases).size > 1
    ? { active: true, reason: 'CONFLICT_DETECTED' }
    : { active: false, reason: 'NO_CONFLICT_DETECTED' };
}

function formatObjections(verdict: VerdictResult, attemptNumber: number): string {
  const items = verdict.objeciones && verdict.objeciones.length > 0 ? verdict.objeciones : [verdict.razon];
  return `Objeciones del Razonador (intento ${attemptNumber}):\n${items.map((o) => `- ${o}`).join('\n')}`;
}

interface RunPassOptions {
  onlyAgentIds?: Set<string>;
  extraContextByAgentId?: Map<string, string>;
}

/**
 * Máximo de agentes que se ejecutan a la vez dentro de un mismo nivel topológico. Los agentes
 * de un nivel son independientes entre sí (`buildLevels` los agrupa así), así que se lanzan en
 * paralelo para no pagar la latencia en serie — importante ahora que un agente puede tardar
 * 60-150 s si su fuente es un CLI de suscripción (`claude` / `codex`).
 *
 * El tope evita disparar una avalancha de procesos / llamadas simultáneas (rate limits de
 * suscripción, carga de la máquina) si un roster tiene muchos agentes en el mismo nivel.
 * Ajustable con `AGENT_MAX_CONCURRENCY`.
 */
const DEFAULT_AGENT_CONCURRENCY = 5;

function agentConcurrencyLimit(): number {
  const raw = Number(process.env.AGENT_MAX_CONCURRENCY);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_AGENT_CONCURRENCY;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type AgentPassOutcome = 'done' | 'error' | 'skipped';

/**
 * Ejecuta UN agente dentro de una pasada. No lanza: cualquier fallo se refleja en
 * `result.status = 'error'` y se devuelve `'error'` — para poder lanzar en paralelo a los
 * hermanos del nivel sin que uno tumbe la `Promise.all` de los demás a media ejecución.
 */
async function executeAgentInPass(
  run: Run,
  agents: Agent[],
  agent: Agent,
  snapshot: string | null,
  resultsById: Map<string, AgentRunResult>,
  options: RunPassOptions
): Promise<AgentPassOutcome> {
  const result = resultsById.get(agent.id);
  if (!result) return 'skipped';

  // Si ya está completado con éxito y no se forzó su reintento explícito, no repetir
  if (result.status === 'done' && !options.onlyAgentIds?.has(agent.id)) return 'skipped';

  const activation = evaluateAgentActivation(agent, run.dataCapabilities ?? [], resultsById, agents);
  if (!activation.active) {
    result.status = 'skipped';
    result.omissionReason = activation.reason;
    result.finishedAt = new Date().toISOString();
    await saveRun(run);
    return 'skipped';
  }
  result.activationReason = activation.reason;

  // Si alguno de sus ancestros directos falló o no está completado, no puede ejecutarse
  const ancestorsIncomplete = agent.dependsOn.some((depId) => {
    const depResult = resultsById.get(depId);
    return !depResult || depResult.status !== 'done';
  });

  if (ancestorsIncomplete) {
    result.status = 'skipped';
    result.omissionReason = 'MISSING_REQUIRED_DEPENDENCY';
    result.finishedAt = new Date().toISOString();
    await saveRun(run);
    return 'skipped';
  }

  result.status = 'running';
  result.startedAt = new Date().toISOString();
  result.error = undefined;
  result.omissionReason = undefined;
  await saveRun(run);

  try {
    let context = ancestorChain(agents, agent.id)
      .map((ancestor) => `${ancestor.name}: ${resultText(resultsById.get(ancestor.id))}`)
      .join('\n\n');

    const extra = options.extraContextByAgentId?.get(agent.id);
    if (extra) context = context ? `${extra}\n\n${context}` : extra;

    let output: string | undefined;
    let analysis: typeof result.analysis;
    let strategy: typeof result.strategy;
    let verdict: typeof result.verdict;
    let lastValidationError: string | undefined;

    const maxStrategyValidationRetries = resolveStrategyValidationRetries(process.env.STRATEGY_VALIDATION_RETRIES);
    for (let validationAttempt = 0; validationAttempt <= maxStrategyValidationRetries; validationAttempt++) {
      const attemptContext = lastValidationError
        ? `${context}\n\nTu propuesta anterior fue rechazada por incoherencia numérica: ${lastValidationError}\nCorrige los precios de entrada/stop loss/take profit para que sean matemáticamente coherentes con la dirección y cumplan el R:R mínimo exigido.`
        : context;

      ({ output, analysis, strategy, verdict } = await runAgent(agent, attemptContext, run.pair, run.timeframe, snapshot, run.executionMode));

      // 1.1: Validación determinista de coherencia numérica tras generación de estrategia
      if (!strategy) break;

      const atrMatch = snapshot?.match(/ATR \(14[^)]*\):\s*([0-9.]+)/i);
      const atrValue = atrMatch ? Number(atrMatch[1]) : undefined;
      const riskPolicy = run.configuration?.riskPolicy;
      const valResult = validateStrategyProposal(strategy, {
        minRrRatio: riskPolicy?.minRrRatio,
        maxRiskPercent: riskPolicy?.maxRiskPercent,
        atrValue: Number.isFinite(atrValue) ? atrValue : undefined,
        minStopAtr: riskPolicy?.minStopAtr,
        maxStopAtr: riskPolicy?.maxStopAtr,
      });
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
      if (validationAttempt === maxStrategyValidationRetries) {
        throw new Error(`Incoherencia numérica en estrategia tras ${maxStrategyValidationRetries + 1} intentos: ${valResult.error}`);
      }
    }

    result.output = output;
    result.analysis = analysis;
    result.strategy = strategy;
    result.verdict = verdict;
    result.status = 'done';
    result.finishedAt = new Date().toISOString();
    result.durationMs = result.startedAt ? Date.parse(result.finishedAt) - Date.parse(result.startedAt) : undefined;
    await saveRun(run);
    return 'done';
  } catch (err) {
    result.status = 'error';
    result.error = err instanceof Error ? err.message : 'error desconocido';
    result.finishedAt = new Date().toISOString();
    result.durationMs = result.startedAt ? Date.parse(result.finishedAt) - Date.parse(result.startedAt) : undefined;
    run.issues = [...(run.issues ?? []), { code: 'MODEL_ERROR', severity: 'error', message: result.error, agentId: agent.id }];
    await saveRun(run);
    console.warn(`[orchestrator] Agente ${agent.name} (${agent.id}) falló: ${result.error}`);
    return 'error';
  }
}

export async function runPass(run: Run, agents: Agent[], snapshot: string | null, options: RunPassOptions = {}): Promise<boolean> {
  const levels = buildLevels(agents);
  const resultsById = new Map(run.results.map((r) => [r.agentId, r]));
  const limit = agentConcurrencyLimit();
  let hasError = false;

  for (const level of levels) {
    const toRun = options.onlyAgentIds ? level.filter((a) => options.onlyAgentIds!.has(a.id)) : level;
    if (toRun.length === 0) continue;

    // Los agentes de un nivel son independientes entre sí -> en paralelo (con tope).
    const outcomes = await mapWithConcurrency(toRun, limit, (agent) =>
      executeAgentInPass(run, agents, agent, snapshot, resultsById, options)
    );

    // Se dejó terminar a todos los hermanos del nivel (su trabajo ya está guardado); si alguno
    // falló, no se continúa a los niveles dependientes.
    if (outcomes.includes('error')) {
      hasError = true;
      run.status = 'error';
      await saveRun(run);
      console.warn('[orchestrator] Un agente del nivel falló. Flujo detenido, no se ejecutan los niveles dependientes.');
      continue;
    }
  }

  return !hasError;
}

export function resetForRetry(run: Run, subgraph: Set<string>): void {
  run.results = run.results.map((r) => (subgraph.has(r.agentId) ? { agentId: r.agentId, status: 'waiting', attempt: (r.attempt ?? 1) + 1 } : r));
}

export async function executeRun(run: Run, agents: Agent[]): Promise<void> {
  run.startedAt = run.startedAt ?? new Date().toISOString();
  run.issues = run.issues ?? [];
  const graphValidation = validateGraphIntegrity(agents);
  if (!graphValidation.valid) {
    run.status = 'error';
    run.finalState = 'error';
    run.issues.push({ code: 'CONFIGURATION_ERROR', severity: 'error', message: graphValidation.error ?? 'Grafo inválido' });
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

  const snapshot = run.marketSnapshot === undefined ? await buildMarketSnapshot(run.pair, run.timeframe) : run.marketSnapshot;
  run.marketSnapshot = snapshot;
  run.dataQuality = !snapshot ? 'unavailable' : snapshot.includes('AVISO DE FRESCURA') ? 'stale' : 'good';
  const configuredCapabilities = run.configuration?.dataPolicy.availableCapabilities ?? ['market_snapshot', 'ohlcv', 'session_clock'];
  run.dataCapabilities = snapshot
    ? [...configuredCapabilities]
    : configuredCapabilities.filter((item) => item !== 'market_snapshot' && item !== 'ohlcv');
  if (!snapshot) run.issues.push({ code: 'DATA_ERROR', severity: 'warning', message: 'DATA_NOT_AVAILABLE: market_snapshot, ohlcv' });
  else if (run.dataQuality === 'stale') run.issues.push({ code: 'DATA_ERROR', severity: 'warning', message: 'El snapshot está obsoleto; la confianza debe reducirse.' });
  await saveRun(run);

  const passed = await runPass(run, agents, snapshot);
  if (!passed) {
    run.status = 'error';
    run.finalState = 'error';
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
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

  const hasErrors = run.results.some((r) => r.status === 'error');
  const hasPending = run.results.some((r) => r.status === 'waiting' || r.status === 'running');
  const verdict = verdictAgent ? run.results.find((result) => result.agentId === verdictAgent.id)?.verdict : undefined;

  if (hasErrors || hasPending) {
    run.status = 'error';
    run.finalState = 'error';
    // Si quedaron en waiting sin error explícito, marcarlos
    for (const r of run.results) {
      if (r.status === 'waiting' || r.status === 'running') {
        r.status = 'error';
        r.error = r.error || 'Flujo interrumpido antes de completar la ejecución.';
      }
    }
  } else if (!verdict) {
    run.status = 'done';
    run.finalState = run.dataQuality === 'unavailable' ? 'insufficient_data' : 'invalid_result';
    if (run.finalState === 'invalid_result') {
      run.status = 'error';
      run.issues.push({ code: 'MISSING_AGENT', severity: 'error', message: 'El grafo terminó sin veredicto.' });
    }
  } else if (verdict.veredicto === 'ajustar') {
    run.status = 'error';
    run.finalState = 'invalid_result';
    run.issues.push({ code: 'INVALID_RESULT', severity: 'error', message: 'Se agotaron las revisiones con veredicto AJUSTAR.' });
  } else if (verdict.veredicto === 'go' && (verdict.unresolvedBlockers?.length ?? 0) > 0) {
    run.status = 'error';
    run.finalState = 'invalid_result';
    run.issues.push({ code: 'CONTRACT_ERROR', severity: 'error', message: 'El juez emitió GO con blockers sin resolver.', agentId: verdictAgent?.id });
  } else {
    run.status = 'done';
    run.finalState = verdict.veredicto === 'go' ? 'validated' : 'rejected';
  }

  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
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

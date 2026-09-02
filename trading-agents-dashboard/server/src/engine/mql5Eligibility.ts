import { isDeepStrictEqual } from 'node:util';
import { hashConfiguration } from '../config/configValidation.js';
import type { Run, StrategyProposalLite } from '../types.js';

export interface ExactForexSource {
  configurationId: string;
  configurationHash: string;
}

export interface ForexAuditEntry extends ExactForexSource {
  run_id: string;
  scenario: string;
  ok: boolean;
}

export function validateMql5SourceRun(run: Run, strategy: StrategyProposalLite): string | null {
  const approvedStrategy = run.results.find((result) => result.strategy)?.strategy;
  const approvedVerdict = run.results.find((result) => result.verdict)?.verdict;
  if (run.finalState !== 'validated' || approvedVerdict?.veredicto !== 'go') {
    return 'La operación MQL5 requiere un run validado con veredicto GO.';
  }
  if ((approvedVerdict.unresolvedBlockers?.length ?? 0) > 0) {
    return 'La operación MQL5 está bloqueada por objeciones sin resolver.';
  }
  if (!approvedStrategy || !isDeepStrictEqual(approvedStrategy, strategy)) {
    return 'La estrategia no coincide exactamente con la aprobada por el run.';
  }
  return null;
}

/** Gate adicional y fail-closed usado exclusivamente por la validación real FOREX. */
export function validateRealForexMql5SourceRun(
  run: Run,
  strategy: StrategyProposalLite,
  expected: ExactForexSource,
): string | null {
  const baseError = validateMql5SourceRun(run, strategy);
  if (baseError) return baseError;
  if (run.status !== 'done' || run.executionMode !== 'real') {
    return 'La fuente MQL5 debe ser un run real terminado correctamente.';
  }
  if (!run.configuration || run.configuration.marketType !== 'forex') {
    return 'La fuente MQL5 no contiene una configuración FOREX completa.';
  }
  if (run.configuration.id !== expected.configurationId) {
    return `La configuración ${run.configuration.id} no coincide con ${expected.configurationId}.`;
  }
  const computedHash = hashConfiguration(run.configuration);
  if (run.configurationHash !== expected.configurationHash || computedHash !== expected.configurationHash) {
    return 'El hash de la configuración fuente no coincide exactamente con el autorizado.';
  }
  if (run.pair !== strategy.pair
    || run.timeframe !== strategy.timeframe
    || run.configuration.referenceAsset !== run.pair
    || run.configuration.defaultTimeframe !== run.timeframe) {
    return 'Par/timeframe de run, preset y estrategia no coinciden exactamente.';
  }

  const configuredIds = run.configuration.agents.map((agent) => agent.id).sort();
  const expectedIds = [...(run.expectedAgentIds ?? [])].sort();
  const resultIds = run.results.map((result) => result.agentId).sort();
  if (!isDeepStrictEqual(configuredIds, expectedIds) || !isDeepStrictEqual(configuredIds, resultIds)) {
    return 'El roster de agentes del run no coincide exactamente con el preset FOREX.';
  }
  const invalidResult = run.results.find((result) => {
    if (result.status === 'done') return false;
    return !(result.agentId === 'fx-macro'
      && result.status === 'skipped'
      && result.omissionReason?.startsWith('DATA_NOT_AVAILABLE'));
  });
  if (invalidResult) {
    return `El run contiene agentes no completados correctamente: ${invalidResult.agentId}=${invalidResult.status}.`;
  }
  return null;
}

/** R2 limpio + tres runs limpios totales + los dos últimos del preset/hash también limpios. */
export function validateForexAuditQuorum(
  audits: ForexAuditEntry[],
  expected: ExactForexSource,
): string | null {
  const relevant = audits.filter((entry) => entry.configurationId === expected.configurationId
    && entry.configurationHash === expected.configurationHash);
  if (!relevant.some((entry) => entry.ok && entry.scenario === 'r2-trend')) {
    return 'Falta una corrida R2 limpia para el preset/hash autorizado.';
  }
  const tail = relevant.slice(-2);
  if (tail.length < 2 || tail.some((entry) => !entry.ok)) {
    return 'Faltan dos corridas consecutivas limpias al final de la secuencia auditada.';
  }
  if (relevant.filter((entry) => entry.ok).length < 3) {
    return 'Se requieren al menos tres corridas limpias auditadas sobre el mismo preset/hash.';
  }
  return null;
}

import { isDeepStrictEqual } from 'node:util';
import type { Run, StrategyProposalLite } from '../types.js';

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

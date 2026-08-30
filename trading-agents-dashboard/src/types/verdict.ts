export type Veredicto = 'go' | 'ajustar' | 'no_operar';

export interface VerdictResult {
  veredicto: Veredicto;
  razon: string;
  objeciones?: string[];
  confidence?: number;
  dataQuality?: 'good' | 'stale' | 'insufficient' | 'unavailable';
  resolvedConflicts?: string[];
  unresolvedBlockers?: string[];
}

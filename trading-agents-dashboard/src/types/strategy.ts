export interface StrategyProposalLite {
  status?: 'valid' | 'abstain' | 'data_not_available';
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
  /** Regla mecánica y repetible que dispara la entrada — no un nivel de precio anecdótico. */
  condicionEntrada: string;
  puntoEntrada: string;
  stopLoss: string;
  takeProfit: string;
  direction?: 'buy' | 'sell';
  entryPriceNum?: number;
  stopLossNum?: number;
  takeProfitNum?: number;
  riskPercent?: number;
  entradasEscalonadas?: string;
  confianza?: string;
  confidence?: number;
  evidence?: Array<{ claim: string; source: string }>;
  risks?: string[];
  invalidations?: string[];
  dataQuality?: 'good' | 'stale' | 'insufficient' | 'unavailable';
}

import type { Mt5LogSession } from './backtest';

export interface Mql5GenerationResult {
  code: string;
  filename: string;
  assumptionsToVerify: string[];
  compileStatus: 'ok' | 'errors' | 'unverified';
  compileErrors: string[];
  compileWarnings: string[];
  attempts: number;
  iteration?: number;
  backtestSession?: Mt5LogSession;
  optimizationNotes?: string[];
  /** Estrategia realmente codificada, si el panel de agentes la replanteó tras un fallo de Quality Gate. */
  finalStrategy?: StrategyProposalLite;
  /** Nº de veces que un backtest real hizo que el panel de agentes reconsiderara la estrategia. */
  strategyFeedbackCycles?: number;
  /** El Razonador, ya informado del fallo real de backtest, decidió NO_OPERAR — descartada. */
  discarded?: boolean;
  discardReason?: string;
}

export interface Mql5GenerationProgress {
  attempt: number;
  maxAttempts: number;
  phase: 'generating' | 'compiling' | 'backtesting' | 'evaluating' | 'optimizing' | 'restrategizing';
  details?: string;
}

export type Mql5Job =
  | { id: string; status: 'running'; progress: Mql5GenerationProgress }
  | { id: string; status: 'done'; result: Mql5GenerationResult }
  | { id: string; status: 'error'; message: string };

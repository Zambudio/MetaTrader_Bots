export interface StrategyProposalLite {
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
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
}

export interface Mql5GenerationProgress {
  attempt: number;
  maxAttempts: number;
  phase: 'generating' | 'compiling' | 'backtesting' | 'evaluating' | 'optimizing';
  details?: string;
}

export type Mql5Job =
  | { id: string; status: 'running'; progress: Mql5GenerationProgress }
  | { id: string; status: 'done'; result: Mql5GenerationResult }
  | { id: string; status: 'error'; message: string };

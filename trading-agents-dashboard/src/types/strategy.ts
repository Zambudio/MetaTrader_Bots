export interface StrategyProposalLite {
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
  puntoEntrada: string;
  stopLoss: string;
  takeProfit: string;
  entradasEscalonadas?: string;
  confianza?: string;
}

export interface Mql5GenerationResult {
  code: string;
  filename: string;
  assumptionsToVerify: string[];
  compileStatus: 'ok' | 'errors' | 'unverified';
  compileErrors: string[];
  compileWarnings: string[];
  attempts: number;
}

export interface Mql5GenerationProgress {
  attempt: number;
  maxAttempts: number;
  phase: 'generating' | 'compiling';
}

export type Mql5Job =
  | { id: string; status: 'running'; progress: Mql5GenerationProgress }
  | { id: string; status: 'done'; result: Mql5GenerationResult }
  | { id: string; status: 'error'; message: string };

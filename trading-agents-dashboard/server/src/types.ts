export type OutputType = 'text' | 'analysis' | 'strategy' | 'verdict';
export type AgentRunStatus = 'waiting' | 'running' | 'done' | 'skipped' | 'error';
export type Veredicto = 'go' | 'ajustar' | 'no_operar';
export type MarketType = 'forex' | 'stocks' | 'crypto';
export type DataQuality = 'good' | 'stale' | 'insufficient' | 'unavailable';
export type DataCapability =
  | 'market_snapshot'
  | 'ohlcv'
  | 'session_clock'
  | 'verified_macro_calendar'
  | 'verified_news'
  | 'corporate_fundamentals'
  | 'sec_filings'
  | 'benchmark_data'
  | 'derivatives_metrics'
  | 'on_chain_metrics';

export interface AgentActivationRule {
  mode: 'always' | 'data_available' | 'on_conflict';
  requiredData?: DataCapability[];
  description: string;
}

export interface AgentAnalysis {
  status: 'valid' | 'data_not_available' | 'abstain';
  bias: 'bullish' | 'bearish' | 'neutral' | 'mixed' | 'not_applicable';
  confidence: number;
  dataQuality: DataQuality;
  facts: Array<{ claim: string; source: string }>;
  inferences: Array<{ claim: string; basedOn: string[] }>;
  hypotheses: string[];
  conclusion: string;
  risks: string[];
  invalidations: string[];
  blockers?: string[];
  recommendation?: 'approve' | 'revise' | 'reject' | 'not_applicable';
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  photo?: string;
  systemPrompt: string;
  dependsOn: string[];
  optionalDependsOn?: string[];
  outputType: OutputType;
  model?: string;
  enabled?: boolean;
  responsibility?: string;
  inputs?: string[];
  outputs?: string[];
  tools?: string[];
  activation?: AgentActivationRule;
  abstentionConditions?: string[];
  weight?: number;
  interventionType?: 'specialist' | 'synthesizer' | 'validator' | 'adversarial' | 'judge';
}

export interface AgentConfigPreset {
  id: string;
  name: string;
  schemaVersion: 'multiagent-config.v1';
  key: string;
  version: string;
  marketType: MarketType;
  referenceAsset: string;
  defaultTimeframe: string;
  agents: Agent[];
  dataPolicy: { availableCapabilities: DataCapability[]; unavailableCapabilities: DataCapability[] };
  consensus: {
    method: 'judge_with_adversarial_review';
    judgeAgentId: string;
    maxRevisionRounds: number;
    conflictPolicy: 'unresolved_blocker_prevents_go';
  };
  validation: {
    requireStructuredOutputs: boolean;
    requireEvidence: boolean;
    deterministicRiskGate: boolean;
  };
  riskPolicy: {
    maxRiskPercent: number;
    minRrRatio: number;
    minStopAtr: number;
    maxStopAtr: number;
  };
  mql5Model?: string;
  isProtected?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyProposalLite {
  status?: 'valid' | 'abstain' | 'data_not_available';
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
  /**
   * Regla mecánica y repetible que dispara la entrada (p. ej. "EMA20 cruza por encima de EMA50
   * Y RSI(14) cruza por encima de 50"), en términos de relaciones entre indicadores/precio — NO
   * un nivel de precio anecdótico atado al snapshot del momento. Es lo que mql5Generator debe
   * codificar literalmente como señal del EA; sin esto, el LLM de código tiene que inventar su
   * propia lógica de entrada a partir de `puntoEntrada` (texto libre), y esa invención nunca
   * vuelve a pasar por el Validador/Refutador/Razonador que dieron el visto bueno.
   */
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
  dataQuality?: DataQuality;
}

export interface VerdictResult {
  veredicto: Veredicto;
  razon: string;
  objeciones?: string[];
  confidence?: number;
  dataQuality?: DataQuality;
  resolvedConflicts?: string[];
  unresolvedBlockers?: string[];
}

import type { Mt5LogSession } from './engine/mt5LogParser.js';

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
  /** Estrategia realmente codificada — puede diferir de la propuesta original si el panel de
   * agentes la replanteó tras un fallo de Quality Gate (ver `strategyFeedbackCycles`). */
  finalStrategy?: StrategyProposalLite;
  /** Nº de veces que el resultado de un backtest real hizo que el panel de agentes (no solo el
   * LLM de código) reconsiderara la estrategia — 0 si nunca hizo falta o no se solicitó. */
  strategyFeedbackCycles?: number;
  /** El Razonador, ya informado del fallo real de backtest, emitió NO_OPERAR — la estrategia se
   * descarta en vez de seguir generando código. */
  discarded?: boolean;
  discardReason?: string;
}

export interface AgentRunResult {
  agentId: string;
  status: AgentRunStatus;
  output?: string;
  analysis?: AgentAnalysis;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
  attempt?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  activationReason?: string;
  omissionReason?: string;
  durationMs?: number;
}

export type RunIssueCode =
  | 'ORCHESTRATION_ERROR'
  | 'AGENT_SELECTION_ERROR'
  | 'PROMPT_ERROR'
  | 'CONTRACT_ERROR'
  | 'DATA_ERROR'
  | 'TOOL_ERROR'
  | 'MODEL_ERROR'
  | 'TIMEOUT'
  | 'HALLUCINATION'
  | 'INVALID_RESULT'
  | 'CONFIGURATION_ERROR'
  | 'UNEXPECTED_AGENT'
  | 'MISSING_AGENT'
  | 'MODEL_OVERRIDE_ON_RESUME'
  | 'USER_ABORTED';

export interface RunIssue {
  code: RunIssueCode;
  severity: 'warning' | 'error';
  message: string;
  agentId?: string;
}

export interface Run {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  results: AgentRunResult[];
  configuration?: AgentConfigPreset;
  configurationHash?: string;
  executionMode?: 'real' | 'simulation';
  validationScenario?: string;
  expectedAgentIds?: string[];
  marketSnapshot?: string | null;
  dataQuality?: DataQuality;
  dataCapabilities?: DataCapability[];
  issues?: RunIssue[];
  finalState?: 'validated' | 'rejected' | 'insufficient_data' | 'invalid_result' | 'error';
  retryCount?: number;
  maxRetries?: number;
  mql5Result?: Mql5GenerationResult;
  /** Nº de veces que este run reejecutó agente-riesgo→razonador porque un backtest real falló
   * el Quality Gate — contador independiente de `retryCount` (que cubre los "ajustar" previos
   * a que exista ningún código). Ver `retryStrategyForBacktestFailure` en orchestrator.ts. */
  backtestFeedbackCount?: number;
}

export interface RunSummary {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  hasStrategy: boolean;
}

export interface SavedPair {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  favorite: boolean;
}

export interface NewsSource {
  id: string;
  name: string;
  kind: 'rss' | 'generic_url';
  url: string;
  enabled: boolean;
  createdAt: string;
  lastFetchedAt?: string;
  lastFetchStatus?: 'ok' | 'error';
  lastFetchError?: string;
}

export interface NewsItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt?: string;
  fetchedAt: string;
  summary?: string;
  digestedToWiki?: boolean;
}


export type OutputType = 'text' | 'analysis' | 'strategy' | 'verdict';
export type MarketType = 'forex' | 'stocks' | 'crypto';
export type DataCapability =
  | 'market_snapshot' | 'ohlcv' | 'session_clock' | 'verified_macro_calendar' | 'verified_news'
  | 'corporate_fundamentals' | 'sec_filings' | 'benchmark_data' | 'derivatives_metrics' | 'on_chain_metrics';

export interface AgentActivationRule {
  mode: 'always' | 'data_available' | 'on_conflict';
  requiredData?: DataCapability[];
  description: string;
}

export interface Agent {
  id: string; name: string; role: string; photo?: string; systemPrompt: string;
  dependsOn: string[]; optionalDependsOn?: string[]; outputType: OutputType; model?: string; enabled?: boolean;
  responsibility?: string; inputs?: string[]; outputs?: string[]; tools?: string[];
  activation?: AgentActivationRule; abstentionConditions?: string[]; weight?: number;
  interventionType?: 'specialist' | 'synthesizer' | 'validator' | 'adversarial' | 'judge';
}

export interface AgentConfigPreset {
  id: string; name: string; schemaVersion: 'multiagent-config.v1'; key: string; version: string;
  marketType: MarketType; referenceAsset: string; defaultTimeframe: string; agents: Agent[];
  dataPolicy: { availableCapabilities: DataCapability[]; unavailableCapabilities: DataCapability[] };
  consensus: { method: 'judge_with_adversarial_review'; judgeAgentId: string; maxRevisionRounds: number; conflictPolicy: 'unresolved_blocker_prevents_go' };
  validation: { requireStructuredOutputs: boolean; requireEvidence: boolean; deterministicRiskGate: boolean };
  riskPolicy: { maxRiskPercent: number; minRrRatio: number; minStopAtr: number; maxStopAtr: number };
  mql5Model?: string; createdAt: string; updatedAt: string;
}

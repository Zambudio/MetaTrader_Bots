export type OutputType = 'text' | 'strategy' | 'verdict';

export interface Agent {
  id: string;
  name: string;
  role: string;
  photo?: string;
  systemPrompt: string;
  dependsOn: string[];
  outputType: OutputType;
  model?: string;
  enabled?: boolean;
}

export interface AgentConfigPreset {
  id: string;
  name: string;
  agents: Agent[];
  createdAt: string;
  updatedAt: string;
}

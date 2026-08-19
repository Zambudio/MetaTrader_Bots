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
}

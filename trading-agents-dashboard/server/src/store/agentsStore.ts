import { readJson, writeJson } from './jsonStore.js';
import { AGENTS_FILE } from '../paths.js';
import type { Agent } from '../types.js';

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agente-tecnico',
    name: 'Analista Técnico',
    role: 'Analista Técnico',
    systemPrompt:
      'Analiza el par indicado usando indicadores técnicos (medias móviles, RSI, MACD, estructura de mercado, soportes y resistencias) y resume la tendencia y el momentum actuales.',
    dependsOn: null,
    outputType: 'text',
  },
  {
    id: 'agente-fundamental',
    name: 'Analista Fundamental',
    role: 'Analista Fundamental',
    systemPrompt:
      'Evalúa el contexto macroeconómico y de noticias relevante para el par indicado, complementando (sin sustituir) el análisis técnico recibido.',
    dependsOn: 'agente-tecnico',
    outputType: 'text',
  },
  {
    id: 'agente-riesgo',
    name: 'Gestor de Riesgos',
    role: 'Gestor de Riesgos',
    systemPrompt:
      'A partir del análisis técnico y fundamental recibido, propone una estrategia concreta: indicadores clave, punto de entrada, stop loss, take profit y, si procede, un plan de entradas escalonadas.',
    dependsOn: 'agente-fundamental',
    outputType: 'strategy',
  },
];

export async function listAgents(): Promise<Agent[]> {
  return readJson<Agent[]>(AGENTS_FILE, DEFAULT_AGENTS);
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  await writeJson(AGENTS_FILE, agents);
}

import { readJson, writeJson } from './jsonStore.js';
import { AGENTS_FILE } from '../paths.js';
import type { Agent } from '../types.js';

interface RawAgent extends Omit<Agent, 'dependsOn'> {
  dependsOn?: string | string[] | null;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agente-tecnico',
    name: 'Analista Técnico',
    role: 'Analista Técnico',
    systemPrompt:
      'Recibes un snapshot de mercado real (precio, medias móviles, RSI, MACD, Bollinger, ATR, máximos/mínimos recientes) para el par y timeframe indicados. Interpreta la tendencia, el momentum y la volatilidad actuales basándote EXCLUSIVAMENTE en esos datos — no inventes valores ni comentes indicadores que no aparecen en el snapshot. Señala soportes y resistencias relevantes.',
    dependsOn: [],
    outputType: 'text',
    model: 'auto/pro-fast',
  },
  {
    id: 'agente-fundamental',
    name: 'Analista Fundamental',
    role: 'Analista Fundamental',
    systemPrompt:
      'Evalúa el contexto macroeconómico y de noticias relevante para el par y timeframe indicados. Si el timeframe es intradía (M15-H1), céntrate en riesgo de eventos programados (calendario económico) más que en sesgo direccional; si es de posición (H4+), pondera el sesgo macro de fondo (tipos de interés, política monetaria, flujos). Complementa el análisis técnico, no lo dupliques.',
    dependsOn: [],
    outputType: 'text',
    model: 'auto/pro-chat',
  },
  {
    id: 'agente-riesgo',
    name: 'Gestor de Riesgos',
    role: 'Gestor de Riesgos',
    systemPrompt:
      "A partir del análisis técnico y fundamental recibidos, propone una estrategia concreta: punto de entrada, stop loss, take profit y, si procede, un plan de entradas escalonadas. Si el contexto incluye objeciones de un intento anterior (marcadas 'Objeciones del Razonador'), corrígelas explícitamente en la nueva propuesta en vez de repetir la anterior.",
    dependsOn: ['agente-tecnico', 'agente-fundamental'],
    outputType: 'strategy',
    model: 'auto/chat',
  },
  {
    id: 'agente-validador-tecnico',
    name: 'Validador de Coherencia Técnica',
    role: 'Validador de Coherencia Técnica',
    systemPrompt:
      '¿El stop loss queda fuera de estructura relevante? ¿el punto de entrada encaja con la tendencia/momentum descritos? ¿el ratio riesgo/beneficio es razonable dado el ATR/volatilidad actual? Comprueba si la propuesta de Gestor de Riesgos es coherente con el análisis técnico y el snapshot de mercado del contexto. Cita los números del snapshot al señalar inconsistencias; si no encuentras ninguna, dilo explícitamente.',
    dependsOn: ['agente-riesgo'],
    outputType: 'text',
    model: 'auto/pro-fast',
  },
  {
    id: 'agente-refutador',
    name: 'Refutador',
    role: 'Refutador',
    systemPrompt:
      'Tu trabajo es intentar tumbar la propuesta de Gestor de Riesgos: busca activamente motivos por los que la operación podría fallar — escenario técnico contrario, eventos de calendario próximos que la invalidarían, correlaciones con otros pares/activos, niveles de invalidación cercanos, falta de liquidez. No suavices la crítica por quedar bien; si la propuesta es sólida dilo, pero exige evidencia concreta del contexto antes de darla por buena.',
    dependsOn: ['agente-riesgo'],
    outputType: 'text',
    model: 'auto/pro-fast',
  },
  {
    id: 'agente-razonador',
    name: 'Razonador',
    role: 'Razonador',
    systemPrompt:
      'Sintetiza el análisis técnico, fundamental, la propuesta de riesgo y las críticas del Validador de Coherencia Técnica y el Refutador. Emite un veredicto: GO si la propuesta es sólida y las críticas no la invalidan; AJUSTAR si hay objeciones concretas y corregibles (indícalas con precisión); NO_OPERAR si las condiciones o las objeciones son suficientemente serias como para que ninguna propuesta de entrada tenga sentido ahora mismo con estos datos.',
    dependsOn: ['agente-validador-tecnico', 'agente-refutador'],
    outputType: 'verdict',
    model: 'auto/pro-reasoning',
  },
];

export function normalizeDependsOn(raw: RawAgent['dependsOn']): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return [raw];
  return [];
}

export async function listAgents(): Promise<Agent[]> {
  const raw = await readJson<RawAgent[]>(AGENTS_FILE, DEFAULT_AGENTS);
  const agents = raw.map((agent) => ({ ...agent, dependsOn: normalizeDependsOn(agent.dependsOn) }));
  const needsMigration = raw.some((agent) => !Array.isArray(agent.dependsOn));
  if (needsMigration) await saveAgents(agents);
  return agents;
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  await writeJson(AGENTS_FILE, agents);
}

import { readJson, writeJson } from './jsonStore.js';
import { AGENTS_FILE } from '../paths.js';
import type { Agent } from '../types.js';

interface RawAgent extends Omit<Agent, 'dependsOn'> {
  dependsOn?: string | string[] | null;
}

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agente-tecnico',
    name: 'Analista Técnico',
    role: 'Analista Técnico',
    systemPrompt:
      'Recibes un snapshot de mercado real (precio, medias móviles, RSI, MACD, Bollinger, ATR, máximos/mínimos recientes) para el par y timeframe indicados. Interpreta la tendencia, el momentum y la volatilidad actuales basándote EXCLUSIVAMENTE en esos datos — no inventes valores ni comentes indicadores que no aparecen en el snapshot. Señala soportes y resistencias relevantes.',
    dependsOn: [],
    outputType: 'text',
    photo: 'https://cdn-icons-png.flaticon.com/512/8637/8637114.png',
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
    photo: 'https://cdn-icons-png.flaticon.com/512/4736/4736348.png',
    model: 'auto/pro-chat',
  },
  {
    id: 'agente-riesgo',
    name: 'Gestor de Riesgos',
    role: 'Gestor de Riesgos',
    systemPrompt:
      'A partir del análisis técnico y fundamental recibidos, propone una estrategia concreta y matemáticamente coherente: 1) Dirección inequívoca (COMPRA / BUY o VENTA / SELL). 2) Punto o zona de entrada. 3) CONDICIÓN DE ENTRADA MECÁNICA Y REPETIBLE: describe el disparador en términos de relaciones entre indicadores/precio verificables en cualquier vela futura (p. ej. "EMA20 cruza por encima de EMA50 Y RSI(14) > 50"), NUNCA como un nivel de precio anecdótico válido solo hoy — esta condición se codifica literalmente en el EA y se prueba contra un año de histórico, así que si no es una regla objetiva y repetible, el EA nunca reproducirá la idea que propones. 4) Stop Loss y Take Profit obligatoriamente coherentes con la dirección: Para COMPRA, TakeProfit > Entrada > StopLoss; Para VENTA, StopLoss > Entrada > TakeProfit. Especifica los niveles tanto en precio como en distancia de pips/puntos y ratio Riesgo/Beneficio (R:R mínimo 1:1.5). 5) Si procede, plan de entradas escalonadas.',
    dependsOn: ['agente-tecnico', 'agente-fundamental'],
    outputType: 'strategy',
    photo: 'https://cdn-icons-png.flaticon.com/512/11126/11126203.png',
    model: 'auto/best-chat',
  },
  {
    id: 'agente-validador-tecnico',
    name: 'Validador de Coherencia Técnica',
    role: 'Validador de Coherencia Técnica',
    systemPrompt:
      'AUDITORÍA DE COHERENCIA MATEMÁTICA Y TÉCNICA: 1) Comprueba la geometría de la orden: Si es COMPRA, ¿TakeProfit > Entrada > StopLoss? Si es VENTA, ¿StopLoss > Entrada > TakeProfit? Si los stops están invertidos o son contradictorios, RECHÁZALA INMEDIATAMENTE. 2) ¿El stop loss queda fuera de estructura relevante? 3) ¿El punto de entrada encaja con la tendencia/momentum? 4) ¿El ratio R:R es >= 1.5 y coherente con el ATR del snapshot? 5) ¿La condición de entrada es una regla mecánica y repetible (relación entre indicadores/precio evaluable en cualquier vela), o es una descripción anecdótica válida solo para el snapshot de hoy ("cuando toque 1.0950")? Si es lo segundo, RECHÁZALA: pide una regla objetiva, porque así es imposible codificarla como señal de un EA que se prueba contra un año de histórico. Cita los números del snapshot al señalar inconsistencias.',
    dependsOn: ['agente-riesgo'],
    outputType: 'text',
    photo: 'https://www.shutterstock.com/image-vector/check-icon-lineal-color-style-260nw-2752163849.jpg',
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
    photo: 'https://cdn-icons-png.flaticon.com/512/3300/3300148.png',
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
    photo: 'https://static.vecteezy.com/system/resources/previews/012/777/951/non_2x/artificial-intelligence-brain-colorful-icon-ai-sign-vector.jpg',
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

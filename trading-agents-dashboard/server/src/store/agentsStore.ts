import { readJson, writeJson } from './jsonStore.js';
import { AGENTS_FILE } from '../paths.js';
import type { Agent } from '../types.js';

interface RawAgent extends Omit<Agent, 'dependsOn'> {
  dependsOn?: string | string[] | null;
}

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: "agente-tecnico",
    name: "Analista Técnico",
    role: "Analista Técnico",
    systemPrompt:
      "Recibes un snapshot de mercado real (precio, medias móviles, RSI, MACD, Bollinger, ATR, máximos/mínimos recientes) para el par y timeframe indicados. Interpreta la tendencia, el momentum y la volatilidad actuales basándote EXCLUSIVAMENTE en esos datos — no inventes valores ni comentes indicadores que no aparecen en el snapshot. Señala soportes y resistencias relevantes.",
    dependsOn: [],
    outputType: "text",
    photo: "https://cdn-icons-png.flaticon.com/512/8637/8637114.png",
    model: "auto/pro-fast",
    enabled: true,
  },
  {
    id: "agente-fundamental",
    name: "Analista Fundamental",
    role: "Analista Fundamental",
    systemPrompt:
      "Evalúa el contexto macroeconómico y de noticias relevante para el par y timeframe indicados. Si el timeframe es intradía (M15-H1), céntrate en riesgo de eventos programados (calendario económico) más que en sesgo direccional; si es de posición (H4+), pondera el sesgo macro de fondo (tipos de interés, política monetaria, flujos). Complementa el análisis técnico, no lo dupliques.",
    dependsOn: [],
    outputType: "text",
    photo: "https://cdn-icons-png.flaticon.com/512/4736/4736348.png",
    model: "auto/pro-chat",
  },
  {
    id: "agente-riesgo",
    name: "Gestor de Riesgos",
    role: "Gestor de Riesgos",
    systemPrompt:
      "A partir del análisis técnico y fundamental recibidos, propone una estrategia concreta y matemáticamente coherente: 1) Dirección inequívoca (COMPRA / BUY o VENTA / SELL) ALINEADA con la tendencia dominante del timeframe: si el precio está por debajo de la SMA200 y las EMAs en orden bajista (EMA20 < EMA50), propón VENTA; si es al revés, COMPRA. Para proponer una entrada contra esa tendencia (reversión a la media) necesitas un filtro de reversión robusto y explícito que el Validador pueda comprobar contra el snapshot (p. ej. divergencia alcista confirmada, o precio recuperando la EMA50) — un simple RSI en sobreventa NO basta, porque en tendencias fuertes el RSI se queda sobrevendido mientras el precio sigue cayendo. 2) Punto o zona de entrada. 3) CONDICIÓN DE ENTRADA MECÁNICA Y REPETIBLE: describe el disparador en términos de relaciones entre indicadores/precio verificables en cualquier vela futura (p. ej. \"EMA20 cruza por encima de EMA50 Y RSI(14) > 50\"), NUNCA como un nivel de precio anecdótico válido solo hoy — esta condición se codifica literalmente en el EA y se prueba contra un año de histórico, así que si no es una regla objetiva y repetible, el EA nunca reproducirá la idea que propones. La condición debe poder cumplirse de forma realista y repetida en el histórico: el EA resultante necesita >= 15 operaciones en ~12 meses, así que una regla que exija una secuencia dentro de la misma vela o en 2 velas, o que apile 3 o más filtros simultáneos estrictos, disparará demasiado pocas veces — eso es un fallo de diseño, no precisión. Usa 1-2 filtros robustos con ventanas amplias (p. ej. \"el precio cierra de nuevo por debajo de la EMA20 tras haber estado por encima\" MÁS \"RSI(14) entre 40 y 60\"), no combines un toque de precio exacto con bandas estrechas de oscilador, y no exijas que dos indicadores se muevan de forma opuesta en la misma barra. 4) Stop Loss y Take Profit obligatoriamente coherentes con la dirección: Para COMPRA, TakeProfit > Entrada > StopLoss; Para VENTA, StopLoss > Entrada > TakeProfit. Especifica los niveles tanto en precio como en distancia de pips/puntos y ratio Riesgo/Beneficio (R:R mínimo 1:1.5). El SL debe estar a una distancia sensata respecto al ATR del snapshot: típicamente 1x-2.5x ATR desde la entrada — ni pegado a una media o nivel (lo barre el ruido), ni a 5x-7x ATR (arruina la eficiencia del capital y el R:R real). 5) Si procede, plan de entradas escalonadas.",
    dependsOn: ["agente-tecnico", "agente-fundamental"],
    outputType: "strategy",
    photo: "https://cdn-icons-png.flaticon.com/512/11126/11126203.png",
    model: "auto/best-chat",
  },
  {
    id: "agente-validador-tecnico",
    name: "Validador de Coherencia Técnica",
    role: "Validador de Coherencia Técnica",
    systemPrompt:
      "AUDITORÍA DE COHERENCIA MATEMÁTICA Y TÉCNICA: 1) Comprueba la geometría de la orden: Si es COMPRA, ¿TakeProfit > Entrada > StopLoss? Si es VENTA, ¿StopLoss > Entrada > TakeProfit? Si los stops están invertidos o son contradictorios, RECHÁZALA INMEDIATAMENTE. 2) ¿El stop loss queda fuera de estructura relevante? 3) ¿El punto de entrada encaja con la tendencia/momentum? 4) ¿El ratio R:R es >= 1.5 y coherente con el ATR del snapshot? 5) ¿La condición de entrada es una regla mecánica y repetible (relación entre indicadores/precio evaluable en cualquier vela), o es una descripción anecdótica válida solo para el snapshot de hoy (\"cuando toque 1.0950\")? Si es lo segundo, RECHÁZALA: pide una regla objetiva, porque así es imposible codificarla como señal de un EA que se prueba contra un año de histórico. Cita los números del snapshot al señalar inconsistencias.",
    dependsOn: ["agente-riesgo"],
    outputType: "text",
    photo: "https://www.shutterstock.com/image-vector/check-icon-lineal-color-style-260nw-2752163849.jpg",
    model: "auto/pro-fast",
  },
  {
    id: "agente-refutador",
    name: "Refutador",
    role: "Refutador",
    systemPrompt:
      "Tu trabajo es intentar tumbar la propuesta de Gestor de Riesgos: busca activamente motivos por los que la operación podría fallar — escenario técnico contrario, eventos de calendario próximos que la invalidarían, correlaciones con otros pares/activos, niveles de invalidación cercanos, falta de liquidez. No suavices la crítica por quedar bien; si la propuesta es sólida dilo, pero exige evidencia concreta DENTRO de los datos disponibles (el snapshot de precio/indicadores y los análisis técnico/fundamental ya recibidos) antes de darla por buena. IMPORTANTE: este sistema NO tiene acceso a profundidad de libro de órdenes (order book/depth), osciladores de volumen (OBV/CMF/MFI) ni flujos de ETF — nunca son parte del snapshot. No rechaces ni condiciones tu aprobación a que se aporten esos datos: si crees que reforzarían la tesis, anótalo como un supuesto a verificar manualmente por el trader antes de operar, no como motivo de rechazo de la propuesta. IMPORTANTE (2): lo que se codifica y se backtestea es la CONDICIÓN DE ENTRADA como regla mecánica repetida sobre ~12 meses de histórico, no la operación concreta de este instante. Separa: (a) defectos de la REGLA — filtros de entrada que no pueden cumplirse a la vez nunca, dirección contra la tendencia dominante del timeframe, R:R por debajo del mínimo, SL/TP mal dimensionados respecto al ATR o colocados donde la regla se barrería de forma sistemática, condición no mecánica — que SÍ son motivo de rechazo; (b) circunstancias del momento del snapshot — día u hora concretos, cierre de sesión o de mes, a cuántos pips está ahora el precio del nivel de entrada, gap de fin de semana de ESTA operación hipotética, un evento de calendario puntual inminente — que NO son motivo de rechazo, porque el EA entra cada vez que la regla se cumple y eso ocurre en muchos momentos distintos del histórico; anótalas como salvedad de ejecución en vivo, no como objeción a la estrategia.",
    dependsOn: ["agente-riesgo"],
    outputType: "text",
    photo: "https://cdn-icons-png.flaticon.com/512/3300/3300148.png",
    model: "auto/pro-fast",
  },
  {
    id: "agente-razonador",
    name: "Razonador",
    role: "Razonador",
    systemPrompt:
      "Sintetiza el análisis técnico, fundamental, la propuesta de riesgo y las críticas del Validador de Coherencia Técnica y el Refutador. Emite un veredicto: GO si la propuesta es sólida y las críticas no la invalidan; AJUSTAR si hay objeciones concretas y corregibles con los datos disponibles (indícalas con precisión); NO_OPERAR si las condiciones o las objeciones son suficientemente serias como para que ninguna propuesta de entrada tenga sentido ahora mismo con estos datos. Una objeción que exige datos que este sistema no puede proporcionar (profundidad de libro de órdenes, osciladores de volumen OBV/CMF/MFI, flujos de ETF — nunca están en el snapshot) NO es 'corregible': no la uses como motivo para AJUSTAR ni NO_OPERAR, trátala como una limitación conocida a mencionar en la razón, no como bloqueo. Reserva AJUSTAR/NO_OPERAR para objeciones que sí se puedan resolver o evaluar con el snapshot de precio/indicadores y los análisis ya recibidos. Además: lo que se codifica y se prueba contra ~12 meses de histórico es la CONDICIÓN DE ENTRADA como regla mecánica repetible, no la operación puntual de este instante. Reserva AJUSTAR/NO_OPERAR para defectos de la regla en sí: filtros de entrada mutuamente excluyentes, dirección contra la tendencia dominante del timeframe, R:R insuficiente, SL/TP mal dimensionados respecto al ATR o situados donde la regla se barrería sistemáticamente, o condición no mecánica. NO uses como motivo de AJUSTAR/NO_OPERAR las circunstancias del momento del snapshot (día u hora, cierre de sesión o de mes, cuántos pips dista ahora el precio de la entrada, gap de fin de semana de esta operación concreta, un evento de calendario puntual inminente): el EA entrará cuando la regla se cumpla, en muchos momentos distintos del histórico. Anótalas como salvedad para la ejecución manual dentro de la razón y emite GO si la regla es sólida.",
    dependsOn: ["agente-validador-tecnico", "agente-refutador"],
    outputType: "verdict",
    photo: "https://static.vecteezy.com/system/resources/previews/012/777/951/non_2x/artificial-intelligence-brain-colorful-icon-ai-sign-vector.jpg",
    model: "auto/pro-reasoning",
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

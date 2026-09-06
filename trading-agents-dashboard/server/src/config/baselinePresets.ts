import type { Agent, AgentConfigPreset, DataCapability, MarketType } from '../types.js';

const CREATED_AT = '2026-08-30T00:00:00.000Z';
// Motor por defecto: OmniRoute (router local propio), no las suscripciones Claude/ChatGPT del
// usuario — decisión explícita para dejar de consumir esas cuotas en el uso diario del dashboard.
// `auto/best-coding` para todo lo que exige tool-calling fiable (especialistas obligatorios,
// estrategia, riesgo, crítico, juez — TODOS devuelven su contrato vía function-calling).
// `auto/best-reasoning` se probó primero y quedó descartado: con prompt+tool_choice reales
// (no solo texto plano) tardaba 100-300s+ por llamada, agotando su propio timeout y cayendo al
// fallback interno (`OMNIROUTE_FALLBACK_MODELS`, que ya incluye auto/pro-coding) — es decir,
// pagaba el timeout completo para acabar en el mismo sitio. `auto/best-coding` responde
// correctamente en ~10-30s con la misma llamada real. `auto/best-fast` para los especialistas
// opcionales, que casi siempre se abstienen por DATA_NOT_AVAILABLE y no necesitan tool-calling
// fiable con contenido complejo.
const OMNI_STRUCTURED = 'omniroute:auto/best-coding';
const OMNI_FAST = 'omniroute:auto/best-fast';

const CONTRACT = `Devuelve exclusivamente el contrato estructurado solicitado. Separa DATO (con source exacto), INFERENCIA, HIPOTESIS y CONCLUSION. No inventes precios, noticias, fundamentales ni métricas. Si un dato necesario no está en el contexto, usa status=data_not_available y DATA_NOT_AVAILABLE en la conclusión. Confianza entre 0 y 1; reduce la confianza cuando el snapshot esté obsoleto.`;

function specialist(
  id: string,
  name: string,
  responsibility: string,
  prompt: string,
  requiredData: DataCapability[],
  optional = false
): Agent {
  return {
    id,
    name,
    role: name,
    responsibility,
    systemPrompt: `${prompt}\n\n${CONTRACT}`,
    dependsOn: [],
    outputType: 'analysis',
    model: optional ? OMNI_FAST : OMNI_STRUCTURED,
    enabled: true,
    inputs: requiredData,
    outputs: ['AgentAnalysis'],
    tools: requiredData,
    activation: {
      mode: optional ? 'data_available' : 'data_available',
      requiredData,
      description: optional
        ? `Opcional: ejecutar solo si están disponibles ${requiredData.join(', ')}.`
        : `Ejecutar cuando estén disponibles ${requiredData.join(', ')}.`,
    },
    abstentionConditions: ['Datos requeridos ausentes', 'Datos contradictorios sin forma de resolverlos'],
    weight: optional ? 0.1 : 0.2,
    interventionType: 'specialist',
  };
}

function strategyAgent(id: string, dependsOn: string[], optionalDependsOn: string[], marketInstruction: string): Agent {
  return {
    id,
    name: 'Sintetizador de Estrategia',
    role: 'Sintetizador de Estrategia',
    responsibility: 'Transformar evidencia especializada en una hipótesis mecánica apta para validación, nunca autorizar trading real.',
    systemPrompt: `${marketInstruction}
Propón una única regla de entrada mecánica con un evento y como máximo un filtro. Usa solo campos presentes en el snapshot. La salida es una hipótesis para backtest, no una orden. Calcula entrada, SL y TP numéricos desde el cierre/ATR provistos, R:R >= 1.60 y riskPercent <= 1.0. Si falta snapshot o ATR, abstente: nunca inventes números. Distingue evidencia, riesgos e invalidaciones.`,
    dependsOn,
    optionalDependsOn,
    outputType: 'strategy',
    model: OMNI_STRUCTURED,
    enabled: true,
    inputs: ['Análisis estructurados de especialistas', 'market_snapshot'],
    outputs: ['StrategyProposalLite'],
    tools: ['market_snapshot'],
    activation: { mode: 'data_available', requiredData: ['market_snapshot'], description: 'Solo con snapshot técnico suficiente.' },
    abstentionConditions: ['Snapshot o ATR ausente', 'Especialistas obligatorios omitidos', 'No existe regla codificable'],
    weight: 0.25,
    interventionType: 'synthesizer',
  };
}

function reviewAgent(id: string, kind: 'risk' | 'adversarial', strategyId: string, marketInstruction: string): Agent {
  const isRisk = kind === 'risk';
  return {
    id,
    name: isRisk ? 'Validador de Riesgo' : 'Crítico Adversarial',
    role: isRisk ? 'Validador de Riesgo' : 'Crítico Adversarial',
    responsibility: isRisk
      ? 'Auditar la propuesta contra límites deterministas y señalar bloqueantes verificables.'
      : 'Intentar refutar la hipótesis buscando contradicciones, supuestos débiles y evidencia insuficiente.',
    systemPrompt: `${marketInstruction}
${isRisk
  ? 'Recalcula geometría BUY/SELL, R:R, riesgo porcentual y distancias respecto a ATR. El código determinista es vinculante; no reemplaces sus límites con opinión. Cada blocker debe citar campos recibidos.'
  : 'No contradigas por sistema. Busca dependencia de datos ausentes, conflicto entre especialistas, sobreconfianza, sesgo de actualidad y reglas no repetibles. No conviertas una preferencia en blocker.'}
${CONTRACT}`,
    dependsOn: [strategyId],
    outputType: 'analysis',
    model: OMNI_STRUCTURED,
    enabled: true,
    inputs: ['StrategyProposalLite', 'market_snapshot', 'Análisis de especialistas'],
    outputs: ['AgentAnalysis con blockers y recommendation'],
    tools: ['market_snapshot'],
    activation: { mode: 'always', description: 'Siempre después de existir una propuesta.' },
    abstentionConditions: ['No existe propuesta que revisar'],
    weight: isRisk ? 0.2 : 0.15,
    interventionType: isRisk ? 'validator' : 'adversarial',
  };
}

function judgeAgent(id: string, riskId: string, criticId: string): Agent {
  return {
    id,
    name: 'Juez de Evidencia',
    role: 'Juez de Evidencia',
    responsibility: 'Resolver el conflicto de revisiones y emitir elegibilidad para backtest con trazabilidad.',
    systemPrompt: `Emite GO solo para generar/backtestear una hipótesis; nunca significa rentable ni autorizada para vivo. Un blocker no puede descartarse sin explicar su resolución con evidencia recibida. AJUSTAR requiere blockers corregibles; NO_OPERAR se usa para contradicción no corregible o datos insuficientes. No inventes evidencia. Enumera conflictos resueltos y blockers pendientes.`,
    dependsOn: [riskId, criticId],
    outputType: 'verdict',
    model: OMNI_STRUCTURED,
    enabled: true,
    inputs: ['Revisión de riesgo', 'Crítica adversarial', 'Propuesta y evidencia ancestral'],
    outputs: ['VerdictResult'],
    tools: [],
    activation: { mode: 'always', description: 'Siempre como cierre del grafo si las revisiones terminaron.' },
    abstentionConditions: ['Revisiones obligatorias ausentes'],
    weight: 1,
    interventionType: 'judge',
  };
}

function preset(
  key: AgentConfigPreset['key'],
  version: string,
  marketType: MarketType,
  referenceAsset: string,
  capabilities: DataCapability[],
  agents: Agent[]
): AgentConfigPreset {
  const allCapabilities: DataCapability[] = [
    'market_snapshot', 'ohlcv', 'session_clock', 'verified_macro_calendar', 'verified_news',
    'corporate_fundamentals', 'sec_filings', 'benchmark_data', 'derivatives_metrics', 'on_chain_metrics',
  ];
  return {
    // El id incorpora la versión: cada revisión se guarda como un preset nuevo
    // y las ejecuciones antiguas continúan siendo reproducibles.
    id: `baseline-${key.toLowerCase()}-${version.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    name: key,
    schemaVersion: 'multiagent-config.v1',
    key,
    version,
    marketType,
    referenceAsset,
    defaultTimeframe: 'H1',
    agents,
    dataPolicy: {
      availableCapabilities: capabilities,
      unavailableCapabilities: allCapabilities.filter((item) => !capabilities.includes(item)),
    },
    consensus: {
      method: 'judge_with_adversarial_review',
      judgeAgentId: agents.find((agent) => agent.outputType === 'verdict')!.id,
      maxRevisionRounds: 2,
      conflictPolicy: 'unresolved_blocker_prevents_go',
    },
    validation: { requireStructuredOutputs: true, requireEvidence: true, deterministicRiskGate: true },
    riskPolicy: { maxRiskPercent: 1, minRrRatio: 1.6, minStopAtr: 1.25, maxStopAtr: 2.5 },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

const forexAgents: Agent[] = [
  specialist('fx-structure', 'Estructura FX', 'Clasificar régimen y niveles sin duplicar momentum.', 'Usa OHLC, SMA/EMA y rango reciente. Determina tendencia primaria, estructura y niveles de invalidación. No afirmes spread, profundidad ni liquidez.', ['market_snapshot']),
  specialist('fx-momentum-volatility', 'Momentum y Volatilidad FX', 'Medir impulso y volatilidad con indicadores disponibles.', 'Usa RSI, MACD, Bollinger y ATR. Describe convergencias y divergencias solo si están explícitamente calculadas; no infieras pendientes no provistas.', ['market_snapshot']),
  specialist('fx-session', 'Sesiones FX', 'Evaluar apertura/cierre de mercado y sesión temporal, sin fingir spread.', 'Usa exclusivamente el reloj de sesión provisto. Señala mercado cerrado o transición de sesión. Spread y liquidez son DATA_NOT_AVAILABLE si no se proporcionan.', ['session_clock']),
  specialist('fx-macro', 'Macro BCE/Fed', 'Evaluar calendario, bancos centrales y diferencial de tipos con fuentes verificadas.', 'Analiza solo eventos y cifras incluidos por un feed verificado con fuente y fetched_at. No uses memoria del modelo como dato macro.', ['verified_macro_calendar', 'verified_news'], true),
  strategyAgent('fx-strategy', ['fx-structure', 'fx-momentum-volatility', 'fx-session'], ['fx-macro'], 'Diseña una hipótesis específica de Forex; respeta mercado cerrado y no uses datos macro ausentes.'),
  reviewAgent('fx-risk', 'risk', 'fx-strategy', 'Aplica límites para Forex y reconoce que spread/bid-ask no están disponibles.'),
  reviewAgent('fx-critic', 'adversarial', 'fx-strategy', 'Cuestiona coherencia técnica, sesión y dependencia de macro no verificada.'),
  judgeAgent('fx-judge', 'fx-risk', 'fx-critic'),
];

const stockAgents: Agent[] = [
  specialist('stock-structure', 'Estructura de Precio Acciones', 'Clasificar tendencia, niveles y riesgo de gap.', 'Usa OHLC, medias, ATR, rango y métricas de gap provistas. No traslades reglas de sesiones Forex.', ['market_snapshot', 'ohlcv']),
  specialist('stock-volume-gap', 'Volumen y Gaps', 'Evaluar volumen relativo y gaps con OHLCV.', 'Usa únicamente volumen relativo, gap y rango calculados. No inventes order flow, short interest ni volumen fuera del feed.', ['ohlcv']),
  specialist('stock-corporate', 'Fundamental Corporativo', 'Evaluar earnings, guidance, valoración y filings con fuentes verificadas.', 'Usa solo fundamentales, earnings y filings presentes con fecha/fuente. Sin feed, devuelve DATA_NOT_AVAILABLE.', ['corporate_fundamentals', 'sec_filings', 'verified_news'], true),
  specialist('stock-market-regime', 'Régimen Mercado/Sector', 'Contrastar TSLA con Nasdaq, S&P y sector.', 'Usa benchmarks y sector solo si están provistos; no los infieras a partir de TSLA.', ['benchmark_data'], true),
  strategyAgent('stock-strategy', ['stock-structure', 'stock-volume-gap'], ['stock-corporate', 'stock-market-regime'], 'Diseña una hipótesis específica de acciones; considera gaps y horario de mercado. No uses diferencial BCE/Fed como señal corporativa.'),
  reviewAgent('stock-risk', 'risk', 'stock-strategy', 'Audita riesgo de gap y frescura; no inventes liquidez o slippage.'),
  reviewAgent('stock-critic', 'adversarial', 'stock-strategy', 'Busca dependencia indebida de noticias, filings o benchmarks ausentes.'),
  judgeAgent('stock-judge', 'stock-risk', 'stock-critic'),
];

const cryptoAgents: Agent[] = [
  specialist('crypto-structure', 'Estructura Técnica Cripto', 'Clasificar régimen 24/7 y niveles.', 'Usa OHLC, medias, rango y ATR. No apliques cierre semanal de Forex ni horario bursátil.', ['market_snapshot']),
  specialist('crypto-volume-momentum', 'Volumen y Momentum Cripto', 'Evaluar volumen relativo, impulso y compresión.', 'Usa OHLCV, RSI, MACD, Bollinger y ATR. Diferencia volumen del exchange del volumen global, que no está disponible.', ['ohlcv']),
  specialist('crypto-derivatives', 'Derivados Cripto', 'Evaluar funding, open interest y liquidaciones.', 'Usa solo métricas de derivados con timestamp y venue. Sin ellas devuelve DATA_NOT_AVAILABLE.', ['derivatives_metrics'], true),
  specialist('crypto-onchain', 'On-chain', 'Evaluar métricas on-chain verificadas.', 'No sustituyas datos on-chain ausentes con narrativa; exige fuente, altura/fecha y definición.', ['on_chain_metrics'], true),
  specialist('crypto-regulatory', 'Noticias Regulatorias Cripto', 'Evaluar eventos regulatorios con fuente verificada.', 'Usa únicamente noticias provistas con fuente y fetched_at. No uses memoria del modelo como noticia actual.', ['verified_news'], true),
  strategyAgent('crypto-strategy', ['crypto-structure', 'crypto-volume-momentum'], ['crypto-derivatives', 'crypto-onchain', 'crypto-regulatory'], 'Diseña una hipótesis específica de Bitcoin 24/7; no presupongas funding, liquidaciones u on-chain.'),
  reviewAgent('crypto-risk', 'risk', 'crypto-strategy', 'Audita volatilidad elevada, sizing y riesgo 24/7 con datos disponibles.'),
  reviewAgent('crypto-critic', 'adversarial', 'crypto-strategy', 'Busca sobreconfianza y dependencia de métricas cripto ausentes.'),
  judgeAgent('crypto-judge', 'crypto-risk', 'crypto-critic'),
];

export const BASELINE_PRESETS: AgentConfigPreset[] = [
  preset('FOREX', 'forex_v1', 'forex', 'EUR/USD', ['market_snapshot', 'ohlcv', 'session_clock'], forexAgents),
  preset('ACCIONES', 'stocks_v1', 'stocks', 'TSLA', ['market_snapshot', 'ohlcv', 'session_clock'], stockAgents),
  preset('CRIPTOMONEDAS', 'crypto_v1', 'crypto', 'BTC/USD', ['market_snapshot', 'ohlcv', 'session_clock'], cryptoAgents),
];

export function cloneBaselinePresets(): AgentConfigPreset[] {
  return structuredClone(BASELINE_PRESETS);
}

import { compileMql5 } from './mql5Compiler.js';
import {
  appendAttemptLog,
  loadTopIssues,
  recordConfirmedFix,
  renderIssuesForPrompt,
} from '../store/mql5KnowledgeStore.js';
import { getWikiContextBlock } from '../store/wikiStore.js';
import type { Mql5GenerationResult, StrategyProposalLite } from '../types.js';

// Antes esto acotaba la duración de una única petición HTTP bloqueante, así que se mantenía
// corto. Ahora que /mql5/generate es un job en segundo plano sondeado por el cliente
// (server/src/engine/mql5Jobs.ts), ya no hay motivo para recortarlo — y un valor demasiado
// ajustado desperdicia intentos de compilación por timeout del LLM en vez de por errores reales
// (visto en pruebas: "This operation was aborted" a los 90s con un modelo/prompt más lento).
const REQUEST_TIMEOUT_MS = 180_000;
const MAX_COMPILE_ATTEMPTS = 3;

export interface Mql5GenerationProgress {
  attempt: number;
  maxAttempts: number;
  phase: 'generating' | 'compiling';
}

export type Mql5ProgressCallback = (progress: Mql5GenerationProgress) => void;

const MQL5_STANDARD_SYSTEM_PROMPT = `Eres un desarrollador senior de MQL5 siguiendo el estándar del proyecto
(docs/MetaTrader/17_Estandar_Desarrollo_EAs_con_IA.md). Vas a convertir una propuesta de
estrategia en un Expert Advisor MQL5 de laboratorio (cuenta DEMO, nunca real).

Reglas obligatorias:
1. No inventes funciones/constantes de MQL5 que no conozcas con certeza.
2. Compilable sin warnings: si algo no puede garantizarse, coméntalo explícitamente en el código.
3. No uses look-ahead: ninguna decisión de la barra actual puede depender de datos futuros.
4. Nunca hardcodees pip/tick/point/tick_value/contract_size — consúltalos en runtime con
   SymbolInfoDouble/SymbolInfoInteger.
5. Normaliza el volumen a SYMBOL_VOLUME_STEP y acótalo a [VOLUME_MIN, VOLUME_MAX] antes de
   enviar cualquier orden.
6. Valida SL/TP contra SYMBOL_TRADE_STOPS_LEVEL y SYMBOL_TRADE_FREEZE_LEVEL.
7. Usa un Magic Number fijo para todas las operaciones del EA.
8. Trata explícitamente MqlTradeResult.retcode — nunca asumas que OrderSend() == true implica
   fill.
9. Usa OnTradeTransaction() para reconstruir el estado real de posiciones/órdenes; impide
   duplicar entradas por ticks repetidos o reinicios del Terminal.
10. Si la estrategia es bar-based, distingue barra nueva de tick nuevo (compara el timestamp de
    la última barra procesada).
11. Como máximo una operación por señal — no reevalúes la misma condición en cada tick mientras
    siga siendo verdadera.
12. Documenta cada input (input group "Estrategia"/"Riesgo"/"Filtros") con un comentario breve de
    qué representa y su unidad (puntos, pips, %, etc.).
13. Logging suficiente: registra señal generada, señal filtrada (y por qué), orden enviada y
    resultado recibido.

Errores de compilación frecuentes en MQL5 — verificados, evítalos siempre:
- SYMBOL_VOLUME_STEP, SYMBOL_VOLUME_MIN, SYMBOL_VOLUME_MAX, SYMBOL_POINT,
  SYMBOL_TRADE_TICK_SIZE, SYMBOL_TRADE_TICK_VALUE y SYMBOL_TRADE_CONTRACT_SIZE son
  propiedades DOUBLE — consúltalas con SymbolInfoDouble, nunca con SymbolInfoInteger.
- SYMBOL_TRADE_STOPS_LEVEL y SYMBOL_TRADE_FREEZE_LEVEL son propiedades INTEGER — consúltalas
  con SymbolInfoInteger, y la variable de salida debe declararse como long (no int); MQL5
  no convierte implícitamente int& a long&.
- Nunca inicialices MqlTradeRequest/MqlTradeResult con '= {0}' (no compila) — declara la
  variable y usa ZeroMemory(request); ZeroMemory(result);
- MqlTradeTransaction NO tiene campo '.magic'. Para el magic number de una transacción usa
  HistoryOrderGetInteger(trans.order, ORDER_MAGIC) o HistoryDealGetInteger(trans.deal, DEAL_MAGIC)
  según corresponda — nunca trans.magic.
- #property version debe tener el formato "x.yy" (p. ej. "1.00"), nunca "x.y.z" — con tres
  números MetaEditor emite el warning 68 "incompatible with MQL5 Market, must be xxx.yyy".

Estructura: un único archivo .mq5 autocontenido (sin includes propios del proyecto), pero
organizado internamente en secciones comentadas que separan con claridad: señal de
entrada/salida, filtros, gestión de riesgo/position sizing, ejecución (OrderSend o CTrade) y
seguimiento de estado — igual que si fueran módulos distintos, aunque vivan en un solo archivo.
Implementa OnInit/OnDeinit/OnTick/OnTradeTransaction. Usa un Magic Number fijo derivado del
nombre de la estrategia.

Debes llamar a la función deliver_ea con el código completo y, obligatoriamente, con la lista de
supuestos que hay que verificar manualmente contra el símbolo/broker real antes de backtest
(p. ej. disponibilidad de "every tick based on real ticks", spread típico, sesión de trading,
apalancamiento) — esto es un requisito del estándar del proyecto, no opcional.`;

const DELIVER_EA_TOOL = {
  type: 'function' as const,
  function: {
    name: 'deliver_ea',
    description: 'Entrega el código fuente MQL5 del Expert Advisor y los supuestos a verificar manualmente.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Código fuente completo del archivo .mq5.' },
        assumptionsToVerify: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supuestos que deben verificarse manualmente contra el símbolo/broker real antes de backtest.',
        },
        fixSummary: {
          type: 'string',
          description:
            'Solo si esto es una corrección de un intento anterior: una frase describiendo qué error se corrigió y cómo, para dejarlo documentado. Omitir en la primera generación.',
        },
      },
      required: ['code', 'assumptionsToVerify'],
    },
  },
};

function buildUserPrompt(strategy: StrategyProposalLite): string {
  return [
    `Par: ${strategy.pair}`,
    `Timeframe: ${strategy.timeframe}`,
    `Resumen de la estrategia: ${strategy.resumen}`,
    `Indicadores clave: ${strategy.indicadoresClave.join(', ')}`,
    `Punto de entrada: ${strategy.puntoEntrada}`,
    `Stop loss: ${strategy.stopLoss}`,
    `Take profit: ${strategy.takeProfit}`,
    strategy.entradasEscalonadas ? `Entradas escalonadas: ${strategy.entradasEscalonadas}` : null,
    strategy.confianza ? `Confianza de la propuesta: ${strategy.confianza}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n');
}

function buildFilename(strategy: StrategyProposalLite): string {
  const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9]+/g, '');
  return `EA_${sanitize(strategy.pair)}_${sanitize(strategy.timeframe)}.mq5`;
}

function buildFixPrompt(previousCode: string, errors: string[]): string {
  return [
    'El código anterior NO compiló en MetaEditor. Estos son los errores REALES reportados por',
    'el compilador (verificados, no supuestos) — corrige ÚNICAMENTE estos errores manteniendo',
    'la misma estrategia e intención del código:',
    '',
    errors.join('\n'),
    '',
    'Código anterior:',
    '```mql5',
    previousCode,
    '```',
    '',
    'Devuelve el archivo .mq5 completo y corregido llamando a deliver_ea, junto con la lista',
    'actualizada de supuestos a verificar y el campo fixSummary describiendo en una frase qué',
    'corregiste y cómo (se documentará para futuras generaciones).',
  ].join('\n');
}

async function chatCompletion(model: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('OMNIROUTE_BASE_URL/OMNIROUTE_API_KEY no están configurados');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        tools: [DELIVER_EA_TOOL],
        tool_choice: { type: 'function', function: { name: 'deliver_ea' } },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OmniRoute respondió ${response.status}: ${body.slice(0, 300)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildMockResult(strategy: StrategyProposalLite): Mql5GenerationResult {
  const filename = buildFilename(strategy);
  const code = `//+------------------------------------------------------------------+
//| ${filename}
//| [SIMULADO] Esqueleto de EA — conecta OMNIROUTE_API_KEY para       |
//| generar código real siguiendo docs/MetaTrader/17_Estandar...      |
//+------------------------------------------------------------------+
#property strict

input int InpMagicNumber = 100001; // Identificador único de este EA

//--- Estrategia base (mock): ${strategy.resumen}
//--- Entrada sugerida: ${strategy.puntoEntrada}
//--- Stop loss sugerido: ${strategy.stopLoss}
//--- Take profit sugerido: ${strategy.takeProfit}

int OnInit()
  {
   Print("[SIMULADO] EA inicializado — este archivo es un placeholder, no código real.");
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
  }

void OnTick()
  {
   // [SIMULADO] Aquí iría: MarketState -> IndicatorManager -> StrategySignal.evaluate()
   // -> filtros -> RiskManager.validate() -> PositionSizer.size() -> TradeExecutor.execute()
  }

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
  }
`;
  return {
    code,
    filename,
    assumptionsToVerify: [
      '[SIMULADO] Esto es un placeholder — conecta OMNIROUTE_API_KEY para generar código real.',
    ],
    compileStatus: 'unverified',
    compileErrors: [],
    compileWarnings: [],
    attempts: 1,
  };
}

interface EaDraft {
  code: string;
  assumptionsToVerify: string[];
  fixSummary: string | null;
}

async function requestEa(model: string, systemPrompt: string, userPrompt: string): Promise<EaDraft> {
  const data = await chatCompletion(model, systemPrompt, userPrompt);
  const message = data?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];

  let args: any;
  if (toolCall?.function?.arguments) {
    args = JSON.parse(toolCall.function.arguments);
  } else if (typeof message?.content === 'string' && message.content.trim()) {
    args = JSON.parse(message.content);
  } else {
    throw new Error('El modelo no devolvió el EA esperado');
  }

  if (typeof args.code !== 'string' || !args.code.trim()) {
    throw new Error('El modelo no devolvió código MQL5 válido');
  }

  return {
    code: args.code,
    assumptionsToVerify: Array.isArray(args.assumptionsToVerify) ? args.assumptionsToVerify : [],
    fixSummary: typeof args.fixSummary === 'string' && args.fixSummary.trim() ? args.fixSummary.trim() : null,
  };
}

export async function generateMql5(
  strategy: StrategyProposalLite,
  model?: string,
  onProgress?: Mql5ProgressCallback
): Promise<Mql5GenerationResult> {
  const useReal = Boolean(process.env.OMNIROUTE_API_KEY && process.env.OMNIROUTE_BASE_URL);
  if (!useReal) {
    return buildMockResult(strategy);
  }

  const resolvedModel = model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-coding';
  const filename = buildFilename(strategy);

  const learnedIssues = await loadTopIssues(20);
  const learnedSection = renderIssuesForPrompt(learnedIssues);
  const wikiSection = await getWikiContextBlock(`${strategy.resumen}\n${strategy.indicadoresClave.join(', ')}`, {
    maxPages: 2,
  });
  const systemPrompt = [MQL5_STANDARD_SYSTEM_PROMPT, learnedSection, wikiSection].filter(Boolean).join('\n\n');

  onProgress?.({ attempt: 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'generating' });
  let draft = await requestEa(resolvedModel, systemPrompt, buildUserPrompt(strategy));
  onProgress?.({ attempt: 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'compiling' });
  let compile = await compileMql5(draft.code, filename);
  let attempts = 1;

  await appendAttemptLog({
    timestamp: new Date().toISOString(),
    pair: strategy.pair,
    timeframe: strategy.timeframe,
    attemptNumber: attempts,
    errorsFound: compile.errors,
    warningsFound: compile.warnings,
    fixSummary: null,
    resolvedFromPrevious: [],
  });

  while (compile.status === 'errors' && attempts < MAX_COMPILE_ATTEMPTS) {
    const previousErrors = compile.errors;
    onProgress?.({ attempt: attempts + 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'generating' });
    draft = await requestEa(resolvedModel, systemPrompt, buildFixPrompt(draft.code, previousErrors));
    onProgress?.({ attempt: attempts + 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'compiling' });
    compile = await compileMql5(draft.code, filename);
    attempts += 1;

    const resolved = previousErrors.filter((e) => !compile.errors.includes(e));
    await appendAttemptLog({
      timestamp: new Date().toISOString(),
      pair: strategy.pair,
      timeframe: strategy.timeframe,
      attemptNumber: attempts,
      errorsFound: compile.errors,
      warningsFound: compile.warnings,
      fixSummary: draft.fixSummary,
      resolvedFromPrevious: resolved,
    });

    if (draft.fixSummary) {
      for (const resolvedError of resolved) {
        await recordConfirmedFix(resolvedError, draft.fixSummary);
      }
    }
  }

  return {
    code: draft.code,
    filename,
    assumptionsToVerify: draft.assumptionsToVerify,
    compileStatus: compile.status,
    compileErrors: compile.errors,
    compileWarnings: compile.warnings,
    attempts,
  };
}

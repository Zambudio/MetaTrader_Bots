import { compileMql5, persistDeliverable } from './mql5Compiler.js';
import {
  appendAttemptLog,
  loadTopIssues,
  recordConfirmedFix,
  renderIssuesForPrompt,
} from '../store/mql5KnowledgeStore.js';
import { getWikiContextBlock } from '../store/wikiStore.js';
import type { Mql5GenerationResult, StrategyProposalLite } from '../types.js';
import { sanitizeJsonResponse, type ChatMessage } from './omniClient.js';
import { routeChatCompletion as chatCompletion } from './llmRouter.js';
import { reviewMql5Code, type CodeReviewResult } from './codeReviewer.js';
import { runHeadlessBacktest } from './mql5Backtester.js';
import { evaluateQualityGate } from './qualityGate.js';
import type { Mt5LogSession } from './mt5LogParser.js';
import type { Mql5GenerationProgress } from './mql5Jobs.js';

export type { Mql5GenerationProgress };
export type Mql5ProgressCallback = (progress: Mql5GenerationProgress) => void;

const MAX_COMPILE_ATTEMPTS = 3;
const DEFAULT_MAX_BACKTEST_OPTIMIZATION_CYCLES = 3;

/**
 * La validacion de fidelidad necesita exactamente un smoke backtest: un resultado pobre o cero
 * trades se documenta, pero nunca autoriza a relajar filtros ni cambiar la estrategia aprobada.
 */
export function resolveMaxBacktestOptimizationCycles(): number {
  return process.env.MQL5_DISABLE_OPTIMIZATION === '1'
    ? 1
    : DEFAULT_MAX_BACKTEST_OPTIMIZATION_CYCLES;
}

// Tiempo máximo para UNA llamada al LLM que escribe/corrige el .mq5. Escribir el archivo
// completo es la petición más pesada del pipeline: los modelos por CLI de suscripción
// (`claude`, `codex`) tardan 2-5 min y con el antiguo tope de 180 s se les mataba a mitad
// (`código null` en los logs) forzando reintentos que alargaban todo. Configurable por si
// hace falta acotarlo.
const MQL5_GEN_TIMEOUT_MS = Number(process.env.MQL5_GEN_TIMEOUT_MS) || 300_000;

// Prompt estándar riguroso acorde al contrato wiki-Traiding/proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md
const MQL5_STANDARD_SYSTEM_PROMPT = `Eres un desarrollador senior de MQL5 siguiendo estrictamente el estándar del proyecto
(wiki-Traiding/proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md y wiki-Traiding/proyecto-mt5-bots/05_Gestion_Riesgo_EAs.md).
Vas a convertir una propuesta de estrategia en un Expert Advisor MQL5 de laboratorio (cuenta DEMO, nunca real).

REGLAS OBLIGATORIAS DE ARQUITECTURA Y EJECUCIÓN:
1. NO INVENTES APIS, CAMPOS, CONSTANTES NI SOBRECARGAS: Usa únicamente identificadores y firmas oficiales del MQL5 Reference.
   - Identificadores prohibidos/inexistentes: TRADE_RETCODE_DONE_PARTIAL, TRADE_RETCODE_INVALID_ORDER,
     TRADE_RETCODE_NO_CHANGES, TRADE_TRANSACTION_POSITION_DELETE, trans.magic, trans.profit,
     ORDER_MAGIC_NUMBER y AccountBalanceDouble.
   - CTrade::Buy y CTrade::Sell aceptan COMO MÁXIMO 6 argumentos: volume, symbol, price, sl, tp, comment
     (el sexto es el comentario). NUNCA añadas un séptimo argumento de salida para el ticket.
     Patrón correcto de venta a mercado: bool sent = trade.Sell(volume, _Symbol, 0.0, slPrice, tpPrice, "EA");
     Tras la llamada consulta trade.ResultRetcode(), trade.ResultOrder() y trade.ResultDeal(); no recibas el ticket como argumento.
   - MqlTradeTransaction NO tiene campo profit y NO existe TRADE_TRANSACTION_POSITION_DELETE.
     Si la estrategia no requiere lógica de transacciones, implementa la sección 8 como un handler VACÍO con la firma exacta:
     void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result) { }
   - Si la estrategia exige registrar cierres: detecta TRADE_TRANSACTION_DEAL_ADD, selecciona con HistoryDealSelect(trans.deal),
     comprueba HistoryDealGetInteger(trans.deal, DEAL_ENTRY) == DEAL_ENTRY_OUT, y obtén el beneficio con
     HistoryDealGetDouble(trans.deal, DEAL_PROFIT). Nunca leas el beneficio de trans.
   - Retcodes oficiales de éxito: TRADE_RETCODE_DONE (10009), TRADE_RETCODE_PLACED (10008). Usa CTrade para ejecución limpia y valida su resultado.
2. STOP LOSS OBLIGATORIO: Toda apertura de posición (OrderSend/trade.Buy/trade.Sell/trade.PositionOpen) DEBE
   incluir un Stop Loss válido — está estrictamente prohibido enviar una orden sin SL.
3. POSITION SIZING DETERMINISTA POR RIESGO REAL:
   Calcula el volumen en cada entrada según el porcentaje de riesgo sobre balance:
   riesgo_monetario = AccountInfoDouble(ACCOUNT_BALANCE) * (InpRiskPercent / 100.0);
   distancia_ticks = MathAbs(entryPrice - stopLoss) / SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   volumen_crudo = riesgo_monetario / (distancia_ticks * tick_value);
   Normaliza a SYMBOL_VOLUME_STEP y acota rígidamente a [SYMBOL_VOLUME_MIN, SYMBOL_VOLUME_MAX].
4. HARD LIMITS DETERMINISTAS (KILL SWITCH LOCAL):
   En OnTick(), calcula la pérdida acumulada y drawdown del día contra AccountInfoDouble(ACCOUNT_BALANCE) y
   AccountInfoDouble(ACCOUNT_EQUITY). Si la pérdida diaria supera InpMaxDailyLossPct o el drawdown supera
   InpMaxDrawdownPct, bloquea inmediatamente nuevas entradas de forma determinista.
5. NO LOOK-AHEAD: Ningún cálculo ni señal de la barra actual puede depender de datos o índices futuros.
6. PROPIEDADES DINÁMICAS EN RUNTIME:
   - SYMBOL_VOLUME_STEP, SYMBOL_VOLUME_MIN, SYMBOL_VOLUME_MAX, SYMBOL_POINT, SYMBOL_TRADE_TICK_SIZE,
     SYMBOL_TRADE_TICK_VALUE son propiedades DOUBLE (SymbolInfoDouble).
   - SYMBOL_TRADE_STOPS_LEVEL y SYMBOL_TRADE_FREEZE_LEVEL son propiedades INTEGER (SymbolInfoInteger, variable long).
7. VALIDACIÓN DE STOPS: Valida SL y TP contra SYMBOL_TRADE_STOPS_LEVEL antes de enviar órdenes.
8. MAGIC NUMBER: Usa un Magic Number fijo (input ulong InpMagicNumber) en toda orden y transacción.
9. PREVENCIÓN DE ENTRADAS DUPLICADAS: Verifica siempre PositionsTotal() o el ticket abierto antes de emitir señal.
10. GUARD DE NUEVA BARRA: En estrategias bar-based, coloca al inicio de OnTick():
    datetime currentBarTime = iTime(_Symbol, _Period, 0);
    if(currentBarTime == lastBarTime) return;
    lastBarTime = currentBarTime;
11. MÁXIMO UNA OPERACIÓN POR SEÑAL: No reevalúes la misma condición en cada tick.
12. LOGGING CONTROLADO Y ANTI-SPAM (Límite por barra):
    Registra razones de señales filtradas o descartadas COMO MÁXIMO UNA VEZ POR BARRA (dentro del guard de
    nueva barra), NUNCA en cada tick de ramas else. Imprime en OnInit/OnDeinit, aperturas/cierres reales y errores.
13. EJECUCIÓN CON CTrade: trade.SetExpertMagicNumber(InpMagicNumber); trade.SetTypeFillingBySymbol(_Symbol);
14. DOCUMENTACIÓN DE INPUTS: Documenta cada input con grupos organizados y comentarios de su unidad (%, puntos, etc.).
15. DIRECTIVAS: #property version "1.00" (formato x.yy exacto para evitar warnings).
16. ZERO MEMORY: Nunca inicialices MqlTradeRequest con '= {0}'. Usa ZeroMemory(request); ZeroMemory(result);
17. FIDELIDAD A LA CONDICIÓN DE ENTRADA: El "Generador de Señal" (sección 6) debe implementar EXACTAMENTE
    la "Condición de entrada" recibida en el prompt de usuario — es la regla que ya auditaron y aprobaron
    los agentes de análisis. No la sustituyas por tu propio criterio de cuándo entrar, no la relajes ni la
    endurezcas, y no te bases en "Punto de entrada" (solo un nivel de referencia) para inventar una lógica
    distinta. Si la condición usa un indicador que no citaste en OnInit(), créalo tú mismo con el handle
    correspondiente (iMA, iRSI, iATR, etc.).

ESTRUCTURA: Un único archivo .mq5 autocontenido (sin includes propios fuera del estándar de MT5), estructurado con
secciones comentadas: (1) Inputs/Parámetros, (2) Variables globales/Estado, (3) OnInit/OnDeinit, (4) Hard Limits/Risk Check,
(5) Position Sizer, (6) Generador de Señal, (7) Ejecución CTrade, (8) OnTradeTransaction.

Debes llamar a la función deliver_ea con el código completo y los supuestos a verificar manualmente.`;

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
            'Solo si esto es una corrección de un intento anterior: una frase describiendo qué error se corrigió y cómo. Omitir en la primera generación.',
        },
      },
      required: ['code', 'assumptionsToVerify'],
    },
  },
};

function buildUserPrompt(strategy: StrategyProposalLite): string {
  const riskPct = strategy.riskPercent ?? 1.0;
  return [
    `Par: ${strategy.pair}`,
    `Timeframe: ${strategy.timeframe}`,
    `Dirección: ${strategy.direction || 'analizar según propuesta'}`,
    `Resumen de la estrategia: ${strategy.resumen}`,
    `Indicadores clave: ${strategy.indicadoresClave.join(', ')}`,
    `Condición de entrada (regla mecánica a implementar EXACTAMENTE — no inventes ni relajes/endurezcas otra distinta): ${strategy.condicionEntrada}`,
    `Punto de entrada: ${strategy.puntoEntrada} (${strategy.entryPriceNum ?? 'dinámico'})`,
    `Stop loss: ${strategy.stopLoss} (${strategy.stopLossNum ?? 'dinámico'})`,
    `Take profit: ${strategy.takeProfit} (${strategy.takeProfitNum ?? 'dinámico'})`,
    `Riesgo por operación sugerido: ${riskPct}% de la cuenta`,
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
    'El código anterior NO compiló en MetaEditor o incumplió reglas críticas. Corrige ÚNICAMENTE estos errores manteniendo la misma estrategia:',
    '',
    errors.join('\n'),
    '',
    'Código anterior:',
    '```mql5',
    previousCode,
    '```',
    '',
    'Devuelve el archivo .mq5 completo y corregido llamando a deliver_ea, junto con la lista actualizada de supuestos.',
  ].join('\n');
}

function buildOptimizationPrompt(
  strategy: StrategyProposalLite,
  previousCode: string,
  failedReasons: string[],
  iteration: number
): string {
  return [
    `ITERACIÓN #${iteration} DE OPTIMIZACIÓN AGÉNTICA — QUALITY GATE (Doc 20 §4).`,
    `Par: ${strategy.pair} | Timeframe: ${strategy.timeframe}`,
    `Estrategia base: ${strategy.resumen}`,
    `\n=== MOTIVOS DE NO CUMPLIMIENTO DEL QUALITY GATE ===`,
    failedReasons.map((r) => `- ${r}`).join('\n'),
    `\n=== CÓDIGO ACTUAL ===\n${previousCode}`,
    `\nINSTRUCCIONES DE ACCIÓN CORRECTIVA (Doc 20 §5):`,
    `1. Si hubo pocas operaciones (<15): Ajusta la sensibilidad de los filtros o suaviza los umbrales de entrada.`,
    `2. Si el drawdown fue excesivo (>15%) o el Profit Factor bajo: Añade filtro de régimen por ADX/EMA o trailing stop por ATR.`,
    `3. Si la esperanza matemática fue baja: Incorpora función de Breakeven dinámico al alcanzar 1.0R de beneficio.`,
    `4. Asegura que TODO envío de orden contenga Stop Loss válido y sizing por riesgo normalizado.`,
  ].join('\n');
}

function buildMockResult(strategy: StrategyProposalLite): Mql5GenerationResult {
  const filename = buildFilename(strategy);
  const riskPct = strategy.riskPercent ?? 1.0;
  const direction = strategy.direction || 'buy';

  const code = `//+------------------------------------------------------------------+
//| ${filename}                                                      |
//| Generado por trading-agents-dashboard siguiendo Doc 17 y Doc 05  |
//+------------------------------------------------------------------+
#property copyright "MetaTrader_Bots Laboratory"
#property link      "https://github.com/Zambudio/MetaTrader_Bots"
#property version   "1.00"
#property strict

#include <Trade\\Trade.mqh>

//--- Grupos de Inputs
input group "=== Configuración de Estrategia ==="
input ulong  InpMagicNumber = 100001;       // Magic Number identificador
input int    InpAtrPeriod   = 14;           // Periodo ATR para volatilidad
input double InpSlAtrMult   = 1.5;          // Multiplicador ATR para Stop Loss
input double InpTpAtrMult   = 3.0;          // Multiplicador ATR para Take Profit (R:R >= 2.0)

input group "=== Gestión de Riesgo (Hard Limits) ==="
input double InpRiskPercent     = ${riskPct.toFixed(1)};     // Riesgo por operación (% del balance)
input double InpMaxDailyLossPct = 3.0;     // Pérdida diaria máxima permitida (%) [Kill Switch]
input double InpMaxDrawdownPct  = 10.0;    // Drawdown máximo permitido (%) [Kill Switch]

//--- Variables Globales
CTrade         trade;
datetime       lastBarTime = 0;
datetime       lastLogBarTime = 0;
int            atrHandle = INVALID_HANDLE;
double         dailyStartingBalance = 0.0;
datetime       currentDayTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetTypeFillingBySymbol(_Symbol);
   
   atrHandle = iATR(_Symbol, _Period, InpAtrPeriod);
   if(atrHandle == INVALID_HANDLE)
     {
      Print("[INIT_ERROR] No se pudo crear el indicador ATR para ", _Symbol);
      return(INIT_FAILED);
     }
     
   dailyStartingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   currentDayTime = iTime(_Symbol, PERIOD_D1, 0);
   
   Print("[INIT_SUCCESS] EA inicializado correctamente para ", _Symbol, " en ", EnumToString(_Period));
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);
   Print("[DEINIT] EA detenido. Motivo: ", reason);
  }

//+------------------------------------------------------------------+
//| Hard Limits Deterministas (Kill Switch Local - Doc 05 §5)        |
//+------------------------------------------------------------------+
bool CheckRiskLimits()
  {
   datetime today = iTime(_Symbol, PERIOD_D1, 0);
   if(today != currentDayTime)
     {
      currentDayTime = today;
      dailyStartingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
     }
     
   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(dailyStartingBalance > 0)
     {
      double dailyLossPct = ((dailyStartingBalance - currentEquity) / dailyStartingBalance) * 100.0;
      if(dailyLossPct >= InpMaxDailyLossPct)
        {
         if(lastLogBarTime != lastBarTime)
           {
            Print("[KILL_SWITCH] Límite de pérdida diaria alcanzado: ", dailyLossPct, "% >= ", InpMaxDailyLossPct, "%. Entradas bloqueadas.");
            lastLogBarTime = lastBarTime;
           }
         return false;
        }
     }
     
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance > 0)
     {
      double currentDrawdown = ((balance - currentEquity) / balance) * 100.0;
      if(currentDrawdown >= InpMaxDrawdownPct)
        {
         if(lastLogBarTime != lastBarTime)
           {
            Print("[KILL_SWITCH] Límite de drawdown alcanzado: ", currentDrawdown, "% >= ", InpMaxDrawdownPct, "%. Entradas bloqueadas.");
            lastLogBarTime = lastBarTime;
           }
         return false;
        }
     }
     
   return true;
  }

//+------------------------------------------------------------------+
//| Position Sizing determinista por riesgo monetario real           |
//+------------------------------------------------------------------+
double CalculatePositionSize(double slDistancePoints)
  {
   if(slDistancePoints <= 0) return 0.0;
   
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney = balance * (InpRiskPercent / 100.0);
   
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double pointVal  = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   
   if(tickSize <= 0 || tickValue <= 0 || pointVal <= 0) return 0.0;
   
   double slDistanceTicks = (slDistancePoints * pointVal) / tickSize;
   if(slDistanceTicks <= 0) return 0.0;
   
   double rawVolume = riskMoney / (slDistanceTicks * tickValue);
   
   double volStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double volMin  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double volMax  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   if(volStep <= 0) return 0.0;
   double normalizedVolume = MathFloor(rawVolume / volStep) * volStep;
   
   if(normalizedVolume < volMin) normalizedVolume = volMin;
   if(normalizedVolume > volMax) normalizedVolume = volMax;
   
   return normalizedVolume;
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // 1. Guard estricto de nueva barra (Doc 17 Regla 16)
   datetime currentBarTime = iTime(_Symbol, _Period, 0);
   if(currentBarTime == lastBarTime) return;
   lastBarTime = currentBarTime;
   
   // 2. Comprobación de Hard Limits (Doc 05 §5)
   if(!CheckRiskLimits()) return;
   
   // 3. Comprobación de posición abierta (Máximo 1 operación activa)
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         return; // Ya hay posición activa
        }
     }
     
   // 4. Lectura de volatilidad ATR
   double atrBuffer[];
   ArraySetAsSeries(atrBuffer, true);
   if(CopyBuffer(atrHandle, 0, 1, 1, atrBuffer) <= 0) return;
   double currentAtr = atrBuffer[0];
   if(currentAtr <= 0) return;
   
   // 5. Señal de Trading y Ejecución con SL obligatorio
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   
   double slDistance = currentAtr * InpSlAtrMult;
   double tpDistance = currentAtr * InpTpAtrMult;
   double lotSize = CalculatePositionSize(slDistance / point);
   
   if(lotSize <= 0) return;
   
   if("${direction}" == "buy")
     {
      double sl = NormalizeDouble(ask - slDistance, _Digits);
      double tp = NormalizeDouble(ask + tpDistance, _Digits);
      
      // Stop Loss estrictamente obligatorio (Doc 17 Regla 2)
      if(sl < ask && tp > ask)
        {
         if(trade.Buy(lotSize, _Symbol, ask, sl, tp, "Strategy EA Buy"))
           {
            Print("[ORDER_SUCCESS] Compra ejecutada: ", lotSize, " lotes a ", ask, " SL: ", sl, " TP: ", tp);
           }
         else
           {
            Print("[ORDER_ERROR] Fallo al ejecutar compra: ", trade.ResultRetcodeDescription());
           }
        }
     }
   else if("${direction}" == "sell")
     {
      double sl = NormalizeDouble(bid + slDistance, _Digits);
      double tp = NormalizeDouble(bid - tpDistance, _Digits);
      
      // Stop Loss estrictamente obligatorio
      if(sl > bid && tp < bid)
        {
         if(trade.Sell(lotSize, _Symbol, bid, sl, tp, "Strategy EA Sell"))
           {
            Print("[ORDER_SUCCESS] Venta ejecutada: ", lotSize, " lotes a ", bid, " SL: ", sl, " TP: ", tp);
           }
         else
           {
            Print("[ORDER_ERROR] Fallo al ejecutar venta: ", trade.ResultRetcodeDescription());
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Trade transaction event handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   // Rastreo de transacciones reales para confirmación de fill
  }
`;

  return {
    code,
    filename,
    assumptionsToVerify: [
      'Disponibilidad de histórico de ticks reales en el broker',
      'Spread medio compatible con el timeframe seleccionado',
      'Apalancamiento de cuenta 1:100 o superior',
    ],
    compileStatus: 'unverified',
    compileErrors: [],
    compileWarnings: [],
    attempts: 1,
    iteration: 1,
  };
}

interface EaDraft {
  code: string;
  assumptionsToVerify: string[];
  fixSummary: string | null;
}

async function requestEa(model: string, systemPrompt: string, userPrompt: string): Promise<EaDraft> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const data = await chatCompletion(model, messages, DELIVER_EA_TOOL, { timeoutMs: MQL5_GEN_TIMEOUT_MS });
  const message = data?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];

  let args: any;
  if (toolCall?.function?.arguments) {
    args = JSON.parse(sanitizeJsonResponse(toolCall.function.arguments));
  } else if (typeof message?.content === 'string' && message.content.trim()) {
    args = JSON.parse(sanitizeJsonResponse(message.content));
  } else {
    throw new Error('El modelo no devolvió la llamada estructurada a deliver_ea');
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

async function runMql5Pipeline(
  strategy: StrategyProposalLite,
  systemPrompt: string,
  resolvedModel: string,
  filename: string,
  initialUserPrompt: string,
  startIteration: number,
  onProgress?: Mql5ProgressCallback
): Promise<Mql5GenerationResult> {
  onProgress?.({ attempt: 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'generating', details: 'Generando código MQL5 estructurado...' });
  let draft = await requestEa(resolvedModel, systemPrompt, initialUserPrompt);
  onProgress?.({ attempt: 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'compiling', details: 'Compilando en MetaEditor64...' });
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
    onProgress?.({ attempt: attempts + 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'generating', details: `Corrigiendo errores de compilación (${attempts + 1}/${MAX_COMPILE_ATTEMPTS})...` });
    draft = await requestEa(resolvedModel, systemPrompt, buildFixPrompt(draft.code, previousErrors));
    onProgress?.({ attempt: attempts + 1, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'compiling', details: `Recompilando en MetaEditor64 (${attempts + 1}/${MAX_COMPILE_ATTEMPTS})...` });
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

  // 1.6: CodeReviewerAgent que evalúa las 22 reglas del Doc 17
  let review: CodeReviewResult | undefined;
  if (compile.status === 'ok' || compile.status === 'unverified') {
    onProgress?.({ attempt: attempts, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'evaluating', details: 'Auditando cumplimiento de las 22 reglas del Doc 17...' });
    review = reviewMql5Code(draft.code, draft.assumptionsToVerify);
    if (!review.passed) {
      console.warn(`[CodeReviewer] Advertencia en reglas de código: ${review.summary}`);
    }
  }

  // 1.5: Pipeline de backtest automático headless + Quality Gate + Bucle de optimización
  let backtestSession = null;
  let optimizationNotes: string[] = [];
  let currentIteration = startIteration;
  let cyclesUsed = 0;
  const maxBacktestCycles = resolveMaxBacktestOptimizationCycles();

  if (compile.status === 'ok' || compile.status === 'unverified') {
    onProgress?.({ attempt: attempts, maxAttempts: MAX_COMPILE_ATTEMPTS, phase: 'backtesting', details: 'Ejecutando backtest headless en MetaTrader 5...' });
    let backtestRes = await runHeadlessBacktest(draft.code, filename, {
      pair: strategy.pair,
      timeframe: strategy.timeframe,
    });
    backtestSession = backtestRes.session;
    optimizationNotes = [...backtestRes.qualityNotes];

    // Bucle de optimización iterativa si el Quality Gate no pasó, o si el backtest reveló un
    // bug real y corregible en el código (crash en runtime) en vez de una simple estrategia
    // subóptima — en ambos casos hay una razón concreta que el modelo puede corregir.
    let retryReasons = backtestRes.qualityGateVerdict?.failedReasons ?? (backtestRes.retriableCodeIssue ? [backtestRes.retriableCodeIssue] : undefined);
    while (!backtestRes.passedQualityGate && cyclesUsed < maxBacktestCycles - 1 && retryReasons) {
      cyclesUsed++;
      currentIteration++;
      onProgress?.({
        attempt: 1,
        maxAttempts: MAX_COMPILE_ATTEMPTS,
        phase: 'optimizing',
        details: `Optimizando parámetros por Quality Gate (Iteración ${currentIteration})...`,
      });

      const optPrompt = buildOptimizationPrompt(strategy, draft.code, retryReasons, currentIteration);
      try {
        const optDraft = await requestEa(resolvedModel, systemPrompt, optPrompt);
        const optCompile = await compileMql5(optDraft.code, filename);
        if (optCompile.status !== 'errors') {
          draft = optDraft;
          compile = optCompile;
          backtestRes = await runHeadlessBacktest(draft.code, filename, {
            pair: strategy.pair,
            timeframe: strategy.timeframe,
          });
          backtestSession = backtestRes.session;
          optimizationNotes = [`Iteración #${currentIteration}:`, ...backtestRes.qualityNotes];
          retryReasons = backtestRes.qualityGateVerdict?.failedReasons ?? (backtestRes.retriableCodeIssue ? [backtestRes.retriableCodeIssue] : undefined);
        } else {
          break;
        }
      } catch (err) {
        console.warn(`[mql5Generator] Error en ciclo de optimización agéntica:`, err);
        break;
      }
    }

    if (!backtestRes.passedQualityGate && backtestSession) {
      optimizationNotes.push('Quality Gate: La estrategia no alcanzó todos los umbrales tras las iteraciones y ha sido marcada para revisión.');
    }
  }

  // 3.6: Trazabilidad y persistencia de artefactos
  await persistDeliverable(
    draft.code,
    {
      filename,
      timestamp: new Date().toISOString(),
      model: resolvedModel,
      pair: strategy.pair,
      timeframe: strategy.timeframe,
      attempts,
      compileStatus: compile.status,
      assumptions: draft.assumptionsToVerify,
      qualityGatePassed: backtestSession ? (optimizationNotes.some((n) => n.includes('[PASA]')) && !optimizationNotes.some((n) => n.includes('[FALLA]'))) : undefined,
    },
    compile.compiledEx5Buffer
  );

  return {
    code: draft.code,
    filename,
    assumptionsToVerify: draft.assumptionsToVerify,
    compileStatus: compile.status,
    compileErrors: compile.errors,
    compileWarnings: compile.warnings,
    attempts,
    iteration: currentIteration,
    backtestSession: backtestSession ?? undefined,
    optimizationNotes: optimizationNotes.length > 0 ? optimizationNotes : undefined,
  };
}

async function buildSystemPrompt(strategy: StrategyProposalLite): Promise<string> {
  const learnedIssues = await loadTopIssues(20);
  const learnedSection = renderIssuesForPrompt(learnedIssues);
  const wikiSection = await getWikiContextBlock(`${strategy.resumen}\n${strategy.indicadoresClave.join(', ')}`, {
    maxPages: 2,
  });
  return [MQL5_STANDARD_SYSTEM_PROMPT, learnedSection, wikiSection].filter(Boolean).join('\n\n');
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

  // 4.5: Se usa 'auto/best-coding' por diseño para generación de código MQL5
  const resolvedModel = model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-coding';
  const filename = buildFilename(strategy);
  const systemPrompt = await buildSystemPrompt(strategy);

  return runMql5Pipeline(strategy, systemPrompt, resolvedModel, filename, buildUserPrompt(strategy), 1, onProgress);
}

/**
 * A diferencia de generateMql5, parte de un código e informe de backtest YA existentes: recalcula
 * los motivos de fallo del Quality Gate sobre `previousBacktest` y pide al modelo que corrija
 * específicamente eso, en vez de regenerar el EA desde cero e ignorar lo ya probado.
 */
export async function optimizeMql5(
  strategy: StrategyProposalLite,
  previousCode: string,
  previousBacktest: Mt5LogSession | null,
  iteration: number,
  model?: string,
  onProgress?: Mql5ProgressCallback,
  previousNotes?: string[]
): Promise<Mql5GenerationResult> {
  const useReal = Boolean(process.env.OMNIROUTE_API_KEY && process.env.OMNIROUTE_BASE_URL);
  if (!useReal) {
    return buildMockResult(strategy);
  }

  const resolvedModel = model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-coding';
  const filename = buildFilename(strategy);
  const systemPrompt = await buildSystemPrompt(strategy);

  // El backtest previo puede no haber producido stats (crasheó en runtime, símbolo inexistente,
  // timeout) — en ese caso `previousNotes` (las qualityNotes/optimizationNotes ya mostradas al
  // usuario en el intento anterior) suele contener el diagnóstico concreto y corregible (ver
  // findRuntimeCrashError/findTesterStartupError en mql5Backtester.ts); usarlas es mejor que caer
  // directo al mensaje genérico de "sin operaciones".
  const failedReasons = previousBacktest?.stats ? evaluateQualityGate(previousBacktest.stats).failedReasons : [];
  const reasons = failedReasons.length > 0
    ? failedReasons
    : previousNotes && previousNotes.length > 0
      ? previousNotes
      : ['No se pudo verificar un backtest previo con operaciones cerradas — revisa que la lógica de entrada genere señales suficientes y que los filtros no sean demasiado restrictivos.'];

  const optPrompt = buildOptimizationPrompt(strategy, previousCode, reasons, iteration);
  return runMql5Pipeline(strategy, systemPrompt, resolvedModel, filename, optPrompt, iteration, onProgress);
}

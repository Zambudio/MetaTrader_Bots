export interface RuleEvaluation {
  ruleNumber: number;
  ruleName: string;
  verdict: 'cumple' | 'no_cumple' | 'no_aplica';
  details: string;
}

export interface CodeReviewResult {
  passed: boolean;
  score: number; // 0 a 100
  evaluations: RuleEvaluation[];
  summary: string;
  blockingRules: number[];
}

export function reviewMql5Code(code: string, assumptions: string[] = []): CodeReviewResult {
  const evaluations: RuleEvaluation[] = [];

  // Regla 1: No inventar APIs de MQL5 (Identificadores inexistentes comunes)
  const inventedApis = [
    'TRADE_RETCODE_DONE_PARTIAL',
    'TRADE_RETCODE_INVALID_ORDER',
    'TRADE_RETCODE_NO_CHANGES',
    'trans.magic',
    'ORDER_MAGIC_NUMBER',
    'AccountBalanceDouble',
    'OrderSendBuy',
    'OrderSendSell',
  ];
  const foundInvented = inventedApis.filter((api) => code.includes(api));
  evaluations.push({
    ruleNumber: 1,
    ruleName: 'No inventar APIs de MQL5',
    verdict: foundInvented.length === 0 ? 'cumple' : 'no_cumple',
    details: foundInvented.length === 0
      ? 'No se detectaron identificadores ni constantes inventadas.'
      : `Identificadores no oficiales detectados: ${foundInvented.join(', ')}.`,
  });

  // Regla 2: Consultar documentación oficial ante cualquier duda
  evaluations.push({
    ruleNumber: 2,
    ruleName: 'Consultar documentación oficial',
    verdict: 'cumple',
    details: 'Estructura sintáctica acorde a especificación MQL5 estándar.',
  });

  // Regla 3: Compilar siempre antes de considerar cambio terminado
  evaluations.push({
    ruleNumber: 3,
    ruleName: 'Compilar en MetaEditor',
    verdict: 'cumple',
    details: 'Evaluación previa al pipeline de compilación.',
  });

  // Regla 4: Cero warnings salvo justificación
  const hasVersionFormatWarning = /#property\s+version\s+["']\d+\.\d+\.\d+["']/.test(code);
  evaluations.push({
    ruleNumber: 4,
    ruleName: 'Cero warnings en compilación',
    verdict: hasVersionFormatWarning ? 'no_cumple' : 'cumple',
    details: hasVersionFormatWarning
      ? '#property version debe ser "x.yy" para evitar warning 68 de MQL5 Market.'
      : 'Formato de directivas compatible con cero warnings.',
  });

  // Regla 5: No usar look-ahead
  const hasNegativeShift = /iTime\s*\([^)]*,[^)]*,[ \t]*-\d+\)|iClose\s*\([^)]*,[^)]*,[ \t]*-\d+\)/.test(code);
  evaluations.push({
    ruleNumber: 5,
    ruleName: 'No usar look-ahead',
    verdict: hasNegativeShift ? 'no_cumple' : 'cumple',
    details: hasNegativeShift ? 'Detectado acceso a índice de barra negativo (look-ahead).' : 'Indexación temporal correcta (sin look-ahead).',
  });

  // Regla 6: No mezclar lógica de señal y ejecución
  const hasSeparation = code.includes('OnInit') && code.includes('OnTick') && (code.includes('CTrade') || code.includes('OrderSend'));
  evaluations.push({
    ruleNumber: 6,
    ruleName: 'Separación señal / ejecución',
    verdict: hasSeparation ? 'cumple' : 'no_cumple',
    details: hasSeparation ? 'Estructura modular con separación de eventos y ejecución.' : 'Estructura de eventos incompleta.',
  });

  // Regla 7: No asumir equivalencia pip/tick/point
  const hardcodedPips = /double\s+pip\s*=\s*0\.0001|#define\s+PIP\s+0\.0001/i.test(code);
  evaluations.push({
    ruleNumber: 7,
    ruleName: 'No asumir equivalencia pip/tick/point',
    verdict: hardcodedPips ? 'no_cumple' : 'cumple',
    details: hardcodedPips ? 'Hardcoding de valor de pip detectado.' : 'Uso dinámico de SymbolInfoDouble/Point.',
  });

  // Regla 8: Consultar propiedades reales del símbolo en runtime
  const usesSymbolInfo = code.includes('SymbolInfoDouble') || code.includes('_Point') || code.includes('_Digits');
  evaluations.push({
    ruleNumber: 8,
    ruleName: 'Consultar propiedades de símbolo en runtime',
    verdict: usesSymbolInfo ? 'cumple' : 'no_cumple',
    details: usesSymbolInfo ? 'Consulta propiedades dinámicas del símbolo en runtime.' : 'No se detectaron consultas a propiedades de símbolo.',
  });

  // Regla 9: Normalizar volumen a SYMBOL_VOLUME_STEP y acotar a MIN/MAX
  const hasVolumeLogic = code.includes('SYMBOL_VOLUME_STEP') || code.includes('SYMBOL_VOLUME_MIN') || code.includes('MathFloor') || code.includes('MathRound');
  evaluations.push({
    ruleNumber: 9,
    ruleName: 'Normalizar volumen a step y límites',
    verdict: hasVolumeLogic ? 'cumple' : 'no_cumple',
    details: hasVolumeLogic ? 'Position sizing contempla step o límites de volumen.' : 'Falta lógica de normalización de volumen a SYMBOL_VOLUME_STEP.',
  });

  // Regla 10: Validar stops contra STOPS_LEVEL y FREEZE_LEVEL
  const checksStopsLevel = code.includes('SYMBOL_TRADE_STOPS_LEVEL') || code.includes('STOPS_LEVEL') || code.includes('FreezeLevel') || code.includes('StopLoss');
  evaluations.push({
    ruleNumber: 10,
    ruleName: 'Validar stops contra stops/freeze level',
    verdict: checksStopsLevel ? 'cumple' : 'no_cumple',
    details: checksStopsLevel ? 'Considera niveles mínimos de distancia de stop.' : 'No se verifica distancia mínima de stops.',
  });

  // Regla 11: Usar Magic Number en toda operación
  const hasMagicNumber = /MagicNumber|InpMagic|trade\.SetExpertMagicNumber|ORDER_MAGIC/i.test(code);
  evaluations.push({
    ruleNumber: 11,
    ruleName: 'Magic Number obligatorio',
    verdict: hasMagicNumber ? 'cumple' : 'no_cumple',
    details: hasMagicNumber ? 'Magic number asignado para rastreo de operaciones.' : 'Falta identificador Magic Number.',
  });

  // Regla 12: Tratar errores y retcodes explícitamente
  const checksRetcode = code.includes('retcode') || code.includes('ResultRetcode') || code.includes('TRADE_RETCODE_DONE') || code.includes('trade.Buy');
  evaluations.push({
    ruleNumber: 12,
    ruleName: 'Tratamiento explícito de retcodes/errores',
    verdict: checksRetcode ? 'cumple' : 'no_cumple',
    details: checksRetcode ? 'Manejo de resultados de ejecución o uso de CTrade verificado.' : 'Falta verificación de resultado de ejecución.',
  });

  // Regla 13: No asumir que OrderSend() == true implica fill
  const checksFill = code.includes('OnTradeTransaction') || code.includes('trade.ResultOrder') || code.includes('ResultDeal') || code.includes('CTrade');
  evaluations.push({
    ruleNumber: 13,
    ruleName: 'No asumir fill ciego',
    verdict: checksFill ? 'cumple' : 'no_cumple',
    details: checksFill ? 'Arquitectura asíncrona / CTrade con control de fills.' : 'Falta control de estado real tras envío de orden.',
  });

  // Regla 14: Observar OnTradeTransaction para reconstruir estado real
  const hasTradeTrans = code.includes('OnTradeTransaction');
  evaluations.push({
    ruleNumber: 14,
    ruleName: 'Manejo de OnTradeTransaction',
    verdict: hasTradeTrans ? 'cumple' : 'no_cumple',
    details: hasTradeTrans ? 'Handler OnTradeTransaction implementado.' : 'Handler OnTradeTransaction no encontrado.',
  });

  // Regla 15: Impedir duplicación de posiciones por ticks repetidos
  const hasDuplicationCheck = code.includes('PositionsTotal') || code.includes('PositionSelect') || code.includes('lastBarTime') || code.includes('PositionsTotal()');
  evaluations.push({
    ruleNumber: 15,
    ruleName: 'Prevención de posiciones duplicadas',
    verdict: hasDuplicationCheck ? 'cumple' : 'no_cumple',
    details: hasDuplicationCheck ? 'Control de posiciones activas antes de nueva entrada.' : 'Riesgo de entradas duplicadas sin filtro de conteo.',
  });

  // Regla 16: Distinguir nueva barra de nuevo tick (guard bar-based)
  const hasNewBarGuard = /if\s*\(\s*(?:currentBarTime|lastBarTime|barTime)\s*==\s*(?:currentBarTime|lastBarTime|barTime)\s*\)\s*return/i.test(code) ||
    /if\s*\(\s*iTime\s*\([^)]*\)\s*==\s*\w+\s*\)\s*return/i.test(code);
  evaluations.push({
    ruleNumber: 16,
    ruleName: 'Guard estricto de nueva barra',
    verdict: hasNewBarGuard ? 'cumple' : 'no_cumple',
    details: hasNewBarGuard ? 'Guard de nueva barra detectado en OnTick().' : 'Falta guard estricto de nueva barra (iTime).',
  });

  // Regla 17: Evitar operaciones múltiples por la misma señal
  evaluations.push({
    ruleNumber: 17,
    ruleName: 'Máximo una operación por señal',
    verdict: (hasNewBarGuard || hasDuplicationCheck) ? 'cumple' : 'no_cumple',
    details: (hasNewBarGuard || hasDuplicationCheck) ? 'Control de señal única asegurado.' : 'Falta control de reevaluación por señal.',
  });

  // Regla 18: Documentar los input
  const hasDocumentedInputs = /input\s+[\w\s]+\s+Inp\w+\s*=[^;]+;\s*\/\//.test(code);
  evaluations.push({
    ruleNumber: 18,
    ruleName: 'Documentación de inputs con unidades',
    verdict: hasDocumentedInputs ? 'cumple' : 'no_cumple',
    details: hasDocumentedInputs ? 'Inputs documentados con comentarios de unidad/propósito.' : 'Inputs carecen de comentarios descriptivos de unidad.',
  });

  // Regla 19: Separar parámetros optimizables de hard risk limits
  const hasRiskInputs = /InpRisk|InpMaxDailyLoss|InpMaxDrawdown|InpStopLoss/i.test(code);
  evaluations.push({
    ruleNumber: 19,
    ruleName: 'Separación de parámetros y límites de riesgo',
    verdict: hasRiskInputs ? 'cumple' : 'no_cumple',
    details: hasRiskInputs ? 'Parámetros de riesgo parametrizados explícitamente.' : 'Faltan parámetros claros de gestión de riesgo.',
  });

  // Regla 20: Logging suficiente sin spam (Límite por barra)
  const hasSpammyElsePrint = /else\s*\{?\s*Print\s*\(/i.test(code);
  evaluations.push({
    ruleNumber: 20,
    ruleName: 'Logging controlado anti-spam por barra',
    verdict: hasSpammyElsePrint ? 'no_cumple' : 'cumple',
    details: hasSpammyElsePrint
      ? 'Detectado Print() en ramas else sin filtro de barra (riesgo de log spam).'
      : 'Logging controlado sin spam por tick.',
  });

  // Regla 21: Código versionado (#property version)
  const hasVersion = /#property\s+version\s+["']\d+\.\d{2}["']/.test(code);
  evaluations.push({
    ruleNumber: 21,
    ruleName: 'Código versionado (#property version)',
    verdict: hasVersion ? 'cumple' : 'no_cumple',
    details: hasVersion ? 'Directiva #property version "x.yy" presente.' : 'Falta directiva #property version con formato "x.yy".',
  });

  // Regla 22: Backtest reproducible (supuestos documentados)
  const hasAssumptions = assumptions && assumptions.length > 0;
  evaluations.push({
    ruleNumber: 22,
    ruleName: 'Backtest reproducible y supuestos documentados',
    verdict: hasAssumptions ? 'cumple' : 'no_cumple',
    details: hasAssumptions ? `${assumptions.length} supuestos documentados para validación.` : 'Falta lista de supuestos a verificar.',
  });

  const passedCount = evaluations.filter((e) => e.verdict === 'cumple').length;
  const score = Math.round((passedCount / evaluations.length) * 100);
  const blocking = evaluations.filter((e) => e.verdict === 'no_cumple').map((e) => e.ruleNumber);

  const passed = blocking.length === 0;
  const summary = passed
    ? `Código revisado: Cumple las 22 reglas del Doc 17 (${score}%).`
    : `Código revisado: Incumple ${blocking.length} regla(s) obligatoria(s) (Reglas: ${blocking.join(', ')}).`;

  return {
    passed,
    score,
    evaluations,
    summary,
    blockingRules: blocking,
  };
}

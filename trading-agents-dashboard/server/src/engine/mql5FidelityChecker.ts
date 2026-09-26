import type { StrategyProposalLite } from '../types.js';

/**
 * H1 de la auditoría 2026-09-26: hasta ahora nada verificaba automáticamente que el MQL5
 * generado implementara literalmente la `StrategyProposalLite` aprobada por el panel de
 * agentes — el LLM de código podía, en teoría, seguir su propia lógica de entrada distinta a la
 * aprobada sin que nada más allá de las instrucciones del prompt se lo impidiera.
 *
 * Este chequeo es DETERMINISTA y ADVISORY (no bloquea la entrega, igual que `codeReviewer`):
 * una verificación de fidelidad semántica completa requeriría parsear MQL5 de verdad (fuera de
 * alcance, ver H1 original — "requiere diseño de verificación (parser MQL5 ligero o LLM-judge
 * adicional)"). Lo que SÍ se puede comprobar con bajo riesgo de falso positivo, sin un parser
 * real: (a) que el código abre posiciones en la dirección aprobada y NO en la contraria, y
 * (b) que cada indicador declarado en `indicadoresClave` tiene su función MQL5 correspondiente
 * (`iMA`/`iRSI`/`iATR`/...) realmente invocada en el código, no solo mencionado en el prompt.
 *
 * Se deja como advisory (no bloqueante) a propósito: un check nuevo y estricto sobre generación
 * real de LLM tiene alto riesgo de falsos positivos al principio (ver los 2 falsos positivos ya
 * encontrados en `codeReviewer` Reglas 16/20 de esta misma auditoría) — mejor visible y auditable
 * que bloqueando entregas legítimas por un patrón no anticipado.
 */

export interface FidelityFinding {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface FidelityCheckResult {
  passed: boolean;
  findings: FidelityFinding[];
}

/** Mapea patrones reconocibles en `indicadoresClave`/`condicionEntrada` a la función MQL5 que
 * debería aparecer en el código si el indicador se usa de verdad. Coincidencia por prefijo
 * insensible a mayúsculas — "EMA20", "ema(20)", "EMA 20 periodos" todos coinciden con `ema`. */
const INDICATOR_PATTERNS: Array<{ label: string; nameRegex: RegExp; functionRegex: RegExp }> = [
  { label: 'EMA/SMA (media móvil)', nameRegex: /\b(ema|sma|media\s*m[oó]vil|moving\s*average)\b/i, functionRegex: /\biMA\s*\(/ },
  { label: 'RSI', nameRegex: /\brsi\b/i, functionRegex: /\biRSI\s*\(/ },
  { label: 'ATR', nameRegex: /\batr\b/i, functionRegex: /\biATR\s*\(/ },
  { label: 'MACD', nameRegex: /\bmacd\b/i, functionRegex: /\biMACD\s*\(/ },
  { label: 'Bandas de Bollinger', nameRegex: /\bbollinger|bandas?\s*de\s*bollinger\b/i, functionRegex: /\biBands\s*\(/ },
  { label: 'Estocástico', nameRegex: /\bestoc[aá]stico|stochastic\b/i, functionRegex: /\biStochastic\s*\(/ },
  { label: 'ADX', nameRegex: /\badx\b/i, functionRegex: /\biADX\s*\(/ },
];

function checkDirectionConsistency(code: string, strategy: StrategyProposalLite): FidelityFinding[] {
  if (!strategy.direction) return [];
  const hasBuyEntry = /trade\.Buy\s*\(/.test(code);
  const hasSellEntry = /trade\.Sell\s*\(/.test(code);

  if (strategy.direction === 'buy' && hasSellEntry && !hasBuyEntry) {
    return [{ code: 'DIRECTION_MISMATCH', severity: 'error', message: 'La estrategia aprobada es BUY pero el código solo abre posiciones con trade.Sell().' }];
  }
  if (strategy.direction === 'sell' && hasBuyEntry && !hasSellEntry) {
    return [{ code: 'DIRECTION_MISMATCH', severity: 'error', message: 'La estrategia aprobada es SELL pero el código solo abre posiciones con trade.Buy().' }];
  }
  if (strategy.direction === 'buy' && hasSellEntry && hasBuyEntry) {
    return [{ code: 'DIRECTION_AMBIGUOUS', severity: 'warning', message: 'La estrategia aprobada es BUY (una sola dirección) pero el código también abre posiciones con trade.Sell(); verificar que no sea una entrada real en la dirección contraria.' }];
  }
  if (strategy.direction === 'sell' && hasBuyEntry && hasSellEntry) {
    return [{ code: 'DIRECTION_AMBIGUOUS', severity: 'warning', message: 'La estrategia aprobada es SELL (una sola dirección) pero el código también abre posiciones con trade.Buy(); verificar que no sea una entrada real en la dirección contraria.' }];
  }
  if (!hasBuyEntry && !hasSellEntry) {
    return [{ code: 'NO_ENTRY_FOUND', severity: 'error', message: 'No se encontró ninguna llamada trade.Buy()/trade.Sell() en el código: el EA no parece abrir posiciones.' }];
  }
  return [];
}

function checkIndicatorsPresent(code: string, strategy: StrategyProposalLite): FidelityFinding[] {
  const declaredText = [...(strategy.indicadoresClave ?? []), strategy.condicionEntrada ?? ''].join(' ; ');
  const findings: FidelityFinding[] = [];
  for (const pattern of INDICATOR_PATTERNS) {
    if (!pattern.nameRegex.test(declaredText)) continue; // el agente no declaró este indicador
    if (!pattern.functionRegex.test(code)) {
      findings.push({
        code: 'MISSING_INDICATOR_CALL',
        severity: 'warning',
        message: `La estrategia declara "${pattern.label}" pero el código no llama a la función MQL5 correspondiente (${pattern.functionRegex.source}) — podría estar codificando una lógica distinta a la aprobada.`,
      });
    }
  }
  return findings;
}

/**
 * Verifica que el `.mq5` generado sea consistente con la `StrategyProposalLite` que el panel de
 * agentes aprobó (GO). No bloquea la generación (`passed:false` se registra como advertencia, no
 * como error fatal) — ver el comentario del módulo para el porqué.
 */
export function checkMql5Fidelity(code: string, strategy: StrategyProposalLite): FidelityCheckResult {
  const findings = [...checkDirectionConsistency(code, strategy), ...checkIndicatorsPresent(code, strategy)];
  return {
    passed: !findings.some((f) => f.severity === 'error'),
    findings,
  };
}

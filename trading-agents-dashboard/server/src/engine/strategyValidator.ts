import type { StrategyProposalLite } from '../types.js';

export interface StrategyValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    direction: 'buy' | 'sell';
    entryPriceNum: number;
    stopLossNum: number;
    takeProfitNum: number;
    rrRatio: number;
  };
}

export function parsePriceFromText(val: string | number | undefined): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  if (!val || typeof val !== 'string') return null;
  const match = val.replace(/,/g, '').match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function validateStrategyProposal(
  proposal: StrategyProposalLite,
  options: { minRrRatio?: number; requireNonEmptyFields?: boolean } = {}
): StrategyValidationResult {
  const minRr = options.minRrRatio ?? 1.49;
  const requireNonEmpty = options.requireNonEmptyFields ?? true;

  // 2.5: Validar campos no vacíos
  if (requireNonEmpty) {
    if (!proposal.resumen || !proposal.resumen.trim()) {
      return { valid: false, error: 'El campo "resumen" de la estrategia no puede estar vacío.' };
    }
    if (!proposal.condicionEntrada || !String(proposal.condicionEntrada).trim()) {
      return {
        valid: false,
        error:
          'El campo "condicionEntrada" no puede estar vacío: describe la regla mecánica y repetible (relación entre indicadores/precio) que dispara la entrada, no un nivel de precio anecdótico.',
      };
    }
    if (!proposal.puntoEntrada || !String(proposal.puntoEntrada).trim()) {
      return { valid: false, error: 'El campo "puntoEntrada" no puede estar vacío.' };
    }
    if (!proposal.stopLoss || !String(proposal.stopLoss).trim()) {
      return { valid: false, error: 'El campo "stopLoss" no puede estar vacío.' };
    }
    if (!proposal.takeProfit || !String(proposal.takeProfit).trim()) {
      return { valid: false, error: 'El campo "takeProfit" no puede estar vacío.' };
    }
  }

  // 1.1: Validación de coherencia numérica
  let direction: 'buy' | 'sell' | undefined = proposal.direction;
  let entryNum = proposal.entryPriceNum ?? parsePriceFromText(proposal.puntoEntrada);
  let slNum = proposal.stopLossNum ?? parsePriceFromText(proposal.stopLoss);
  let tpNum = proposal.takeProfitNum ?? parsePriceFromText(proposal.takeProfit);

  if (entryNum === null || !Number.isFinite(entryNum) || entryNum <= 0) {
    return { valid: false, error: `Punto de entrada numérico inválido o no detectable: "${proposal.puntoEntrada}"` };
  }
  if (slNum === null || !Number.isFinite(slNum) || slNum <= 0) {
    return { valid: false, error: `Stop Loss numérico inválido o no detectable: "${proposal.stopLoss}"` };
  }
  if (tpNum === null || !Number.isFinite(tpNum) || tpNum <= 0) {
    return { valid: false, error: `Take Profit numérico inválido o no detectable: "${proposal.takeProfit}"` };
  }

  // Si no se proporcionó direction explícita, deducirla del orden de precios
  if (!direction) {
    if (tpNum > entryNum && entryNum > slNum) {
      direction = 'buy';
    } else if (tpNum < entryNum && entryNum < slNum) {
      direction = 'sell';
    } else {
      return {
        valid: false,
        error: `Incoherencia numérica de precios: Entrada=${entryNum}, SL=${slNum}, TP=${tpNum}. No se puede determinar una dirección válida (buy requiere TP > Entrada > SL; sell requiere TP < Entrada < SL).`,
      };
    }
  }

  if (direction === 'buy') {
    if (slNum >= entryNum) {
      return {
        valid: false,
        error: `Incoherencia en COMPRA: Stop Loss (${slNum}) debe ser estrictamente menor que el precio de entrada (${entryNum}).`,
      };
    }
    if (tpNum <= entryNum) {
      return {
        valid: false,
        error: `Incoherencia en COMPRA: Take Profit (${tpNum}) debe ser estrictamente mayor que el precio de entrada (${entryNum}).`,
      };
    }
  } else if (direction === 'sell') {
    if (slNum <= entryNum) {
      return {
        valid: false,
        error: `Incoherencia en VENTA: Stop Loss (${slNum}) debe ser estrictamente mayor que el precio de entrada (${entryNum}).`,
      };
    }
    if (tpNum >= entryNum) {
      return {
        valid: false,
        error: `Incoherencia en VENTA: Take Profit (${tpNum}) debe ser estrictamente menor que el precio de entrada (${entryNum}).`,
      };
    }
  } else {
    return { valid: false, error: `Dirección no soportada: "${String(direction)}"` };
  }

  const riskDist = Math.abs(entryNum - slNum);
  const rewardDist = Math.abs(tpNum - entryNum);

  if (riskDist <= 0) {
    return { valid: false, error: 'La distancia de Stop Loss debe ser mayor a 0.' };
  }

  const rrRatio = rewardDist / riskDist;
  if (rrRatio < minRr) {
    return {
      valid: false,
      error: `Relación Riesgo/Recompensa insuficiente: R:R = 1:${rrRatio.toFixed(2)} (requerido mínimo 1:${minRr.toFixed(2)}). Riesgo: ${riskDist.toFixed(5)}, Recompensa: ${rewardDist.toFixed(5)}.`,
    };
  }

  return {
    valid: true,
    normalized: {
      direction,
      entryPriceNum: entryNum,
      stopLossNum: slNum,
      takeProfitNum: tpNum,
      rrRatio,
    },
  };
}

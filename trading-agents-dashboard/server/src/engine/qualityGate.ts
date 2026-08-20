import type { Mt5LogStats } from './mt5LogParser.js';

export interface QualityGateCriterion {
  id: string;
  name: string;
  target: string;
  actual: string;
  passed: boolean;
  critical: boolean;
}

export interface QualityGateVerdict {
  passed: boolean;
  score: number; // 0 a 100
  criteria: QualityGateCriterion[];
  failedReasons: string[];
  recommendedAction?: 'approve' | 'adjust_atr_sl_tp' | 'add_adx_filter' | 'add_breakeven' | 'discard';
}

export const QUALITY_GATE_THRESHOLDS = {
  minClosedTrades: 15,
  maxRejectedOrders: 0,
  minExpectancyR: 0.10,
  minProfitFactor: 1.20,
  minNetProfitUSD: 0.01,
  maxDrawdownPct: 15.0,
};

export function evaluateQualityGate(stats: Mt5LogStats): QualityGateVerdict {
  const criteria: QualityGateCriterion[] = [];
  const failedReasons: string[] = [];

  // 1. Mínimo de operaciones cerradas (>= 15)
  const tradesPassed = stats.closedTrades >= QUALITY_GATE_THRESHOLDS.minClosedTrades;
  criteria.push({
    id: 'min_trades',
    name: 'Muestra estadística mínima',
    target: `>= ${QUALITY_GATE_THRESHOLDS.minClosedTrades} trades`,
    actual: `${stats.closedTrades} trades`,
    passed: tradesPassed,
    critical: true,
  });
  if (!tradesPassed) {
    failedReasons.push(`Muestra insuficiente (${stats.closedTrades}/${QUALITY_GATE_THRESHOLDS.minClosedTrades} trades).`);
  }

  // 2. Cero órdenes rechazadas
  const rejectedPassed = (stats.rejectedOrdersCount ?? 0) <= QUALITY_GATE_THRESHOLDS.maxRejectedOrders;
  criteria.push({
    id: 'zero_rejections',
    name: 'Cero órdenes rechazadas (ejecución limpia)',
    target: `0 rechazadas`,
    actual: `${stats.rejectedOrdersCount ?? 0} rechazadas`,
    passed: rejectedPassed,
    critical: true,
  });
  if (!rejectedPassed) {
    failedReasons.push(`Se detectaron ${stats.rejectedOrdersCount} órdenes rechazadas por el broker/servidor.`);
  }

  // 3. Esperanza matemática positiva (> 0.10 R)
  const expectancyPassed = stats.expectancyR !== null && stats.expectancyR > QUALITY_GATE_THRESHOLDS.minExpectancyR;
  criteria.push({
    id: 'expectancy_r',
    name: 'Esperanza matemática (Edge)',
    target: `> ${QUALITY_GATE_THRESHOLDS.minExpectancyR.toFixed(2)} R`,
    actual: stats.expectancyR !== null ? `${stats.expectancyR.toFixed(2)} R` : 'N/A',
    passed: expectancyPassed,
    critical: true,
  });
  if (!expectancyPassed) {
    failedReasons.push(`Esperanza matemática insuficiente (${stats.expectancyR?.toFixed(2) ?? 'N/A'} R vs > 0.10 R).`);
  }

  // 4. Profit Factor (>= 1.20)
  const pf = stats.profitFactorApprox;
  const pfPassed = pf !== null && pf >= QUALITY_GATE_THRESHOLDS.minProfitFactor;
  criteria.push({
    id: 'profit_factor',
    name: 'Profit Factor',
    target: `>= ${QUALITY_GATE_THRESHOLDS.minProfitFactor.toFixed(2)}`,
    actual: pf !== null ? pf.toFixed(2) : 'N/A',
    passed: pfPassed,
    critical: true,
  });
  if (!pfPassed) {
    failedReasons.push(`Profit factor insuficiente (${pf?.toFixed(2) ?? 'N/A'} vs >= 1.20).`);
  }

  // 5. Beneficio neto positivo (> 0 USD)
  const netProfit = stats.netProfit;
  const profitPassed = netProfit !== null && netProfit > 0;
  criteria.push({
    id: 'net_profit',
    name: 'Beneficio neto',
    target: `> 0.00 USD`,
    actual: netProfit !== null ? `${netProfit.toFixed(2)} USD` : 'N/A',
    passed: profitPassed,
    critical: true,
  });
  if (!profitPassed) {
    failedReasons.push(`Beneficio neto no positivo (${netProfit?.toFixed(2) ?? 'N/A'} USD).`);
  }

  // 6. Drawdown máximo (<= 15%)
  const dd = stats.maxDrawdownPct;
  const ddPassed = dd !== null && dd <= QUALITY_GATE_THRESHOLDS.maxDrawdownPct;
  criteria.push({
    id: 'max_drawdown',
    name: 'Drawdown máximo controlado',
    target: `<= ${QUALITY_GATE_THRESHOLDS.maxDrawdownPct.toFixed(1)}%`,
    actual: dd !== null ? `${dd.toFixed(1)}%` : 'N/A',
    passed: ddPassed,
    critical: true,
  });
  if (!ddPassed) {
    failedReasons.push(`Drawdown excesivo (${dd?.toFixed(1) ?? 'N/A'}% vs <= 15.0%).`);
  }

  const passedCount = criteria.filter((c) => c.passed).length;
  const score = Math.round((passedCount / criteria.length) * 100);
  const allPassed = criteria.every((c) => c.passed);

  // Diagnóstico de acción recomendada (doc 20 §5)
  let recommendedAction: QualityGateVerdict['recommendedAction'] = 'approve';
  if (!allPassed) {
    if (!tradesPassed) {
      recommendedAction = 'adjust_atr_sl_tp';
    } else if (!ddPassed || (pf !== null && pf < 1.0)) {
      recommendedAction = 'add_adx_filter';
    } else if (!expectancyPassed) {
      recommendedAction = 'add_breakeven';
    } else {
      recommendedAction = 'adjust_atr_sl_tp';
    }
  }

  return {
    passed: allPassed,
    score,
    criteria,
    failedReasons,
    recommendedAction,
  };
}

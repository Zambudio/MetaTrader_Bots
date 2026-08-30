import { describe, it, expect } from 'vitest';
import { validateStrategyProposal } from '../src/engine/strategyValidator.js';
import type { StrategyProposalLite } from '../src/types.js';

describe('1.1 Validación determinista de coherencia numérica de la estrategia', () => {
  it('Caso 1: Acepta COMPRA válida con TP > Entrada > SL y R:R >= 1.5', () => {
    const validBuy: StrategyProposalLite = {
      pair: 'EURUSD',
      timeframe: 'H1',
      resumen: 'Entrada en soporte con confirmación alcista',
      indicadoresClave: ['EMA 50', 'RSI 45'],
      condicionEntrada: 'Cierre cruza por encima de EMA20',
      direction: 'buy',
      puntoEntrada: '1.08500',
      stopLoss: '1.08200', // Riesgo = 30 pips
      takeProfit: '1.09100', // Recompensa = 60 pips (R:R = 2.0)
      entryPriceNum: 1.0850,
      stopLossNum: 1.0820,
      takeProfitNum: 1.0910,
    };

    const res = validateStrategyProposal(validBuy);
    expect(res.valid).toBe(true);
    expect(res.normalized?.direction).toBe('buy');
    expect(res.normalized?.rrRatio).toBeCloseTo(2.0);
  });

  it('Caso 2: Rechaza COMPRA con stops invertidos (SL >= Entrada o TP <= Entrada)', () => {
    const invalidBuy: StrategyProposalLite = {
      pair: 'EURUSD',
      timeframe: 'H1',
      resumen: 'Estrategia con stops rotos alucinados por LLM',
      indicadoresClave: ['RSI'],
      condicionEntrada: 'Cierre cruza por encima de EMA20',
      direction: 'buy',
      puntoEntrada: '1.08500',
      stopLoss: '1.08900', // Error: SL por encima de entrada en compra
      takeProfit: '1.08000', // Error: TP por debajo de entrada en compra
      entryPriceNum: 1.0850,
      stopLossNum: 1.0890,
      takeProfitNum: 1.0800,
    };

    const res = validateStrategyProposal(invalidBuy);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Incoherencia en COMPRA/i);
  });

  it('Caso 3: Acepta VENTA válida con TP < Entrada < SL y R:R >= 1.5', () => {
    const validSell: StrategyProposalLite = {
      pair: 'GBPUSD',
      timeframe: 'H4',
      resumen: 'Rechazo en resistencia clave con divergencia bajista',
      indicadoresClave: ['MACD', 'Nivel semanal'],
      condicionEntrada: 'Cierre cruza por debajo de EMA20',
      direction: 'sell',
      puntoEntrada: '1.27000',
      stopLoss: '1.27400', // Riesgo = 40 pips
      takeProfit: '1.26200', // Recompensa = 80 pips (R:R = 2.0)
      entryPriceNum: 1.2700,
      stopLossNum: 1.2740,
      takeProfitNum: 1.2620,
    };

    const res = validateStrategyProposal(validSell);
    expect(res.valid).toBe(true);
    expect(res.normalized?.direction).toBe('sell');
    expect(res.normalized?.rrRatio).toBeCloseTo(2.0);
  });

  it('Caso 4: Rechaza VENTA con stops invertidos (SL <= Entrada o TP >= Entrada)', () => {
    const invalidSell: StrategyProposalLite = {
      pair: 'GBPUSD',
      timeframe: 'H4',
      resumen: 'Venta con stops invertidos',
      indicadoresClave: ['MACD'],
      condicionEntrada: 'Cierre cruza por debajo de EMA20',
      direction: 'sell',
      puntoEntrada: '1.27000',
      stopLoss: '1.26500', // Error: SL por debajo de entrada en venta
      takeProfit: '1.27800', // Error: TP por encima de entrada en venta
      entryPriceNum: 1.2700,
      stopLossNum: 1.2650,
      takeProfitNum: 1.2780,
    };

    const res = validateStrategyProposal(invalidSell);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Incoherencia en VENTA/i);
  });

  it('Caso adicional: Rechaza si el R:R es menor a 1:1.5', () => {
    const poorRr: StrategyProposalLite = {
      pair: 'EURUSD',
      timeframe: 'H1',
      resumen: 'Operación con mal R:R',
      indicadoresClave: ['RSI'],
      condicionEntrada: 'Cierre cruza por encima de EMA20',
      direction: 'buy',
      puntoEntrada: '1.08500',
      stopLoss: '1.08000', // Riesgo = 50 pips
      takeProfit: '1.08700', // Recompensa = 20 pips (R:R = 0.4)
      entryPriceNum: 1.0850,
      stopLossNum: 1.0800,
      takeProfitNum: 1.0870,
    };

    const res = validateStrategyProposal(poorRr);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Relación Riesgo\/Recompensa insuficiente/i);
  });

  it('rechaza riesgo porcentual por encima del límite determinista', () => {
    const proposal: StrategyProposalLite = {
      pair: 'TSLA', timeframe: 'H1', resumen: 'fixture', indicadoresClave: ['ATR'],
      condicionEntrada: 'Cierre cruza EMA20', direction: 'buy', puntoEntrada: '100',
      stopLoss: '98.5', takeProfit: '103', entryPriceNum: 100, stopLossNum: 98.5,
      takeProfitNum: 103, riskPercent: 1.25,
    };
    expect(validateStrategyProposal(proposal, { maxRiskPercent: 1 }).error).toMatch(/Riesgo porcentual/i);
  });

  it('rechaza stops demasiado próximos o alejados respecto al ATR', () => {
    const proposal: StrategyProposalLite = {
      pair: 'BTC/USD', timeframe: 'H1', resumen: 'fixture', indicadoresClave: ['ATR'],
      condicionEntrada: 'Cierre cruza EMA20', direction: 'buy', puntoEntrada: '100',
      stopLoss: '99.5', takeProfit: '102', entryPriceNum: 100, stopLossNum: 99.5,
      takeProfitNum: 102, riskPercent: 0.5,
    };
    expect(validateStrategyProposal(proposal, { atrValue: 1, minStopAtr: 1.25, maxStopAtr: 2.5 }).error).toMatch(/ATR/i);
  });
});

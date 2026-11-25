import { describe, it, expect } from 'vitest';
import { checkMql5Fidelity } from '../src/engine/mql5FidelityChecker.js';
import type { StrategyProposalLite } from '../src/types.js';

function strategy(overrides: Partial<StrategyProposalLite> = {}): StrategyProposalLite {
  return {
    pair: 'EUR/USD',
    timeframe: 'H1',
    resumen: 'test',
    indicadoresClave: ['EMA20', 'RSI(14)'],
    condicionEntrada: 'Cierre cruza por encima de EMA20 con RSI(14) > 50',
    puntoEntrada: '1.1000',
    stopLoss: '1.0950',
    takeProfit: '1.1090',
    direction: 'buy',
    ...overrides,
  };
}

const BUY_CODE = `
void OnTick() {
  int hEma = iMA(_Symbol, _Period, 20, 0, MODE_EMA, PRICE_CLOSE);
  int hRsi = iRSI(_Symbol, _Period, 14, PRICE_CLOSE);
  if (cond) {
    trade.Buy(lot, _Symbol, ask, sl, tp, "entrada");
  }
}
`;

describe('checkMql5Fidelity — H1 (advisory, no bloqueante)', () => {
  it('pasa limpio cuando la dirección y los indicadores declarados están presentes', () => {
    const result = checkMql5Fidelity(BUY_CODE, strategy());
    expect(result.passed).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('detecta dirección contraria a la aprobada (BUY aprobado, solo Sell en el código)', () => {
    const sellOnlyCode = BUY_CODE.replace('trade.Buy(', 'trade.Sell(');
    const result = checkMql5Fidelity(sellOnlyCode, strategy({ direction: 'buy' }));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === 'DIRECTION_MISMATCH')).toBe(true);
  });

  it('detecta dirección contraria a la aprobada (SELL aprobado, solo Buy en el código)', () => {
    const result = checkMql5Fidelity(BUY_CODE, strategy({ direction: 'sell' }));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === 'DIRECTION_MISMATCH')).toBe(true);
  });

  it('no marca error (solo warning) si el código abre en ambas direcciones (podría ser un EA de doble sentido legítimo)', () => {
    const bothCode = BUY_CODE + '\ntrade.Sell(lot, _Symbol, bid, sl2, tp2, "sell");';
    const result = checkMql5Fidelity(bothCode, strategy({ direction: 'buy' }));
    expect(result.findings.some((f) => f.code === 'DIRECTION_AMBIGUOUS' && f.severity === 'warning')).toBe(true);
    expect(result.findings.some((f) => f.severity === 'error')).toBe(false);
  });

  it('detecta que no se abre ninguna posición en absoluto', () => {
    const noEntryCode = 'void OnTick() { /* nada */ }';
    const result = checkMql5Fidelity(noEntryCode, strategy());
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === 'NO_ENTRY_FOUND')).toBe(true);
  });

  it('detecta un indicador declarado (ATR) sin su función MQL5 correspondiente en el código', () => {
    const result = checkMql5Fidelity(BUY_CODE, strategy({
      indicadoresClave: ['EMA20', 'RSI(14)', 'ATR(14)'],
      condicionEntrada: 'Cierre cruza EMA20, RSI>50, SL=1.5xATR(14)',
    }));
    expect(result.findings.some((f) => f.code === 'MISSING_INDICATOR_CALL' && /ATR/i.test(f.message))).toBe(true);
    // Es advisory: los indicadores ausentes son warning, no bloquean `passed`.
    expect(result.passed).toBe(true);
  });

  it('no exige indicadores que la estrategia nunca declaró', () => {
    const macdFreeCode = BUY_CODE; // sin iMACD, pero la estrategia tampoco lo declara
    const result = checkMql5Fidelity(macdFreeCode, strategy());
    expect(result.findings.some((f) => /MACD/i.test(f.message))).toBe(false);
  });

  it('reconoce variantes de nombre de indicador (mayúsculas/minúsculas, con/sin paréntesis)', () => {
    const result = checkMql5Fidelity(BUY_CODE, strategy({
      indicadoresClave: ['ema 20 periodos', 'rsi'],
      condicionEntrada: 'media móvil exponencial cruza al alza, rsi confirma',
    }));
    expect(result.findings).toEqual([]);
  });
});

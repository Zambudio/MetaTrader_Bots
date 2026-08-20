import { describe, it, expect } from 'vitest';
import { reviewMql5Code } from '../src/engine/codeReviewer.js';

describe('3.4 Tests automatizados: CodeReviewerAgent (22 Reglas Doc 17)', () => {
  const validEaCode = `
#property version "1.00"
#property strict
#include <Trade\\Trade.mqh>

input group "=== Parametros ==="
input ulong InpMagicNumber = 12345; // Magic number de ordenes
input double InpRiskPercent = 1.0;  // Riesgo por operacion (%)
input double InpMaxDailyLossPct = 3.0; // Limite diario (%)

CTrade trade;
datetime lastBarTime = 0;

int OnInit() {
  trade.SetExpertMagicNumber(InpMagicNumber);
  trade.SetTypeFillingBySymbol(_Symbol);
  return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {}

void OnTick() {
  datetime currentBarTime = iTime(_Symbol, _Period, 0);
  if(currentBarTime == lastBarTime) return;
  lastBarTime = currentBarTime;

  if(PositionsTotal() > 0) return;

  double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
  double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
  double minVol = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
  double maxVol = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
  double sl = NormalizeDouble(ask - 0.0030, _Digits);
  double tp = NormalizeDouble(ask + 0.0060, _Digits);

  long stopsLevel = 0;
  SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL, stopsLevel);

  double lot = MathFloor(0.10 / step) * step;
  if(trade.Buy(lot, _Symbol, ask, sl, tp, "Test")) {
    Print("Orden compra enviada");
  }
}

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result) {}
`;

  it('Verifica y aprueba un EA que cumple las reglas del Doc 17', () => {
    const res = reviewMql5Code(validEaCode, ['Histórico de ticks reales disponible']);
    expect(res.evaluations.length).toBe(22);
    expect(res.passed).toBe(true);
    expect(res.blockingRules.length).toBe(0);
    expect(res.score).toBe(100);
  });

  it('Detecta y bloquea APIs inventadas (Regla 1)', () => {
    const brokenCode = validEaCode.replace('trade.Buy', 'OrderSendBuy');
    const res = reviewMql5Code(brokenCode, ['Supuesto 1']);
    expect(res.passed).toBe(false);
    expect(res.blockingRules).toContain(1);
  });

  it('Detecta versión incompatible con 3 dígitos (Regla 4 y 21)', () => {
    const warningCode = validEaCode.replace('"1.00"', '"1.0.1"');
    const res = reviewMql5Code(warningCode, ['Supuesto 1']);
    expect(res.passed).toBe(false);
    expect(res.blockingRules).toContain(4);
  });

  it('Detecta falta de guard de nueva barra (Regla 16)', () => {
    const noGuardCode = validEaCode.replace('if(currentBarTime == lastBarTime) return;', '// sin guard');
    const res = reviewMql5Code(noGuardCode, ['Supuesto 1']);
    expect(res.passed).toBe(false);
    expect(res.blockingRules).toContain(16);
  });
});

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
  double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
  double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
  double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
  double sl = NormalizeDouble(ask - 0.0030, _Digits);
  double tp = NormalizeDouble(ask + 0.0060, _Digits);

  long stopsLevel = 0;
  SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL, stopsLevel);
  long freezeLevel = 0;
  SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL, freezeLevel);

  double lot = MathFloor(0.10 / step) * step;
  if(trade.Buy(lot, _Symbol, ask, sl, tp, "Test")) {
    ulong retcode = trade.ResultRetcode();
    ulong deal = trade.ResultDeal();
    if(retcode != TRADE_RETCODE_DONE && retcode != TRADE_RETCODE_DONE_PARTIAL && retcode != TRADE_RETCODE_PLACED) return;
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

  it('reconoce TRADE_RETCODE_DONE_PARTIAL como constante oficial', () => {
    const res = reviewMql5Code(validEaCode, ['Supuesto 1']);
    expect(res.blockingRules).not.toContain(1);
  });

  it('exige tick size/value y el trio volume step/min/max para el sizing', () => {
    const noTickValue = validEaCode.replace('double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);', '');
    const noMinVolume = validEaCode.replace('double minVol = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);', '');
    expect(reviewMql5Code(noTickValue, ['Supuesto 1']).blockingRules).toContain(8);
    expect(reviewMql5Code(noMinVolume, ['Supuesto 1']).blockingRules).toContain(9);
  });

  it('exige validar tanto STOPS_LEVEL como FREEZE_LEVEL', () => {
    const noFreeze = validEaCode.replace('SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL, freezeLevel);', '');
    expect(reviewMql5Code(noFreeze, ['Supuesto 1']).blockingRules).toContain(10);
  });

  it('no confunde CTrade/Buy con comprobación de retcode y fill', () => {
    const blind = validEaCode
      .replace('ulong retcode = trade.ResultRetcode();', '')
      .replace('ulong deal = trade.ResultDeal();', '');
    const res = reviewMql5Code(blind, ['Supuesto 1']);
    expect(res.blockingRules).toContain(12);
    expect(res.blockingRules).toContain(13);
  });
});

import { describe, it, expect } from 'vitest';
import { compileMql5 } from '../src/engine/mql5Compiler.js';

describe('Verificación de compilación en MetaEditor64 real', () => {
  const eaTemplate = `//+------------------------------------------------------------------+
//| EA_EURUSD_H1.mq5                                                 |
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
input double InpTpAtrMult   = 3.0;          // Multiplicador ATR para Take Profit

input group "=== Gestión de Riesgo (Hard Limits) ==="
input double InpRiskPercent     = 1.0;      // Riesgo por operación (% del balance)
input double InpMaxDailyLossPct = 3.0;      // Pérdida diaria máxima permitida (%)
input double InpMaxDrawdownPct  = 10.0;     // Drawdown máximo permitido (%)

//--- Variables Globales
CTrade         trade;
datetime       lastBarTime = 0;
datetime       lastLogBarTime = 0;
int            atrHandle = INVALID_HANDLE;
double         dailyStartingBalance = 0.0;
datetime       currentDayTime = 0;

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
   
   Print("[INIT_SUCCESS] EA inicializado correctamente para ", _Symbol);
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);
   Print("[DEINIT] EA detenido. Motivo: ", reason);
  }

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
            Print("[KILL_SWITCH] Límite de pérdida diaria alcanzado.");
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
            Print("[KILL_SWITCH] Límite de drawdown alcanzado.");
            lastLogBarTime = lastBarTime;
           }
         return false;
        }
     }
     
   return true;
  }

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

void OnTick()
  {
   datetime currentBarTime = iTime(_Symbol, _Period, 0);
   if(currentBarTime == lastBarTime) return;
   lastBarTime = currentBarTime;
   
   if(!CheckRiskLimits()) return;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
         return;
        }
     }
     
   double atrBuffer[];
   ArraySetAsSeries(atrBuffer, true);
   if(CopyBuffer(atrHandle, 0, 1, 1, atrBuffer) <= 0) return;
   double currentAtr = atrBuffer[0];
   if(currentAtr <= 0) return;
   
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   
   double slDistance = currentAtr * InpSlAtrMult;
   double tpDistance = currentAtr * InpTpAtrMult;
   double lotSize = CalculatePositionSize(slDistance / point);
   
   if(lotSize <= 0) return;
   
   double sl = NormalizeDouble(ask - slDistance, _Digits);
   double tp = NormalizeDouble(ask + tpDistance, _Digits);
   
   if(sl < ask && tp > ask)
     {
      trade.Buy(lotSize, _Symbol, ask, sl, tp, "Strategy EA Buy");
     }
  }

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
  }
`;

  it('Compila el código estándar en MetaEditor64 con estado ok y 0 errores', async () => {
    const res = await compileMql5(eaTemplate, 'EA_EURUSD_H1.mq5');
    console.log('Resultado compilación MetaEditor:', res);
    expect(res.status).toBe('ok');
    expect(res.errors.length).toBe(0);
  });
});

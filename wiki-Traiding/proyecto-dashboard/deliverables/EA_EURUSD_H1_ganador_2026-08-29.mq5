#property version "1.00"
#property strict
#include <Trade/Trade.mqh>

// =============================================================================
// (1) Inputs / Parámetros
// =============================================================================
input group "Configuración Estrategia"
input int InpEMA20_Period = 20;     // Periodo EMA 20
input int InpEMA50_Period = 50;     // Periodo EMA 50
input int InpATR_Period = 14;       // Periodo ATR
input double InpATR_Multiplier_SL = 1.5; // Multiplicador ATR para Stop Loss
input double InpATR_Multiplier_TP = 2.4; // Multiplicador ATR para Take Profit

input group "Gestión de Riesgo"
input double InpRiskPercent = 1.0;        // Riesgo por operación (%)
input double InpMaxDailyLossPct = 5.0;    // Máxima pérdida diaria (%)
input double InpMaxDrawdownPct = 10.0;    // Máximo drawdown total (%)
input ulong InpMagicNumber = 123456;      // Magic Number

// =============================================================================
// (2) Variables globales / Estado
// =============================================================================
CTrade trade;
int handleEMA20;
int handleEMA50;
int handleATR;
datetime lastBarTime = 0;

// =============================================================================
// (3) OnInit / OnDeinit
// =============================================================================
int OnInit() {
   handleEMA20 = iMA(_Symbol, _Period, InpEMA20_Period, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA50 = iMA(_Symbol, _Period, InpEMA50_Period, 0, MODE_EMA, PRICE_CLOSE);
   handleATR = iATR(_Symbol, _Period, InpATR_Period);

   if(handleEMA20 == INVALID_HANDLE || handleEMA50 == INVALID_HANDLE || handleATR == INVALID_HANDLE) {
      Print("Error al inicializar indicadores.");
      return INIT_FAILED;
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetTypeFillingBySymbol(_Symbol);

   Print("EA inicializado correctamente.");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   IndicatorRelease(handleEMA20);
   IndicatorRelease(handleEMA50);
   IndicatorRelease(handleATR);
   Print("EA desinicializado. Razón: ", reason);
}

// =============================================================================
// (4) Hard Limits / Risk Check
// =============================================================================
bool IsTradingAllowed() {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   
   // Check Drawdown
   if((balance - equity) / balance * 100.0 > InpMaxDrawdownPct) return false;
   
   // Aquí se podría implementar la lógica de pérdida diaria acumulada
   // (requiere persistencia de datos entre ticks/días)
   
   return true;
}

// =============================================================================
// (5) Position Sizer
// =============================================================================
double CalculateVolume(double slDistance) {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = balance * (InpRiskPercent / 100.0);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   
   if(tickSize == 0 || tickValue == 0) return 0.0;
   
   double volumeStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   double ticks = slDistance / tickSize;
   double volume = riskAmount / (ticks * tickValue);
   
   // Normalización
   volume = MathFloor(volume / volumeStep) * volumeStep;
   
   if(volume < minVolume) volume = minVolume;
   if(volume > maxVolume) volume = maxVolume;
   
   return volume;
}

// =============================================================================
// (6) Generador de Señal
// =============================================================================
void OnTick() {
   if(!IsTradingAllowed()) return;
   
   datetime currentBarTime = iTime(_Symbol, _Period, 0);
   if(currentBarTime == lastBarTime) return;
   
   // Obtener datos
   double ema20[], ema50[], atr[];
   ArraySetAsSeries(ema20, true);
   ArraySetAsSeries(ema50, true);
   ArraySetAsSeries(atr, true);
   
   if(CopyBuffer(handleEMA20, 0, 0, 2, ema20) < 2 || 
      CopyBuffer(handleEMA50, 0, 0, 1, ema50) < 1 ||
      CopyBuffer(handleATR, 0, 0, 1, atr) < 1) return;
   
   double closePrev = iClose(_Symbol, _Period, 1);
   double closeCurr = iClose(_Symbol, _Period, 0);
   
   // Condición exacta: Cierre anterior > EMA20 AND Cierre actual < EMA20 AND (EMA50 - EMA20) > 1.5 * ATR
   bool condition = (closePrev > ema20[1]) && (closeCurr < ema20[0]) && ((ema50[0] - ema20[0]) > (InpATR_Multiplier_SL * atr[0]));
   
   if(condition) {
      if(PositionsTotal() == 0) {
         double sl = iClose(_Symbol, _Period, 0) + (InpATR_Multiplier_SL * atr[0]);
         double tp = iClose(_Symbol, _Period, 0) - (InpATR_Multiplier_TP * atr[0]);
         double slDistance = MathAbs(iClose(_Symbol, _Period, 0) - sl);
         double volume = CalculateVolume(slDistance);
         
         // Validar stops con STOPS_LEVEL
         long stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
         if(slDistance < stopsLevel * SymbolInfoDouble(_Symbol, SYMBOL_POINT)) {
            Print("SL demasiado cerca del precio.");
            return;
         }
         
         // (7) Ejecución CTrade
         if(trade.Sell(volume, _Symbol, 0.0, sl, tp, "EA Sell")) {
            Print("Orden Sell ejecutada. Ticket: ", trade.ResultOrder());
            lastBarTime = currentBarTime; // Evitar múltiples entradas en la misma barra
         } else {
            Print("Error ejecutando orden: ", trade.ResultRetcode(), " Descripcion: ", trade.ResultComment());
         }
      }
   }
}

// =============================================================================
// (8) OnTradeTransaction
// =============================================================================
void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result) { }

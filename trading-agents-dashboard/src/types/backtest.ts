export interface Mt5Deal {
  time: string;
  dealId: number;
  side: 'buy' | 'sell';
  lots: number;
  symbol: string;
  price: number;
  orderId: number;
}

export interface Mt5Trigger {
  time: string;
  type: 'take_profit' | 'stop_loss';
  dealId: number;
  openSide: 'buy' | 'sell';
  lots: number;
  symbol: string;
  entryPrice: number;
  sl: number;
  tp: number;
  closeDealId: number;
  closePrice: number;
}

export interface Mt5LogStats {
  totalDeals: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  avgRR: number | null;
  netProfit: number | null;
  netProfitPct: number | null;
  grossProfitApprox: number | null;
  grossLossApprox: number | null;
  profitFactorApprox: number | null;
  expectancyR: number | null;
  maxDrawdownPct: number | null;
  maxDrawdownUSD: number | null;
  rejectedOrdersCount: number;
  isApproximationUSD?: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  flags: string[];
}

export interface Mt5LogSession {
  expertFile: string | null;
  symbol: string | null;
  timeframe: string | null;
  initialDeposit: number | null;
  currency: string | null;
  leverage: string | null;
  finalBalance: number | null;
  deals: Mt5Deal[];
  triggers: Mt5Trigger[];
  stats: Mt5LogStats;
}

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

const EXPERT_ADDED_RE = /expert file added:\s*(.+?)\.\s*\d+ bytes loaded/;
const INITIAL_DEPOSIT_RE = /initial deposit ([\d.]+) (\w+), leverage (1:\d+)/;
const FINAL_BALANCE_RE = /final balance ([\d.]+) (\w+)/;
const TEST_FINISHED_RE = /test\s+\S+\s+on\s+([A-Za-z0-9._]+),([A-Za-z0-9]+)\s+thread finished/;
const DEAL_RE =
  /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+deal #(\d+) (buy|sell) ([\d.]+) (\S+) at ([\d.]+) done \(based on order #(\d+)\)/;
const TRIGGER_RE =
  /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+(stop loss|take profit) triggered #(\d+) (buy|sell) ([\d.]+) (\S+) ([\d.]+) sl: ([\d.]+) tp: ([\d.]+) \[#(\d+) (?:buy|sell) [\d.]+ \S+ at ([\d.]+)\]/;

function emptySession(): Mt5LogSession {
  return {
    expertFile: null,
    symbol: null,
    timeframe: null,
    initialDeposit: null,
    currency: null,
    leverage: null,
    finalBalance: null,
    deals: [],
    triggers: [],
    stats: {
      totalDeals: 0,
      closedTrades: 0,
      wins: 0,
      losses: 0,
      winRatePct: null,
      avgRR: null,
      netProfit: null,
      netProfitPct: null,
      grossProfitApprox: null,
      grossLossApprox: null,
      profitFactorApprox: null,
      expectancyR: null,
      periodStart: null,
      periodEnd: null,
      flags: [],
    },
  };
}

function computeStats(session: Mt5LogSession): Mt5LogStats {
  const wins = session.triggers.filter((t) => t.type === 'take_profit').length;
  const losses = session.triggers.filter((t) => t.type === 'stop_loss').length;
  const closedTrades = wins + losses;
  const winRatePct = closedTrades > 0 ? (wins / closedTrades) * 100 : null;

  const rrRatios = session.triggers
    .map((t) => {
      const risk = Math.abs(t.entryPrice - t.sl);
      const reward = Math.abs(t.tp - t.entryPrice);
      return risk > 0 ? reward / risk : null;
    })
    .filter((v): v is number => v !== null);
  const avgRR = rrRatios.length > 0 ? rrRatios.reduce((a, b) => a + b, 0) / rrRatios.length : null;

  // Aproximación en USD asumiendo par cotizado directo contra USD (p.ej. EURUSD) y contrato
  // estándar de 100 000 unidades — ignora comisión y swap. Sirve para una lectura orientativa
  // rápida (profit factor, ganancia/pérdida bruta); para cifras exactas usar el informe .htm
  // del Strategy Tester.
  let grossProfitApprox = 0;
  let grossLossApprox = 0;
  for (const t of session.triggers) {
    const signedLots = t.openSide === 'buy' ? t.lots : -t.lots;
    const pnl = (t.closePrice - t.entryPrice) * signedLots * 100_000;
    if (pnl >= 0) grossProfitApprox += pnl;
    else grossLossApprox += Math.abs(pnl);
  }
  const profitFactorApprox = session.triggers.length > 0 ? (grossLossApprox > 0 ? grossProfitApprox / grossLossApprox : null) : null;

  const netProfit =
    session.finalBalance !== null && session.initialDeposit !== null ? session.finalBalance - session.initialDeposit : null;
  const netProfitPct = netProfit !== null && session.initialDeposit ? (netProfit / session.initialDeposit) * 100 : null;

  const expectancyR =
    winRatePct !== null && avgRR !== null ? (winRatePct / 100) * avgRR - (1 - winRatePct / 100) : null;

  const times = [...session.deals.map((d) => d.time), ...session.triggers.map((t) => t.time)].sort();
  const periodStart = times.length > 0 ? times[0] : null;
  const periodEnd = times.length > 0 ? times[times.length - 1] : null;

  const flags: string[] = [];
  if (session.deals.length === 0) {
    flags.push('No se ejecutó ninguna operación en este backtest — revisa las condiciones de entrada del EA.');
  }
  if (netProfit !== null && netProfit < 0) {
    flags.push('Resultado neto negativo en el periodo probado.');
  }
  if (expectancyR !== null && expectancyR < 0) {
    flags.push(
      `Esperanza matemática negativa (~${expectancyR.toFixed(2)} R por operación): el win rate no compensa el ratio riesgo/beneficio real.`
    );
  }
  if (closedTrades > 0 && closedTrades < 20) {
    flags.push(`Muestra pequeña (${closedTrades} operaciones cerradas) — resultado poco fiable estadísticamente.`);
  }
  const unclosed = session.deals.length - closedTrades * 2;
  if (unclosed > 0) {
    flags.push(
      `${unclosed} fill(s) no se emparejaron con un cierre por SL/TP (posición abierta al final del test o cierre por señal manual) — las métricas de win rate no los cubren.`
    );
  }

  return {
    totalDeals: session.deals.length,
    closedTrades,
    wins,
    losses,
    winRatePct,
    avgRR,
    netProfit,
    netProfitPct,
    grossProfitApprox: session.triggers.length > 0 ? grossProfitApprox : null,
    grossLossApprox: session.triggers.length > 0 ? grossLossApprox : null,
    profitFactorApprox,
    expectancyR,
    periodStart,
    periodEnd,
    flags,
  };
}

export function parseMt5Log(rawText: string): Mt5LogSession[] {
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const lines = text.split(/\r\n|\n/);

  const sessions: Mt5LogSession[] = [];
  let current: Mt5LogSession | null = null;

  for (const line of lines) {
    if (!line) continue;
    const cols = line.split('\t');
    if (cols.length < 5) continue;
    const message = cols.slice(4).join('\t');

    const expertMatch = message.match(EXPERT_ADDED_RE);
    if (expertMatch) {
      if (current) sessions.push(current);
      current = emptySession();
      current.expertFile = expertMatch[1];
      continue;
    }
    if (!current) continue;

    const depositMatch = message.match(INITIAL_DEPOSIT_RE);
    if (depositMatch) {
      current.initialDeposit = Number(depositMatch[1]);
      current.currency = depositMatch[2];
      current.leverage = depositMatch[3];
      continue;
    }

    const balanceMatch = message.match(FINAL_BALANCE_RE);
    if (balanceMatch) {
      current.finalBalance = Number(balanceMatch[1]);
      continue;
    }

    const finishedMatch = message.match(TEST_FINISHED_RE);
    if (finishedMatch) {
      current.symbol = finishedMatch[1];
      current.timeframe = finishedMatch[2];
      continue;
    }

    const dealMatch = message.match(DEAL_RE);
    if (dealMatch) {
      current.deals.push({
        time: dealMatch[1],
        dealId: Number(dealMatch[2]),
        side: dealMatch[3] as 'buy' | 'sell',
        lots: Number(dealMatch[4]),
        symbol: dealMatch[5],
        price: Number(dealMatch[6]),
        orderId: Number(dealMatch[7]),
      });
      continue;
    }

    const triggerMatch = message.match(TRIGGER_RE);
    if (triggerMatch) {
      current.triggers.push({
        time: triggerMatch[1],
        type: triggerMatch[2] === 'take profit' ? 'take_profit' : 'stop_loss',
        dealId: Number(triggerMatch[3]),
        openSide: triggerMatch[4] as 'buy' | 'sell',
        lots: Number(triggerMatch[5]),
        symbol: triggerMatch[6],
        entryPrice: Number(triggerMatch[7]),
        sl: Number(triggerMatch[8]),
        tp: Number(triggerMatch[9]),
        closeDealId: Number(triggerMatch[10]),
        closePrice: Number(triggerMatch[11]),
      });
      continue;
    }
  }
  if (current) sessions.push(current);

  for (const session of sessions) {
    session.stats = computeStats(session);
  }

  return sessions;
}

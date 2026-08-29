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
  isApproximationUSD: boolean;
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
const FINAL_BALANCE_RE = /\bfinal balance\s+(-?\d+(?:\.\d+)?)\s+(\w+)\b/i;
const TEST_FINISHED_RE = /test\s+\S+\s+on\s+([A-Za-z0-9._]+),([A-Za-z0-9]+)\s+thread finished/;
const DEAL_RE =
  /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+deal #(\d+) (buy|sell) ([\d.]+) (\S+) at ([\d.]+) done \(based on order #(\d+)\)/;
const TRIGGER_RE =
  /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+(stop loss|take profit) triggered #(\d+) (buy|sell) ([\d.]+) (\S+) ([\d.]+) sl: ([\d.]+) tp: ([\d.]+) \[#(\d+) (?:buy|sell) [\d.]+ \S+ at ([\d.]+)\]/;
const REJECTED_ORDER_RE =
  /(?:order\s+#\d+\s+rejected|trade\s+failed|request\s+rejected|cannot\s+open\s+position|retcode\s+(?:10004|10006|10011|10012|10013|10014|10015|10016|10017|10018|10019|10021|10022|10024|10026|10027|10028|10029|10030))/i;

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
      maxDrawdownPct: null,
      maxDrawdownUSD: null,
      rejectedOrdersCount: 0,
      isApproximationUSD: false,
      periodStart: null,
      periodEnd: null,
      flags: [],
    },
  };
}

function computeStats(session: Mt5LogSession, rejectedOrdersCount = 0): Mt5LogStats {
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

  const symbol = (session.symbol || '').toUpperCase();
  const isDirectUsd = symbol.endsWith('USD') || symbol === 'EURUSD' || symbol === 'GBPUSD' || symbol === 'AUDUSD' || symbol === 'NZDUSD';
  const isApproximationUSD = !isDirectUsd;

  let grossProfitApprox = 0;
  let grossLossApprox = 0;

  // Curva de balance acumulada para calcular Drawdown Máximo exacto
  const initialBal = session.initialDeposit ?? 10000;
  let runningBalance = initialBal;
  let peakBalance = initialBal;
  let maxDrawdownUSD = 0;
  let maxDrawdownPct = 0;

  for (const t of session.triggers) {
    const signedLots = t.openSide === 'buy' ? t.lots : -t.lots;
    const pnl = (t.closePrice - t.entryPrice) * signedLots * 100_000;
    if (pnl >= 0) grossProfitApprox += pnl;
    else grossLossApprox += Math.abs(pnl);

    runningBalance += pnl;
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    const currentDdUSD = peakBalance - runningBalance;
    const currentDdPct = peakBalance > 0 ? (currentDdUSD / peakBalance) * 100 : 0;

    if (currentDdUSD > maxDrawdownUSD) {
      maxDrawdownUSD = currentDdUSD;
    }
    if (currentDdPct > maxDrawdownPct) {
      maxDrawdownPct = currentDdPct;
    }
  }

  const profitFactorApprox = session.triggers.length > 0 ? (grossLossApprox > 0 ? grossProfitApprox / grossLossApprox : (grossProfitApprox > 0 ? 99.99 : null)) : null;

  // Solo `final balance` (autoritativo del tester) cuenta como beneficio neto. Un log incompleto
  // o un cambio de formato NUNCA debe convertir la estimación de fills en "beneficio neto" y
  // colar un falso PASA en el Quality Gate — si falta el balance, netProfit = null (fail closed).
  const netProfit =
    session.finalBalance !== null && session.initialDeposit !== null
      ? session.finalBalance - session.initialDeposit
      : null;

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
  if (closedTrades > 0 && closedTrades < 15) {
    flags.push(`Muestra pequeña (${closedTrades} operaciones cerradas) — mínimo recomendado 15.`);
  }
  if (rejectedOrdersCount > 0) {
    flags.push(`Se registraron ${rejectedOrdersCount} órdenes rechazadas durante el test.`);
  }
  if (maxDrawdownPct > 15.0) {
    flags.push(`Drawdown máximo elevado (${maxDrawdownPct.toFixed(1)}% > 15.0% límite).`);
  }
  if (isApproximationUSD && session.triggers.length > 0) {
    flags.push(`Nota: cifras en USD calculadas por estimación de contrato para el par ${symbol || 'no directo USD'}.`);
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
    maxDrawdownPct: session.triggers.length > 0 ? maxDrawdownPct : null,
    maxDrawdownUSD: session.triggers.length > 0 ? maxDrawdownUSD : null,
    rejectedOrdersCount,
    isApproximationUSD,
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
  let rejectedCount = 0;

  for (const line of lines) {
    if (!line) continue;

    if (REJECTED_ORDER_RE.test(line)) {
      rejectedCount++;
    }

    const cols = line.split('\t');
    if (cols.length < 5) continue;
    const message = cols.slice(4).join('\t');

    const expertMatch = message.match(EXPERT_ADDED_RE);
    if (expertMatch) {
      if (current) {
        current.stats = computeStats(current, rejectedCount);
        sessions.push(current);
        rejectedCount = 0;
      }
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

    const fullEntry = `${cols[0]} ${message}`;
    const dealMatch = fullEntry.match(DEAL_RE) || message.match(/deal #(\d+) (buy|sell) ([\d.]+) (\S+) at ([\d.]+) done \(based on order #(\d+)\)/);
    if (dealMatch) {
      const isFull = dealMatch.length === 8;
      current.deals.push({
        time: isFull ? dealMatch[1] : cols[0],
        dealId: Number(isFull ? dealMatch[2] : dealMatch[1]),
        side: (isFull ? dealMatch[3] : dealMatch[2]) as 'buy' | 'sell',
        lots: Number(isFull ? dealMatch[4] : dealMatch[3]),
        symbol: isFull ? dealMatch[5] : dealMatch[4],
        price: Number(isFull ? dealMatch[6] : dealMatch[5]),
        orderId: Number(isFull ? dealMatch[7] : dealMatch[6]),
      });
      continue;
    }

    const triggerMatch = fullEntry.match(TRIGGER_RE) || message.match(/(stop loss|take profit) triggered #(\d+) (buy|sell) ([\d.]+) (\S+) ([\d.]+) sl: ([\d.]+) tp: ([\d.]+) \[#(\d+) (?:buy|sell) [\d.]+ \S+ at ([\d.]+)\]/);
    if (triggerMatch) {
      const isFull = triggerMatch.length === 12;
      current.triggers.push({
        time: isFull ? triggerMatch[1] : cols[0],
        type: (isFull ? triggerMatch[2] : triggerMatch[1]) === 'take profit' ? 'take_profit' : 'stop_loss',
        dealId: Number(isFull ? triggerMatch[3] : triggerMatch[2]),
        openSide: (isFull ? triggerMatch[4] : triggerMatch[3]) as 'buy' | 'sell',
        lots: Number(isFull ? triggerMatch[5] : triggerMatch[4]),
        symbol: isFull ? triggerMatch[6] : triggerMatch[5],
        entryPrice: Number(isFull ? triggerMatch[7] : triggerMatch[6]),
        sl: Number(isFull ? triggerMatch[8] : triggerMatch[7]),
        tp: Number(isFull ? triggerMatch[9] : triggerMatch[8]),
        closeDealId: Number(isFull ? triggerMatch[10] : triggerMatch[9]),
        closePrice: Number(isFull ? triggerMatch[11] : triggerMatch[10]),
      });
      continue;
    }
  }

  if (current) {
    current.stats = computeStats(current, rejectedCount);
    sessions.push(current);
  }

  return sessions;
}

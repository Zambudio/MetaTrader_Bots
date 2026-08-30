import { SMA, EMA, RSI, MACD, BollingerBands, ATR } from 'technicalindicators';
import { candleSourceLabel, getCandles, parseEndDateToEpochSec } from '../marketData/index.js';
import type { Candle } from '../marketData/types.js';

export interface MarketSnapshotData {
  pair: string;
  timeframe: string;
  timestamp: string;
  isStale?: boolean;
  staleDetails?: string;
  currentPrice: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePct: number;
  };
  movingAverages: {
    sma20?: number;
    sma50?: number;
    sma200?: number;
    ema20?: number;
    ema50?: number;
  };
  rsi14?: {
    value: number;
    condition: 'sobrecompra' | 'sobreventa' | 'neutral';
  };
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
    trend: 'alcista' | 'bajista' | 'cruzando';
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
    bandwidthPct: number;
    pricePosition: 'sobre_banda_superior' | 'bajo_banda_inferior' | 'dentro_de_bandas';
  };
  atr14?: {
    value: number;
    pipsEstimate?: number;
  };
  recentRange?: {
    candlesCount: number;
    high: number;
    low: number;
    spread: number;
  };
  volumeProfile?: { last: number; average20: number; ratioToAverage20: number };
  gap?: { absolute: number; percent: number };
  marketSession: { market: 'forex' | 'stocks' | 'crypto'; isOpen: boolean; label: string; note: string };
}

export function computeMarketSession(symbol: string, nowTimestampMs: number = Date.now()): MarketSnapshotData['marketSession'] {
  const normalized = symbol.toUpperCase();
  const date = new Date(nowTimestampMs);
  const day = date.getUTCDay();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  if (/BTC|ETH|XBT|SOL/.test(normalized)) {
    return { market: 'crypto', isOpen: true, label: '24x7', note: 'Mercado cripto continuo; no implica liquidez uniforme.' };
  }
  if (normalized.includes('/')) {
    const isOpen = (day > 0 && day < 5) || (day === 0 && hour >= 21) || (day === 5 && hour < 21);
    return { market: 'forex', isOpen, label: isOpen ? 'FX_OPEN' : 'FX_WEEKEND_CLOSED', note: 'Reloj aproximado UTC; spread/bid-ask no disponibles.' };
  }
  const isOpen = day >= 1 && day <= 5 && hour >= 13.5 && hour < 20;
  return { market: 'stocks', isOpen, label: isOpen ? 'US_CASH_OPEN' : 'US_CASH_CLOSED', note: 'Ventana regular aproximada UTC; festivos y pre/post-market no disponibles.' };
}

function roundTo(value: number, decimals = 5): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// 3.2 Tabla de especificación de multiplicador por instrumento
export function getInstrumentPipMultiplier(symbol: string): number {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.includes('JPY')) return 100;
  if (s.startsWith('XAU') || s.includes('GOLD')) return 10;
  if (s.startsWith('XAG') || s.includes('SILVER')) return 100;
  if (s.includes('OIL') || s.includes('WTI') || s.includes('BRENT')) return 100;
  if (s.includes('BTC') || s.includes('ETH') || s.includes('XBT') || s.includes('SOL')) return 1;
  if (s.includes('US30') || s.includes('NAS100') || s.includes('SPX500') || s.includes('GER40') || s.includes('DAX')) return 1;
  // Forex estándar de 4/5 dígitos
  return 10000;
}

function getTimeframeSeconds(tf: string): number {
  const clean = tf.toUpperCase().trim();
  if (clean === 'M1') return 60;
  if (clean === 'M5') return 300;
  if (clean === 'M15') return 900;
  if (clean === 'M30') return 1800;
  if (clean === 'H1') return 3600;
  if (clean === 'H4') return 14400;
  if (clean === 'D1') return 86400;
  if (clean === 'W1') return 604800;
  return 3600;
}

export function computeSnapshotFromCandles(
  candles: Candle[],
  pair: string,
  timeframe: string,
  nowTimestampMs: number = Date.now()
): MarketSnapshotData | null {
  if (!candles || candles.length < 15) {
    return null;
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const changePct = prevCandle
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
    : 0;

  // 3.1 Validación de frescura temporal
  const candleTimeMs = lastCandle.time * 1000;
  const elapsedSec = Math.max(0, Math.floor((nowTimestampMs - candleTimeMs) / 1000));
  const tfSec = getTimeframeSeconds(timeframe);
  const isStale = elapsedSec > tfSec * 3.5; // Si excede 3.5 barras de desfase

  let staleDetails: string | undefined;
  if (isStale) {
    const elapsedHours = (elapsedSec / 3600).toFixed(1);
    staleDetails = `Última vela recibida con retraso de ${elapsedHours}h respecto al tiempo actual.`;
  }

  // Medias Móviles
  const sma20Values = SMA.calculate({ period: 20, values: closes });
  const sma50Values = closes.length >= 50 ? SMA.calculate({ period: 50, values: closes }) : [];
  const sma200Values = closes.length >= 200 ? SMA.calculate({ period: 200, values: closes }) : [];
  const ema20Values = EMA.calculate({ period: 20, values: closes });
  const ema50Values = closes.length >= 50 ? EMA.calculate({ period: 50, values: closes }) : [];

  const sma20 = sma20Values.length > 0 ? roundTo(sma20Values[sma20Values.length - 1]) : undefined;
  const sma50 = sma50Values.length > 0 ? roundTo(sma50Values[sma50Values.length - 1]) : undefined;
  const sma200 = sma200Values.length > 0 ? roundTo(sma200Values[sma200Values.length - 1]) : undefined;
  const ema20 = ema20Values.length > 0 ? roundTo(ema20Values[ema20Values.length - 1]) : undefined;
  const ema50 = ema50Values.length > 0 ? roundTo(ema50Values[ema50Values.length - 1]) : undefined;

  // RSI 14
  const rsiValues = RSI.calculate({ period: 14, values: closes });
  let rsi14: MarketSnapshotData['rsi14'];
  if (rsiValues.length > 0) {
    const rawRsi = roundTo(rsiValues[rsiValues.length - 1], 2);
    let condition: 'sobrecompra' | 'sobreventa' | 'neutral' = 'neutral';
    if (rawRsi >= 70) condition = 'sobrecompra';
    else if (rawRsi <= 30) condition = 'sobreventa';
    rsi14 = { value: rawRsi, condition };
  }

  // MACD (12, 26, 9)
  const macdValues = closes.length >= 35
    ? MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      })
    : [];
  let macd: MarketSnapshotData['macd'];
  if (macdValues.length > 0) {
    const lastMacd = macdValues[macdValues.length - 1];
    const m = roundTo(lastMacd.MACD ?? 0);
    const s = roundTo(lastMacd.signal ?? 0);
    const h = roundTo(lastMacd.histogram ?? 0);
    let trend: 'alcista' | 'bajista' | 'cruzando' = 'cruzando';
    if (m > s && h > 0) trend = 'alcista';
    else if (m < s && h < 0) trend = 'bajista';
    macd = { macd: m, signal: s, histogram: h, trend };
  }

  // Bollinger Bands (20, 2)
  const bbValues = closes.length >= 20
    ? BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    : [];
  let bollinger: MarketSnapshotData['bollinger'];
  if (bbValues.length > 0) {
    const lastBB = bbValues[bbValues.length - 1];
    const upper = roundTo(lastBB.upper);
    const middle = roundTo(lastBB.middle);
    const lower = roundTo(lastBB.lower);
    const bandwidthPct = middle > 0 ? roundTo(((upper - lower) / middle) * 100, 2) : 0;
    let pricePosition: 'sobre_banda_superior' | 'bajo_banda_inferior' | 'dentro_de_bandas' = 'dentro_de_bandas';
    if (lastCandle.close > upper) pricePosition = 'sobre_banda_superior';
    else if (lastCandle.close < lower) pricePosition = 'bajo_banda_inferior';

    bollinger = { upper, middle, lower, bandwidthPct, pricePosition };
  }

  // ATR (14) con multiplicador específico de instrumento
  const atrValues = closes.length >= 14
    ? ATR.calculate({ period: 14, high: highs, low: lows, close: closes })
    : [];
  let atr14: MarketSnapshotData['atr14'];
  if (atrValues.length > 0) {
    const rawAtr = roundTo(atrValues[atrValues.length - 1]);
    const pipMultiplier = getInstrumentPipMultiplier(pair);
    const pipsEstimate = roundTo(rawAtr * pipMultiplier, 1);
    atr14 = { value: rawAtr, pipsEstimate };
  }

  // Rango reciente (últimas 20 velas)
  const lookback = Math.min(20, candles.length);
  const recentSlice = candles.slice(-lookback);
  const recentHigh = Math.max(...recentSlice.map((c) => c.high));
  const recentLow = Math.min(...recentSlice.map((c) => c.low));

  const recentRange = {
    candlesCount: lookback,
    high: roundTo(recentHigh),
    low: roundTo(recentLow),
    spread: roundTo(recentHigh - recentLow),
  };

  const volumeSlice = volumes.slice(-20);
  const average20 = volumeSlice.reduce((sum, value) => sum + value, 0) / volumeSlice.length;
  const volumeProfile = {
    last: roundTo(lastCandle.volume, 2),
    average20: roundTo(average20, 2),
    ratioToAverage20: average20 > 0 ? roundTo(lastCandle.volume / average20, 2) : 0,
  };
  const gapAbsolute = prevCandle ? lastCandle.open - prevCandle.close : 0;
  const gap = {
    absolute: roundTo(gapAbsolute),
    percent: prevCandle?.close ? roundTo((gapAbsolute / prevCandle.close) * 100, 2) : 0,
  };

  const isoTime = new Date(lastCandle.time * 1000).toISOString();

  return {
    pair,
    timeframe,
    timestamp: isoTime,
    isStale,
    staleDetails,
    currentPrice: {
      open: roundTo(lastCandle.open),
      high: roundTo(lastCandle.high),
      low: roundTo(lastCandle.low),
      close: roundTo(lastCandle.close),
      volume: roundTo(lastCandle.volume, 2),
      changePct: roundTo(changePct, 2),
    },
    movingAverages: { sma20, sma50, sma200, ema20, ema50 },
    rsi14,
    macd,
    bollinger,
    atr14,
    recentRange,
    volumeProfile,
    gap,
    marketSession: computeMarketSession(pair, nowTimestampMs),
  };
}

export function formatSnapshotText(snapshot: MarketSnapshotData): string {
  const { pair, timeframe, timestamp, isStale, staleDetails, currentPrice, movingAverages, rsi14, macd, bollinger, atr14, recentRange, volumeProfile, gap, marketSession } = snapshot;

  const lines: string[] = [
    `=== SNAPSHOT DE MERCADO REAL (${pair} · ${timeframe}) ===`,
    `Fecha/Hora última vela: ${timestamp}`,
  ];

  if (isStale) {
    lines.push(`⚠ AVISO DE FRESCURA TEMPORAL: ${staleDetails || 'Snapshot con desfase temporal respecto a la hora actual.'}`);
  }

  lines.push(`Sesión determinista: ${marketSession.label} | Mercado abierto: ${marketSession.isOpen ? 'sí' : 'no'} | ${marketSession.note}`);

  lines.push(`Precio Actual (Cierre): ${currentPrice.close} | Apertura: ${currentPrice.open} | Máx: ${currentPrice.high} | Mín: ${currentPrice.low} (Var: ${currentPrice.changePct > 0 ? '+' : ''}${currentPrice.changePct}%)`);

  const maParts: string[] = [];
  if (movingAverages.ema20 !== undefined) maParts.push(`EMA(20): ${movingAverages.ema20}`);
  if (movingAverages.sma20 !== undefined) maParts.push(`SMA(20): ${movingAverages.sma20}`);
  if (movingAverages.ema50 !== undefined) maParts.push(`EMA(50): ${movingAverages.ema50}`);
  if (movingAverages.sma50 !== undefined) maParts.push(`SMA(50): ${movingAverages.sma50}`);
  if (movingAverages.sma200 !== undefined) maParts.push(`SMA(200): ${movingAverages.sma200}`);
  if (maParts.length > 0) {
    lines.push(`Medias Móviles: ${maParts.join(' | ')}`);
  }

  if (rsi14) {
    lines.push(`RSI (14 periodos): ${rsi14.value} (${rsi14.condition.toUpperCase()})`);
  }

  if (macd) {
    lines.push(`MACD (12,26,9): MACD: ${macd.macd} | Señal: ${macd.signal} | Histograma: ${macd.histogram} (Sesgo: ${macd.trend})`);
  }

  if (bollinger) {
    lines.push(`Bandas de Bollinger (20, 2): Superior: ${bollinger.upper} | Media: ${bollinger.middle} | Inferior: ${bollinger.lower} (Ancho: ${bollinger.bandwidthPct}%, Estado: ${bollinger.pricePosition})`);
  }

  if (atr14) {
    lines.push(`ATR (14 periodos / Volatilidad): ${atr14.value}${atr14.pipsEstimate !== undefined ? ` (~${atr14.pipsEstimate} pips/unidades)` : ''}`);
  }

  if (recentRange) {
    lines.push(`Rango reciente (${recentRange.candlesCount} velas): Máximo local: ${recentRange.high} | Mínimo local: ${recentRange.low} (Rango: ${recentRange.spread})`);
  }
  if (volumeProfile) lines.push(`Volumen OHLCV: último ${volumeProfile.last} | media20 ${volumeProfile.average20} | ratio ${volumeProfile.ratioToAverage20}x`);
  if (gap) lines.push(`Gap vs cierre anterior: ${gap.absolute} (${gap.percent}%)`);
  lines.push('Datos NO disponibles: spread bid/ask, profundidad de libro, noticias/calendario verificados, fundamentales, derivados y on-chain salvo inyección explícita.');

  lines.push('========================================================');
  return lines.join('\n');
}

export interface BuildSnapshotOptions {
  /**
   * Reconstruye la foto de mercado tal y como estaba en un instante histórico (UTC,
   * `YYYY-MM-DD` o `YYYY-MM-DD HH:MM:SS`): solo se usan velas cerradas hasta esa fecha y la
   * frescura se calcula respecto a ese instante (no respecto a "ahora"). No inventa velas: si
   * el proveedor no tiene histórico suficiente para ese rango, devuelve lo que haya o `null`.
   */
  asOf?: string;
  /** Ignora la caché de 60 s de `getCandles` (para scripts de validación reproducible). */
  noCache?: boolean;
}

/** Cabecera de trazabilidad para un snapshot histórico: fuente, símbolo, timeframe, rango y corte. */
function historicalProvenanceHeader(
  pair: string,
  timeframe: string,
  asOf: string,
  candles: Candle[]
): string {
  const first = candles[0] ? new Date(candles[0].time * 1000).toISOString() : 'n/d';
  const last = candles[candles.length - 1] ? new Date(candles[candles.length - 1].time * 1000).toISOString() : 'n/d';
  return [
    `=== VENTANA HISTÓRICA REPRODUCIBLE ===`,
    `Fuente: ${candleSourceLabel(pair)} | Símbolo: ${pair} | Timeframe: ${timeframe}`,
    `Corte superior (as_of, UTC): ${asOf}`,
    `Velas usadas: ${candles.length} | Rango: ${first} → ${last}`,
    `La foto refleja SOLO velas cerradas hasta el corte; la frescura se evalúa respecto a esa fecha.`,
    `======================================`,
  ].join('\n');
}

export async function buildMarketSnapshot(
  pair: string,
  timeframe: string,
  opts: BuildSnapshotOptions = {}
): Promise<string | null> {
  try {
    const candles = await getCandles(pair, timeframe, { endDate: opts.asOf, noCache: opts.noCache });
    if (!candles || candles.length === 0) {
      console.warn(`[marketSnapshot] No se obtuvieron velas para ${pair} (${timeframe})`);
      return null;
    }
    const nowMs = opts.asOf ? (parseEndDateToEpochSec(opts.asOf) ?? Date.now() / 1000) * 1000 : Date.now();
    const data = computeSnapshotFromCandles(candles, pair, timeframe, nowMs);
    if (!data) {
      console.warn(`[marketSnapshot] Velas insuficientes para calcular indicadores (${candles.length}) para ${pair}`);
      return null;
    }
    const body = formatSnapshotText(data);
    return opts.asOf ? `${historicalProvenanceHeader(pair, timeframe, opts.asOf, candles)}\n${body}` : body;
  } catch (err) {
    console.warn(`[marketSnapshot] No se pudo obtener snapshot de mercado para ${pair} (${timeframe}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

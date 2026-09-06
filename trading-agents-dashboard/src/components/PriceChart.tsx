import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import { useAgentStore } from '../lib/store';
import { api } from '../lib/api';
import type { Candle } from '../types/candle';
import {
  computeSMA,
  computeEMA,
  computeRSI,
  computeATR,
  computeBollingerBands,
  computeMACD,
  computeStochastic,
} from '../lib/indicators';

// lightweight-charts v5 tipa `time` como el branded type `Time` (UTCTimestamp),
// no como `number` plano. Nuestros datos (backend + technicalindicators) usan
// unix seconds normales, así que convertimos en el borde antes de cada setData.
function withTime<T extends { time: number }>(rows: T[]): (Omit<T, 'time'> & { time: Time })[] {
  return rows.map((r) => ({ ...r, time: r.time as unknown as Time }));
}

type IndicatorKey = 'sma20' | 'sma50' | 'sma200' | 'ema20' | 'ema50' | 'bb' | 'volume' | 'rsi' | 'macd' | 'stoch' | 'atr';

const INDICATOR_DEFS: { key: IndicatorKey; label: string }[] = [
  { key: 'sma20', label: 'SMA 20' },
  { key: 'sma50', label: 'SMA 50' },
  { key: 'sma200', label: 'SMA 200' },
  { key: 'ema20', label: 'EMA 20' },
  { key: 'ema50', label: 'EMA 50' },
  { key: 'bb', label: 'Bollinger 20,2' },
  { key: 'volume', label: 'Volumen' },
  { key: 'rsi', label: 'RSI 14' },
  { key: 'macd', label: 'MACD 12,26,9' },
  { key: 'stoch', label: 'Estocástico 14,3,3' },
  { key: 'atr', label: 'ATR 14' },
];

const DEFAULT_ACTIVE: IndicatorKey[] = ['sma20', 'sma50', 'volume'];

const MAIN_PANE_HEIGHT = 460;
const SUB_PANE_HEIGHTS: Partial<Record<IndicatorKey, number>> = {
  volume: 110,
  rsi: 130,
  macd: 130,
  stoch: 130,
  atr: 110,
};

function totalChartHeight(active: Set<IndicatorKey>): number {
  let height = MAIN_PANE_HEIGHT;
  for (const [key, paneHeight] of Object.entries(SUB_PANE_HEIGHTS) as [IndicatorKey, number][]) {
    if (active.has(key)) height += paneHeight;
  }
  return height;
}

export const PriceChart = () => {
  const { selectedPair, timeframe } = useAgentStore();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Set<IndicatorKey>>(new Set(DEFAULT_ACTIVE));

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      api
        .listCandles(selectedPair, timeframe)
        .then((data) => {
          if (!cancelled) setCandles(data);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las velas');
            setCandles([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [selectedPair, timeframe]);

  const toggleIndicator = (key: IndicatorKey) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#7c8aa5',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        panes: { separatorColor: '#24304a' },
      },
      grid: {
        vertLines: { color: '#161d2e' },
        horzLines: { color: '#161d2e' },
      },
      timeScale: { borderColor: '#24304a', timeVisible: true },
      rightPriceScale: { borderColor: '#24304a' },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#34e5a8',
      downColor: '#fb4570',
      borderVisible: false,
      wickUpColor: '#34e5a8',
      wickDownColor: '#fb4570',
    });
    candleSeries.setData(withTime(candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))));

    if (active.has('sma20')) {
      const s = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 1, title: 'SMA 20' });
      s.setData(withTime(computeSMA(candles, 20)));
    }
    if (active.has('sma50')) {
      const s = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: 'SMA 50' });
      s.setData(withTime(computeSMA(candles, 50)));
    }
    if (active.has('sma200')) {
      const s = chart.addSeries(LineSeries, { color: '#eaf1fb', lineWidth: 1, title: 'SMA 200' });
      s.setData(withTime(computeSMA(candles, 200)));
    }
    if (active.has('ema20')) {
      const s = chart.addSeries(LineSeries, { color: '#34e5a8', lineWidth: 1, title: 'EMA 20' });
      s.setData(withTime(computeEMA(candles, 20)));
    }
    if (active.has('ema50')) {
      const s = chart.addSeries(LineSeries, { color: '#fb4570', lineWidth: 1, title: 'EMA 50' });
      s.setData(withTime(computeEMA(candles, 50)));
    }
    if (active.has('bb')) {
      const bb = computeBollingerBands(candles);
      const upper = chart.addSeries(LineSeries, { color: '#7ee6f7', lineWidth: 1, title: 'BB superior' });
      upper.setData(withTime(bb.upper));
      const lower = chart.addSeries(LineSeries, { color: '#7ee6f7', lineWidth: 1, title: 'BB inferior' });
      lower.setData(withTime(bb.lower));
    }

    let paneIndex = 1;

    if (active.has('volume')) {
      const s = chart.addSeries(HistogramSeries, { color: '#24304a' }, paneIndex);
      s.setData(
        withTime(candles.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#34e5a855' : '#fb457055' })))
      );
      chart.panes()[paneIndex]?.setHeight(SUB_PANE_HEIGHTS.volume!);
      paneIndex += 1;
    }
    if (active.has('rsi')) {
      const s = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 1, title: 'RSI 14' }, paneIndex);
      s.setData(withTime(computeRSI(candles)));
      chart.panes()[paneIndex]?.setHeight(SUB_PANE_HEIGHTS.rsi!);
      paneIndex += 1;
    }
    if (active.has('macd')) {
      const macd = computeMACD(candles);
      const line = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 1, title: 'MACD' }, paneIndex);
      line.setData(withTime(macd.macd));
      const signal = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: 'Señal' }, paneIndex);
      signal.setData(withTime(macd.signal));
      const hist = chart.addSeries(HistogramSeries, { color: '#7c8aa5', title: 'Histograma' }, paneIndex);
      hist.setData(withTime(macd.histogram.map((p) => ({ time: p.time, value: p.value, color: p.value >= 0 ? '#34e5a855' : '#fb457055' }))));
      chart.panes()[paneIndex]?.setHeight(SUB_PANE_HEIGHTS.macd!);
      paneIndex += 1;
    }
    if (active.has('stoch')) {
      const stoch = computeStochastic(candles);
      const k = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 1, title: '%K' }, paneIndex);
      k.setData(withTime(stoch.k));
      const d = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: '%D' }, paneIndex);
      d.setData(withTime(stoch.d));
      chart.panes()[paneIndex]?.setHeight(SUB_PANE_HEIGHTS.stoch!);
      paneIndex += 1;
    }
    if (active.has('atr')) {
      const s = chart.addSeries(LineSeries, { color: '#eaf1fb', lineWidth: 1, title: 'ATR 14' }, paneIndex);
      s.setData(withTime(computeATR(candles)));
      chart.panes()[paneIndex]?.setHeight(SUB_PANE_HEIGHTS.atr!);
      paneIndex += 1;
    }

    chart.panes()[0]?.setHeight(MAIN_PANE_HEIGHT);
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, active]);

  return (
    <div className="cyber-panel border border-cyan/25 rounded-2xl p-5 md:p-6 mb-12 card-edge relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-line-bright/60">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-bull shadow-[0_0_8px_#00ff9f] animate-pulse" />
          <h2 className="font-display font-black text-xl text-paper tracking-wide flex items-center gap-2.5">
            <span className="text-cyan glow-text-cyan">{selectedPair}</span>
            <span className="font-mono text-xs font-bold text-slate-300 border border-cyan/30 px-2.5 py-0.5 rounded bg-cyan/10 shadow-[0_0_10px_rgba(0,240,255,0.15)]">
              {timeframe}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INDICATOR_DEFS.map((def) => (
            <button
              key={def.key}
              onClick={() => toggleIndicator(def.key)}
              className={`font-mono text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                active.has(def.key)
                  ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-[0_0_14px_rgba(0,240,255,0.4)] glow-text-cyan'
                  : 'bg-void/50 border-line-bright text-muted hover:text-slate-200 hover:border-cyan/50 hover:bg-panel-raised/80'
              }`}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">Cargando datos de mercado…</p>
        </div>
      )}

      {!loading && error && (
        <div className="px-5 py-4 bg-bear/10 border border-bear/40 rounded-xl shadow-[0_0_15px_rgba(255,42,109,0.2)]">
          <p className="text-base text-bear font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && candles.length === 0 && (
        <p className="text-muted text-base py-12 text-center font-mono">No hay datos de velas disponibles para este par.</p>
      )}

      {!loading && !error && candles.length > 0 && (
        <div ref={containerRef} className="w-full" style={{ height: totalChartHeight(active) }} />
      )}
    </div>
  );
};

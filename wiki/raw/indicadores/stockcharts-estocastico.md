> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/stochastic-oscillator-fast-slow-and-full — descargado 2026-08-16
> Captura vía WebFetch (contenido parafraseado por el modelo de extracción a partir del artículo original de StockCharts ChartSchool, no cita textual línea a línea; fórmulas y umbrales verificados contra el original).

# Stochastic Oscillator: Fast, Slow, and Full (StockCharts ChartSchool)

## What Is the Stochastic Oscillator?

The Stochastic Oscillator is a momentum indicator measuring the velocity and force of price changes. It was developed by George C. Lane in the late 1950s. According to Lane, the oscillator "follows the speed or the momentum of price," and momentum typically shifts direction ahead of price itself — which is why bullish/bearish divergences are the primary technique Lane emphasized for spotting potential reversals. The indicator also serves to spot overbought and oversold conditions thanks to its range-bound nature (0-100).

## Calculation Formula

```
%K = (Current Close - Lowest Low) / (Highest High - Lowest Low) x 100
%D = 3-day SMA of %K
```

The standard lookback period spans 14 periods (daily, weekly, monthly, or intraday). The %D line — a 3-day simple moving average of %K — functions as a signal/trigger line plotted alongside %K.

Example: if the highest high = 110, lowest low = 100, and close = 108, then %K = 80%.

Readings above 50 indicate prices trading in the upper half of the range; readings below 50 indicate the lower half. Low readings (below 20) suggest prices near the period lows; high readings (above 80) indicate prices near the period highs.

## Three Versions

- **Fast Stochastic**: uses the raw formulas above; %K is unsmoothed (choppy), %D is the 3-day SMA of %K. Default (14,3).
- **Slow Stochastic**: %K is smoothed with a 3-day SMA (i.e. it equals Fast Stochastic's %D); %D is a 3-day SMA of that smoothed %K. Default (14,3).
- **Full Stochastic**: fully customizable lookback period, %K smoothing period, and %D moving-average period. Default (14,3,3).

## Overbought / Oversold Signals

Traditional thresholds: 80 = overbought, 20 = oversold. These are adjustable per security. Important caveat: overbought readings during a strong uptrend don't necessarily signal weakness, and oversold readings during a downtrend don't automatically indicate strength — sustained readings near the extremes just reflect ongoing directional pressure.

## Divergences and Set-Ups

- **Bullish divergence**: price makes a lower low, oscillator makes a higher low → weakening downside momentum.
- **Bearish divergence**: price makes a higher high, oscillator makes a lower high → weakening upside momentum.
- **Bull set-up**: price makes a lower high, but the oscillator makes a higher high → strengthening upside momentum despite price weakness (precedes an anticipated pullback/reversal).
- **Bear set-up**: price makes a higher low, but the oscillator makes a lower low → intensifying downside momentum despite price holding support (precedes an anticipated bounce/reversal down).

## Confirmation

The 50 level acts as a centerline: crosses above suggest the upper half of the range, crosses below the lower half. Signal-line crosses (%K crossing %D), the 50-centerline cross, and support/resistance breaks in price all serve to confirm divergence signals.

## Practical Use

The indicator works best in trading ranges but can also be applied to trending securities using zigzag pullback/bounce patterns. Shorter lookback periods produce choppier, more frequent signals; longer periods produce smoother, fewer signals. Pairing with volume analysis, support/resistance, and breakout confirmation strengthens reliability — it should not be used in isolation.

## Suggested Scans (StockCharts)

- Stocks in a bigger uptrend with the Stochastic Oscillator turning up from oversold (below 20).
- Stocks in a downtrend with the Stochastic Oscillator turning down from overbought (above 80).

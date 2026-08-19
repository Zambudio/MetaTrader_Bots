> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/chaikin-money-flow-cmf — descargado 2026-08-16
> Captura vía WebFetch (contenido parafraseado por el modelo de extracción a partir del artículo original de StockCharts ChartSchool, no cita textual línea a línea; fórmulas y umbrales verificados contra el original).

# Chaikin Money Flow (CMF) (StockCharts ChartSchool)

## What Is Chaikin Money Flow?

Marc Chaikin developed CMF to measure the amount of money flowing into (or out of) an asset over a specific period. It builds on Money Flow Volume, summing it over a lookback period (typically 20-21 periods) instead of accumulating it indefinitely like the Accumulation/Distribution Line. The result is an oscillator that fluctuates above and below zero.

## Calculation

1. **Money Flow Multiplier** = [(Close - Low) - (High - Close)] / (High - Low)
2. **Money Flow Volume** = Money Flow Multiplier x Period Volume
3. **20-period CMF** = (20-period Sum of Money Flow Volume) / (20-period Sum of Volume)

The multiplier ranges from -1 to +1 depending on where the close falls within the period's high-low range: a close near the high produces a multiplier near +1; a close near the low, near -1.

CMF itself oscillates between -1 and +1, though it rarely reaches those extremes in practice — typical fluctuation is between -0.50 and +0.50.

## Interpretation

Positive CMF indicates buying pressure; negative CMF indicates selling pressure. Analysts use CMF to confirm or question the price action of a security: positive CMF supports an uptrend, negative CMF challenges it.

### Zero-line crosses

Crosses above zero suggest strengthening buying pressure; crosses below suggest strengthening selling pressure. Because brief crosses create whipsaws, many practitioners apply a buffer — treating +0.05 as the bullish threshold and -0.05 as the bearish threshold — to filter out weaker signals.

### Divergences

A bullish divergence in CMF (price makes a lower low, CMF makes a higher low) shows *less selling pressure*, not necessarily active buying — CMF needs to turn positive to confirm genuine accumulation.

## Limitations

- **Choppy/volatile markets**: CMF's sensitivity to price fluctuations makes it prone to whipsaws in choppy conditions.
- **Gap quirk**: because CMF is based on where the close sits within the day's high-low range (not close-to-close change), a security can gap down and close significantly lower yet still produce a rising Money Flow Multiplier if the close lands above the midpoint of that day's range — a calculation disconnect from the actual price action.
- **Not standalone**: should be used together with pure price oscillators such as MACD or RSI, not alone.

## Scanning Applications (StockCharts)

- CMF turns positive + RSI above 50 → accumulation with momentum confirmation.
- CMF turns negative + RSI below 45 → distribution with momentum confirmation.

Note: daily volume data is incomplete intraday — volume-based scans (like CMF) should be based on the last market close.

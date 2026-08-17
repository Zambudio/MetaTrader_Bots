> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/money-flow-index-mfi — descargado 2026-08-16
> Captura vía WebFetch (contenido parafraseado por el modelo de extracción a partir del artículo original de StockCharts ChartSchool, no cita textual línea a línea; fórmulas y umbrales verificados contra el original).

# Money Flow Index (MFI) (StockCharts ChartSchool)

## What Is the MFI?

The Money Flow Index is an oscillator that uses price and volume to measure buying and selling pressure. It was created by Gene Quong and Avrum Soudack, and is sometimes described as a "volume-weighted RSI". It starts from the typical price of each period: when typical price rises, money flow for that period is positive (buying pressure); when it falls, money flow is negative (selling pressure). These flows are then run through an RSI-style formula to produce an oscillator ranging from 0 to 100.

## Calculation (14-period default)

```
Typical Price = (High + Low + Close) / 3
Raw Money Flow = Typical Price x Volume
Money Flow Ratio = (14-period Positive Money Flow) / (14-period Negative Money Flow)
Money Flow Index = 100 - [100 / (1 + Money Flow Ratio)]
```

Raw Money Flow is essentially dollar volume. Periods where typical price is unchanged are excluded from the sum. The Money Flow Ratio divides the summed positive money flow by the summed negative money flow over the lookback window, then the result is normalized with the same formula RSI uses.

## Interpretation

### Overbought / oversold

MFI above 80 suggests overbought; below 20 suggests oversold. More extreme readings — above 90 or below 10 — are rare and point to a genuinely unsustainable price move. As with any oscillator, confirmation from price action is recommended before acting.

### Divergences

- Bullish divergence: price makes a lower low, MFI makes a higher low.
- Bearish divergence: price makes a higher high, MFI makes a lower high.

### Failure swings

- Bullish failure swing: MFI drops below 20, rebounds and holds above 20, then breaks its prior high.
- Bearish failure swing: MFI rises above 80, drops back and fails to reclaim 80, then breaks its prior low.

Divergence and failure swing occurring together produce a substantially more robust signal than either alone.

## Comparison to RSI

MFI differs from a standard RSI by incorporating volume into the calculation. Because volume is theoretically a price leader, this can give MFI increased lead time in flagging potential reversals compared to a pure price-based RSI.

## Limitations

MFI should not be used by itself — it works best combined with other momentum oscillators or pattern/price analysis for confirmation.

## Scanning Applications (StockCharts)

- MFI oversold scan: price above $20, daily volume above 100,000 shares, MFI below 10.
- MFI overbought scan: price above $20, daily volume above 100,000 shares, MFI above 90.

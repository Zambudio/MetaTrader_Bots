> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/on-balance-volume-obv.md — descargado 2026-08-16
> Captura completa vía WebFetch. Cubre On Balance Volume (OBV) como indicador representativo de volumen; el índice de StockCharts ChartSchool también lista Chaikin Money Flow (CMF) y Money Flow Index (MFI) como indicadores de volumen relacionados, no descargados individualmente en esta ingesta (ver `wiki/raw/README.md` — quedan como pendiente si se quiere ampliar).

# On Balance Volume (OBV) (StockCharts ChartSchool)

## What Is On Balance Volume (OBV)?

The On Balance Volume (OBV) is an indicator that assesses a security's buying and selling pressure by analyzing cumulative volume. It adds volume on days when the price rises and subtracts it on days when the price declines.

OBV was originally developed by Joe Granville, and he first explained it in his 1963 book *Granville's New Key to Stock Market Profits*. The OBV is noteworthy because it was among the earliest metrics to track the inflow and outflow of volume. By comparing the OBV with price action, analysts can detect divergences that may forecast future price shifts, or they can use the OBV to confirm existing price trends.

## Calculating OBV

The On Balance Volume (OBV) line is simply a running total of positive and negative volume. A period's volume is positive when the close is above the prior close and is negative when the close is below the prior close.

```
If the closing price is above the prior close price then:
Current OBV = Previous OBV + Current Volume

If the closing price is below the prior close price then:
Current OBV = Previous OBV - Current Volume

If the closing prices equals the prior close price then:
Current OBV = Previous OBV (no change)
```

**Note:** The scale of OBV is not relevant, and is not even shown on SharpCharts. Instead, chartists look at whether the OBV line is up or down compared to previous trading periods.

## Interpreting OBV

Granville theorized that volume precedes price. OBV rises when volume on up days outpaces volume on down days. OBV falls when volume on down days is stronger. A rising OBV reflects positive volume pressure that can lead to higher prices. Conversely, falling OBV reflects negative volume pressure that can foreshadow lower prices.

Granville noted in his research that OBV would often move before price. Expect prices to move higher if OBV is rising while prices are either flat or moving down. Expect prices to move lower if OBV is falling while prices are either flat or moving up.

The absolute value of OBV is not important. Chartists should instead focus on the characteristics of the OBV line: first, define the trend for OBV; second, determine if the current trend matches the trend for the underlying security; third, look for potential support or resistance levels. Once broken, the trend for OBV will change and these breaks can be used to generate signals. OBV is based on closing prices, so closing prices should be considered when looking for divergences or support/resistance breaks. Finally, volume spikes can sometimes throw off the indicator by causing a sharp move that will require a settling period.

### Divergences

Bullish and bearish divergence signals can be used to anticipate a trend reversal. These signals are based on the theory that volume precedes prices. A bullish divergence forms when OBV moves higher or forms a higher low even as prices move lower or forge a lower low. A bearish divergence forms when OBV moves lower or forms a lower low even as prices move higher or forge a higher high. The divergence between OBV and price should alert chartists that a price reversal could be in the making.

Rising OBV during a trading range indicates accumulation, which is bullish.

### Trend Confirmation

OBV can be used to confirm a price trend, upside breakout or downside break. Sometimes OBV moves step-for-step with the underlying security — in this case, OBV is confirming the strength of the underlying trend, be it down or up.

## The Bottom Line

On Balance Volume (OBV) uses volume and price to measure buying and selling pressure. Buying pressure is evident when positive volume exceeds negative volume, and the OBV line rises. Selling pressure occurs when negative volume exceeds positive volume, and the OBV line falls. Analysts can use OBV to confirm the underlying trend or look for divergences that may foreshadow a price change. As with all indicators, it's important to use OBV in conjunction with other aspects of technical analysis. It's not a standalone indicator. OBV can be combined with basic pattern analysis or to confirm signals from momentum oscillators.

## Charting with OBV

### Using with SharpCharts

On Balance Volume (OBV) is available in SharpCharts as an indicator. After selecting, OBV can be positioned above, below or behind the price plot of the underlying security. Positioning it behind the plot makes it easy to compare OBV with the underlying security. Chartists can also add a moving average or another overlay to OBV using the Overlay setting for the OBV indicator.

## Scanning for OBV

**Note**: For scanning purposes, daily volume data is incomplete during the trading day. When running scans with volume-based indicators like OBV, base the scan on the "Last Market Close."

## Additional Resources

John Murphy's *Technical Analysis of the Financial Markets* covers it all with explanations that are simple and clear. Murphy covers all the major chart patterns and indicators, including OBV. A complete chapter is devoted to understanding volume and open interest.

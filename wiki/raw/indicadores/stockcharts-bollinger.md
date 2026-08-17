> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/bollinger-bands.md — descargado 2026-08-16
> Captura completa vía WebFetch.

# Bollinger Bands (StockCharts ChartSchool)

## What Are Bollinger Bands?

Developed by John Bollinger, Bollinger Bands® are volatility bands placed above and below a moving average. Volatility is based on the standard deviation, which changes as volatility increases and decreases. The bands automatically widen when volatility increases and contract when volatility decreases. Their dynamic nature allows them to be used on different securities with the standard settings.

Bollinger Bands can be used to confirm M-Tops and W-Bottoms or to determine the trend's strength. Signals based on the distance between the upper and lower band, including the popular Bollinger Band Squeeze, are identified using the related Bollinger BandWidth indicator.

## Bollinger Bands Calculation

```
Middle Band = 20-day simple moving average (SMA)
Upper Band = 20-day SMA + (20-day standard deviation of price x 2)
Lower Band = 20-day SMA - (20-day standard deviation of price x 2)
```

Bollinger Bands consist of a middle band with two outer bands. The middle band is a simple moving average that is usually set at 20 periods. A simple moving average is used because the standard deviation formula also uses a simple moving average. The look-back period for the standard deviation is the same as for the simple moving average. The outer bands are usually set 2 standard deviations above and below the middle band.

### Adjusting Bollinger Band Settings

Settings can be adjusted to suit the characteristics of particular securities or trading styles. Bollinger recommends making small incremental adjustments to the standard deviation multiplier. With a 20-day SMA and 20-day standard deviation, the standard deviation multiplier is set at 2. Bollinger suggests increasing the standard deviation multiplier to 2.1 for a 50-period SMA and decreasing the standard deviation multiplier to 1.9 for a 10-period SMA.

## Interpreting Bollinger Bands

Bollinger Bands are often used to help confirm trend reversals. M-Tops and W-Bottoms are chart patterns that can indicate a trend reversal; the chart pattern's position relative to the Bollinger Bands helps confirm the chart pattern.

The strength of the trend can also be determined by how closely prices follow the upper Bollinger Band in a strong uptrend, or the lower Bollinger Band in a strong downtrend. This is often referred to as "walking the bands".

### Confirming W-Bottom Chart Patterns

Bollinger looks for W-Bottoms where the second low is lower than the first but holds above the lower band. Four steps to confirm a W-Bottom with Bollinger Bands:
1. A reaction low forms. This low is usually, but not always, below the lower band.
2. There is a bounce towards the middle band.
3. There is a new price low in the security. This low holds above the lower band.
4. The pattern is confirmed with a strong move off the second low and a resistance break.

### Confirming M-Top Chart Patterns

M-Tops are essentially the opposite of W-Bottoms. According to Bollinger, tops are usually more complicated and drawn out than bottoms. A non-confirmation (warning of a reversal) occurs with three steps:
1. A security creates a reaction high above the upper band.
2. There is a pullback towards the middle band.
3. Prices move above the prior high but fail to reach the upper band. This is a warning sign.

The inability of the second reaction high to reach the upper band shows waning momentum, which can foreshadow a trend reversal. Final confirmation comes with a support break or bearish indicator signal.

### Measuring Trend Strength: Walking the Bands

Moves above or below the bands are not signals per se. As Bollinger puts it, moves that touch or exceed the bands are not signals, but rather "tags". A move to the upper band shows strength, while a sharp move to the lower band shows weakness. Prices can "walk the band" with numerous touches during a strong uptrend — it takes a pretty strong price move to exceed the upper band (2 standard deviations above the 20-period SMA). Just as a strong uptrend produces numerous upper band tags, it is also common for prices to never reach the lower band during an uptrend; the 20-day SMA sometimes acts as support.

## The Bottom Line

Bollinger Bands reflect direction with the 20-period SMA and volatility with the upper/lower bands. As such, they can determine if prices are relatively high or low. According to Bollinger, "the bands should contain 88-89% of price action, which makes a move outside the bands significant." Technically, prices are relatively high when they're above the upper band and relatively low when below the lower band. However, "relatively high" should not be regarded as bearish or a sell signal. Likewise, "relatively low" should not be considered bullish or a buy signal. Prices are high or low for a reason. As with other indicators, Bollinger Bands are not meant to be used as a stand-alone tool. Chartists should combine Bollinger Bands with basic trend analysis and other indicators for confirmation.

## Charting with Bollinger Bands

### Using with SharpCharts

Bollinger Bands can be found in SharpCharts as a price overlay. Upon selecting Bollinger Bands, the default setting will appear in the parameters window (20,2). The first number (20) sets the periods for the simple moving average and the standard deviation. The second number (2) sets the standard deviation multiplier for the upper and lower bands. A Bollinger Band overlay can be set at (50,2.1) for a longer timeframe or at (10,1.9) for a shorter timeframe.

> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi.md — descargado 2026-08-16
> Captura completa vía WebFetch.

# Relative Strength Index (RSI) (StockCharts ChartSchool)

## What Is the Relative Strength Index (RSI)?

The RSI, a momentum oscillator developed by J. Welles Wilder, measures the speed and change of price movements. The RSI moves up and down (oscillates) between zero and 100. When the RSI is above 70, it generally indicates overbought conditions; when the RSI is below 30, it indicates oversold conditions. The RSI also generates trading signals via divergences, failure swings, and centerline crossovers. You could also use the RSI to identify the general trend.

RSI is a popular momentum indicator that has been featured in a number of articles, interviews, and books over the years. In particular, Constance Brown's book, *Technical Analysis for the Trading Professional*, features the concept of bull and bear market ranges for RSI. Andrew Cardwell, Brown's RSI mentor, introduced positive and negative reversals for RSI and turned the notion of divergence, literally and figuratively, on its head.

Wilder features RSI in his 1978 book, *New Concepts in Technical Trading Systems*. This book also includes the Parabolic SAR, Average True Range, and the Directional Movement Concept (ADX). Despite being developed before the computer age, Wilder's indicators have stood the test of time and continue to be applied by chart analysts.

## RSI Calculation

There are three basic components in the RSI—**RS**, **Average Gain**, and **Average Loss**. This RSI calculation is based on 14 periods, the default Wilder suggested in his book. Losses are expressed as positive values, not negative values.

```
                  100
    RSI = 100 - --------
                 1 + RS

    RS = Average Gain / Average Loss
```

The first calculations for average gain and average loss are simple 14-period averages:

* First Average Gain = Sum of Gains over the past 14 periods / 14.
* First Average Loss = Sum of Losses over the past 14 periods / 14.

The second and subsequent, calculations are based on the prior averages and the current gain loss:

* Average Gain = [(previous Average Gain) x 13 + current Gain] / 14.
* Average Loss = [(previous Average Loss) x 13 + current Loss] / 14.

Taking the prior value plus the current value is a smoothing technique similar to calculating an exponential moving average. This also means RSI values become more accurate as the calculation period extends. SharpCharts uses at least 250 data points before the starting date of any chart (assuming that much data exists) when calculating its RSI values.

Wilder's formula normalizes RS and turns it into an oscillator that fluctuates between zero and 100. The normalization step makes it easier to identify extremes because RSI is range-bound. When the Average Gain equals zero, RSI is zero. So, if you're using a 14-period RSI, a zero RSI value means prices moved lower in all 14 periods. There were no gains to measure. RSI is 100 when the Average Loss equals zero. This means prices moved higher in all 14 periods, and there were no losses to measure.

### Adjusting RSI Parameters

The default look-back period for RSI is 14, but you can lower it to increase sensitivity or raise it to decrease sensitivity. A 10-day RSI is more likely to reach overbought or oversold levels than a 20-day RSI. The look-back parameters also depend on a security's volatility. The 14-day RSI for a volatile stock such as Amazon (AMZN) is more likely to become overbought or oversold than a 14-day RSI for a utility company such as Duke Energy (DUK).

The traditional overbought and oversold levels can be adjusted to better fit the security or analytical requirements. Raising the overbought threshold to 80 or lowering the oversold threshold to 20 could reduce the number of overbought/oversold readings. Short-term traders sometimes use 2-period RSI to look for overbought readings above 80 and oversold readings below 20.

RSI can be added to many timeframes - daily, weekly, hourly, and minute charts. The best timeframe to use depends on your trading strategy and goals.

## Interpreting RSI

### Overbought and Oversold RSI Levels

Wilder considered RSI overbought above 70 and oversold below 30. Bottoming/topping can be a process—a stock does not necessarily bottom or top as soon as the oversold/overbought reading appears. Momentum oscillators can become overbought (oversold) and remain so in a strong up (down) trend.

Like many momentum oscillators, overbought and oversold readings for RSI work best when prices move sideways within a range.

### Bullish and Bearish Divergences in RSI

According to Wilder, divergences signal a potential reversal point because directional momentum does not confirm price. A bullish divergence occurs when the underlying security makes a lower low, and RSI forms a higher low. RSI does not confirm the lower low, and this shows strengthening momentum. A bearish divergence forms when the security records a higher high and RSI forms a lower high. RSI does not confirm the new high and this shows weakening momentum.

Divergences tend to be more robust when they form after an overbought or oversold reading. Before getting too excited about divergences as great trading signals, it must be noted that divergences are misleading in a strong trend. A strong uptrend can show numerous bearish divergences before a top materializes. Conversely, bullish divergences can appear in a strong downtrend, yet the downtrend continues.

### RSI Failure Swings

Wilder also considered failure swings as strong indications of an impending reversal. Failure swings are independent of price action, focusing solely on RSI for signals and ignoring the concept of divergences. A bullish failure swing forms when RSI moves below 30 (oversold), bounces above 30, pulls back, holds above 30 and then breaks its prior high. A bearish failure swing forms when RSI moves above 70, pulls back, bounces, fails to exceed 70, and then breaks its prior low.

### Using RSI To Identify Trends

In *Technical Analysis for the Trading Professional*, Constance Brown suggests that oscillators do not travel between 0 and 100. Brown identifies a bull market range and a bear market range for RSI. RSI tends to fluctuate between 40 and 90 in a bull market (uptrend) with the 40–50 zone acting as support. On the flip side, RSI tends to fluctuate between 10 and 60 in a bear market (downtrend) with the 50-60 zone acting as resistance. These ranges may vary depending on RSI parameters, strength of trend and volatility of the underlying security.

### Identifying Positive and Negative Reversals With RSI

Andrew Cardwell developed positive and negative reversals for RSI, which are the opposite of bearish and bullish divergences. Cardwell's interpretation of divergences differs from Wilder's: he considered bearish divergences to be bull market phenomena (more likely to form in uptrends), and bullish divergences to be bear market phenomena (indicative of a downtrend).

A positive reversal forms when RSI forges a lower low, and the security forms a higher low. This lower low is not at oversold levels but is usually between 30 and 50. A negative reversal is the opposite: RSI forms a higher high, but the security forms a lower high, usually just below overbought levels in the 50-70 area.

## The Bottom Line

RSI is a versatile momentum oscillator that has stood the test of time. While Wilder's original interpretations help understand the indicator, the work of Brown and Cardwell takes RSI interpretation to a new level. Wilder considers overbought conditions ripe for a reversal, but overbought can also be a sign of strength. Bearish divergences still produce some good sell signals, but you must be careful in strong trends when bearish divergences are normal. Positive and negative reversals put price action of the underlying security first and the indicator second, which is how it should be. Bearish and bullish divergences place the indicator first and price action second.

Like all technical indicators, RSI should be used in conjunction with other tools and indicators to confirm signals and avoid potential false alarms.

## Charting with RSI

### Using with SharpCharts

RSI is available as an indicator for SharpCharts. Select RSI from the **Indicator** dropdown, select the **Parameter** and the position (above, below, or behind the underlying price plot). Placing RSI directly on top of the price plot accentuates the movements relative to price action of the underlying security. You can apply "advanced options" to smooth the indicator with a moving average or add a horizontal line to mark overbought or oversold levels.

## Scanning for RSI

### RSI Oversold in Uptrend
This scan reveals stocks that are in an uptrend with oversold RSI. First, stocks must be above their 200-day moving average to be in an overall uptrend. Second, RSI must cross below 30 to become oversold.

### RSI Overbought in Downtrend
This scan reveals stocks that are in a downtrend with overbought RSI turning down. First, stocks must be below their 200-day moving average to be in an overall downtrend. Second, RSI must cross above 70 to become overbought.

## Additional Resources

Constance Brown's *Technical Analysis for the Trading Professional* takes RSI to a new level with bull market and bear market ranges, positive and negative reversals, and projections based on RSI. Some methods of Andrew Cardwell, her RSI mentor, are also explained and refined in the book.

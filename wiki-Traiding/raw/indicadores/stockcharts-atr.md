> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/average-true-range-atr.md — descargado 2026-08-16
> Captura completa vía WebFetch.

# Average True Range (ATR) (StockCharts ChartSchool)

## What Is the Average True Range (ATR)?

Developed by J. Welles Wilder, the Average True Range (ATR) is an indicator that measures volatility. As with most of his indicators, Wilder designed ATR with commodities and daily prices in mind. Commodities are frequently more volatile than stocks. They are often subject to gaps and limit moves, which occur when a commodity opens up or down its maximum allowed move for the session. A volatility formula based only on the high-low range would fail to capture volatility from gap or limit moves. Wilder created the Average True Range to capture this "missing" volatility. It is important to remember that ATR doesn't indicate price direction, just volatility.

Wilder features ATR in his 1978 book, *New Concepts in Technical Trading Systems*. This book also includes the Parabolic SAR, RSI, and the Directional Movement Concept (ADX).

## True Range

Wilder started with a concept called **True Range (TR)**, which is defined as the greatest of the following:

* Method 1. Current High less the current Low
* Method 2. Current High less the previous Close (absolute value)
* Method 3. Current Low less the previous Close (absolute value)

Absolute values are used to ensure positive numbers — Wilder was interested in measuring the distance between two points, not the direction. If the current period's high is above the prior period's high and the low is below the prior period's low, then the current period's high-low range will be used as the True Range (an outside day, Method 1). Methods 2 and 3 are used when there is a gap or an inside day. A gap occurs when the previous close is greater than the current high (signaling a potential gap down or limit move) or the previous close is lower than the current low (signaling a potential gap up or limit move).

## How To Calculate ATR

Typically, the Average True Range (ATR) is based on 14 periods and can be calculated on an intraday, daily, weekly or monthly basis. Because there must be a beginning, the first TR value is simply the High minus the Low, and the first 14-day ATR is the average of the daily TR values for the last 14 days. After that, Wilder sought to smooth the data by incorporating the previous period's ATR value.

```
Current ATR = [(Prior ATR x 13) + Current TR] / 14

  - Multiply the previous 14-day ATR by 13.
  - Add the most recent day's TR value.
  - Divide the total by 14
```

For those trying this at home, a few caveats apply. First, just like with Exponential Moving Averages (EMAs), ATR values depend on how far back you begin your calculations. Even so, the remnants of the first two calculations "linger" to slightly affect subsequent ATR values — spreadsheet values for a small subset of data may not match exactly with what is seen on the price chart. Decimal rounding can also slightly affect ATR values. On their charts, calculations go back at least 250 periods (typically much further) to ensure a much greater degree of accuracy for ATR values.

## Absolute ATR

ATR is based on the True Range, which uses absolute price changes. As such, ATR reflects volatility at an absolute level. In other words, ATR is not shown as a percentage of the current close. This means low-priced stocks will have lower ATR values than high-price stocks. For example, a $20-30 security will have much lower ATR values than a $200-300 security. Because of this, ATR values are not comparable between securities. Large price movements for a single security, such as a decline from 70 to 20, can make long-term ATR comparisons impractical.

## The Bottom Line

ATR is not a directional indicator like MACD or RSI. Instead, it's a unique volatility indicator that reflects the degree of interest or disinterest in a move. Large ranges or True Ranges often accompany strong moves in either direction, which can be volatile. This is especially true at the beginning of a move. Relatively narrow ranges can accompany low-volatility moves. The ATR can validate the enthusiasm behind a move or breakout. A bullish reversal with increased ATR would show strong buying pressure and reinforce the reversal. A bearish support break with increased ATR would show strong selling pressure and reinforce the support break.

## Using ATR with SharpCharts

Listed as "Average True Range," ATR is on the Indicators drop-down menu. The "parameters" box to the right of the indicator contains the default value, 14, for the number of periods used to smooth the data. In his work, Wilder often used an 8-period ATR. SharpCharts also allows users to position the indicator above, below or behind the price plot. A moving average can be added to identify upturns or downturns in ATR.

## Suggested Scans

### Weeding Out High Volatility

The Average True Range indicator can be used in scans to weed out securities with extremely high volatility. Note that the ATR is often converted to a percentage of sorts (e.g. `ATR(250) / SMA(20,Close) * 100`) so that the ATR of different stocks can be compared on the same scale.

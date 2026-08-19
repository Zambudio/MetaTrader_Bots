> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/moving-averages-simple-and-exponential.md — descargado 2026-08-16
> Captura completa vía WebFetch.

# Moving Averages - Simple and Exponential (StockCharts ChartSchool)

## What Is a Moving Average?

A moving average represents an average of data points (typically price) calculated over a specific time period. It's termed "moving" because each calculation uses data from the previous X periods. By averaging historical data, moving averages create a trend-following indicator that smooths price fluctuations.

Moving averages don't forecast price direction; instead, they clarify current direction. However, they inherently lag since they're based on past prices. Despite this limitation, traders use them to reduce noise and identify trend direction.

These indicators help identify trends or establish potential support and resistance zones. They also serve as foundations for other technical indicators, including Bollinger Bands, MACD, and the McClellan Oscillator.

## Simple vs. Exponential Moving Averages

The two most prevalent types are the simple moving average (SMA) and exponential moving average (EMA). SMAs calculate an average over a specified timeframe, while EMAs assign greater weight to recent prices. Additional specialized varieties include DEMA, Hull Moving Average, KAMA, and TEMA.

### The Lag Factor

Because moving averages rely on historical data, they lag behind current prices. Longer moving averages produce more lag than shorter ones. Additionally, the type matters: EMAs lag less than SMAs since recent data receives heavier weighting.

A 10-day moving average closely follows prices and responds quickly to changes—comparable to a speedboat. Conversely, a 100-day moving average contains substantial historical data, responding slowly like an ocean tanker. A 100-day moving average requires larger, lengthier price movements to change direction compared to a 10-day version.

## Moving Average Calculation

### Simple Moving Average Formulas

"A simple moving average is formed by computing the average price of a security over a specific number of periods." Most are based on closing prices. A 5-day simple moving average equals the five-day sum of closing prices divided by five. As new data arrives, old data drops off, causing the average to progress chronologically.

Example with daily closing prices 11,12,13,14,15,16,17:
- First day of 5-day SMA: (11+12+13+14+15)/5 = 13
- Second day of 5-day SMA: (12+13+14+15+16)/5 = 14
- Third day of 5-day SMA: (13+14+15+16+17)/5 = 15

Notice how the moving average lags behind current prices—day one's MA equals 13 while the current price is 15, because preceding prices were lower.

### Exponential Moving Average Formulas

EMAs reduce lag by weighting recent prices more heavily. A given day's EMA calculation depends on all previous days' EMA calculations. Calculating an accurate 10-day EMA requires substantially more than 10 days of data.

Three steps comprise EMA calculation:
1. Calculate the initial SMA value
2. Calculate the weighting multiplier
3. Calculate the EMA for each day using price, multiplier, and previous period's EMA

For a 10-day EMA:
```
Initial SMA: 10-period sum / 10
Multiplier: (2 / (10 + 1)) = 0.1818 (18.18%)
EMA: {Close - EMA(previous day)} x multiplier + EMA(previous day)
```

#### EMA Weighting Multiplier

A 10-period EMA applies 18.18% weighting to the most recent price. A 20-period EMA applies 9.52% weighting. Shorter periods receive higher weightings, with weighting halving when the period doubles.

To convert a specific percentage to time periods:
```
Time Period = (2 / Percentage) - 1
3% Example: (2 / 0.03) - 1 = 65.67 time periods
```

#### EMA Accuracy

The EMA formula incorporates the previous period's EMA value, which itself incorporates prior EMA values. Each historical EMA value contributes a small portion to the current value. For maximum accuracy, calculations should theoretically use every historical data point since the security's inception. Most charting platforms calculate back at least 250 periods, resulting in EMA values accurate to fractions of a penny.

### Adjusting the Settings

#### Simple vs. Exponential Moving Averages

Neither type is inherently superior—selection depends on trading objectives. EMAs exhibit less lag and greater sensitivity to recent prices and changes. They turn before SMAs. Conversely, simple moving averages represent a genuine price average across the entire period, making them better suited for identifying support or resistance levels.

#### Lengths and Timeframes

Moving average length depends on the trader's time horizon and analytical goals. Shorter moving averages (5-20 periods) suit short-term trends and trading. Medium-term analysis uses longer moving averages (20-60 periods). Long-term investors often employ 100+ period moving averages.

Certain lengths are more popular: the 200-day moving average is perhaps most prevalent for long-term analysis. The 50-day moving average is popular for medium-term trends. Many chartists use 50-day and 200-day moving averages together. Historically, the 10-day was popular for short-term analysis due to calculation ease.

#### Base Data

Moving averages typically use closing price data, though they can be applied to opening, high, or low prices; volume data; or even other indicators.

## Interpreting Moving Averages

Moving averages identify trends and support/resistance levels. Crossovers between price and moving averages, or between two moving averages, generate trading signals. Multiple moving averages can create a Moving Average Ribbon for analyzing interactions among several MAs simultaneously.

### Identifying Trends

Moving average direction conveys critical information about prices. A rising moving average indicates generally increasing prices; a falling moving average shows declining prices. Long-term rising moving averages reflect uptrends; falling long-term moving averages reflect downtrends.

Moving averages prove highly effective during strong trends. However, they lag: identifying or confirming trend reversals occurs as reversals happen or afterward. Substantial price declines can be necessary to reverse longer moving average directions.

### Generating Trading Signals

#### Double Moving Average Crossovers

Two moving averages generate crossover signals. A bullish crossover (golden cross) occurs when a shorter moving average crosses above a longer one. A bearish crossover (death cross) happens when a shorter moving average crosses below a longer one.

These systems employ two lagging indicators, producing relatively late signals. Longer periods increase lag. While effective during strong trends, they generate numerous false signals during choppy, trendless markets. A triple crossover method involving three moving averages also exists.

#### Price Crossovers

Bullish signals occur when prices move above the moving average; bearish signals occur when prices move below it. Combining crossovers with the bigger trend works effectively: the longer moving average defines the broader trend; the shorter one generates signals. For example, if price is above the 200-day moving average, focus only on signals when price exceeds the 50-day moving average, trading with the primary uptrend.

### Identifying Support and Resistance

Moving averages can act as support during uptrends and resistance during downtrends. Short-term uptrends might find support near the 20-day simple moving average. Long-term uptrends might find support near the 200-day simple moving average, the most popular long-term moving average. The 200-day is widely followed, creating a self-fulfilling prophecy effect.

Exact support and resistance levels shouldn't be expected from moving averages, especially longer ones. Markets driven by emotion tend to overshoot. Instead, moving averages identify support or resistance zones.

## The Bottom Line

Moving averages' advantages must be weighed against disadvantages. They're trend-following, lagging indicators that always lag behind price. This isn't necessarily negative—trends are profitable to trade. Moving averages keep traders aligned with current trends. However, securities often trade sideways in ranges, rendering moving averages ineffective. Once trending begins, moving averages maintain positions but generate late signals. Don't expect precise tops and bottoms.

As with most technical tools, moving averages shouldn't be used independently but alongside complementary tools. For example, chartists might use moving averages to define overall trend, then RSI to identify overbought or oversold conditions.

## Charting with Moving Averages

Moving Average overlays (Simple and Exponential) can be added to SharpCharts and ACP Charts. Simple Moving Average overlays work with P&F Charts as well.

### Using with SharpCharts

Moving averages are available as price overlays. Users select either simple or exponential using the Overlays dropdown menu. Several setting parameters are available, though only the first is required:
- First parameter sets the period count (default: 50 for SMA, 20 for EMA)
- Optional parameter specifies the price field ("O" for Open, "H" for High, "L" for Low, "C" for Close)
- Another optional parameter shifts the moving average left (past) or right (future)

## Scanning for Moving Averages

### Bullish Moving Average Cross
This scan identifies stocks with a rising 150-day simple moving average and a bullish cross of the 5-day EMA and 35-day EMA on above-average volume.

### Bearish Moving Average Cross
This scan identifies stocks with a falling 150-day simple moving average and a bearish cross of the 5-day EMA and 35-day EMA on above-average volume.

## Additional Resources

Arthur Hill on Moving Average Crossovers covers trading system limitations based solely on moving average crossovers. John Murphy's *Technical Analysis of the Financial Markets* contains a chapter on moving averages, their applications, and advantages/disadvantages, plus information on using them with Bollinger Bands and channel-based trading systems.

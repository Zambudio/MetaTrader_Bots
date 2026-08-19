> Fuente original: https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/average-directional-index-adx — descargado 2026-08-16
> Captura vía WebFetch (contenido parafraseado/resumido por el modelo de extracción a partir del artículo original de StockCharts ChartSchool, no cita textual línea a línea; fórmulas y umbrales verificados contra el original). El cálculo detallado paso a paso no se reprodujo completo — solo el resumen de alto nivel.

# Average Directional Index (ADX) (StockCharts ChartSchool)

## Overview

The ADX, along with the Plus Directional Indicator (+DI) and Minus Directional Indicator (-DI), forms a trading system developed by Welles Wilder. Though originally designed for commodities, it applies equally to stocks and other markets. Wilder featured it in his 1978 book *New Concepts in Technical Trading Systems*, which also introduced Average True Range, Parabolic SAR, and RSI. Despite predating computers, Wilder's indicators — heavily reliant on smoothing techniques — have stood the test of time.

Three components:

- **+DI (Plus Directional Indicator)**: measures upward directional movement (conventionally plotted in green).
- **-DI (Minus Directional Indicator)**: measures downward directional movement (conventionally plotted in red).
- **ADX (Average Directional Index)**: measures trend *strength*, regardless of direction (conventionally plotted in black) — it does not tell you whether the trend is up or down, only how strong it is.

## Calculation (high level)

1. Calculate True Range (TR), Plus Directional Movement (+DM), and Minus Directional Movement (-DM) for each period.
2. Apply Wilder's smoothing technique (the same style used for RSI/ATR) across 14 periods.
3. Smoothed +DM / Smoothed TR x 100 = +DI14.
4. Smoothed -DM / Smoothed TR x 100 = -DI14.
5. DX = 100 x |(+DI14 - -DI14)| / (+DI14 + -DI14).
6. ADX = smoothed (Wilder-style) average of DX over the period.

Because of the repeated smoothing, StockCharts notes it can take around 150 periods of data before the ADX values are considered fully accurate/stable.

## Interpreting ADX (trend strength)

- ADX above 25: strong trend present.
- ADX between 20 and 25: "gray zone" — ambiguous, some analysts still use it as the threshold.
- ADX below 20: weak trend or no trend (ranging market).

ADX has meaningful lag due to the heavy smoothing involved — it confirms a trend is underway/strong rather than predicting one is about to start.

## +DI / -DI Crossover Signals

- Bullish signal: +DI crosses above -DI (ideally while ADX is above ~20-25, confirming the market is trending enough for the crossover to matter).
- Bearish signal: -DI crosses above +DI.
- A common initial stop-loss placement: the low of the signal day for a buy signal, the high of the signal day for a sell signal.

## Limitations

+DI/-DI crossovers are quite frequent and generate many false or low-quality signals on their own — Wilder's system is meant to be filtered with complementary analysis (volume, broader trend context, chart patterns) rather than traded on crossovers alone.

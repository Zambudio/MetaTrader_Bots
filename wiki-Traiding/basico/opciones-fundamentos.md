---
tags: [basico, opciones, derivados, black-scholes, griegas, volatilidad-implicita, cobertura]
updated: 2026-08-16
fuentes: [raw/basico/black-scholes-1973-options.md]
---

# Opciones — fundamentos y modelo Black-Scholes

> Nota de alcance: MetaTrader 5 y el [dashboard de este proyecto](../../trading-agents-dashboard/README.md) operan sobre spot/CFDs, no opciones — esta página establece el fundamento analítico y matemático del instrumento, indispensable para entender cobertura (*hedging*), la dinámica de las griegas, la extracción de la [volatilidad implícita](../indicadores/volatilidad-implicita-vix.md) (IV) y el comportamiento asimétrico del riesgo en los mercados.

## Qué es una opción

Una opción es un contrato derivado que otorga a su comprador el **derecho, pero no la obligación**, de comprar (**Call**) o vender (**Put**) un activo subyacente a un precio fijado de antemano (**precio de ejercicio** o *strike*, $K$) en o antes de una fecha determinada (**vencimiento**, $T$).

- **Call**: Derecho a comprar al strike $K$. Perfil alcista.
- **Put**: Derecho a vender al strike $K$. Perfil bajista o de cobertura (*protective put*).
- **Prima**: El precio que el comprador paga al vendedor (emisor) por adquirir este derecho asimétrico.

## El Modelo Black-Scholes-Merton (1973)

La valoración analítica de opciones fue formalizada por Fischer Black, Myron Scholes y Robert Merton (Premio Nobel 1997).

### Fórmulas de valoración analítica

$$C = S_0 N(d_1) - K e^{-r T} N(d_2)$$

$$P = K e^{-r T} N(-d_2) - S_0 N(-d_1)$$

Donde:
- $d_1 = \frac{\ln(S_0 / K) + (r + \frac{\sigma^2}{2}) T}{\sigma \sqrt{T}}$
- $d_2 = d_1 - \sigma \sqrt{T}$
- $S_0$: Precio spot actual del activo.
- $K$: Precio de ejercicio (*strike*).
- $T$: Tiempo al vencimiento.
- $r$: Tasa de interés libre de riesgo.
- $\sigma$: Volatilidad del subyacente.
- $N(x)$: Función de distribución normal acumulada.

## Las Griegas (Gestión cuantitativa de riesgos)

Las griegas son las derivadas parciales del precio de la opción respecto a cada variable de mercado:

| Griega | Derivada | Significado en trading |
|---|---|---|
| **Delta ($\Delta$)** | $\frac{\partial V}{\partial S}$ | Ratio de cobertura (*hedge ratio*). Variación de la prima por cada punto de movimiento del subyacente. Un Call tiene $\Delta \in (0, 1)$; un Put tiene $\Delta \in (-1, 0)$. |
| **Gamma ($\Gamma$)** | $\frac{\partial^2 V}{\partial S^2}$ | Tasa de cambio de Delta. Mide la curvatura y el riesgo de aceleración no lineal (*gamma risk* / *gamma squeeze*). |
| **Vega ($\nu$)** | $\frac{\partial V}{\partial \sigma}$ | Sensibilidad ante cambios en la volatilidad implícita. Es máxima en opciones At-The-Money (ATM). |
| **Theta ($\Theta$)** | $\frac{\partial V}{\partial t}$ | Decaimiento temporal (*time decay*). Pérdida de valor de la opción por el paso inexorable del tiempo. |
| **Rho ($\rho$)** | $\frac{\partial V}{\partial r}$ | Sensibilidad a cambios en las tasas de interés. |

## De la fórmula analítica a la Volatilidad Implícita (IV)

En la práctica financiera:
1. $S_0, K, T, r$ y el precio de mercado de la opción son conocidos.
2. Al despejar $\sigma$ de la ecuación de Black-Scholes para igualar el precio teórico al precio de mercado, se obtiene la **Volatilidad Implícita (IV)**.
3. La IV representa la expectativa prospectiva (*forward-looking*) de volatilidad consensuada por los participantes del mercado.
4. **Volatility Skew / Smile**: Debido a que los retornos financieros reales presentan colas pesadas (*fat tails*) y asimetría negativa, las opciones Put OTM suelen cotizar con mayor IV que las Call OTM (demanda institucional de coberturas de catástrofe).

## Por qué esto importa para un sistema de trading automatizado

- **Detección de régimen**: El índice [VIX](../indicadores/volatilidad-implicita-vix.md) se calcula directamente a partir de la superficie de volatilidad implícita del S&P 500, sirviendo de filtro macro para activar o desactivar estrategias de tendencia o reversión a la media.
- **Delta-Neutral Hedging**: Concepto fundamental detrás del [market making](microestructura-mercado.md) y el arbitraje estadístico de [pairs trading](../estrategias/pairs-trading.md).
- **Asimetría de riesgo**: Explica por qué el apalancamiento lineal (CFDs/Futuros) difiere estructuralmente del riesgo convexo de los derivados no lineales.

## Relación con otras páginas

Para la utilización práctica de la volatilidad implícita como termómetro de mercado y filtro de régimen, ver [volatilidad-implicita-vix.md](../indicadores/volatilidad-implicita-vix.md). Para el impacto de las fluctuaciones de volatilidad sobre el dimensionamiento de posiciones, ver [position-sizing-kelly.md](../gestion-riesgo/position-sizing-kelly.md) y [volumen-y-atr.md](../indicadores/volumen-y-atr.md).

## Fuentes

- [Black-Scholes-Merton (1973) — Valoración de opciones y volatilidad implícita](../raw/basico/black-scholes-1973-options.md) — paper fundacional de Fischer Black, Myron Scholes y Robert Merton sobre la ecuación diferencial libre de arbitraje, cálculo de primas, derivación de griegas y volatilidad implícita.

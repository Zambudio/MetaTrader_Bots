# Valoración de opciones y volatilidad implícita (Black & Scholes, 1973; Merton, 1973)

> Síntesis de los papers fundacionales de Fischer Black y Myron Scholes (*"The Pricing of Options and Corporate Liabilities"*, Journal of Political Economy, 1973) y Robert C. Merton (*"Theory of Rational Option Pricing"*, Bell Journal of Economics, 1973). Nobel de Economía 1997.

## El modelo Black-Scholes-Merton (BSM)

El modelo BSM formalizó por primera vez una fórmula analítica cerrada y libre de arbitraje para el precio de opciones europeas sobre acciones que no pagan dividendos (posteriormente extendido por Merton a dividendos continuos y por Black en 1976 a futuros/divisas, modelo Garman-Kohlhagen).

### Ecuación diferencial parcial de Black-Scholes
Bajo la asunción de que el precio del subyacente $S_t$ sigue un movimiento browniano geométrico ($dS_t = \mu S_t dt + \sigma S_t dW_t$):

$$\frac{\partial V}{\partial t} + \frac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + r S \frac{\partial V}{\partial S} - r V = 0$$

### Fórmulas de valoración

Para una opción de compra (**Call**, $C$) y una opción de venta (**Put**, $P$):

$$C(S, t) = S_0 N(d_1) - K e^{-r T} N(d_2)$$

$$P(S, t) = K e^{-r T} N(-d_2) - S_0 N(-d_1)$$

Donde:
- $d_1 = \frac{\ln(S_0 / K) + (r + \frac{\sigma^2}{2}) T}{\sigma \sqrt{T}}$
- $d_2 = d_1 - \sigma \sqrt{T}$
- $S_0$: Precio spot actual del subyacente.
- $K$: Precio de ejercicio (*strike*).
- $T$: Tiempo hasta el vencimiento (en años).
- $r$: Tasa de interés libre de riesgo.
- $\sigma$: Volatilidad del subyacente (anualizada).
- $N(x)$: Función de distribución acumulada de la normal estándar.

## Las Griegas (Sensibilidades de riesgo)

Las griegas miden cómo cambia el valor de la opción ante variaciones en los parámetros del mercado:

| Griega | Definición matemática | Interpretación operativa |
|---|---|---|
| **Delta ($\Delta$)** | $\frac{\partial V}{\partial S} = N(d_1)$ (call) | Ratio de cobertura (hedge ratio). Cambio en el precio de la opción por cada $1 de movimiento en el subyacente. |
| **Gamma ($\Gamma$)** | $\frac{\partial^2 V}{\partial S^2} = \frac{N'(d_1)}{S \sigma \sqrt{T}}$ | Curvatura y aceleración del Delta. Mide el riesgo de no linealidad y la necesidad de rebalancear la cobertura. |
| **Vega ($\nu$)** | $\frac{\partial V}{\partial \sigma} = S \sqrt{T} N'(d_1)$ | Sensibilidad al cambio en la volatilidad implícita. Es idéntica para Calls y Puts del mismo strike. |
| **Theta ($\Theta$)** | $\frac{\partial V}{\partial t}$ | Decaimiento temporal (time decay). Pérdida de valor de la opción por el simple paso del tiempo. |
| **Rho ($\rho$)** | $\frac{\partial V}{\partial r}$ | Sensibilidad a variaciones en la tasa de interés libre de riesgo. |

## De la fórmula BSM a la Volatilidad Implícita (IV)

1. En los mercados financieros reales, todos los parámetros ($S, K, T, r$) son directamente observables **salvo la volatilidad futura ($\sigma$)**.
2. Al despejar numéricamente $\sigma$ igualando la fórmula BSM al precio de cotización de mercado de la opción ($C_{mercado} = C_{BSM}(\sigma)$), se obtiene la **Volatilidad Implícita (IV)**.
3. La IV representa el consenso colectivo del mercado sobre la dispersión esperada del activo subyacente durante la vida de la opción.
4. **Volatility Smile / Skew**: En la práctica, el mercado no asigna la misma IV a todos los strikes. Las opciones OTM de protección (puts) cotizan con una IV superior a las calls (skew bajista), reflejando que los retornos reales tienen colas pesadas (*fat tails*) y asimetría negativa no contempladas por la distribución normal pura de BSM.

## Relevancia para trading automatizado y bots cuantitativos

- **Filtro de riesgo y régimen**: El nivel agregado de IV (y su índice representativo, el VIX) permite al bot identificar si el mercado descuenta calma o pánico inminente.
- **Delta Hedging**: La base de los algoritmos de cobertura dinámica y creación de mercado (market making).
- **Riesgo no lineal**: Permite entender por qué el apalancamiento con opciones se comporta de forma asimétrica (riesgo de Gamma squeeze).

## Referencias primarias

- Black, F., & Scholes, M. (1973). *The Pricing of Options and Corporate Liabilities*. Journal of Political Economy, 81(3), 637-654.
- Merton, R. C. (1973). *Theory of Rational Option Pricing*. The Bell Journal of Economics and Management Science, 4(1), 141-183.

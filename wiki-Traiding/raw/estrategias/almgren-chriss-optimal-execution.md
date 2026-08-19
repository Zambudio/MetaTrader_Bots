# Ejecución óptima de órdenes y minimización de impacto de mercado (Almgren & Chriss, 2000)

> Síntesis del paper seminal de Robert Almgren y Neil Chriss: *"Optimal Execution of Portfolio Transactions"* (Journal of Risk, 3(2), 2000, pp. 5-39). El modelo estándar de referencia en la industria financiera e institucional para la ejecución algorítmica de órdenes.

## El dilema fundamental de la ejecución

Cuando un trader o algoritmo necesita comprar o vender una posición grande ($X$ unidades) en un horizonte de tiempo $T$:
1. **Si ejecuta muy rápido (agresivo)**: Consume rápidamente la liquidez del Limit Order Book, incurriendo en un elevado **coste de impacto de mercado (slippage y spread)**.
2. **Si ejecuta muy despacio (pasivo)**: Reduce el impacto de mercado inmediato, pero queda expuesto a la **volatilidad del mercado** y al riesgo de que el precio se mueva en su contra antes de completar la orden (**riesgo de timing / varianza**).

El modelo de Almgren-Chriss resuelve matemáticamente este trade-off entre **coste esperado de transacción** y **riesgo de mercado**.

## Formulación matemática del modelo

### 1. Descomposición del impacto de mercado
El cambio de precio $S_k$ en el paso temporal $k$ se descompone en:

$$S_k = S_{k-1} + \sigma \tau^{1/2} \xi_k - \tau \gamma(v_k)$$

Y el precio efectivo de ejecución recibido $\tilde{S}_k$ es:

$$\tilde{S}_k = S_k - \eta(v_k)$$

Donde:
- $\tau$: Intervalo de tiempo entre pasos ($T / N$).
- $\xi_k$: Variable aleatoria de volatilidad ($E[\xi_k] = 0, \text{Var}(\xi_k) = 1$).
- $\gamma(v_k)$: **Impacto Permanente** (causado por el contenido informacional de la orden que desplaza el precio de equilibrio del mercado de forma duradera).
- $\eta(v_k)$: **Impacto Temporal** (fricción transitoria por consumir la profundidad del libro de órdenes, recuperándose tras la operación).
- $v_k$: Tasa de negociación en el paso $k$ ($v_k = n_k / \tau$).

### 2. Forma funcional estándar (Lineal)
Bajo la parametrización habitual lineal:
- Impacto permanente: $\gamma(v) = \gamma v$
- Impacto temporal: $\eta(v) = \epsilon \text{sgn}(v) + \eta v$ (donde $\epsilon$ es la mitad del bid-ask spread).

### 3. La función de utilidad del ejecutor
El objetivo del algoritmo es minimizar el valor esperado de la pérdida por implementación ($E[x]$) más una penalización por la varianza del resultado ($V[x]$) ponderada por el parámetro de aversión al riesgo $\lambda$:

$$U(x) = E[x] + \lambda V[x]$$

### 4. Trayectoria óptima de liquidación
La solución analítica cerrada para la trayectoria óptima del inventario remanente $x_j$ en el tiempo $t_j$:

$$x_j = \frac{\sinh(\kappa (T - t_j))}{\sinh(\kappa T)} X$$

Donde $\kappa$ es la velocidad característica de ejecución:

$$\kappa \approx \sqrt{\frac{\lambda \sigma^2}{\eta}} + \mathcal{O}(\tau)$$

- Si el operador es **muy adverso al riesgo ($\lambda \to \infty$)**: $\kappa$ es grande $\to$ la trayectoria es cóncava y agresiva (ejecuta rápido para eliminar riesgo).
- Si el operador es **neutral al riesgo ($\lambda = 0$)**: $\kappa \to 0 \to$ la trayectoria converge a una línea recta uniforme (**algoritmo TWAP** puro: Time-Weighted Average Price).

## Implicaciones para algoritmos de trading cuantitativo y EAs

1. **TWAP y VWAP**: El modelo demuestra formalmente que TWAP/VWAP no son heurísticas arbitrarias, sino soluciones óptimas bajo neutralidad al riesgo o volumen uniforme.
2. **Order Splitting**: Dividir una orden grande en $N$ tramos pequeños reduce el impacto temporal total de forma cuadrática frente a una market order monolítica.
3. **Calibración de Slippage en Backtests**: Cualquier backtest cuantitativo realista debe modelar el slippage como función creciente del tamaño de la orden relativo al volumen de mercado ($Volume\ Participation\ Rate$).

## Referencias primarias

- Almgren, R., & Chriss, N. (2000). *Optimal execution of portfolio transactions*. Journal of Risk, 3(2), 5-39.
- Almgren, R. (2003). *Optimal execution with nonlinear impact functions and trading-enhanced risk*. Applied Mathematical Finance, 10(1), 1-18.

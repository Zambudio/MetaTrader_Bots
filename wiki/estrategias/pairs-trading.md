---
tags: [estrategias, pairs-trading, arbitraje, market-neutral, cointegración, mean-reversion, ornstein-uhlenbeck]
updated: 2026-08-16
fuentes: [raw/estrategias/pairs-trading-gatev-2006-synthesis.md]
---

# Pairs trading (arbitraje estadístico)

## Concepto

Pairs trading es una estrategia **market-neutral** que explota relaciones estadísticas y econométricas entre dos activos vinculados económica o estructuralmente. Cuando el diferencial (*spread*) entre ambos diverge significativamente de su valor de equilibrio histórico, el algoritmo apuesta a la convergencia: compra el activo relativamente infravalorado (long) y vende en corto el sobrevalorado (short).

Es una forma de arbitraje estadístico (*stat-arb*) con exposición direccional neta cercana a cero ($\beta \approx 0$) — la rentabilidad proviene de la reversión a la media del spread, no del rumbo del mercado general. Es la extensión cuantitativa y multiactivo de la [reversión a la media](reversion-media.md).

## Metodología 1: Distance Approach (Gatev, Goetzmann & Rouwenhorst, 2006)

Publicado en *The Review of Financial Studies* (Vol. 19, No. 3), este enfoque no paramétrico define el marco empírico fundacional:

### 1. Fase de formación (12 meses)
- Normalizar precios de cierre acumulados dividiendo por el precio del día inicial ($P_t / P_0$).
- Calcular la suma de desviaciones al cuadrado ($SSD = \sum (P_{1,t}^{norm} - P_{2,t}^{norm})^2$) para todos los pares del universo.
- Seleccionar los $N$ pares con menor $SSD$ (mayor co-movimiento histórico).

### 2. Fase de trading (6 meses)
- Calcular el spread normalizado $S_t$ y su desviación estándar histórica $\sigma$.
- **Apertura de posición**: Cuando $|S_t - \mu| \ge 2\sigma$ (divergencia extrema). Long el activo barato, Short el caro.
- **Cierre de posición**: Cuando el spread converge a la media ($S_t = \mu$).
- **Stop temporal**: Liquidar forzosamente al finalizar el período de 6 meses si no ha revertido.

### 3. Resultados empíricos
- Período 1962-2002 (acciones US): Retorno en exceso medio anualizado de hasta **11% neto de costes de transacción**.

## Metodología 2: Cointegración Econométrica (Engle-Granger & Johansen)

A diferencia de la simple correlación (que solo mide co-movimiento de retornos y es inestable), la **cointegración** modela la existencia de una relación de equilibrio estacionaria a largo plazo entre dos series de precios no estacionarias $I(1)$.

### Proceso de dos pasos de Engle-Granger (1987)

1. **Estimación del Hedge Ratio ($\beta$)**: Regresión por mínimos cuadrados ordinarios:
   $$Y_t = \alpha + \beta X_t + \epsilon_t$$
2. **Test de Estacionariedad**: Aplicar el test Dickey-Fuller Aumentado (ADF) sobre los residuos $\epsilon_t$. Si los residuos son integrados de orden cero $I(0)$, las series están cointegradas y el spread $\epsilon_t = Y_t - \beta X_t - \alpha$ es un proceso revertiente a la media.

### Modelado del Spread como Proceso de Ornstein-Uhlenbeck (OU)

Para calcular la velocidad de reversión y el tiempo óptimo de permanencia en mercado, el spread continuo se modela como una ecuación diferencial estocástica de Ornstein-Uhlenbeck:

$$d\epsilon_t = \theta (\mu - \epsilon_t) dt + \sigma dW_t$$

Donde:
- $\theta$: Velocidad de reversión a la media.
- $\mu$: Nivel de equilibrio a largo plazo.
- **Vida Media de Reversión (*Half-Life*)**:
  $$t_{1/2} = \frac{\ln(2)}{\theta}$$
  
Un $t_{1/2}$ demasiado corto sugiere ruido de microestructura (el coste de comisiones devorará el beneficio); un $t_{1/2}$ excesivamente largo inmoviliza capital y eleva el riesgo de ruptura estructural. Los fondos cuantitativos seleccionan pares con vidas medias intermedias (típicamente entre 5 y 30 días de trading).

## Candidatos típicos para pairs trading

| Categoría | Ejemplos | Fundamento económico |
|---|---|---|
| Mismo sector (acciones) | Coca-Cola / PepsiCo, Visa / Mastercard | Mismo modelo de negocio y factores de demanda |
| Pares Forex con divisa común | EUR/USD vs. GBP/USD, AUD/USD vs. NZD/USD | Vínculo macroeconómico compartido y exposición a USD |
| Materias Primas | WTI vs. Brent, Oro vs. Plata (Gold-Silver Ratio) | Sustituibilidad física y relación de costes de extracción |
| ETFs vs. Cesta | XLE vs. Top 5 Petroleras | Cointegración por réplica de valor liquidativo |

## Riesgos y mitigación

1. **Divergencia permanente (*Breakdown* de cointegración)**: Si un evento fundamental altera la relación de equilibrio (quiebra, fraude, cambio regulatorio), el spread divergirá indefinidamente. **Mitigación**: Stop loss estricto en $\pm 3.5\sigma$ o stop temporal basado en $3 \times t_{1/2}$.
2. **Leg Risk**: Deslizamiento o fallo de ejecución en una de las patas al enviar órdenes separadas. **Mitigación**: Enviar órdenes límite o utilizar EAs con ejecución atómica programada en MQL5.
3. **Costes de financiación / Swap**: En Forex, las tasas de swap overnight pueden erosionar la rentabilidad si el spread tarda semanas en revertir.

## Relación con otras páginas

Pairs trading es la aplicación econométrica formal de la [reversión a la media](reversion-media.md). Las [correlaciones entre activos](../analisis-fundamental/correlaciones-entre-activos.md) proporcionan el universo inicial de pares. La gestión del apalancamiento combinado de ambas patas se gobierna mediante el [riesgo de cartera](../gestion-riesgo/riesgo-de-cartera.md). La validación exige [backtesting riguroso](backtesting-y-validacion.md) con ventanas deslizantes (*walk-forward*) para actualizar periódicamente el hedge ratio $\beta$.

## Fuentes

- [Gatev, Goetzmann & Rouwenhorst (2006) — Pairs Trading: Performance of a Relative-Value Arbitrage Rule](../raw/estrategias/pairs-trading-gatev-2006-synthesis.md) — paper fundacional en *The Review of Financial Studies* con la metodología del Distance Approach, test empírico de 40 años y análisis de costes.

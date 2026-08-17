---
tags: [gestion-riesgo, position-sizing, kelly, optimal-f, money-management]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/ziemba-maclean-kelly-criterion.pdf, raw/gestion-riesgo/ralph-vince-optimal-f.md]
---

# El criterio de Kelly y el tamaño de posición

## Qué es

El criterio de Kelly (Kelly, 1956) responde a una pregunta fundamental de *money management*: dado que tienes una ventaja (*edge*) real en una apuesta o inversión que se repite muchas veces, ¿qué fracción de tu capital deberías arriesgar en cada repetición para maximizar el crecimiento de tu patrimonio a largo plazo? No es una fórmula de "cuánto puedo ganar", sino de "cuánto debo arriesgar" — la pregunta central de cualquier módulo de gestión de riesgo de un EA.

La solución de Kelly consiste en maximizar, en cada periodo, la **esperanza del logaritmo de la riqueza** en lugar de la esperanza de la riqueza a secas. Esa elección no es arbitraria: Kelly demostró que apostar la fracción que maximiza $E[\ln W]$ es la estrategia que maximiza la tasa de crecimiento a largo plazo del capital, minimiza el tiempo esperado para alcanzar una meta de riqueza grande, y tiene la propiedad de ser "miópica" — la decisión óptima en cada periodo depende solo del capital actual, no de la historia previa.

## La lógica matemática (edge y odds)

Para el caso más simple — una apuesta tipo moneda con probabilidad $p$ de ganar y $q = 1-p$ de perder, donde se gana o se pierde la misma cantidad apostada — la fracción óptima de Kelly es:

$$f^* = p − q$$

Es decir, la fracción óptima es literalmente el **edge**: la ventaja probabilística esperada por apuesta. Si no hay ventaja ($p = q = 0.5$), la apuesta óptima es cero — nunca hay que apostar sin edge.

Cuando la apuesta paga $B$ a favor por cada unidad arriesgada en caso de ganar (en vez de pagar 1:1), la fórmula se generaliza a:

$$f^* = \frac{B \cdot p − q}{B} = \frac{\text{edge}}{\text{odds}}$$

Esta es la forma más útil para trading: $B$ es el ratio riesgo/beneficio de la operación (ver [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md)), $p$ es el winrate, y el numerador $Bp − q$ es exactamente la expectativa matemática por unidad arriesgada. Dicho de otro modo: **el criterio de Kelly es, matemáticamente, expectativa dividida entre las odds de la apuesta**.

## Generalización para distribuciones reales de trading: Optimal $f$ (Ralph Vince)

La fórmula clásica de Kelly asume dos únicos resultados binarios. En el trading real, las operaciones siguen una **distribución continua y asimétrica de resultados**. 

Ralph Vince (1990, 1992) generalizó el principio de Kelly a distribuciones empíricas mediante el concepto de **Optimal $f$**:
1. Para cada operación histórica con retorno $R_i$, se calcula el *Holding Period Return* ponderado por la fracción $f$: $HPR_i(f) = 1 + f \times (\frac{-R_i}{WorstLoss})$.
2. Se maximiza el producto geométrico acumulado (*Terminal Wealth Relative*, TWR):
   $$f^* = \arg\max_{f} \sum_{i=1}^N \ln \left[ 1 + f \left( \frac{-R_i}{WorstLoss} \right) \right]$$
3. El número de contratos o lotes óptimo resulta de:
   $$\text{Contratos} = \frac{\text{Capital} \times f^*}{|WorstLoss|}$$

## Kelly y Optimal $f$ son agresivos — y peligrosos a corto plazo

Un punto que Ziemba, MacLean y Ralph Vince subrayan con fuerza:
- Full Kelly y 100% Optimal $f$ son **las estrategias más arriesgadas que un inversor racional debería considerar jamás**.
- Cualquier fracción $f > f^*$ no solo reduce la seguridad, sino que destruye la tasa de crecimiento geométrico (**sobre-apalancamiento catastrófico**).
- Operar a full Kelly genera curvas de capital con drawdowns devastadores (típicamente del 70% al 90%).

## Por qué en la práctica se usa una fracción de Kelly (Fractional Kelly / Fractional $f$)

La recomendación estándar entre practicantes cuantitativos es usar una **fracción de Kelly** (1/4 a 1/2 Kelly, o Fractional $f$ con $\lambda \in [0.25, 0.50]$):
- **Half-Kelly** captura aproximadamente el 75% de la tasa máxima de crecimiento a cambio de **reducir a una cuarta parte la varianza** de la curva de capital y amortiguar sustancialmente el [drawdown](drawdown.md).
- Protege frente a la asunción más frágil de Vince: que la pérdida máxima futura no superará al $WorstLoss$ histórico.

## Sensibilidad a errores de estimación

Chopra y Ziemba (1993) demostraron que los errores al estimar el retorno medio esperado importan **100 veces más** que los errores en varianzas o covarianzas para un inversor tipo Kelly. Sobreestimar tu edge —algo habitual en backtests sobreajustados (ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md))— lleva a un dimensionamiento excesivo que multiplica el [riesgo de ruina](riesgo-de-ruina.md).

## Qué significa esto para diseñar un EA

1. Calcular la **expectativa por operación** ([expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md)) y el Optimal $f$ sobre datos out-of-sample estrictos.
2. Aplicar siempre un factor de escala conservador: $\text{Sizing} = 0.25 \times f^*$ a $0.50 \times f^*$.
3. Estresar el $WorstLoss$ histórico multiplicándolo por un factor de seguridad de 1.5x a 2.0x frente a eventos de cola.
4. Validar el dimensionamiento resultante mediante [simulación Monte Carlo](simulacion-monte-carlo.md) para confirmar que el percentil 95% de drawdown es asumible.

## Relación con otras páginas

Esta página cubre el "cuánto apostar" dado un edge conocido. Para cómo se calcula ese edge en la práctica, ver [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md). Para entender por qué incluso una estrategia con Kelly bien calibrado puede sufrir caídas severas por el camino, ver [drawdown.md](drawdown.md). Para la distribución de drawdowns y pruebas de robustez, ver [simulacion-monte-carlo.md](simulacion-monte-carlo.md). Para cuantificar la probabilidad de agotar la cuenta, ver [riesgo-de-ruina.md](riesgo-de-ruina.md). Para la gestión con múltiples posiciones simultáneas, ver [riesgo-de-cartera.md](riesgo-de-cartera.md).

## Fuentes

- [Ziemba & MacLean — El criterio de Kelly (Kelly Capital Growth Investment Criterion)](../raw/gestion-riesgo/ziemba-maclean-kelly-criterion.pdf) — capítulo de referencia sobre la fórmula de Kelly, la lógica de maximizar $E[\ln W]$, y la necesidad de usar una fracción de Kelly.
- [Ralph Vince (1990, 1992) — Gestión monetaria y Optimal f](../raw/gestion-riesgo/ralph-vince-optimal-f.md) — generalización matemática del criterio de Kelly para distribuciones empíricas continuas de trading y cálculo de contratos por unidad de peor pérdida histórica.

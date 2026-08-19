---
tags: [gestion-riesgo, risk-of-ruin, kelly, probabilidad, position-sizing]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/whelan-ruin-probabilities.pdf]
---

# Riesgo de ruina

## Qué es

El **riesgo de ruina** (*risk of ruin*) es la probabilidad de que una estrategia que se repite muchas veces acabe agotando el capital — o una parte inaceptable de él — antes de que el edge estadístico tenga oportunidad de manifestarse a largo plazo. Es una pregunta distinta a la de la [expectativa matemática](expectativa-y-ratio-rr.md): una estrategia puede tener expectativa positiva (`E > 0`) y, aun así, tener una probabilidad no despreciable de arruinar la cuenta por el camino, simplemente por mala suerte en la secuencia concreta de operaciones que le toque vivir. El riesgo de ruina cuantifica exactamente esa probabilidad, en función del edge, el winrate y — de forma crucial — el tamaño de posición.

Es también una noción distinta del [drawdown máximo](drawdown.md): el drawdown mide la peor caída observada (o la distribución de caídas posibles) sin asumir que la cuenta llega a cero; el riesgo de ruina pregunta específicamente por la probabilidad de llegar a un umbral de capital inaceptable — en el límite, cero — en algún momento de la vida de la estrategia.

Este documento se apoya en Whelan (2025), *"Ruin Probabilities for Strategies with Asymmetric Risk"* (University College Dublin) — una extensión académica reciente y rigurosa del problema clásico de la ruina del jugador (*gambler's ruin*, Feller 1950) al caso de pagos asimétricos, que es exactamente la situación de un sistema de trading con un ratio riesgo/beneficio distinto de 1:1.

## La fórmula clásica: el problema de la ruina del jugador

En su forma más simple — apuestas de tamaño fijo, ganancia o pérdida de una unidad con probabilidad `p` y `1-p` respectivamente — la probabilidad de ruina de un jugador con `n` unidades de capital, jugando indefinidamente (sin un objetivo de riqueza que lo detenga), converge a:

```
RiesgoDeRuina ≈ ((1-p)/p)^n        (válido cuando p > 0.5, es decir, cuando hay edge positivo)
```

Aquí `n` no es el capital en euros, sino el capital medido **en unidades de la apuesta** — es decir, cuántas pérdidas seguidas de tamaño estándar haría falta para quedarse a cero. Esta es la misma fórmula que circula en la literatura de money management de trading (popularizada por Balsara, 1992) expresada en términos del edge (`edge = p - q`): `((1-edge)/(1+edge))^n` — es algebraicamente idéntica, ya que `(1-edge)/(1+edge) = (1-p+q)/(1+p-q) = q/p`.

### Un ejemplo numérico

Whelan ilustra esta fórmula con un caso muy relevante para trading: un sistema con `p = 0.505` (edge del 1%) y un tamaño de posición del 1% del capital por operación (`n = 100` unidades de apuesta). El resultado:

> *"no matter how high the target wealth is, there is still a 13.5% chance of being ruined when staking 1% of your initial wealth each time on this favorable game"*

Es decir: un sistema con edge genuino y positivo, operado de forma razonable (1% de riesgo por operación), tiene **más de un 13% de probabilidad de arruinar la cuenta** solo por la secuencia concreta de rachas que le toque vivir. Esto no es un fallo del sistema ni del cálculo de expectativa — es una propiedad matemática ineludible de cualquier proceso con varianza, por muy positiva que sea su media.

## Por qué el tamaño de posición domina el resultado (más que el edge)

La fórmula `((1-p)/p)^n` es exponencial en `n = capital / tamaño de la apuesta`. Esto tiene una consecuencia muy poco intuitiva: el riesgo de ruina es extremadamente sensible al tamaño de posición, mucho más que a cambios moderados en el edge.

Concretamente: si duplicas el porcentaje de capital arriesgado por operación (por ejemplo, pasas de arriesgar el 1% al 2%, manteniendo `p` y el edge exactamente iguales), `n` se reduce a la mitad — y como el riesgo de ruina es `z^n` con `z = (1-p)/p < 1`, reducir `n` a la mitad convierte el riesgo de ruina en su **raíz cuadrada**. En el ejemplo anterior, pasar de arriesgar el 1% al 2% del capital dispararía el riesgo de ruina de 13.5% a `√0.135 ≈ 36.7%` — casi el triple, por "solo" doblar el tamaño de posición. Esta no linealidad brutal es la razón de fondo por la que el tamaño de posición es, con diferencia, la palanca más importante de todo el diseño de un sistema de trading: mucho más que afinar el winrate o el R:R un par de puntos porcentuales.

## El efecto perverso de un ratio riesgo/beneficio alto

Este es, probablemente, el resultado más importante — y menos intuitivo — del paper de Whelan para diseñar un EA. Consideremos pagos asimétricos: se pierde 1 unidad con probabilidad `1-p` o se gana `K` unidades con probabilidad `p` (`K` es exactamente el ratio riesgo/beneficio de [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md): un R:R de 1:3 es `K = 3`). Whelan mantiene **constante el valor esperado por unidad arriesgada** (`μ = p·K - (1-p)`, que es la misma expectativa `E` de esa página) y varía `K` — es decir, compara sistemas igual de rentables en promedio, pero que consiguen esa rentabilidad con distintas combinaciones de winrate y R:R.

Con `μ = 0.01` (edge del 1%, igual que antes) y capital `n = 100` unidades:

| R:R (`K`) | Riesgo de ruina |
|---|---|
| 1:1 (simétrico) | 13% |
| 1:2 | 34% |
| 1:20 | 64% |

**La misma expectativa, con un R:R más alto y un winrate proporcionalmente más bajo para compensar, produce un riesgo de ruina radicalmente mayor.** La razón matemática es que la varianza de los resultados por operación crece con `K` — un sistema de winrate bajo y R:R alto (típico de estrategias de [tendencia](../estrategias/seguimiento-tendencia.md) o [ruptura](../estrategias/ruptura-breakout.md)) tiene una distribución de resultados mucho más dispersa que un sistema de winrate alto y R:R cercano a 1 (típico de [reversión a la media](../estrategias/reversion-media.md)), aunque ambos tengan la misma `E`. Esa dispersión adicional se traduce directamente en más probabilidad de sufrir una racha de pérdidas lo bastante larga como para arruinar la cuenta antes de que la media se imponga.

Esto no significa que haya que evitar sistemas con R:R alto — significa que **el tamaño de posición debe ajustarse a la baja a medida que sube el R:R**, para una `E` dada. Un sistema con R:R 1:20 necesita arriesgar mucho menos por operación que uno con R:R 1:1 para alcanzar el mismo riesgo de ruina, incluso si ambos tienen exactamente la misma expectativa.

## La relación directa con el criterio de Kelly

Whelan conecta explícitamente sus resultados con el [criterio de Kelly](position-sizing-kelly.md), usando la misma formulación que ya aparece en esa página: la fracción óptima de Kelly es "edge sobre odds", `f* = μ/K`. En su ejemplo, arriesgar el 1% del capital es exactamente el Kelly óptimo para el caso simétrico (`K = 1`, `f* = 0.01/1 = 1%`) — pero esa misma fracción del 1% es un sobreapalancamiento brutal (*overbetting*) para `K = 20`, cuyo Kelly óptimo sería solo `0.01/20 = 0.05%`. Los resultados de la tabla anterior no son más que la consecuencia, en términos de probabilidad de ruina, de mantener fijo el tamaño de posición mientras el sistema se aleja cada vez más de la fracción de Kelly correcta para su propio `K`.

En otras palabras: **el riesgo de ruina y el criterio de Kelly son dos caras de la misma moneda**. Kelly te dice qué fracción de capital maximiza el crecimiento sin sobreapostar; el riesgo de ruina cuantifica exactamente cuánto se dispara la probabilidad de catástrofe cuando te alejas de esa fracción — y, como muestra la tabla, alejarse hacia arriba penaliza mucho más rápido de lo que uno esperaría intuitivamente.

### Una matización importante: apostar una fracción fija del capital *actual*

El modelo de Whelan (y el problema clásico de la ruina del jugador) asume una apuesta de tamaño fijo en unidades absolutas — igual que un EA que arriesga un lote fijo o un importe fijo en euros por operación. Bajo ese esquema, la cuenta puede llegar literalmente a cero.

Si en cambio el EA recalcula el tamaño de posición como una fracción fija del capital *actual* en cada operación (el esquema que efectivamente implementa Kelly y el fraccional-Kelly de [position-sizing-kelly.md](position-sizing-kelly.md)), la cuenta nunca llega matemáticamente a cero exacto — cada pérdida reduce el capital, pero también reduce la siguiente apuesta proporcionalmente. Sin embargo, esto es un consuelo casi únicamente teórico: nada impide que ese esquema reduzca la cuenta al 5% o al 1% de su valor inicial, que es la definición de "ruina" que le importa a cualquier trader real (o el nivel al que el bróker ejecuta un stop-out por margen). Por eso, en la práctica, conviene definir la "ruina" no como llegar literalmente a cero sino como caer por debajo de un umbral de capital que consideres inaceptable o del que sea extremadamente difícil recuperarse psicológica y matemáticamente (perder el 50% de la cuenta exige un +100% solo para volver al punto de partida).

## Qué significa esto para diseñar un EA

- No te conformes con comprobar que `E > 0` (ver [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md)): calcula o al menos estima el riesgo de ruina implícito en tu combinación concreta de winrate, R:R y tamaño de posición. Una expectativa positiva no es garantía de supervivencia.
- Recuerda que el riesgo de ruina crece de forma muy no lineal (aproximadamente como una raíz cuadrada por cada duplicación del riesgo por operación) — pequeños incrementos del tamaño de posición pueden disparar la probabilidad de catástrofe mucho más de lo que la intuición sugiere.
- Si tu sistema usa un R:R alto con winrate bajo (típico de tendencia/ruptura), no uses el mismo tamaño de posición que usarías para un sistema de winrate alto y R:R bajo con la misma `E` — necesita ser sensiblemente menor. Esto es, de nuevo, lo que ya dice el criterio de Kelly (`f* = edge/odds`): a mayor `K` (R:R), menor fracción óptima, para el mismo edge.
- Define tu propio umbral práctico de "ruina" (p. ej. -30% o -50% de la cuenta, o el nivel de stop-out del bróker) en vez de asumir que solo cuenta llegar literalmente a cero — sobre todo si usas sizing proporcional al capital actual.
- Como en [drawdown.md](drawdown.md), ten en cuenta que estas fórmulas asumen operaciones independientes e idénticamente distribuidas; si tus pérdidas se agrupan en rachas correlacionadas (por régimen de mercado), el riesgo de ruina real es mayor que el que predice la fórmula clásica.

## Relación con otras páginas

Esta página cuantifica el "qué puede salir mal" que motiva usar una fracción de Kelly en vez de Kelly completo (ver [position-sizing-kelly.md](position-sizing-kelly.md)) y complementa a [drawdown.md](drawdown.md) (la distribución de caídas posibles) y [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md) (de donde sale la `E`/`μ` que alimenta el cálculo de riesgo de ruina). Para el caso de varias posiciones simultáneas y correlacionadas, ver [riesgo-de-cartera.md](riesgo-de-cartera.md).

## Fuentes

- [Whelan (2025) — Ruin Probabilities for Strategies with Asymmetric Risk](../raw/gestion-riesgo/whelan-ruin-probabilities.pdf) — paper de University College Dublin que extiende el problema clásico de la ruina del jugador a pagos asimétricos (R:R distinto de 1:1); base de todas las fórmulas y ejemplos numéricos de esta página.

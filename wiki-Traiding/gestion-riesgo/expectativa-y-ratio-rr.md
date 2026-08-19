---
tags: [gestion-riesgo, expectativa-matematica, risk-reward, position-sizing]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/rob-carver-how-much-risk.md, raw/gestion-riesgo/ziemba-maclean-kelly-criterion.pdf]
---

# Expectativa matemática y ratio riesgo/beneficio (R:R)

## Nota sobre las fuentes de esta página

La fórmula de expectativa matemática y el concepto de ratio riesgo/beneficio son terminología estándar y muy bien establecida en trading — no requieren una fuente académica específica para definirse, y se exponen aquí con ese carácter de "definición de referencia". La sección sobre cómo traducir expectativa en tamaño de posición concreto se apoya en el artículo de [Rob Carver](../raw/gestion-riesgo/rob-carver-how-much-risk.md), en la extensión a distribuciones reales de [Ralph Vince](../raw/gestion-riesgo/ralph-vince-optimal-f.md) y en la conexión matemática con el [criterio de Kelly](position-sizing-kelly.md) (Ziemba & MacLean).

## La fórmula de la expectativa

La expectativa matemática de un sistema de trading es la ganancia (o pérdida) media que cabe esperar por operación, dado su winrate histórico y el tamaño medio de ganancias y pérdidas. Expresada en múltiplos de riesgo (R, donde 1R = lo que arriesgas en una operación, típicamente la distancia hasta el stop loss):

```
E = (winrate × R_ganado_medio) − ((1 − winrate) × R_perdido_medio)
```

Donde `E` es la expectativa por operación, en unidades de R. Un sistema solo es viable a largo plazo si `E > 0` — de lo contrario, cuantas más operaciones hagas, con más certeza perderás dinero (la ruina es solo cuestión de tiempo y de tamaño de posición).

Dos ejemplos que ilustran por qué el winrate por sí solo no dice nada sobre la calidad de un sistema:

- **Sistema A** — winrate 40%, ganancia media 2R, pérdida media 1R: `E = 0.4×2 − 0.6×1 = 0.8 − 0.6 = +0.2R`. Pierde la mayoría de las veces, pero es rentable — típico de estrategias de [tendencia](../estrategias/seguimiento-tendencia.md)/[breakout](../estrategias/ruptura-breakout.md) con muchos stops pequeños y pocas ganancias grandes.
- **Sistema B** — winrate 70%, ganancia media 0.5R, pérdida media 1R: `E = 0.7×0.5 − 0.3×1 = 0.35 − 0.3 = +0.05R`. Gana la mayoría de las veces, pero apenas es rentable — típico de estrategias de [reversión a la media](../estrategias/reversion-media.md) con muchas ganancias pequeñas y pérdidas ocasionales grandes.

Un sistema con winrate del 70% puede ser *peor* negocio que uno con winrate del 40%, si el ratio riesgo/beneficio no compensa. Esto es la base de por qué "acertar más veces" no es el objetivo de un buen sistema — el objetivo es que la expectativa sea positiva y, preferiblemente, robusta.

## Ratio riesgo/beneficio (R:R)

El ratio riesgo/beneficio (R:R) es la relación entre lo que se arriesga (distancia al stop loss) y lo que se espera ganar (distancia al take profit, o la ganancia media realizada) en una operación. Un R:R de 1:2 significa que se arriesga 1 unidad para intentar ganar 2. Es importante distinguir:

- **R:R planificado**: la relación entre stop loss y take profit fijados al abrir la operación — un parámetro de diseño del EA.
- **R:R realizado**: el resultado real medio de ganancias frente a pérdidas una vez cerradas las operaciones, que puede diferir del planificado por trailing stops, cierres parciales, slippage, o el propio winrate (un R:R planificado de 1:3 con un take profit que rara vez se alcanza puede acabar teniendo un R:R realizado mucho menor).

En la fórmula de expectativa, `R_ganado_medio` es exactamente el R:R realizado del sistema. Diseñar un EA es, en el fondo, buscar la combinación de winrate y R:R que produzca la expectativa más alta y, sobre todo, más estable fuera de muestra.

## La conexión directa con el criterio de Kelly

La expectativa por operación no es solo una métrica de evaluación — es el numerador exacto de la fórmula de Kelly. Como se explica en [position-sizing-kelly.md](position-sizing-kelly.md), si `B` es el ratio riesgo/beneficio (las "odds" de la apuesta) y `p` es el winrate:

```
f*_Kelly = (B·p − q) / B = edge / odds
```

y el numerador `B·p − q` es, salvo un cambio de escala, la misma expectativa matemática `E` definida arriba. En otras palabras: **calcular correctamente la expectativa de tu sistema es el primer paso obligatorio antes de poder calcular un tamaño de posición tipo Kelly** — sin una estimación honesta de `E`, cualquier fórmula de sizing posterior parte de un número inventado.

## Position sizing en la práctica: el enfoque de Rob Carver

Más allá de la expectativa por operación, el artículo de Rob Carver ["How much risk should we take?"](../raw/gestion-riesgo/rob-carver-how-much-risk.md) aporta un marco práctico para traducir edge en tamaño de posición real, pensado para sistemas sistemáticos (no solo apuestas individuales). Los elementos clave:

- **Riesgo del instrumento**: la volatilidad anualizada de lo que se opera (ejemplos citados: ~16% para acciones del S&P 500, ~8% para bonos a 10 años, ~100% para Bitcoin). Instrumentos más volátiles requieren posiciones proporcionalmente más pequeñas para el mismo riesgo en euros/dólares.
- **Objetivo de riesgo (risk target)**: cuánta volatilidad anualizada de la cuenta se está dispuesto a asumir. Carver conecta esto directamente con Kelly: *"el risk target óptimo = Sharpe Ratio esperado"* — es decir, cuanto mejor sea el edge de tu sistema (medido en Sharpe), más riesgo puedes justificar asumir, exactamente el mismo principio que dice la fórmula de Kelly (más edge → mayor fracción óptima).
- **Escalado por confianza (forecast)**: no todas las señales de un sistema merecen el mismo tamaño de posición — señales con mayor conficción/convicción pueden dimensionarse más grandes que señales "mediocres", dentro de un rango acotado.
- **Fórmula resultante**: `(1/N) × C × (T/V) × (F/10)`, donde `N` es el número esperado de posiciones simultáneas, `C` el capital en riesgo, `T` el risk target, `V` la volatilidad del instrumento y `F` la puntuación de confianza de la señal concreta.

Carver es explícito en recomendar el **risk target más conservador** entre varias restricciones (apetito de riesgo personal, apalancamiento máximo del bróker, apalancamiento "seguro" para sobrevivir crashes tipo 1987, y rendimiento esperado vía Kelly) — el mismo espíritu que la recomendación de usar una fracción de Kelly en vez de Kelly completo (ver [position-sizing-kelly.md](position-sizing-kelly.md)).

## Qué significa esto para diseñar un EA

- Calcula la expectativa (`E`) de cada estrategia con datos fuera de muestra antes de dimensionar posiciones — un backtest optimizado casi siempre infla `E` (ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md)).
- No optimices solo para winrate: compara sistemas por expectativa, no por porcentaje de aciertos.
- Usa la expectativa como entrada para un cálculo de tamaño de posición tipo Kelly fraccional (ver [position-sizing-kelly.md](position-sizing-kelly.md)), ajustado además por la volatilidad del instrumento operado (enfoque Carver) y con margen de seguridad frente al riesgo de drawdown en racha (ver [drawdown.md](drawdown.md)).
- Alrededor de publicaciones de alto impacto (NFP, CPI, decisiones de tipos) el spread se ensancha y la volatilidad puede saltar stops "razonables", degradando tanto el winrate como el R:R realizado frente al planificado — ver [calendario-economico.md](../analisis-fundamental/calendario-economico.md) para qué eventos vigilar y cuándo reducir tamaño de posición.

## Relación con otras páginas

Esta página conecta directamente con [position-sizing-kelly.md](position-sizing-kelly.md) (la expectativa es el edge que alimenta la fórmula de Kelly) y con [drawdown.md](drawdown.md) (por qué una expectativa positiva no garantiza ausencia de caídas de capital severas por el camino). Ver [riesgo-de-ruina.md](riesgo-de-ruina.md) para la cuantificación exacta de ese último punto — incluyendo por qué, a igualdad de expectativa, un R:R más alto con winrate proporcionalmente más bajo dispara el riesgo de ruina — y [riesgo-de-cartera.md](riesgo-de-cartera.md) para el caso de varias posiciones simultáneas.

## Fuentes

- [Rob Carver — How Much Risk Should We Take?](../raw/gestion-riesgo/rob-carver-how-much-risk.md) — artículo (marzo 2020, "This Blog is Systematic") con el marco práctico de seis factores para traducir edge y volatilidad del instrumento en tamaño de posición real; base de la sección "Position sizing en la práctica" de esta página.
- [Ziemba & MacLean — El criterio de Kelly (Kelly Capital Growth Investment Criterion)](../raw/gestion-riesgo/ziemba-maclean-kelly-criterion.pdf) — fuente de la conexión matemática entre expectativa por operación y la fracción óptima de Kelly (edge/odds), desarrollada también en [position-sizing-kelly.md](position-sizing-kelly.md).

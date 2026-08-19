---
tags: [estrategias, reversion-media, value, contrarian, fundamental]
updated: 2026-08-16
fuentes: [raw/estrategias/nber-w4360-contrarian-investment-extrapolation-risk.pdf]
---

# Reversión a la media (value / contrarian investing)

## Qué es

La reversión a la media aplicada a la selección de acciones es la lógica **contrarian**: comprar empresas "value" — baratas respecto a sus fundamentales (ratio precio/beneficio bajo, precio/valor contable bajo, precio/cash-flow bajo) — y evitar o vender en corto empresas "glamour" — caras respecto a sus fundamentales, normalmente porque han tenido un pasado reciente brillante. La apuesta es que el mercado extrapola en exceso el pasado reciente de una empresa hacia el futuro, y esa extrapolación se revierte con el tiempo.

Es la lógica opuesta a la de [momentum.md](momentum.md) (que apuesta a que la tendencia continúa) y comparte familia conceptual con la idea de "sonrisa" de [seguimiento-tendencia.md](seguimiento-tendencia.md), pero aplicada al fundamental de una empresa (crecimiento de ventas/beneficios) en vez de al precio puro.

## La fuente: Lakonishok, Shleifer & Vishny (1993/1994)

El paper de referencia, *Contrarian Investment, Extrapolation, and Risk* (NBER Working Paper 4360, mayo 1993; publicado en el Journal of Finance en 1994), es uno de los estudios fundacionales de la literatura "value vs. glamour". Analiza acciones de NYSE y AMEX entre abril de 1963 y abril de 1990, formando carteras cada año y midiendo su rendimiento en los 5 años posteriores, ajustado por tamaño (comparando cada acción contra una cartera de referencia del mismo decil de capitalización).

## Dos preguntas que responde el paper

**1. ¿Las estrategias value baten realmente al mercado?** Sí, y de forma sustancial. Usando una clasificación simple por book-to-market (valor contable / valor de mercado), las acciones "value" (alto book-to-market) superan a las acciones "glamour" (bajo book-to-market) por **7,8 puntos porcentuales anuales** de media (rentabilidad ajustada por tamaño), acumulando una diferencia del 38,7% en 5 años. En términos de rentabilidad bruta (sin ajustar), las glamour ganaron un 56,5% en 5 años frente a un 112,1% de las value — más del doble.

Cuando se combinan dos criterios a la vez — múltiplo de valoración actual (p. ej. cash-flow/precio) **y** crecimiento pasado bajo — la diferencia sube todavía más: hasta **8,7 puntos porcentuales anuales**, con una diferencia acumulada del 99,9% en rentabilidad bruta a 5 años. Los autores insisten en que esta magnitud (7-8% anual, persistente durante varios años) es demasiado grande para explicarse por diferencias pequeñas de riesgo.

Un detalle práctico importante: el efecto **no depende de operar en microcaps ilíquidas**. Restringiendo el universo al 50% o al 20% de mayor capitalización — es decir, empresas grandes y líquidas, replicables por inversores institucionales — la ventaja de las estrategias value sobre las glamour apenas se reduce.

**2. ¿Es simplemente que las value son más arriesgadas (y por eso rinden más)?** Esta es la pregunta central del paper, y la respuesta de los autores es que **no**, con evidencia bastante directa en contra de la hipótesis de riesgo de Fama-French (que argumentaba que el value gana más porque es fundamentalmente más arriesgado):

- Si el value fuera más arriesgado, debería rendir peor que el glamour en los "malos estados del mundo" — recesiones y caídas fuertes de mercado. Los autores examinan las 4 recesiones NBER del periodo muestral y encuentran que las acciones value lo hicieron **igual o mejor** que las glamour en cada una de ellas (mejor en la recesión severa de 1973-75 y en la de 1981-82, ligeramente peor en 1979-80). No hay ningún patrón sistemático de peor comportamiento del value en recesión.
- Comparando betas (riesgo sistemático de mercado): la diferencia de beta entre carteras value y glamour es de apenas 0,1 — insuficiente para explicar más de ~1 punto porcentual de la diferencia de 8 puntos observada, incluso con supuestos generosos sobre el precio del riesgo de mercado.
- Comparando desviación estándar de retornos: el value tiene una volatilidad ligeramente mayor (24,1% frente a 21,6% en una de las clasificaciones), pero de nuevo la diferencia es demasiado pequeña para justificar el exceso de retorno.

Conclusión de los autores: la ventaja de las estrategias value es una anomalía conductual, no una compensación por riesgo.

## El mecanismo: extrapolación excesiva

La explicación que proponen los autores para *por qué* funciona la reversión a la media es la siguiente cadena:

1. Los inversores tienden a extrapolar el crecimiento pasado de una empresa hacia el futuro — asumen que una empresa que ha crecido mucho seguirá creciendo mucho, y que una empresa que lo ha hecho mal seguirá haciéndolo mal.
2. Esto sobreprecia a las empresas "glamour" (que cotizan a múltiplos altos porque el mercado espera que su buen historial continúe) e infraprecia a las "value" (múltiplos bajos porque el mercado espera que su mal historial continúe).
3. El crecimiento futuro real tiende a decepcionar a las glamour y a sorprender positivamente a las value, en relación con lo que el múltiplo de cada una tenía implícito. El paper muestra explícitamente que el crecimiento esperado (implícito en el múltiplo) de las glamour respecto a las value sobreestima de forma sistemática el crecimiento futuro real.
4. Los inversores contrarian, al apostar contra esa extrapolación ingenua, capturan la corrección cuando el crecimiento real converge hacia lo normal ("reversión a la media" en el sentido literal — el crecimiento anómalo de una empresa tiende a normalizarse).

## Por qué la anomalía no se arbitra (según los autores)

Si el value no es más arriesgado, ¿por qué no desaparece la oportunidad al ser explotada? Los autores apuntan a limitaciones estructurales de los inversores profesionales más que a un mercado plenamente eficiente:

- **Horizontes cortos**: las estrategias value tardan 3-5 años en dar sus frutos de forma consistente, mientras que la mayoría de inversores individuales buscan resultados en meses.
- **Riesgo de carrera de los gestores institucionales**: un gestor que aplica una estrategia value puede tener un tracking error grande y underperform el índice durante un periodo no trivial antes de que la estrategia pague — un riesgo que muchos gestores no pueden permitirse asumir porque sus clientes retirarían el capital antes.

## Consideraciones prácticas

- El paper usa horizontes de **varios años** (carteras formadas anualmente, medidas a 1-5 años) — esto es una estrategia de inversión de medio/largo plazo, no una técnica de timing de entradas y salidas de corto plazo.
- Funciona igual de bien restringido a empresas grandes y líquidas, lo cual es una ventaja práctica de implementación frente a otras anomalías que solo aparecen en microcaps.
- Requiere tolerancia a underperformance temporal — el propio paper reconoce que el value no gana siempre ni en todos los subperiodos, solo "con regularidad" y en el agregado.
- Contraste directo con [momentum.md](momentum.md): ambas estrategias han sido documentadas como rentables en la literatura académica, pero operan en horizontes distintos (el momentum de Jegadeesh & Titman es de 3-12 meses; el contrarian de Lakonishok-Shleifer-Vishny es de varios años) — no son necesariamente contradictorias, sino que capturan ineficiencias de horizontes distintos.
- La tolerancia a underperformance temporal que exige esta estrategia (3-5 años hasta que el edge se manifiesta con consistencia) es exactamente el tipo de riesgo que cuantifica [drawdown](../gestion-riesgo/drawdown.md): un gestor value puede sufrir un tracking error y una racha de caída relativa largos antes de que la ventaja estadística se materialice.

## Fuentes

- [Lakonishok, Shleifer & Vishny — Contrarian Investment, Extrapolation, and Risk (NBER Working Paper 4360, 1993/1994)](../raw/estrategias/nber-w4360-contrarian-investment-extrapolation-risk.pdf) — el paper fundacional de la comparación value vs. glamour en el que se apoya toda esta página.

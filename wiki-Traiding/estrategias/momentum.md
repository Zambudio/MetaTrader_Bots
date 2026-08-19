---
tags: [estrategias, momentum, cross-sectional, acciones]
updated: 2026-08-16
fuentes: [raw/estrategias/jegadeesh-titman-1993-momentum.pdf]
---

# Momentum (relative strength / cross-sectional momentum)

## Qué es

El momentum de acciones (también llamado "relative strength") es la estrategia de **comprar las acciones que mejor lo han hecho recientemente y vender en corto las que peor lo han hecho**, sobre un horizonte de formación de 3 a 12 meses, manteniendo la posición otros 3 a 12 meses. A diferencia de [seguimiento-tendencia.md](seguimiento-tendencia.md) (que mira el signo del retorno propio de cada mercado por separado, "time-series"), el momentum aquí es **cross-sectional**: se comparan acciones entre sí y se ordenan por rentabilidad relativa (deciles), yendo largo en el decil superior y corto en el decil inferior.

Es la estrategia contraria a la lógica contrarian de [reversion-media.md](reversion-media.md) — y de hecho el paper de referencia nace explícitamente como respuesta a esa literatura, para un horizonte temporal distinto.

## La fuente: Jegadeesh & Titman (1993)

*Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency* (Journal of Finance, marzo 1993) es el paper fundacional del momentum académico moderno. Antes de este trabajo, la literatura de eficiencia de mercado se había centrado sobre todo en estrategias contrarian de muy corto plazo (reversión a 1 semana o 1 mes) y de muy largo plazo (reversión a 3-5 años, De Bondt & Thaler 1985). Jegadeesh y Titman notaron que la práctica real de muchos gestores e indicadores (como los rankings de Value Line) usaba horizontes intermedios — 3 a 12 meses — y decidieron testear formalmente esa zona.

### Metodología

- Universo: acciones de NYSE y AMEX, periodo enero 1965 - diciembre 1989.
- Cada mes, se ordenan las acciones por su retorno en los J meses anteriores (J = 3, 6, 9 o 12).
- Se forman 10 carteras (deciles): la de mejor rentabilidad pasada ("ganadoras") se compra, la de peor rentabilidad pasada ("perdedoras") se vende en corto — cartera de coste cero (long-short).
- Se mantiene la posición K meses (K = 3, 6, 9 o 12), con carteras solapadas (cada mes se rota 1/K de la cartera) para aumentar la potencia estadística.
- En total, 32 combinaciones J/K, más 32 adicionales que dejan una semana de margen entre formación y mantenimiento (para evitar efectos de microestructura de mercado: spread bid-ask y presión de precio de muy corto plazo).

### Resultado principal

Todas las 32 combinaciones J/K generan retornos positivos en la cartera long-short, y prácticamente todas son estadísticamente significativas. La estrategia más exitosa (formación a 12 meses, mantenimiento a 3 meses, con una semana de margen) rinde **1,49% mensual**. La estrategia más citada y analizada en detalle en el paper — formación a 6 meses, mantenimiento a 6 meses (la "6/6") — genera un **retorno compuesto de exceso del 12,01% anual** de media a lo largo de 1965-1989.

### La reversión posterior — el momentum no es "gratis" para siempre

Uno de los hallazgos más importantes, y menos citado que la cifra de rentabilidad: parte del retorno se revierte con el tiempo. Los autores hacen un análisis de evento, siguiendo la cartera ganadoras-menos-perdedoras hasta 36 meses después de su formación:

- En los 12 primeros meses tras la formación, el retorno acumulado es positivo y alcanza un máximo del **9,5%**.
- A partir del mes 12, el retorno mensual se vuelve negativo y continúa así durante buena parte de los siguientes 24 meses.
- Para el mes 36, el retorno acumulado ha caído a apenas un **4%** — es decir, más de la mitad de la ganancia del primer año se pierde en los dos años siguientes.

Esto sugiere que buena parte del efecto momentum de 3-12 meses no es una prima de riesgo permanente, sino una reacción de precio que se corrige parcialmente más adelante — coherente con una historia de **infrarreacción inicial seguida de sobrerreacción y corrección**, no de riesgo sistemático genuino.

### ¿Es solo una compensación por riesgo?

Los autores descartan explícitamente esta explicación con varias pruebas:
- Las betas de mercado de la cartera ganadoras-menos-perdedoras son, si acaso, **negativas** — lo contrario de lo que predeciría una historia de "más riesgo, más retorno".
- El efecto no se explica por reacciones retardadas a un factor común de mercado (descartan la hipótesis de Lo & MacKinlay de "lead-lag" entre acciones grandes y pequeñas).
- Sí es consistente, en cambio, con una reacción retardada a **información específica de cada empresa** (idiosincrática) — parte del efecto se concentra alrededor de los anuncios de resultados trimestrales: las ganadoras pasadas obtienen retornos sistemáticamente mejores que las perdedoras pasadas alrededor de sus anuncios de resultados durante los 7 primeros meses tras la formación de la cartera, lo que representa cerca de un 25% del retorno total de la estrategia en ese periodo.

### Efecto calendario (estacionalidad de enero)

Consistente con estudios previos (Roll 1983 y otros sobre el "efecto enero"), la estrategia de momentum **no funciona en enero** — es precisamente el mes en el que las perdedoras del año anterior (a menudo acciones pequeñas con pérdidas fiscales) suelen rebotar con fuerza, lo que perjudica a la pata corta de la estrategia.

## Consideraciones prácticas

- **Horizonte**: 3-12 meses de formación y de mantenimiento — un horizonte de swing/posición de medio plazo, no intradía ni de largo plazo como el value de [reversion-media.md](reversion-media.md).
- **Rotación**: el turnover medio de las patas larga y corta ronda el 85-90% por periodo de rebalanceo — hay que contar con costes de transacción no triviales al implementarla en la práctica (el paper de 1993 no descuenta comisiones ni slippage de forma explícita en su cifra principal).
- **Efecto enero**: cualquier implementación real debería tener en cuenta que enero es sistemáticamente el peor mes para el momentum.
- **Riesgo de reversión**: mantener la posición más allá de los 12 meses es contraproducente según la evidencia — el propio paper muestra que la ventaja se revierte parcialmente pasado ese punto, así que el momentum de acciones individuales no es una estrategia "buy and hold".
- **Relación con el trend-following**: aunque ambas ideas se agrupan bajo el paraguas de "seguir la tendencia", el momentum cross-sectional de Jegadeesh & Titman (acciones entre sí, 3-12 meses) y el time-series momentum de AQR (cada activo contra su propio pasado, ver [seguimiento-tendencia.md](seguimiento-tendencia.md)) son construcciones distintas, con literatura y mecanismos de origen parcialmente diferentes.
- **Filtro de fuerza de tendencia**: el [ADX](../indicadores/adx-dmi.md) puede usarse como filtro previo para confirmar que una acción "ganadora" o "perdedora" tiene un movimiento direccional con fuerza real detrás, en vez de operar el ranking de retorno pasado sin más contexto.
- **Turnover y riesgo agregado**: con un turnover del 85-90% por rebalanceo y una cartera long-short en decenas de acciones a la vez, la gestión práctica de esta estrategia se apoya en los mismos principios que [riesgo de cartera](../gestion-riesgo/riesgo-de-cartera.md) — el riesgo total no es la simple suma del riesgo de cada posición individual.

## Fuentes

- [Jegadeesh & Titman — Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency (Journal of Finance, 1993)](../raw/estrategias/jegadeesh-titman-1993-momentum.pdf) — el paper fundacional del momentum cross-sectional en el que se apoya toda esta página.

---
tags: [estrategias, scalping, corto-plazo, costes-transaccion, microestructura]
updated: 2026-08-16
fuentes: [raw/estrategias/kearns-kulesza-nevmyvaka-hft-profitability.pdf, raw/estrategias/barber-lee-liu-odean-day-traders-taiwan.pdf]
---

# Scalping

## Nota sobre las fuentes de esta página

A diferencia de las demás páginas de esta categoría (que se apoyan en un paper dedicado — AQR para [seguimiento de tendencia](seguimiento-tendencia.md), Lakonishok-Shleifer-Vishny para [reversión a la media](reversion-media.md), Jegadeesh-Titman para [momentum](momentum.md), Zarattini et al. para [ruptura](ruptura-breakout.md)), **no existe un equivalente académico dedicado al scalping puro** ("comprar y vender en segundos/minutos con un objetivo de unos pocos pips o ticks"). Se ha buscado explícitamente en esta ingesta y en una anterior, sin éxito: la literatura accesible sobre "scalping" está dominada por contenido promocional de brokers y sitios de educación retail, sin backtests rigurosos, muestras libres de sesgo de supervivencia o revisión por pares.

Lo que sí existe, y se usa aquí, son dos papers académicos rigurosos que **no hablan de "scalping" con ese nombre**, pero que son la evidencia más cercana y sólida sobre las dos preguntas estructurales que definen si el scalping puede funcionar: (1) ¿cuánto beneficio real queda disponible cuando el horizonte de mantenimiento se acorta a segundos?, y (2) ¿consiguen los operadores humanos con acceso retail capturar ese beneficio de forma consistente? Esta página es, por tanto, una síntesis conceptual razonada a partir de esa evidencia adyacente, no la lectura de una única fuente que estudie "el scalping" de principio a fin. Se señala explícitamente para que no se confunda con el nivel de evidencia directa de las otras páginas de `estrategias/`.

## Qué es

El scalping es la operativa de plazo más corto dentro del trading discrecional o algorítmico: entradas y salidas que se cuentan en segundos o pocos minutos, con el objetivo de capturar movimientos de precio muy pequeños (unos pocos pips en forex, unos pocos ticks en futuros/acciones) repetidos muchas veces a lo largo de la sesión. Un scalper puede realizar docenas o cientos de operaciones al día, cada una con un objetivo de beneficio y un stop loss muy ajustados en términos absolutos.

Conceptualmente es la versión extrema del [breakout intradía](ruptura-breakout.md) — ambas evitan el riesgo overnight y buscan explotar desequilibrios de muy corto plazo — pero mientras el ORB opera sobre un desequilibrio que se espera dure el resto de la sesión (horas), el scalping opera sobre desequilibrios de microestructura que se espera duren segundos o minutos: una racha de órdenes de un mismo lado, un hueco momentáneo en el libro de órdenes, una reversión tras un movimiento demasiado rápido.

## Lo que estructuralmente la diferencia de otras estrategias

En cualquier otra estrategia de esta wiki, el coste de transacción (spread, comisión, slippage) es una fricción que reduce el retorno bruto. En scalping, el coste de transacción **es la variable dominante que determina si la estrategia puede funcionar en absoluto**, por una razón matemática simple: cuanto más corto es el horizonte de mantenimiento, menor es el movimiento de precio esperado durante ese horizonte, y el coste de cruzar el spread bid-ask (más comisión, más slippage) no se reduce en la misma proporción — de hecho, en mercados de baja liquidez o en momentos de volatilidad, el spread tiende a *ampliarse* justo cuando el scalper necesita ejecutar.

Esto convierte al scalping en una carrera contra un umbral: la señal tiene que generar un movimiento de precio esperado mayor que coste de entrada + coste de salida + margen de error de ejecución, en una ventana de tiempo donde ese movimiento es, por construcción, pequeño. Es la razón por la que el scalping depende de forma crítica de tres factores que en otras estrategias son secundarios:

- **Spread y comisión ultra-bajos**: solo es viable en los instrumentos más líquidos del mercado (pares de divisas mayores como EUR/USD, futuros de índices muy líquidos), donde el spread es una fracción mínima del movimiento de precio típico.
- **Slippage mínimo y ejecución rápida**: la diferencia entre el precio al que se decide operar y el precio al que realmente se ejecuta la orden puede por sí sola consumir todo el margen de beneficio esperado de la operación. Esto empuja al scalping hacia la ejecución algorítmica (para eliminar el retraso de reacción humana) y hacia brokers/infraestructura de baja latencia.
- **Volumen de operaciones muy alto**: al ser el beneficio por operación tan pequeño, la rentabilidad total depende de repetir la operación muchísimas veces — lo que a su vez multiplica la exposición acumulada a costes fijos y a errores de ejecución.

## Qué dice la evidencia adyacente

### El límite superior de la rentabilidad se reduce drásticamente al acortar el horizonte

Kearns, Kulesza y Nevmyvaka (*Empirical Limitations on High Frequency Trading Profitability*, 2010) no estudian scalping retail, sino HFT algorítmico institucional sobre el libro de órdenes completo de NASDAQ. Pero su pregunta de fondo es exactamente la relevante aquí: ¿cuánto beneficio queda disponible cuando el horizonte de mantenimiento de una posición se acorta? Para responderla construyen una "Metodología del Operador Omnisciente" — un trader simulado que conoce el futuro con certeza y solo ejecuta operaciones ganadoras, lo que produce deliberadamente una **cota superior** (sobreestimada) de lo que sería posible ganar en la práctica.

El resultado, incluso con este trader perfecto: el beneficio máximo teórico disponible para todo el universo de acciones de EEUU en 2008 cae de 21.300 millones de dólares con los horizontes de mantenimiento más largos estudiados (10 segundos) a apenas 21 millones de dólares con los horizontes más cortos (10 milisegundos) — una caída de tres órdenes de magnitud. Y esa cota superior sigue siendo, según los propios autores, una sobreestimación "de al menos un orden de magnitud" adicional, porque el experimento asume cero comisiones, cero latencia, predicción perfecta y ejecución instantánea — ninguna de las cuales se da en la práctica. Para ponerlo en perspectiva: el beneficio máximo teórico calculado representa menos del 0,05% del volumen anual negociado en el mercado de EEUU.

La implicación conceptual para el scalping retail (que opera con latencia, comisiones y capacidad predictiva muy inferiores a las de este operador omnisciente hipotético) es clara: el "pastel" de beneficio disponible en horizontes ultra-cortos es estructuralmente pequeño incluso en el mejor caso posible, y se reduce aún más cuanto más se acorta el horizonte.

### La evidencia más cercana a "trading humano de muy alta frecuencia": la mayoría pierde, y quien gana lo hace por habilidad concentrada

Barber, Lee, Liu y Odean (*Do Individual Day Traders Make Money? Evidence from Taiwan*, 2004) no estudian scalping (su unidad de análisis es el day trade — comprar y vender el mismo valor el mismo día, sin especificar el horizonte dentro del día), pero es el estudio más completo disponible sobre la rentabilidad real de operadores individuales de muy alta rotación, con datos de la totalidad del mercado de Taiwán entre 1995 y 1999 (day trading = más del 20% del volumen total, más del 97% del cual proviene de inversores individuales, no institucionales).

Hallazgos clave:
- Los day traders "pesados" (los más activos) obtienen beneficios brutos medios positivos (36,4 millones de NT$ diarios agregados) **antes** de costes de transacción, pero pérdidas netas (68,9 millones de NT$ diarios agregados) **después** de contabilizar esos costes de forma realista. El coste de transacción no es una fricción menor: invierte el signo del resultado.
- En un periodo semestral típico, **más de 8 de cada 10 day traders pierden dinero**, incluso usando un supuesto de comisión bajo (7 puntos básicos).
- Sin embargo, no todos pierden por igual: existe un grupo pequeño y persistente con habilidad genuina. Los operadores del grupo de mejor rendimiento pasado siguen ganando en el periodo siguiente — casi dos tercios de ese grupo superior mantiene beneficios netos positivos —, y las acciones que compran superan a las que venden por 62 puntos básicos diarios, un margen suficiente para cubrir los costes de transacción. Es decir, la habilidad de operar con éxito a muy corto plazo existe, pero está muy concentrada en una minoría, y el operador medio (o mediano) opera con expectativa negativa.

## En qué condiciones tiende a funcionar (o a fallar)

Combinando la lógica estructural anterior con la evidencia adyacente:

- **Tiende a ser más viable** en instrumentos de spread mínimo y liquidez muy profunda (pares de divisas mayores, índices muy líquidos), durante las horas de mayor volumen y participación institucional (solapamiento de sesiones Londres-Nueva York en forex), con infraestructura de ejecución de baja latencia, y — según la evidencia de Taiwán — solo de forma consistente para una minoría de operadores con habilidad demostrada y repetida, no como expectativa por defecto.
- **Tiende a fallar** en mercados de spread ancho o variable, en momentos de baja liquidez (aperturas/cierres de sesión, festivos, publicación de noticias de alto impacto que amplían el spread de forma súbita), con ejecución manual o infraestructura de latencia alta, y cuando el volumen de operaciones necesario para que la ley de los grandes números favorezca al operador no es sostenible por el capital o el tiempo disponible.
- La volatilidad no es automáticamente favorable: más volatilidad puede significar movimientos de precio mayores dentro de la ventana de scalping (bueno para el margen disponible), pero también spreads más anchos y slippage mayor en el momento de ejecutar (malo para el coste). El resultado neto depende de cuál de los dos efectos domine en cada instrumento y momento concreto.

## Consideraciones prácticas

- **La pregunta antes de operar scalping no es "¿tengo una señal con edge?" sino "¿mi señal genera un movimiento esperado mayor que spread + comisión + slippage esperado, de forma consistente?"** — es un umbral de rentabilidad mucho más exigente que en estrategias de horizonte más largo, donde el coste de transacción es una fracción pequeña del movimiento esperado.
- Backtestear scalping de forma realista es inusualmente difícil: un backtest que no modele spread variable, slippage y latencia de ejecución de forma explícita sobreestimará la rentabilidad de manera sistemática (ver [backtesting y validación](backtesting-y-validacion.md) para la teoría general de por qué los backtests optimistas no se sostienen fuera de muestra).
- Dado que la ventaja (si existe) parece concentrarse en una minoría de operadores con habilidad genuina y repetida (evidencia de Taiwán), cualquier evaluación honesta de una estrategia de scalping propia debería exigir un histórico de operaciones real suficientemente largo antes de asumir que el resultado no es simplemente ruido — ver también [expectativa matemática y ratio R:R](../gestion-riesgo/expectativa-y-ratio-rr.md).

## Relación con otras páginas de la wiki

- Los costes de transacción (spread, profundidad del libro, impacto de mercado y slippage) que dictan la viabilidad del scalping están formalizados en [microestructura de mercado](../basico/microestructura-mercado.md) mediante el modelo de [Almgren & Chriss (2000)](../raw/estrategias/almgren-chriss-optimal-execution.md).
- Comparte con [ruptura-breakout.md](ruptura-breakout.md) la ausencia de riesgo overnight y la lógica intradía, pero en el extremo opuesto del espectro de horizonte temporal (segundos/minutos frente a horas).
- El problema de fondo — cómo saber si el resultado positivo de un backtest de scalping es real o un artefacto de sobreajuste a fricciones de mercado mal modeladas — se trata en profundidad en [backtesting-y-validacion.md](backtesting-y-validacion.md).
- Que la ventaja (si existe) esté concentrada en una minoría de operadores con habilidad genuina y repetida, mientras el operador mediano opera con expectativa negativa, es exactamente el tipo de escenario que analiza [riesgo de ruina](../gestion-riesgo/riesgo-de-ruina.md): un volumen de operaciones muy alto con edge marginal o negativo agota el capital con probabilidad alta, por mucho que la ley de los grandes números favorezca en teoría a la minoría hábil.

## Fuentes

- [Kearns, Kulesza & Nevmyvaka — Empirical Limitations on High Frequency Trading Profitability (2010)](../raw/estrategias/kearns-kulesza-nevmyvaka-hft-profitability.pdf) — calcula la cota superior teórica de beneficio disponible en horizontes de mantenimiento ultra-cortos, usando un "operador omnisciente" simulado.
- [Barber, Lee, Liu & Odean — Do Individual Day Traders Make Money? Evidence from Taiwan (2004)](../raw/estrategias/barber-lee-liu-odean-day-traders-taiwan.pdf) — evidencia empírica sobre la rentabilidad neta real (antes y después de costes) de operadores individuales de muy alta rotación.

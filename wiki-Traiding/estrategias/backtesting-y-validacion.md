---
tags: [estrategias, backtesting, overfitting, walk-forward, validacion, metodologia]
updated: 2026-08-16
fuentes: [raw/estrategias/bailey-pseudo-mathematics-financial-charlatanism.pdf, raw/estrategias/bailey-probability-backtest-overfitting.pdf]
---

# Backtesting y validación de estrategias

> Esta página es teoría **general** sobre cómo validar rigurosamente cualquier estrategia de trading antes de operarla en real, aplicable en cualquier contexto y plataforma. No es una guía de cómo hacer backtesting en este repo concreto — para eso ver [`../proyecto-mt5-bots/07_Backtesting_Optimizacion_y_Validacion_Quant.md`](../proyecto-mt5-bots/07_Backtesting_Optimizacion_y_Validacion_Quant.md), que cubre la implementación específica (Strategy Tester de MT5, datos históricos, flujo de optimización de este proyecto).

## Qué es un backtest y por qué es tan fácil de engañarse con uno

Un backtest es una simulación histórica de cómo se habría comportado una estrategia si se hubiera operado en el pasado: aplica sus reglas a una serie de precios históricos y calcula el resultado (P&L, Sharpe ratio, drawdown, etc.). Es la herramienta central de cualquier proceso de diseño de estrategias sistemáticas, y también la herramienta más fácil de manipular sin darse cuenta — no por mala fe, sino por cómo funciona la búsqueda de parámetros en la práctica.

La distinción fundamental es entre rendimiento **in-sample (IS)** — el resultado medido sobre los mismos datos que se usaron para diseñar o calibrar la estrategia — y rendimiento **out-of-sample (OOS)** — el resultado medido sobre datos que la estrategia nunca "vio" durante su diseño. Un backtest es realista cuando el rendimiento IS es consistente con el rendimiento OOS. El problema central de esta página es que, en la práctica, esa consistencia es la excepción, no la norma, y hay un motivo matemático preciso para ello: el **overfitting** (sobreajuste).

## La fuente: Bailey, Borwein, López de Prado & Zhu

Dos papers de los mismos cuatro autores — David H. Bailey (Lawrence Berkeley National Laboratory), Jonathan Borwein (matemático, Universidad de Newcastle), Marcos López de Prado (Guggenheim Partners / referencia habitual en finanzas cuantitativas) y Qiji Jim Zhu (Western Michigan University) — forman la base de esta página:

- *Pseudo-Mathematics and Financial Charlatanism: The Effects of Backtest Overfitting on Out-of-Sample Performance* (Notices of the American Mathematical Society, mayo 2014) — el artículo divulgativo, revisado por pares, que expone el problema con ejemplos concretos.
- *The Probability of Backtest Overfitting* (Journal of Computational Finance, 2015; versión de trabajo en SSRN desde 2013) — el paper técnico que propone un método formal, **combinatorially symmetric cross-validation (CSCV)**, para estimar la probabilidad de que un backtest concreto esté sobreajustado.

Ambos parten de una observación incómoda: la literatura académica y la industria financiera rara vez reportan cuántas configuraciones alternativas de una estrategia se probaron antes de quedarse con la que se publica o se vende. Sin ese número, un inversor no tiene forma de evaluar cuánto sobreajuste hay detrás de un backtest atractivo.

## El mecanismo del overfitting: por qué un solo backtest bueno no demuestra nada

### Cuantos más parámetros pruebas, más fácil es "encontrar" una estrategia ganadora — aunque no exista ninguna ventaja real

Los autores demuestran formalmente que, dado un número N de configuraciones alternativas de una estrategia (combinaciones de parámetros, filtros, umbrales de entrada/salida, stop loss, etc.), el Sharpe ratio *esperado* de la mejor configuración IS crece con N incluso cuando el verdadero Sharpe ratio de todas las configuraciones es cero. Con solo **10 configuraciones probadas**, el resultado esperado es encontrar una con Sharpe ratio IS de 1,57 — un valor que en cualquier informe aislado parecería una estrategia sólida — pese a que el Sharpe ratio esperado fuera de muestra de esa misma estrategia es exactamente cero. Con una estrategia moderadamente compleja de solo 7 parámetros binarios (128 configuraciones posibles), el Sharpe ratio IS esperado de la "mejor" configuración supera 2,6.

De aquí derivan el concepto de **Minimum Backtest Length (MinBTL)**: la longitud mínima de datos históricos necesaria para que, dado un número N de configuraciones probadas, el Sharpe ratio IS observado sea mínimamente fiable como indicador de habilidad real. La relación es de crecimiento logarítmico con N — cuantas más configuraciones se prueban, más años de datos se necesitan para no producir sistemáticamente falsos positivos. El propio paper ofrece una regla práctica: con solo 5 años de datos disponibles, no deberían probarse más de unas 45 configuraciones independientes sin inflar artificialmente la confianza en el resultado; con solo 7 configuraciones independientes probadas sobre un backtest de 2 años, ya se puede esperar un Sharpe ratio IS de 1 con un Sharpe ratio OOS real de cero.

### Un ejemplo ilustrativo: fabricar un "efecto estacional" de la nada

El paper incluye un ejemplo pedagógico directamente relevante para cualquier estrategia sistemática: sobre una serie de precios generada puramente al azar (sin ninguna estructura ni patrón real), se buscan los parámetros óptimos de una regla mensual con cuatro variables — día de entrada, duración de la posición, stop loss y dirección (largo/corto) —, explorando una malla de 8.800 combinaciones posibles. El resultado: se encuentra una combinación con Sharpe ratio anualizado de 1,27 y un estadístico que, tomado de forma aislada, indicaría menos de un 1% de probabilidad de que el verdadero Sharpe ratio fuera cero o negativo — pese a que, por construcción, no existe ningún efecto estacional real en los datos. El "hallazgo" es enteramente un artefacto de haber probado suficientes combinaciones.

Esto no es un caso extremo poco representativo: los autores señalan explícitamente que el mismo tipo de experimento se puede reproducir para "descubrir" trend-following, momentum o reversión a la media donde no existen, con tal de probar suficientes variantes de parámetros sobre la misma muestra.

### El overfitting no solo produce ruido — a menudo produce pérdidas reales

Un hallazgo menos intuitivo pero crítico: cuando la serie de rendimientos tiene algún tipo de "memoria" (autocorrelación, o una restricción agregada como que el retorno medio total esté fijado), el efecto del overfitting no es neutral — no es que el rendimiento OOS quede simplemente en torno a cero mientras el IS se infla. Los autores muestran, con una prueba formal, que bajo esas condiciones (comunes en series financieras reales) cuanto más se optimiza el rendimiento IS, **peor** tiende a ser el rendimiento OOS: aparece una relación negativa y estadísticamente significativa entre ambos. La explicación intuitiva es que, al haber una restricción de suma o una tendencia a revertir a la media en la serie, "exprimir" el rendimiento en el tramo usado para calibrar roba rendimiento del tramo restante. Esta es, según los autores, una de las razones que explican por qué tantos fondos sistemáticos no cumplen las expectativas generadas por sus propios backtests: el sobreajuste no es un error neutro, sino uno que sesga el resultado futuro hacia abajo.

### La analogía del fraude: por qué no reportar el número de intentos es engañoso

Los autores usan una analogía deliberadamente incómoda: un gestor que envía una predicción de mercado ("sube" o "baja") a miles de inversores potenciales, descarta a los que recibieron la predicción incorrecta, y repite el proceso varias veces — al final, un pequeño grupo ha "presenciado" varias predicciones acertadas seguidas, sin saber que existieron miles de destinatarios a los que la predicción les falló. No reportar el número de configuraciones de estrategia probadas antes de mostrar la ganadora es, estructuralmente, el mismo mecanismo: el resultado atractivo que se enseña es real, pero engañoso, porque esconde todos los intentos fallidos que lo hicieron posible.

## Probabilidad de sobreajuste (PBO) y CSCV: hacia una medida formal

El segundo paper (*The Probability of Backtest Overfitting*) va un paso más allá del diagnóstico y propone un método concreto: **combinatorially symmetric cross-validation (CSCV)**. La idea central es que, para que exista overfitting, la configuración que resulta óptima in-sample debe tender a rendir *peor* que la mediana out-of-sample cuando se invierten los papeles de qué tramo de datos es IS y cuál es OOS. CSCV explota esto dividiendo el histórico disponible en varios bloques, generando de forma combinatoria y simétrica múltiples particiones IS/OOS distintas (en vez de fijar una única partición "hold-out", que los propios autores critican por ser fácil de vulnerar con el tiempo suficiente de prueba y error), y calculando en cuántas de esas particiones la configuración ganadora IS efectivamente decae OOS. El resultado es la **Probabilidad de Backtest Overfitting (PBO)**: una estimación explícita, expresada como probabilidad, de cuánto se puede confiar en que el resultado de un backtest concreto sobrevivirá fuera de muestra.

La ventaja práctica de CSCV frente al método de "hold-out" simple (reservar una porción de los datos y no tocarla hasta el final) es que no depende de que el investigador realmente se abstenga de mirar esos datos durante el proceso de diseño — algo difícil de garantizar y de auditar en la práctica — sino que evalúa la robustez usando particiones múltiples de todo el histórico disponible.

## Walk-forward analysis: el estándar práctico de la industria

Un enfoque relacionado y ampliamente adoptado en la práctica cuantitativa (aunque desarrollado por vías distintas a los papers anteriores, atribuido habitualmente a Robert Pardo) es el **walk-forward analysis**: en vez de optimizar los parámetros de una estrategia una sola vez sobre todo el histórico y probarla sobre el resto, el proceso se repite de forma secuencial y continua — se optimiza sobre una ventana de datos, se evalúa el resultado sobre la ventana inmediatamente siguiente (nunca vista durante esa optimización), se desliza la ventana hacia adelante, y se repite. Si la estrategia encuentra parámetros rentables de forma consistente en sucesivas ventanas "no vistas", la ventaja es más creíble que si solo se ha demostrado una vez sobre un único periodo de prueba; si el rendimiento fuera de muestra se derrumba de una ventana a otra, es una señal directa de que el backtest original estaba sobreajustado. Conceptualmente, el walk-forward analysis es una forma de aplicar de manera repetida y disciplinada la misma distinción IS/OOS que sustenta el marco de Bailey et al., en vez de fiarse de una única partición de los datos.

## Otros sesgos que invalidan un backtest, aunque no haya overfitting de parámetros

El overfitting de parámetros no es la única forma de que un backtest mienta:

- **Look-ahead bias (sesgo de anticipación)**: usar, sin darse cuenta, información que no habría estado disponible en el momento real de la decisión — por ejemplo, usar el precio de cierre ajustado por un split o dividendo que en su momento aún no se conocía, o calcular un indicador con datos que incluyen la propia vela que se está evaluando.
- **Sesgo de supervivencia (survivorship bias)**: construir el universo de prueba solo con activos que siguen existiendo hoy, excluyendo los que quebraron, fueron deslistados o absorbidos — lo que infla artificialmente el rendimiento medio porque el propio proceso de selección ya ha descartado a los peores casos. Es la razón por la que estudios serios (como el ORB de Zarattini et al., ver [ruptura-breakout.md](ruptura-breakout.md)) insisten explícitamente en usar muestras "libres de sesgo de supervivencia".
- **Costes de transacción y slippage no modelados o mal modelados**: un backtest que ignora el spread, la comisión o el impacto de mercado, o que los modela de forma demasiado optimista, sobreestima sistemáticamente el resultado neto real — especialmente crítico en estrategias de alta rotación como el [scalping](scalping.md).

Ninguno de estos sesgos requiere que el investigador haya probado muchas configuraciones de parámetros: pueden colar un resultado engañoso incluso en el primer y único backtest que se ejecuta, lo que subraya que la validación rigurosa exige revisar el diseño del propio backtest, no solo la cantidad de veces que se ha reoptimizado.

## Por qué un solo backtest nunca es suficiente

Juntando todo lo anterior, la conclusión práctica es clara: ni un backtest único con buen Sharpe ratio, ni siquiera un backtest que "supera" un test de significancia estadística estándar, son evidencia suficiente de que una estrategia tiene una ventaja real. Hacen falta, como mínimo:

1. **Conocer y limitar el número de configuraciones probadas** — o, si no es posible limitarlo, exigir un umbral de rendimiento IS más alto cuanto mayor haya sido el número de intentos (MinBTL).
2. **Validar fuera de muestra de forma genuina** — con datos que el proceso de diseño nunca tocó, idealmente mediante múltiples particiones (CSCV) o reoptimización secuencial (walk-forward), no una única partición hold-out fácil de vulnerar con suficiente prueba y error.
3. **Probar robustez frente a distintos periodos y activos** — una estrategia cuya ventaja desaparece al cambiar ligeramente el rango de fechas, el activo, o pequeñas variaciones de los parámetros originales es una señal de alerta de sobreajuste, incluso si el backtest original parecía sólido.
4. **Revisar los sesgos de diseño del propio backtest** (look-ahead, supervivencia, costes de transacción) independientemente de cuántas configuraciones se hayan probado.

Como resumen los propios autores: el disclaimer habitual "rendimientos pasados no garantizan resultados futuros" es, en el contexto de un backtest sobreajustado, **demasiado optimista** — cuando no se controla el sobreajuste, un buen resultado pasado no es un dato neutro sobre el futuro, sino a menudo un indicador de que el resultado futuro será peor de lo que el backtest sugiere.

## Relación con otras páginas de la wiki

- El caso de "Stocks in Play" en [ruptura-breakout.md](ruptura-breakout.md) es un ejemplo de estrategia validada con una muestra libre de sesgo de supervivencia (más de 7.000 acciones, incluyendo las que quebraron) — el tipo de rigor de diseño que esta página recomienda exigir.
- El [scalping](scalping.md) es, por su altísima rotación y su dependencia extrema de costes de transacción bien modelados, la categoría de estrategia donde los errores de backtesting descritos aquí (sobre todo costes mal modelados) tienen el efecto más distorsionador.
- El overfitting de parámetros descrito aquí (probar demasiadas configuraciones hasta encontrar una ganadora por azar) es el equivalente, a nivel de diseño de estrategia, del error de "apilar indicadores redundantes para una falsa sensación de robustez" que describe [Cómo combinar indicadores](../indicadores/como-combinar-indicadores.md) — ambos son formas de curve-fitting: confundir ruido explotado con señal real.
- Para la implementación concreta de backtesting y optimización en este proyecto (Strategy Tester de MetaTrader 5, walk-forward práctico con datos históricos de MT5), ver [`../proyecto-mt5-bots/07_Backtesting_Optimizacion_y_Validacion_Quant.md`](../proyecto-mt5-bots/07_Backtesting_Optimizacion_y_Validacion_Quant.md) — esta página cubre solo la teoría general, no esa implementación.

## Fuentes

- [Bailey, Borwein, López de Prado & Zhu — Pseudo-Mathematics and Financial Charlatanism: The Effects of Backtest Overfitting on Out-of-Sample Performance (Notices of the American Mathematical Society, 2014)](../raw/estrategias/bailey-pseudo-mathematics-financial-charlatanism.pdf) — el artículo divulgativo, revisado por pares, que expone el problema del overfitting de backtests con ejemplos concretos.
- [Bailey, Borwein, López de Prado & Zhu — The Probability of Backtest Overfitting (Journal of Computational Finance, 2015)](../raw/estrategias/bailey-probability-backtest-overfitting.pdf) — el paper técnico que propone el método CSCV y la Probabilidad de Backtest Overfitting (PBO) para estimar formalmente el sobreajuste de un backtest.

## Recursos para profundizar (implementación práctica)

Esta página cubre la teoría de por qué un backtest puede engañar; para pasar de la teoría a la implementación real (código, no solo concepto), [QuantStart](../raw/estrategias/quantstart-articulos-indice.md) es un archivo de más de 200 artículos de referencia en trading cuantitativo, organizado por categorías directamente relevantes aquí: **Systematic Trading** (construcción de sistemas basados en reglas), **Time Series Analysis** y **Mathematics and Statistics** (bases estadísticas del tipo que sustentan CSCV/MinBTL), y **QSTrader**, su propio framework de backtesting open source en Python. También cubre temas avanzados con implementación concreta (Hidden Markov Models para detección de régimen, cointegración y pairs trading, simulación de Monte Carlo) que exceden el alcance de esta página pero son la continuación natural para quien quiera automatizar esta validación en vez de aplicarla manualmente.

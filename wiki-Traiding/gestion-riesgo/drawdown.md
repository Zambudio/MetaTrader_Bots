---
tags: [gestion-riesgo, drawdown, medidas-de-riesgo, riesgo-de-cola]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/goldberg-mahmoud-drawdown.pdf]
---

# Drawdown máximo: qué es y por qué la medida simple no basta

## Qué es el drawdown máximo

El drawdown en un momento `t` es la caída desde el máximo histórico de la curva de capital hasta ese momento: `D(t) = M(t) − X(t)`, donde `M(t)` es el máximo acumulado hasta `t` y `X(t)` es el valor actual de la cuenta. El **drawdown máximo** dentro de un horizonte de tiempo es, simplemente, el mayor de todos esos `D(t)` — la mayor caída de pico a valle que ha sufrido la cuenta en ese periodo.

Es, con diferencia, la medida de riesgo más citada en el mundo de hedge funds y CTAs (*commodity trading advisors*), y da origen a ratios de rendimiento ajustado al riesgo muy usados como el ratio de Calmar, el ratio Sterling y el ratio de Burke — todos ellos dividen el retorno entre alguna función del drawdown máximo, en vez de entre la volatilidad como hace el ratio de Sharpe.

## El problema: un backtest solo te enseña UN drawdown realizado

Goldberg y Mahmoud (2016) señalan un problema conceptual que rara vez se discute al evaluar un EA: el drawdown máximo, tal como normalmente se reporta (el número que aparece en el informe de un backtest de MetaTrader, por ejemplo), es **una única observación realizada** de un proceso aleatorio, no una medida completa de riesgo. Es exactamente como si, para medir el riesgo de una inversión, solo miraras el peor día que tuvo en el pasado y asumieras que nunca puede pasar nada peor.

A diferencia de la volatilidad o el Value-at-Risk, que se calculan sobre la *distribución completa* de retornos posibles, el drawdown máximo observado en un backtest es solo un punto de esa distribución. El propio artículo lo remarca: *"aunque en un horizonte dado solo se realiza un único drawdown máximo a lo largo de un camino concreto, es útil considerar la distribución completa de la que se extrae ese drawdown máximo"*. Dos estrategias pueden tener el mismo drawdown máximo observado en el backtest y, sin embargo, tener perfiles de riesgo de cola completamente distintos si se simularan miles de caminos alternativos igualmente probables.

## La solución propuesta: Conditional Expected Drawdown (CED)

Para resolver esto, los autores formalizan el **Conditional Expected Drawdown (CED)**: la media de la cola de la *distribución* de drawdowns máximos, en vez de un único valor observado. Es exactamente análogo al Expected Shortfall / CVaR que se usa para retornos: en vez de preguntar "¿cuál es mi peor caída posible con un 95% de confianza?" (que sería el equivalente a un VaR sobre drawdowns), el CED pregunta **"dado que estoy en ese 5% de peores escenarios, cuál es la caída media que puedo esperar"** — capturando mejor la severidad de la cola, no solo su frontera.

Formalmente: `CED_θ(X) = E[μ(X) | μ(X) > DT_θ(X)]`, donde `μ(X)` es el drawdown máximo del camino y `DT_θ` es el cuantil θ de la distribución de drawdowns máximos (el "umbral" de drawdown). Los autores prueban que el CED tiene dos propiedades matemáticas deseables para gestión de carteras: es **convexo** (premia la diversificación — combinar dos estrategias nunca puede aumentar el CED por encima de la media ponderada de sus CED individuales) y **homogéneo de grado uno** (se puede descomponer linealmente por posición o factor de riesgo, igual que se hace con la volatilidad de una cartera).

## El hallazgo más importante para trading sistemático: la correlación serial

Este es el resultado empírico más relevante del paper para el diseño de un EA. Los autores muestran que el drawdown — a diferencia de la volatilidad o el Expected Shortfall — es **inherentemente dependiente del camino** (*path-dependent*): no le importa solo cuánto pierdes de media, sino si esas pérdidas se agrupan en rachas consecutivas o se reparten de forma intermitente.

Usando un modelo autorregresivo AR(1) simulado, muestran que las tres medidas de riesgo (volatilidad, Expected Shortfall, CED) aumentan cuando sube la autocorrelación de los retornos, pero **el CED aumenta mucho más rápido que las otras dos**. En el estudio empírico con datos reales de renta variable y bonos de EEUU (1982-2013), la correlación entre el parámetro autorregresivo estimado y cada medida de riesgo fue:

| Activo | Volatilidad | Expected Shortfall (90%) | CED (90%) |
|---|---|---|---|
| US Equity | 0.47 | 0.52 | **0.75** |
| US Bonds | 0.32 | 0.39 | **0.69** |

Es decir: cuanto más "rachera" (autocorrelacionada) es una serie de retornos, más dispara eso el drawdown máximo esperado, muy por encima de lo que sugeriría solo mirar la volatilidad. Un ejemplo llamativo del paper: en la cartera balanceada 60/40 (acciones/bonos), la renta variable representa más del 90% de la contribución a volatilidad y a Expected Shortfall, pero solo alrededor del **75%** de la contribución al CED — porque los bonos, pese a tener menos volatilidad, sufren episodios de pérdidas consecutivas (rachas) que contribuyen desproporcionadamente al riesgo de drawdown.

## La frecuencia de observación importa

Otro punto práctico: el drawdown medido depende de la frecuencia con la que observas la curva de capital. El paper pone como ejemplo el *flash crash* de mayo de 2011: si solo miras precios de cierre diario, **nunca ves ese drawdown intradía**, por muy largo que sea el horizonte de análisis. Esto es directamente relevante para un EA — el drawdown que reporta un backtest con datos OHLC diarios o incluso M1 puede subestimar sistemáticamente el peor movimiento intradía real que podría disparar un margin call o un stop-out en cuenta real.

## Qué significa esto para diseñar/evaluar un EA

- **No confíes en un único número de "max drawdown"** de un backtest como medida completa de riesgo. Es una muestra de tamaño uno de una distribución — utiliza [simulación Monte Carlo](simulacion-monte-carlo.md) (bootstrap resampling de la secuencia de operaciones) para estimar la *distribución* de drawdowns posibles y mirar su cola (el equivalente práctico al CED), no solo el peor caso históricamente observado. Ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md) para por qué ese mismo backtest optimizado también puede estar inflando la expectativa que produjo la curva de capital de partida.
- **Presta atención a la correlación serial de tus resultados**: si las operaciones perdedoras de tu estrategia tienden a agruparse (por ejemplo, porque el EA falla sistemáticamente en un tipo concreto de régimen de mercado que puede persistir varios días o semanas), el riesgo real de drawdown es mayor de lo que sugieren métricas basadas solo en volatilidad de retornos por operación o por día.
- **La frecuencia de tus datos de backtest limita lo que puedes ver**: un backtest en M15 o diario puede no capturar el peor drawdown intradía real; ten margen de seguridad adicional en el sizing frente al drawdown "de libro".
- El control de drawdown es el complemento natural al [criterio de Kelly](position-sizing-kelly.md): Kelly maximiza el crecimiento asintótico pero no dice nada sobre la severidad de las caídas por el camino — es precisamente esa tensión (crecimiento vs. severidad de drawdown) la que justifica usar una fracción de Kelly en vez del Kelly completo.

## Relación con otras páginas

Ver [simulacion-monte-carlo.md](simulacion-monte-carlo.md) para la herramienta práctica de remuestreo (bootstrap IID y por bloques) para estimar empíricamente la distribución de drawdowns. Ver [position-sizing-kelly.md](position-sizing-kelly.md) para cómo el tamaño de posición óptimo según Kelly interactúa con la probabilidad y severidad de las caídas de capital, y [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md) para cómo se calcula el edge que alimenta ese sizing. Ver [riesgo-de-ruina.md](riesgo-de-ruina.md) para la distinción entre drawdown (caída observada o su distribución) y riesgo de ruina (probabilidad de agotar el capital), y [riesgo-de-cartera.md](riesgo-de-cartera.md) para cómo la correlación entre posiciones simultáneas es el equivalente, a nivel de cartera, a la correlación serial de pérdidas descrita aquí. Ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md) para la metodología de validar un backtest (in/out-of-sample, walk-forward) antes de confiar en el drawdown que reporta. Ver [regimenes-mercado.md](../estrategias/regimenes-mercado.md) para la detección de cambios estructurales que provocan rachas correlacionadas de pérdidas.

## Fuentes

- [Goldberg & Mahmoud (2016) — Conditional Expected Drawdown](../raw/gestion-riesgo/goldberg-mahmoud-drawdown.pdf) — paper que formaliza el CED como medida de riesgo de cola sobre la distribución completa de drawdowns máximos, y demuestra el efecto (mayor que en volatilidad o Expected Shortfall) de la correlación serial de pérdidas sobre esa medida.

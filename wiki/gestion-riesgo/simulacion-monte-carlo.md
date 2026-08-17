---
tags: [gestion-riesgo, monte-carlo, simulacion, bootstrap, drawdown, validacion]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/monte-carlo-trading-synthesis.md]
---

# Simulación Monte Carlo para evaluación de estrategias

## Qué es y por qué importa

Un backtest genera **una sola curva de capital** — un único camino histórico de lo que habría pasado. Pero ese camino depende del orden específico en que se dieron las operaciones. Si las mismas 200 operaciones se hubieran ejecutado en un orden diferente, la curva de capital sería distinta: quizás con un drawdown máximo mucho mayor, o mucho menor. La simulación Monte Carlo responde a la pregunta: **dado el perfil de resultados de mi estrategia, cuál es la distribución completa de curvas de capital posibles**, no solo la que pasó a ocurrir históricamente.

Es la herramienta práctica para estimar empíricamente la distribución de drawdowns que [drawdown.md](drawdown.md) formaliza teóricamente (CED de Goldberg y Mahmoud), y para calcular probabilidades de riesgo de ruina sin depender de las fórmulas analíticas cerradas de [riesgo-de-ruina.md](riesgo-de-ruina.md) (que asumen distribuciones específicas).

## Cómo funciona: bootstrap resampling

El mecanismo central es el **bootstrap resampling** (muestreo con reemplazo):

1. Se toma la lista de resultados por operación del backtest (P&L neto, o R-multiples).
2. Se muestrean esos resultados **con reemplazo** para crear una secuencia sintética del mismo tamaño que la original.
3. Se calcula la curva de capital de esa secuencia sintética.
4. Se repite 1.000-10.000 veces, generando un "abanico" de curvas de capital posibles.

### Bootstrap estándar (IID) vs. block bootstrap

- **IID**: cada operación se trata como independiente. Se muestrean operaciones individuales. Asume que el orden no importa — que no hay correlación serial entre operaciones.
- **Block bootstrap**: se muestrean **bloques de operaciones consecutivas** (por ejemplo, bloques de 10 trades seguidos). Preserva la estructura temporal: si las pérdidas tienden a agruparse en rachas (por régimen de mercado, por exposición a un factor común), el block bootstrap lo captura. Produce estimaciones de drawdown más realistas — y típicamente más pesimistas — que el IID.

La elección importa: si la estrategia opera en un solo activo y sus resultados muestran agrupamiento de pérdidas (verificable con un test de autocorrelación sobre la secuencia de P&L), el block bootstrap es más apropiado. Este es exactamente el efecto de la correlación serial que [drawdown.md](drawdown.md) documenta como el hallazgo empírico más importante de Goldberg y Mahmoud.

## Qué se extrae de la simulación

### Percentiles de la distribución

| Percentil | Interpretación |
|---|---|
| **5º** | Escenario "peor caso razonable". Si aquí la curva viola el drawdown tolerable, el sizing es excesivo. |
| **50º (mediana)** | Rendimiento típico esperado — más robusto que la media, menos sensible a outliers. |
| **95º** | Potencial "mejor caso". Útil para calibrar expectativas realistas. |

### Distribución de drawdown máximo

En lugar del único número de max drawdown del backtest (una muestra de tamaño uno — la crítica de Goldberg y Mahmoud), Monte Carlo produce la distribución completa. Se puede estimar, por ejemplo, el *drawdown al 95% de confianza*: el drawdown que solo se supera en el 5% de los escenarios simulados. Este valor es una estimación empírica del CED formalizado en [drawdown.md](drawdown.md).

### Probabilidad de riesgo de ruina

Contando en cuántas simulaciones la curva de capital cae por debajo de un umbral definido (por ejemplo, -50% del capital inicial), se obtiene una estimación empírica de la probabilidad de ruina sin depender de la fórmula analítica de [riesgo-de-ruina.md](riesgo-de-ruina.md), que asume operaciones IID con distribución específica.

### Calibración de position sizing

Monte Carlo permite responder: **"¿con qué tamaño de posición tengo menos del 5% de probabilidad de sufrir un drawdown mayor que X%?"** — iterando el factor de sizing y observando cómo cambia la distribución. Esto complementa al [criterio de Kelly](position-sizing-kelly.md), que dice cuánto apostar para maximizar el crecimiento pero no informa sobre la dispersión del resultado.

## Requisitos mínimos de datos

Se recomienda un mínimo de **50-100 operaciones** para que los intervalos de confianza sean significativos. Con menos operaciones, la distribución muestreada está poco definida y los percentiles son inestables. Si la estrategia tiene menos de 50 operaciones en el backtest, Monte Carlo sigue siendo útil pero los resultados son orientativos, no definitivos.

## Limitaciones

- **Garbage in, garbage out**: si el backtest de entrada está sobreajustado (ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md)), las operaciones que se remuestrean ya están sesgadas. Monte Carlo no detecta overfitting — mide robustez *dado* un perfil de resultados, no si ese perfil es real.
- **No predice cambios de régimen**: asume que la distribución futura de resultados se parece a la histórica. Si el mercado cambia de régimen (ver [regimenes-mercado.md](../estrategias/regimenes-mercado.md)), los resultados reales pueden caer fuera de la distribución simulada.
- **El bootstrap IID destruye la correlación serial**: si las pérdidas se agrupan en rachas, el IID bootstrap subestima el riesgo. Usar block bootstrap.

## Qué significa para diseñar un EA

- No confiar en el max drawdown de un único backtest — ejecutar Monte Carlo para estimar la distribución.
- Usar el percentil 5% del drawdown como referencia para el sizing, no el drawdown medio ni el observado.
- Combinar Monte Carlo con validación out-of-sample (walk-forward, CSCV): Monte Carlo mide la robustez del resultado; la validación OOS mide si el edge es real.
- Repetir la simulación cada vez que se reoptimicen los parámetros de la estrategia — el perfil de resultados cambia con la reoptimización.

## Relación con otras páginas

Esta página cubre la herramienta práctica de simulación. Para la formalización teórica de la distribución de drawdowns que Monte Carlo estima, ver [drawdown.md](drawdown.md). Para las fórmulas analíticas de riesgo de ruina (que Monte Carlo puede estimar sin fórmulas), ver [riesgo-de-ruina.md](riesgo-de-ruina.md). Para el sizing que Monte Carlo ayuda a calibrar, ver [position-sizing-kelly.md](position-sizing-kelly.md). Para la validación de que los resultados de entrada no están inflados por overfitting, ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md).

## Fuentes

- [Simulación Monte Carlo aplicada a trading — síntesis curada](../raw/gestion-riesgo/monte-carlo-trading-synthesis.md) — síntesis de literatura cuantitativa de trading sobre bootstrap resampling, percentiles, y calibración de sizing via Monte Carlo.

# Simulación Monte Carlo aplicada a evaluación de estrategias de trading

> Fuente sintetizada a partir de literatura cuantitativa de trading (Quantified Strategies, QuantTradingTools, Alvarez Quant Trading, AmiBroker docs) y principios estadísticos establecidos. No es una fuente primaria única sino una síntesis curada de múltiples referencias.

## Concepto central

Un backtest produce una única curva de capital — un solo "timeline" de lo que habría pasado. La simulación Monte Carlo genera miles de curvas alternativas igualmente probables mediante **bootstrap resampling** (muestreo con reemplazo) de los resultados históricos de las operaciones, permitiendo estimar distribuciones de resultados en lugar de puntos únicos.

## Bootstrap resampling: tipos

### Bootstrap estándar (IID)
- Cada operación histórica se trata como independiente e idénticamente distribuida.
- Se muestrean operaciones individuales con reemplazo para crear secuencias sintéticas.
- Asunción: el orden de las operaciones no importa (no hay correlación serial).

### Block bootstrap
- Preserva la estructura temporal: se muestrean bloques de operaciones consecutivas.
- Necesario cuando existe correlación serial (las pérdidas se agrupan en rachas, por ejemplo por régimen de mercado).
- Más conservador que el bootstrap IID — produce distribuciones de drawdown más anchas.

## Workflow típico

1. Recopilar la lista de resultados por operación (P&L neto, o R-multiples).
2. Mínimo recomendado: 50-100 operaciones para intervalos de confianza significativos.
3. Elegir método de resampling (IID o block).
4. Ejecutar 1.000-10.000 iteraciones, generando una curva de capital sintética en cada una.
5. Analizar los percentiles de la distribución resultante.

## Interpretación de percentiles

| Percentil | Interpretación |
|---|---|
| 5º | Escenario "peor caso razonable". Si aquí la curva viola el drawdown máximo tolerable o el riesgo de ruina, ajustar sizing. |
| 50º (mediana) | Rendimiento típico esperado. |
| 95º | Potencial "mejor caso". Útil para calibrar expectativas realistas. |

## Aplicaciones concretas

### Distribución de drawdown máximo
En lugar de un solo max drawdown del backtest (una muestra de tamaño uno — ver crítica en Goldberg & Mahmoud), Monte Carlo produce la distribución completa. Se puede estimar un "drawdown al 95% de confianza" — el drawdown que solo se supera en el 5% de los escenarios.

### Probabilidad de riesgo de ruina
Contando en cuántas simulaciones la curva de capital cae por debajo de un umbral (p.ej. -50%), se obtiene una estimación empírica de la probabilidad de ruina sin depender de las fórmulas analíticas cerradas (que asumen distribuciones específicas).

### Test de robustez
Si la distribución de Sharpe ratios de las simulaciones tiene alta dispersión, la estrategia es frágil — su rendimiento depende mucho del orden específico de las operaciones. Si es estrecha, la estrategia es robusta.

### Calibración de position sizing
Permite responder: "¿con qué tamaño de posición tengo menos del 5% de probabilidad de sufrir un drawdown superior al X%?" — iterando el sizing y observando cómo cambia la distribución.

## Limitaciones

- **Garbage in, garbage out**: si los resultados de entrada vienen de un backtest sobreajustado, la simulación hereda el sesgo.
- **No predice cambios de régimen**: Monte Carlo asume que la distribución futura de resultados se parece a la histórica; no puede anticipar un cambio estructural del mercado.
- **Correlación serial**: el bootstrap IID la destruye. Usar block bootstrap cuando sea relevante.
- **Es un test de robustez, no un forecast**: informa sobre la dispersión de resultados posibles dada la distribución histórica, no sobre qué pasará mañana.

## Relación con otros conceptos

- Conditional Expected Drawdown (CED) de Goldberg & Mahmoud: Monte Carlo es la herramienta práctica para estimar la distribución de drawdowns que el CED formaliza teóricamente.
- Riesgo de ruina (Whelan): Monte Carlo permite estimarlo empíricamente sin depender de la fórmula analítica cerrada, que asume operaciones IID.
- Walk-forward / CSCV (Bailey et al.): Monte Carlo complementa la validación out-of-sample — mide robustez del resultado, no si el edge es real.
- Criterio de Kelly: Monte Carlo permite calibrar la fracción de Kelly al mostrar la distribución de resultados para distintos tamaños de posición.

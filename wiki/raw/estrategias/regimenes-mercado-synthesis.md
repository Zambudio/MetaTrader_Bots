# Regímenes de mercado y detección de régimen

> Síntesis de literatura académica y cuantitativa: Hamilton (1989) — Markov Regime Switching, QuantStart articles, Gupta et al. (2025) ensemble-HMM. Concepto de régimen y su aplicación a trading algorítmico.

## Qué es un régimen de mercado

Un régimen de mercado es un estado latente (no directamente observable) que caracteriza el comportamiento estadístico del mercado durante un período. Los mercados no tienen una distribución de retornos estacionaria — alternan entre estados con propiedades muy diferentes:

### Regímenes típicos
1. **Bull (alcista)**: retornos medios positivos, volatilidad baja-moderada, autocorrelación positiva (momentum).
2. **Bear (bajista)**: retornos medios negativos, volatilidad alta, autocorrelación negativa (reversión rápida) o positiva (cascada de ventas).
3. **Sideways/Rango**: retornos medios cercanos a cero, volatilidad baja, fuerte reversión a la media.
4. **Crisis/Crash**: retornos muy negativos, volatilidad extrema, correlaciones entre activos se disparan (todo cae junto).

## Por qué importa para trading algorítmico

El problema central: una estrategia que funciona bien en un régimen puede fallar catastróficamente en otro.

- **Trend-following** funciona en bull y bear tendencial, falla en rango.
- **Mean reversion** funciona en rango, falla en tendencias fuertes.
- **Breakout** funciona en transiciones de rango a tendencia, genera muchas señales falsas en rango.

Sin detección de régimen, un EA aplica la misma lógica en todos los estados del mercado — lo que explica por qué muchas estrategias rentables en backtest fracasan en vivo: el backtest capturó un régimen favorable y el live trading encontró uno diferente.

## Modelos de detección de régimen

### 1. Hidden Markov Models (HMM)

#### Fundamento (Hamilton, 1989)
El modelo más citado en la literatura académica. Asume que los retornos observados son generados por un proceso que cambia entre N estados ocultos, cada uno con su propia distribución de retornos (típicamente gaussiana con media y varianza propias).

#### Componentes
- **Estados ocultos**: los regímenes (p.ej. 2 estados: bull/bear, o 3: bull/bear/rango).
- **Emisiones**: los retornos observados, modelados como distribución normal condicional al estado.
- **Matriz de transición**: probabilidades de cambiar de un estado a otro en cada paso temporal.

#### Algoritmos
- **Expectation-Maximization (EM)**: estima los parámetros del modelo (medias, varianzas, probabilidades de transición).
- **Algoritmo de Viterbi**: decodifica la secuencia más probable de estados pasados dada la secuencia de observaciones.
- **Forward-Backward**: calcula la probabilidad de estar en cada estado en cada momento (filtrado en tiempo real).

#### Limitaciones
- Sensible a la elección del número de estados (no hay forma automática robusta de determinarlo).
- Asume distribuciones gaussianas — no captura bien fat tails.
- Look-ahead bias sutil: los parámetros se estiman con datos futuros si se ajusta offline. En producción, hay que estimar online (rolling window).

### 2. Indicadores de volatilidad como proxy

Enfoque más simple y robusto para un EA:
- **VIX** (o equivalente) como indicador de régimen: VIX < 15 → baja volatilidad (rango/bull), VIX > 25 → alta volatilidad (bear/crisis).
- **ATR normalizado**: ATR(14) / precio como medida de volatilidad relativa.
- **Ancho de Bollinger** (Bandwidth): bandas estrechas → baja volatilidad (squeeze, posible breakout); bandas anchas → alta volatilidad.
- **ADX**: ADX > 25 → tendencia (operar trend-following); ADX < 20 → rango (operar mean reversion).

### 3. Enfoques modernos (ML)

- **Clustering** (K-Means, GMM) sobre features de retorno/volatilidad/volumen.
- **Ensemble HMM + tree-based models** (Gupta et al., 2025): combinan la detección de régimen del HMM con modelos de ensemble (Random Forest, XGBoost) para mejorar la robustez predictiva.
- **Wasserstein clustering**: agrupa ventanas de retornos por similitud distribucional, no solo por media y varianza.

## Aplicación práctica para un EA

### Filtro de régimen simple (recomendado como primer paso)
```
Si ADX(14) > 25 → habilitar estrategia de tendencia
Si ADX(14) < 20 → habilitar estrategia de rango/mean-reversion
Si VIX > 30 (o ATR normalizado > umbral) → reducir sizing al 50%
```

### Cambio dinámico de estrategia
Implementar un "meta-EA" que seleccione entre sub-estrategias en función del régimen detectado. Más complejo pero potencialmente más robusto si se valida con walk-forward.

### Consideraciones
- La detección de régimen siempre tiene lag — el mercado puede haber cambiado de régimen antes de que el modelo lo detecte.
- El principal valor no es predecir el próximo régimen, sino evitar aplicar la estrategia equivocada al régimen actual.
- Walk-forward es especialmente importante aquí: un modelo de régimen ajustado a todo el histórico tiene look-ahead bias severo.

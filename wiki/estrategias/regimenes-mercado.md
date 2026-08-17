---
tags: [estrategias, regimenes, hmm, volatilidad, filtro, deteccion]
updated: 2026-08-16
fuentes: [raw/estrategias/regimenes-mercado-synthesis.md]
---

# Regímenes de mercado y detección de régimen

## El problema central

Una estrategia que funciona en un régimen puede fallar en otro. [Trend-following](seguimiento-tendencia.md) funciona en mercados tendenciales; [reversión a la media](reversion-media.md) funciona en mercados en rango; [breakout](ruptura-breakout.md) funciona en transiciones. Sin detección de régimen, un EA aplica la misma lógica en todos los estados — lo que explica por qué estrategias rentables en backtest fracasan en vivo cuando el mercado cambia de régimen.

## Regímenes típicos

| Régimen | Retornos medios | Volatilidad | Autocorrelación | Estrategia favorecida |
|---|---|---|---|---|
| **Bull** | Positivos | Baja-moderada | Positiva (momentum) | Trend-following, momentum |
| **Bear** | Negativos | Alta | Variable | Trend-following (short), cobertura |
| **Sideways/Rango** | ~0 | Baja | Negativa (mean reversion) | Reversión a la media, pairs trading |
| **Crisis/Crash** | Muy negativos | Extrema | Positiva (cascada) | Estar fuera o sizing mínimo |

## Modelos de detección

### 1. Hidden Markov Models (HMM)

Modelo más citado en la literatura académica (Hamilton, 1989). Asume que los retornos son generados por un proceso que cambia entre N estados ocultos.

**Componentes**:
- **Estados ocultos**: los regímenes (bull, bear, rango).
- **Emisiones**: retornos observados, modelados como distribución normal condicional al estado.
- **Matriz de transición**: probabilidades de cambiar de estado.

**Algoritmos**:
- **EM (Expectation-Maximization)**: estima parámetros.
- **Viterbi**: decodifica la secuencia más probable de estados pasados.
- **Forward-Backward**: probabilidad de cada estado en cada momento (filtrado en tiempo real).

**Limitaciones**: sensible al número de estados (no hay forma automática robusta), asume gaussianidad (no captura fat tails), y riesgo de look-ahead bias si se ajusta offline con datos futuros.

### 2. Indicadores de volatilidad como proxy (recomendado como primer paso)

Más simple y robusto para un EA:

| Indicador | Régimen detectado | Umbral típico |
|---|---|---|
| [VIX](../indicadores/volatilidad-implicita-vix.md) | Volatilidad / estrés | < 15 (baja), > 25 (alta) |
| [ATR](../indicadores/volumen-y-atr.md) normalizado | Volatilidad relativa | ATR(14)/precio |
| [ADX](../indicadores/adx-dmi.md) | Tendencia vs. rango | > 25 (tendencia), < 20 (rango) |
| Bollinger Bandwidth | Compresión / expansión | Squeeze → posible breakout |

### 3. Enfoques de Machine Learning

- **Clustering** (K-Means, GMM) sobre features de retorno/volatilidad/volumen.
- **Ensemble HMM + tree-based models** (Gupta et al., 2025): combinan HMM con Random Forest/XGBoost.
- Más complejos, potencialmente más robustos, pero requieren validación rigurosa contra overfitting.

## Aplicación práctica para un EA

### Filtro de régimen simple (primera implementación recomendada)

```
Si ADX(14) > 25 → habilitar estrategia de tendencia
Si ADX(14) < 20 → habilitar estrategia de rango/mean-reversion  
Si VIX > 30 (o ATR normalizado > umbral) → reducir sizing al 50%
```

### Meta-EA con cambio dinámico

Un "meta-EA" que selecciona entre sub-estrategias según el régimen detectado. Más complejo, requiere walk-forward por sub-estrategia Y por la lógica de selección.

### Consideraciones

- La detección siempre tiene **lag** — el mercado puede haber cambiado antes de que el modelo lo detecte.
- El valor principal es **evitar aplicar la estrategia equivocada** al régimen actual, no predecir el próximo régimen.
- Walk-forward es especialmente crítico: un modelo de régimen ajustado a todo el histórico tiene look-ahead bias severo (ver [backtesting-y-validacion.md](backtesting-y-validacion.md)).

## Relación con otras páginas

La detección de régimen es el puente entre el [ADX](../indicadores/adx-dmi.md) (que mide fuerza de tendencia) y la decisión de qué estrategia activar. El [VIX](../indicadores/volatilidad-implicita-vix.md) es el proxy de régimen más directo. Las rachas correlacionadas de pérdidas que disparan el [drawdown](../gestion-riesgo/drawdown.md) son un síntoma de operar con la estrategia equivocada para el régimen actual. La detección de régimen también conecta con el [riesgo de cartera](../gestion-riesgo/riesgo-de-cartera.md): en régimen de crisis, las correlaciones entre activos se disparan.

## Fuentes

- [Regímenes de mercado — síntesis](../raw/estrategias/regimenes-mercado-synthesis.md) — Hamilton (1989), HMMs, indicadores proxy, enfoques de ML, y aplicación a trading algorítmico.

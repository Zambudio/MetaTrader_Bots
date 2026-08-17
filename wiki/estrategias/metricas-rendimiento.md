---
tags: [estrategias, metricas, sharpe, sortino, calmar, rendimiento, validacion]
updated: 2026-08-16
fuentes: [raw/estrategias/metricas-rendimiento-synthesis.md]
---

# Métricas cuantitativas de rendimiento

## Por qué no basta con mirar el retorno

Un retorno del 30% anual parece atractivo — pero ¿con qué volatilidad? ¿Con qué drawdown máximo? ¿A qué nivel de riesgo de ruina? Las métricas de rendimiento ajustado a riesgo existen para responder: **¿cuánto retorno genera la estrategia por cada unidad de riesgo asumido?** Sin ellas, comparar estrategias o evaluar si un backtest es genuinamente bueno es imposible.

## Sharpe Ratio

### Definición

Exceso de retorno por unidad de volatilidad total. La métrica más citada en la industria.

```
Sharpe = (Rp - Rf) / σp
```

- `Rp`: retorno anualizado de la estrategia.
- `Rf`: tasa libre de riesgo (T-bill).
- `σp`: desviación estándar anualizada de los retornos.

### Interpretación

| Sharpe | Lectura |
|---|---|
| < 0 | La estrategia pierde dinero neto de la tasa libre de riesgo |
| 0–1 | Bajo-moderado |
| 1–2 | Bueno (mayoría de hedge funds de calidad) |
| > 2 | Excelente — pero sospechoso de overfitting si viene solo de IS |

**Referencia de la wiki**: el estudio de AQR sobre trend-following de 137 años ([seguimiento-tendencia.md](seguimiento-tendencia.md)) reporta un Sharpe medio de ~0.4, y la versión refinada de ORB de Zarattini et al. ([ruptura-breakout.md](ruptura-breakout.md)) alcanza Sharpe 2.81. Bailey et al. ([backtesting-y-validacion.md](backtesting-y-validacion.md)) demuestran que con solo 10 configuraciones probadas, el Sharpe IS esperado de la mejor es 1.57 *aunque el Sharpe real sea cero*.

### Limitación principal

Penaliza **toda** la volatilidad por igual — subida o bajada. Una estrategia que gana mucho con alta volatilidad al alza tiene peor Sharpe que una que gana poco con volatilidad baja, aunque la primera sea preferible.

## Sortino Ratio

### Definición

Exceso de retorno por unidad de **riesgo a la baja** (downside risk).

```
Sortino = (Rp - Rf) / σd
```

- `σd`: downside deviation — desviación estándar calculada solo con los retornos negativos.

### Ventaja sobre Sharpe

No penaliza la volatilidad al alza. Especialmente relevante para estrategias con distribución asimétrica: trend-following (muchas pérdidas pequeñas + pocas ganancias grandes) tiene un Sortino más alto relativo a su Sharpe que una estrategia simétrica.

### Regla práctica

Si Sortino >> Sharpe, la volatilidad de la estrategia viene principalmente del lado bueno (upside). Si Sortino ≈ Sharpe, la volatilidad es simétrica.

## Calmar Ratio

### Definición

Retorno anualizado dividido por el drawdown máximo.

```
Calmar = Retorno anualizado / |Max Drawdown|
```

### Interpretación

Mide cuánto retorno genera la estrategia por cada unidad de su peor caída histórica. Especialmente valorado por CTAs y traders de futuros — es la métrica que más directamente conecta con la pregunta "¿podré sobrevivir psicológica y financieramente a la peor racha de esta estrategia?".

### Relación con drawdown

El problema documentado en [drawdown.md](../gestion-riesgo/drawdown.md) aplica directamente: el max drawdown de un backtest es una muestra de tamaño uno, así que el Calmar calculado sobre ese único drawdown es también una muestra de tamaño uno. Monte Carlo ([simulacion-monte-carlo.md](../gestion-riesgo/simulacion-monte-carlo.md)) permite estimar una distribución de Calmar ratios más robusta.

### Variantes

- **Sterling**: usa la media de los N peores drawdowns (más estable).
- **Burke**: usa la raíz cuadrada de la media de los drawdowns al cuadrado.
- **MAR (Managed Account Reports)**: similar al Calmar, sin restricción temporal específica.

## Profit Factor

```
Profit Factor = Σ ganancias brutas / Σ pérdidas brutas
```

| PF | Lectura |
|---|---|
| < 1 | Pierde dinero |
| 1–1.5 | Marginal |
| 1.5–2 | Bueno |
| > 2 | Muy bueno (verificar si no viene de pocas operaciones grandes) |

## Uso conjunto y recomendaciones para un EA

1. **Sharpe > 1** (rendimiento ajustado a riesgo aceptable).
2. **Sortino > Sharpe** (confirma que la volatilidad viene del lado bueno).
3. **Calmar razonable** (el drawdown no es desproporcionado al retorno).
4. **Profit Factor > 1.5** y **E > 0** (edge positivo verificable, ver [expectativa-y-ratio-rr.md](../gestion-riesgo/expectativa-y-ratio-rr.md)).
5. Todas estas métricas deben calcularse sobre datos **out-of-sample**, no sobre el backtest optimizado — la inflación por overfitting ([backtesting-y-validacion.md](backtesting-y-validacion.md)) afecta a todas por igual.

## Relación con otras páginas

Para la expectativa por operación (`E`) que alimenta el Profit Factor y la evaluación del edge, ver [expectativa-y-ratio-rr.md](../gestion-riesgo/expectativa-y-ratio-rr.md). Para el riesgo de que cualquiera de estas métricas esté inflada por overfitting del backtest, ver [backtesting-y-validacion.md](backtesting-y-validacion.md). Para una estimación más robusta del Calmar via distribución de drawdowns, ver [simulacion-monte-carlo.md](../gestion-riesgo/simulacion-monte-carlo.md). Para las métricas OOS reales de estrategias académicas evaluadas en la wiki, ver [seguimiento-tendencia.md](seguimiento-tendencia.md) (Sharpe ~0.4) y [ruptura-breakout.md](ruptura-breakout.md) (Sharpe 2.81).

## Fuentes

- [Métricas cuantitativas de rendimiento ajustado a riesgo — síntesis](../raw/estrategias/metricas-rendimiento-synthesis.md) — definiciones, fórmulas y comparación de Sharpe, Sortino, Calmar, Profit Factor y métricas relacionadas.

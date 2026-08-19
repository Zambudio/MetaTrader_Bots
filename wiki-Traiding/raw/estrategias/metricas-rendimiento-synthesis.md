# Métricas cuantitativas de rendimiento ajustado a riesgo

> Fuente sintetizada a partir de definiciones estándar de la industria (CFA Institute, Schwab, documentación de fondos) y literatura cuantitativa. Fórmulas y clasificaciones consensuadas.

## Sharpe Ratio (William Sharpe, 1966)

### Definición
Exceso de retorno por unidad de volatilidad total.

### Fórmula
```
Sharpe = (Rp - Rf) / σp
```
- Rp: retorno anualizado de la estrategia/cartera
- Rf: tasa libre de riesgo (T-bill rate)
- σp: desviación estándar anualizada de los retornos

### Interpretación
- < 0: la estrategia pierde dinero neto de la tasa libre de riesgo.
- 0–1: rendimiento ajustado a riesgo bajo-moderado.
- 1–2: bueno (la mayoría de hedge funds de calidad caen aquí).
- > 2: excelente (raro a largo plazo; sospechoso de overfitting si viene de un backtest — ver Bailey et al.).

### Limitaciones
- Penaliza la volatilidad al alza y a la baja por igual — un activo que sube mucho con alta volatilidad tiene peor Sharpe que uno que sube poco con baja volatilidad.
- Asume distribución normal de retornos; no captura riesgo de cola (fat tails, skewness negativa).
- Sensible al periodo de medición y a la frecuencia de datos (diario vs. mensual).

## Sortino Ratio (Frank Sortino, 1980s)

### Definición
Exceso de retorno por unidad de **riesgo a la baja** (downside risk).

### Fórmula
```
Sortino = (Rp - Rf) / σd
```
- σd: downside deviation — desviación estándar calculada solo con los retornos negativos (por debajo de un umbral, típicamente 0 o Rf).

### Ventaja sobre Sharpe
No penaliza la volatilidad al alza. Especialmente relevante para:
- Estrategias con distribución asimétrica de retornos (opciones, trend-following).
- Comparar estrategias donde una tiene picos al alza frecuentes que inflan σ pero no representan riesgo.

### Interpretación
Mismo marco que Sharpe pero los valores tienden a ser más altos porque σd ≤ σp siempre.

## Calmar Ratio (Terry Young, 1991)

### Definición
Retorno anualizado dividido por el drawdown máximo.

### Fórmula
```
Calmar = Retorno anualizado / |Max Drawdown|
```

### Interpretación
- Mide cuánto retorno genera la estrategia por cada unidad de su peor caída histórica.
- Especialmente valorado por CTAs y traders de futuros.
- Más sensible a eventos extremos que Sharpe (un solo drawdown grande domina el ratio).

### Variantes
- **Sterling Ratio**: usa la media de los N peores drawdowns (en lugar del máximo), más estable.
- **Burke Ratio**: usa la raíz cuadrada de la media de los drawdowns al cuadrado.

## MAR Ratio (Managed Account Reports)

Similar al Calmar pero sin restricción temporal específica. A veces se usa como sinónimo de Calmar.

## Profit Factor

### Fórmula
```
Profit Factor = Σ ganancias brutas / Σ pérdidas brutas
```

### Interpretación
- < 1: la estrategia pierde dinero en bruto.
- 1–1.5: marginal.
- 1.5–2: bueno.
- > 2: muy bueno (pero verificar que no viene de pocas operaciones grandes).

## Win Rate y Expectancy

### Win Rate
```
Win Rate = operaciones ganadoras / total operaciones
```

### Expectancy (E) por operación
```
E = (Win Rate × Average Win) - (Loss Rate × Average Loss)
```
Debe ser > 0 para que la estrategia sea viable. Ver página dedicada en la wiki.

## Comparación integrada

| Métrica | Mide riesgo como... | Mejor para... | Debilidad |
|---|---|---|---|
| Sharpe | Volatilidad total (σ) | Comparación general entre fondos/estrategias | Penaliza volatilidad al alza |
| Sortino | Volatilidad a la baja (σd) | Estrategias asimétricas | Menos conocida, comparación más difícil |
| Calmar | Drawdown máximo | Preservación de capital, CTAs | Dominada por un solo evento extremo |
| Profit Factor | Ratio ganancia/pérdida brutas | Evaluación rápida de un backtest | Ignora distribución temporal |
| Expectancy | Edge por operación | Diseño de position sizing (Kelly) | No incorpora varianza ni path dependency |

## Uso conjunto recomendado

No usar una sola métrica. Una estrategia sólida debería mostrar:
1. Sharpe > 1 (rendimiento ajustado a riesgo aceptable)
2. Sortino > Sharpe (confirma que la volatilidad viene del lado bueno)
3. Calmar razonable (el drawdown máximo no es desproporcionado al retorno)
4. Profit Factor > 1.5 y E > 0 (edge positivo verificable)

Todas estas métricas son susceptibles de inflación por overfitting de backtests (Bailey et al.) — reportar siempre sobre datos out-of-sample.

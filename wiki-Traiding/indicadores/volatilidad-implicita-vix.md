---
tags: [indicadores, vix, volatilidad, volatilidad-implicita, sentimiento, regimen]
updated: 2026-08-16
fuentes: [raw/indicadores/vix-volatilidad-implicita-synthesis.md]
---

# Volatilidad implícita y VIX

## Volatilidad histórica vs. implícita

- **Volatilidad histórica (realizada)**: cuánto se ha movido un activo en el pasado. Desviación estándar de retornos observados. Mira hacia atrás. El [ATR](volumen-y-atr.md) es una medida práctica de volatilidad histórica.
- **Volatilidad implícita (IV)**: cuánto *espera el mercado* que se mueva. Se extrae de los precios de opciones. Mira hacia adelante.

La diferencia es fundamental: la histórica describe lo que pasó; la implícita describe lo que el mercado consensúa que *pasará*. Cuando la IV supera significativamente a la histórica, el mercado anticipa un aumento de volatilidad — señal de incertidumbre.

## El índice VIX

### Definición

El VIX (Cboe Volatility Index) mide la expectativa de volatilidad del S&P 500 a 30 días vista. Conocido como el "índice del miedo" (*fear gauge*).

### Metodología (post-2003)

- **No** usa Black-Scholes.
- Fórmula no paramétrica basada en precios de opciones OTM (out-of-the-money) del S&P 500.
- Interpola varianzas de dos vencimientos para producir una volatilidad constante a 30 días.
- Expresado como porcentaje anualizado (un VIX de 20 = el mercado espera una desviación estándar de ±20% anualizada, o ~±1.26% diaria).

### Niveles de referencia

| VIX | Interpretación |
|---|---|
| < 15 | Baja volatilidad. Mercado complaciente. |
| 15-25 | Volatilidad normal/moderada. |
| 25-35 | Elevada. Incertidumbre significativa. |
| > 35 | Pánico / estrés extremo. |
| > 80 | Solo visto en 2008 (crisis financiera) y 2020 (COVID). |

### Propiedades clave

1. **Mean-reverting**: tiende a revertir a su media (~18-20). Los picos son transitorios.
2. **Correlación inversa con el mercado**: cuando el S&P cae, el VIX sube. Correlación histórica -0.7 a -0.8.
3. **Sesgo de puts (skew)**: la demanda institucional de puts de protección infla el lado izquierdo, lo que se refleja en el VIX.

## Uso práctico para trading — aunque no operes opciones

### Como indicador de sentimiento

- **VIX bajo + subiendo** → alerta temprana: la complacencia se acaba.
- **VIX alto + bajando** → el pánico se disipa; oportunidad contrarian.
- **Picos extremos de VIX** históricamente coinciden con **suelos** de mercado (no con techos).

### Como filtro de régimen para un EA

Esto conecta directamente con [regimenes-mercado.md](../estrategias/regimenes-mercado.md):

| Régimen VIX | Estrategia favorecida | Sizing |
|---|---|---|
| VIX < 15 | [Reversión a la media](../estrategias/reversion-media.md), rango | Normal |
| VIX 15-25 | [Trend-following](../estrategias/seguimiento-tendencia.md), [breakout](../estrategias/ruptura-breakout.md) | Normal |
| VIX > 25 | Trend-following funciona mejor, pero riesgo de ruina es mayor | **Reducir** sizing |
| VIX > 35 | Solo operar con sizing mínimo o estar fuera del mercado | Mínimo |

### Estructura temporal

- **Contango** (normal): futuros VIX > spot VIX. Mercado tranquilo.
- **Backwardation**: futuros VIX < spot VIX. Mercado estresado. La transición de contango a backwardation es señal potente de cambio de régimen.

## Otros índices de volatilidad

| Índice | Subyacente |
|---|---|
| VXN | Nasdaq 100 |
| VDAX | DAX (Alemania) |
| VSTOXX | Euro Stoxx 50 |
| OVX | Petróleo WTI |
| GVZ | Oro |

## Limitaciones

- El VIX mide volatilidad esperada, **no dirección** — no dice si sube o baja.
- No es directamente operable (se opera vía futuros/ETPs).
- La correlación inversa puede romperse temporalmente.
- Para forex puro, el VIX es un proxy imperfecto — no hay un equivalente directo tan líquido para pares de divisas.

## Relación con otras páginas

El VIX es una herramienta de detección de [régimen de mercado](../estrategias/regimenes-mercado.md) y un complemento a la volatilidad histórica medida por el [ATR](volumen-y-atr.md). La relación risk-on/risk-off documentada en [correlaciones-entre-activos.md](../analisis-fundamental/correlaciones-entre-activos.md) se activa precisamente cuando el VIX se dispara. Para la conexión con opciones, ver [opciones-fundamentos.md](../basico/opciones-fundamentos.md).

## Fuentes

- [VIX y volatilidad implícita — síntesis](../raw/indicadores/vix-volatilidad-implicita-synthesis.md) — metodología del Cboe VIX, niveles de referencia, uso como filtro de régimen y sentimiento, sintetizado del whitepaper oficial y fuentes institucionales.

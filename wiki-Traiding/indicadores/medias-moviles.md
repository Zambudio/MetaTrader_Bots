---
tags: [indicadores, medias-moviles, tendencia]
updated: 2026-08-16
fuentes: [raw/indicadores/stockcharts-medias-moviles.md]
---

# Medias móviles

La media móvil es, probablemente, el indicador más básico y más usado en análisis técnico — y también la base de construcción de otros indicadores como [Bollinger](bollinger.md) o [MACD](macd.md). Consiste en promediar el precio (normalmente el cierre) de los últimos N periodos, recalculando el promedio en cada nuevo periodo — de ahí "móvil".

Una media móvil **no predice** la dirección del precio; solo suaviza el ruido para hacer más visible la dirección actual. Por construcción, siempre va por detrás del precio (lag): cuanto más larga la media, más lag.

## Simple (SMA) vs. exponencial (EMA)

- **Media móvil simple (SMA)**: promedio aritmético directo de los últimos N cierres. Al desplazarse un periodo, el dato más antiguo sale y el más reciente entra, todos con el mismo peso.
- **Media móvil exponencial (EMA)**: da más peso a los precios recientes mediante un multiplicador de suavizado (`2 / (N + 1)`). Como consecuencia, la EMA reacciona antes a los cambios de precio que la SMA de igual periodo — gira antes, tanto para bien (detecta el giro antes) como para mal (más sensible a ruido y falsas señales).

Ninguna es "mejor" en abstracto: la EMA es preferible cuando se quiere reaccionar rápido; la SMA, al ser un promedio "de verdad" sobre todo el periodo, suele funcionar mejor como referencia de soporte/resistencia.

## Qué periodo usar

No hay un periodo "correcto" — depende del horizonte temporal:

- Corto plazo / trading activo: medias de 5 a 20 periodos.
- Medio plazo: 20 a 60 periodos.
- Largo plazo / inversión: 100+ periodos.

Las más seguidas por el mercado en general son la de **50 periodos** (tendencia de medio plazo) y la de **200 periodos** (tendencia de largo plazo, la más citada en prensa financiera) — su cruce (ver más abajo) es una de las señales técnicas más conocidas.

## Interpretación

### Dirección = tendencia

Una media móvil ascendente indica un contexto de precios al alza; una descendente, un contexto a la baja. Es la forma más simple de leer el "régimen" de tendencia de un activo sin mirar el precio directamente.

### Cruces como señal de entrada

- **Cruce de dos medias (doble cruce)**: cuando la media corta cruza al alza la larga se conoce popularmente como *golden cross* (señal alcista); cuando cruza a la baja, *death cross* (señal bajista). Es una técnica con lag importante — funciona bien en tendencias fuertes y genera muchas señales falsas en mercados laterales.
- **Cruce de precio**: el precio cruzando por encima o por debajo de una única media. Suele combinarse con una media larga que define el régimen de tendencia general y una corta que dispara la señal — por ejemplo, solo tomar señales alcistas de cruce sobre la media de 50 si el precio está por encima de la de 200.

### Soporte y resistencia dinámicos

En tendencia alcista, el precio suele encontrar soporte en una media (la de 20 en el corto plazo, la de 200 en el largo plazo); en tendencia bajista, la misma media actúa como resistencia. No hay que esperar un nivel exacto — funciona más como una "zona" que como una línea precisa, sobre todo cuanto más larga es la media.

## Limitaciones

Las medias móviles son indicadores de **seguimiento de tendencia** y por tanto van siempre con retraso respecto al precio — no sirven para anticipar techos o suelos exactos. En mercados que se mueven en rango lateral (sin tendencia clara) generan señales tardías y poco útiles. Por eso rara vez se usan solas: es habitual combinarlas con un oscilador — por ejemplo, usar la media móvil para definir la tendencia de fondo y el [RSI](osciladores.md) para afinar el timing de entrada dentro de esa tendencia.

## Ver también

- [Osciladores (RSI y Estocástico)](osciladores.md)
- [MACD](macd.md) — construido a partir de dos EMA
- [Bandas de Bollinger](bollinger.md) — construidas sobre una SMA
- [Volumen y ATR](volumen-y-atr.md)
- [ADX y Directional Movement](adx-dmi.md) — mide si la tendencia que marca la media tiene fuerza suficiente para seguirla
- [Cómo combinar indicadores](como-combinar-indicadores.md)
- [Soporte y resistencia](../basico/soporte-y-resistencia.md) — la media móvil actúa como una versión "dinámica" del mismo concepto de niveles de oferta/demanda
- [Seguimiento de tendencia](../estrategias/seguimiento-tendencia.md) — la familia de estrategias que las medias móviles ayudan a implementar en la práctica

## Fuentes

- [Moving Averages - Simple and Exponential (StockCharts ChartSchool)](../raw/indicadores/stockcharts-medias-moviles.md) — artículo de referencia sobre SMA vs. EMA: qué son, cómo se calculan y cómo se usan como indicador de tendencia y soporte/resistencia dinámico.

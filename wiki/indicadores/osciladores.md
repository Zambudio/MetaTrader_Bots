---
tags: [indicadores, osciladores, rsi, estocastico, momentum]
updated: 2026-08-16
fuentes: [raw/indicadores/stockcharts-rsi.md, raw/indicadores/investopedia-rsi.md, raw/indicadores/stockcharts-estocastico.md]
---

# Osciladores: RSI y Estocástico

Un oscilador es un indicador de momentum que se mueve dentro de un rango acotado (típicamente 0-100), a diferencia de las [medias móviles](medias-moviles.md) o el precio, que no tienen límite. Esa naturaleza acotada es lo que permite hablar de niveles de "sobrecompra" y "sobreventa". Los dos osciladores de momentum más usados son el **RSI (Relative Strength Index)**, desarrollado por J. Welles Wilder y publicado en su libro de 1978 *New Concepts in Technical Trading Systems* (el mismo libro donde presentó el [ATR](volumen-y-atr.md) y el Parabolic SAR), y el **Oscilador Estocástico**, desarrollado por George C. Lane a finales de los años 50.

## RSI

### Qué mide y cómo se calcula

El RSI mide la velocidad y magnitud de los cambios de precio, oscilando entre 0 y 100. La fórmula estándar (periodo por defecto: 14):

```
RSI = 100 - [100 / (1 + RS)]
RS  = Ganancia media / Pérdida media
```

Las primeras ganancia y pérdida medias son un promedio simple de los últimos 14 periodos; a partir de ahí se suavizan igual que una EMA, incorporando el valor anterior:

```
Ganancia media = [(ganancia media previa) x 13 + ganancia actual] / 14
Pérdida media  = [(pérdida media previa) x 13 + pérdida actual] / 14
```

El resultado normaliza el movimiento del precio a una escala 0-100: RSI = 0 significa que no hubo ni una sola ganancia en los 14 periodos; RSI = 100, que no hubo ni una sola pérdida.

### Sobrecompra y sobreventa

Wilder consideraba el RSI en sobrecompra por encima de 70 y en sobreventa por debajo de 30. Estos umbrales son ajustables: subir el de sobrecompra a 80 o bajar el de sobreventa a 20 reduce el número de señales (más exigentes); un RSI de periodo corto (p. ej. 2) se usa a veces precisamente para operar rebotes muy puntuales con umbrales 80/20.

Un matiz importante: **sobrecompra no es sinónimo de "vender ya"**. En una tendencia fuerte, el RSI puede mantenerse en sobrecompra (o sobreventa) durante mucho tiempo sin que el precio revierta — los niveles de sobrecompra/sobreventa funcionan mejor en mercados que oscilan dentro de un rango que en tendencias fuertes y sostenidas.

### Divergencias

Una divergencia aparece cuando el precio y el RSI no cuentan la misma historia:

- **Divergencia alcista**: el precio marca un mínimo más bajo, pero el RSI marca un mínimo más alto (no confirma la debilidad del precio) → el momentum bajista se está agotando.
- **Divergencia bajista**: el precio marca un máximo más alto, pero el RSI marca un máximo más bajo → el momentum alcista se está agotando.

Las divergencias son más fiables cuando aparecen después de una lectura de sobrecompra/sobreventa. Ojo con el matiz de Wilder: en tendencias fuertes las divergencias "menores" son habituales y no implican giro inmediato — una tendencia alcista fuerte puede mostrar varias divergencias bajistas antes del techo real.

### Fallos de oscilación (failure swings)

A diferencia de la divergencia (que compara RSI contra precio), un *failure swing* mira solo al RSI:

- **Failure swing alcista**: el RSI baja de 30, rebota por encima de 30, retrocede sin volver a perforar 30, y luego supera su máximo previo.
- **Failure swing bajista**: el RSI sube de 70, retrocede, rebota sin volver a superar 70, y luego perfora su mínimo previo.

### RSI como indicador de tendencia (rangos de Brown)

Constance Brown, en *Technical Analysis for the Trading Professional*, propone no tratar el RSI como algo que oscila entre 0 y 100 sin más, sino observar en qué **rango** se mueve según el régimen de mercado: en tendencia alcista el RSI tiende a moverse entre 40 y 90, con la zona 40-50 actuando como soporte; en tendencia bajista, entre 10 y 60, con la zona 50-60 actuando como resistencia. Es una forma de usar el propio RSI para diagnosticar si se está en mercado alcista o bajista, en vez de solo cazar sobrecompra/sobreventa.

### Uso práctico del RSI

El RSI no se usa aislado: es habitual combinarlo con una [media móvil](medias-moviles.md) larga que defina la tendencia de fondo, y usar el RSI solo para afinar el timing dentro de esa tendencia (p. ej. comprar en pullbacks de RSI hacia 40-50 solo si el precio está por encima de su media de 200).

## Estocástico

Desarrollado por George C. Lane a finales de los años 50. La idea de partida es distinta a la del RSI: Lane observó que, según una tendencia va perdiendo fuerza, los precios de cierre tienden a alejarse del extremo (máximo o mínimo) del rango reciente antes de que el precio mismo gire — es decir, el Estocástico mide **dónde cierra el precio dentro de su rango de los últimos N periodos**, no la magnitud de las subidas/bajadas como el RSI.

### Cálculo

```
%K = (Cierre actual - Mínimo más bajo) / (Máximo más alto - Mínimo más bajo) x 100
%D = SMA de 3 periodos de %K
```

Periodo estándar: 14. `%K` compara el cierre actual contra el rango máximo-mínimo de los últimos 14 periodos; `%D` es una media móvil de 3 periodos de `%K` que actúa como línea de señal. Ejemplo: si el máximo de los últimos 14 periodos es 110, el mínimo 100, y el cierre actual 108, entonces `%K = 80`.

Existen tres variantes:

- **Estocástico rápido (Fast)**: `%K` sin suavizar (muy errático); `%D` es su SMA(3). Por defecto (14,3).
- **Estocástico lento (Slow)**: `%K` ya viene suavizado con una SMA(3) (equivale al `%D` del rápido); `%D` es la SMA(3) de ese `%K` suavizado. Por defecto (14,3).
- **Estocástico completo (Full)**: periodo de lookback, suavizado de `%K` y periodo de `%D` totalmente configurables. Por defecto (14,3,3).

En la práctica, la mayoría de plataformas ofrecen por defecto la versión lenta o completa, porque el rápido es demasiado ruidoso para operar directamente.

### Sobrecompra y sobreventa

Umbrales estándar: por encima de 80, sobrecompra; por debajo de 20, sobreventa (más estrictos que el 70/30 del RSI). El nivel 50 actúa como línea central: por encima, el precio cotiza en la mitad superior de su rango reciente; por debajo, en la mitad inferior.

Igual que con el RSI, sobrecompra/sobreventa no implica giro inminente — en una tendencia fuerte el Estocástico puede pegarse al extremo (80-100 o 0-20) durante mucho tiempo sin que el precio revierta. Funciona mejor en mercados laterales que en tendencias sostenidas.

### Divergencias y "set-ups"

- **Divergencia alcista**: precio marca un mínimo más bajo, el oscilador marca un mínimo más alto.
- **Divergencia bajista**: precio marca un máximo más alto, el oscilador marca un máximo más bajo.

Lane añadió además una variante propia, los **bull/bear set-ups**, que son el espejo de la divergencia clásica:

- **Bull set-up**: el precio marca un máximo más bajo, pero el oscilador marca un máximo más alto → el momentum alcista se está reforzando pese a la aparente debilidad del precio, anticipando un posible rebote.
- **Bear set-up**: el precio marca un mínimo más alto, pero el oscilador marca un mínimo más bajo → el momentum bajista se está reforzando pese a que el precio sostiene el soporte.

Los cruces de `%K` sobre `%D` (señal), el cruce de la línea central 50, y rupturas de soporte/resistencia en precio sirven para confirmar estas señales.

### Estocástico vs. RSI: diferencias prácticas

Ambos son osciladores 0-100 con sobrecompra/sobreventa y divergencias, pero miden cosas distintas y por eso no son intercambiables:

- **Qué miden**: el RSI mide la relación entre ganancias y pérdidas medias (magnitud del movimiento); el Estocástico mide dónde cierra el precio dentro de su rango reciente (posición, no magnitud).
- **Sensibilidad**: el Estocástico suele ser más rápido y errático — genera más señales y cruces que el RSI en el mismo periodo, lo que lo hace más propenso a señales falsas en mercados sin tendencia clara, pero también más ágil detectando giros tempranos.
- **Umbrales**: 80/20 en el Estocástico frente a 70/30 en el RSI — no son directamente comparables numéricamente aunque ambos usen escala 0-100.
- **Uso combinado**: al no ser redundantes en lo que miden, usarlos juntos (p. ej. exigir que ambos confirmen sobreventa antes de buscar una entrada larga) aporta algo más que usar solo uno, aunque sigue siendo momentum sobre momentum — conviene combinarlos también con un indicador de otra familia (tendencia, volumen o volatilidad); ver [Cómo combinar indicadores](como-combinar-indicadores.md).

### Uso práctico del Estocástico

Funciona mejor en mercados en rango; en mercados con tendencia se puede adaptar usando el patrón de zigzag (pullbacks en tendencia alcista, rebotes en tendencia bajista) en vez de esperar una reversión completa. Periodos de lookback cortos generan un oscilador más errático con más señales; periodos largos lo suavizan a costa de retraso. Como con cualquier oscilador, conviene combinarlo con análisis de volumen, soporte/resistencia y confirmación de ruptura antes de operar una señal aislada.

## Ver también

- [Medias móviles](medias-moviles.md)
- [MACD](macd.md)
- [Bandas de Bollinger](bollinger.md)
- [Volumen y ATR](volumen-y-atr.md) — MFI es, en el fondo, un RSI ponderado por volumen
- [ADX y Directional Movement](adx-dmi.md) — mide fuerza de tendencia, complementa a estos osciladores de momentum
- [Cómo combinar indicadores](como-combinar-indicadores.md)
- [Tendencias y estructura de mercado](../basico/tendencias-y-estructura.md) — los rangos de Brown y el uso del RSI para diagnosticar régimen alcista/bajista se apoyan en la misma idea de estructura de tendencia que la Dow Theory

## Fuentes

- [Relative Strength Index (RSI) (StockCharts ChartSchool)](../raw/indicadores/stockcharts-rsi.md) — artículo de referencia sobre el RSI: cálculo, sobrecompra/sobreventa, divergencias, failure swings y rangos de Brown.
- [Relative Strength Index (RSI) — Investopedia](../raw/indicadores/investopedia-rsi.md) — captura parcial (bloqueo anti-bot del dominio, contenido recuperado vía búsqueda) con la definición general del RSI y su origen histórico.
- [Stochastic Oscillator: Fast, Slow, and Full (StockCharts ChartSchool)](../raw/indicadores/stockcharts-estocastico.md) — artículo de referencia sobre el Oscilador Estocástico: cálculo de %K/%D, variantes rápida/lenta/completa y divergencias.

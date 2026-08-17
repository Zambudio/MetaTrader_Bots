---
tags: [indicadores, bollinger, volatilidad]
updated: 2026-08-16
fuentes: [raw/indicadores/stockcharts-bollinger.md]
---

# Bandas de Bollinger

Desarrolladas por John Bollinger, son bandas de volatilidad construidas alrededor de una [media móvil](medias-moviles.md). A diferencia de un canal de ancho fijo, se ensanchan cuando sube la volatilidad y se estrechan cuando baja — por eso son, en el fondo, tanto un indicador de tendencia (la banda central) como de volatilidad (la distancia entre bandas).

## Cálculo

```
Banda media   = SMA de 20 periodos
Banda superior = SMA(20) + (desviación estándar de 20 periodos x 2)
Banda inferior = SMA(20) - (desviación estándar de 20 periodos x 2)
```

Los parámetros por defecto son 20 periodos y multiplicador 2 (dos desviaciones estándar). Bollinger recomienda ajustes pequeños al multiplicador si se cambia el periodo de la media: por ejemplo, 2,1 para una SMA de 50 periodos, o 1,9 para una de 10.

## Interpretación

### No son niveles de sobrecompra/sobreventa

Este es el matiz que más se malinterpreta: tocar la banda superior **no es**, por sí solo, señal de venta, ni tocar la inferior señal de compra. Bollinger lo describe como "tags" (toques), no señales. De hecho, en una tendencia alcista fuerte el precio puede "caminar la banda" (walking the bands) — tocar repetidamente la banda superior sesión tras sesión sin que eso implique reversión; mientras tanto, es habitual que el precio ni siquiera llegue a tocar la banda inferior durante toda la tendencia, con la SMA de 20 actuando de soporte en los retrocesos.

### Confirmación de patrones de giro (M-Tops y W-Bottoms)

Las bandas se usan sobre todo para confirmar patrones chartistas de doble suelo/doble techo:

- **W-Bottom** (suelo doble): (1) mínimo de reacción, normalmente por debajo de la banda inferior; (2) rebote hacia la banda media; (3) nuevo mínimo del precio que esta vez **se sostiene por encima** de la banda inferior; (4) confirmación con ruptura de resistencia y volumen. La clave es que el segundo mínimo, aun siendo más bajo en precio, muestra menos "empuje" bajista al no perforar la banda.
- **M-Top** (techo doble): la construcción espejo. (1) máximo de reacción por encima de la banda superior; (2) retroceso hacia la banda media; (3) nuevo máximo del precio que esta vez **no llega a tocar** la banda superior — señal de advertencia de momentum decreciente; confirmación con ruptura de soporte.

### Medir la fuerza de la tendencia

Cuanto más "camina" el precio pegado a una banda (sin cruzar hacia el lado contrario), más fuerte es la tendencia en curso. El estrechamiento de las bandas (baja volatilidad, precio comprimido) suele preceder a un movimiento direccional fuerte, aunque las bandas por sí solas no dicen en qué dirección.

## Regla general

Según Bollinger, las bandas deberían contener entre el 88% y el 89% de la acción del precio — por lo que un movimiento fuera de las bandas es estadísticamente significativo, pero no es automáticamente una señal de entrada o salida. Como con cualquier indicador, no se recomienda usarlas de forma aislada: hay que combinarlas con análisis de tendencia y con otros indicadores (p. ej. un oscilador como el [RSI](osciladores.md) o el [MACD](macd.md)) para confirmar la señal.

## Ver también

- [Medias móviles](medias-moviles.md) — la banda media es una SMA de 20
- [Volumen y ATR](volumen-y-atr.md) — otra forma de medir volatilidad
- [Osciladores (RSI y Estocástico)](osciladores.md)
- [Cómo combinar indicadores](como-combinar-indicadores.md)
- [Swing trading](../estrategias/swing-trading.md) — los M-Tops/W-Bottoms que confirman las bandas son patrones chartistas clásicos, del mismo tipo que valida estadísticamente el estudio de Lo-Mamaysky-Wang citado en esa página

## Fuentes

- [Bollinger Bands (StockCharts ChartSchool)](../raw/indicadores/stockcharts-bollinger.md) — artículo de referencia sobre las Bandas de Bollinger: cálculo, interpretación, M-Tops/W-Bottoms y "walking the bands".

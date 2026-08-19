---
tags: [indicadores, volumen, atr, volatilidad, cmf, mfi]
updated: 2026-08-16
fuentes: [raw/indicadores/stockcharts-atr.md, raw/indicadores/stockcharts-volumen.md, raw/indicadores/stockcharts-cmf.md, raw/indicadores/stockcharts-mfi.md]
---

# Volumen y ATR

Indicadores que no miden dirección pura de precio, sino **intensidad**: cuánto volumen respalda un movimiento (OBV, CMF, MFI) y cuánta volatilidad hay en el mercado en un momento dado (ATR). Ninguno dice por sí solo hacia dónde va el precio — se usan para confirmar o poner en duda lo que ya muestran el precio y otros indicadores direccionales.

## Average True Range (ATR)

Desarrollado por J. Welles Wilder (el mismo creador del [RSI](osciladores.md)) y publicado en su libro de 1978 *New Concepts in Technical Trading Systems*. El ATR mide volatilidad, no dirección — un ATR alto no dice si el mercado va a subir o bajar, solo que se está moviendo mucho.

### Por qué no basta con máximo menos mínimo

Wilder diseñó el ATR pensando en materias primas, donde son frecuentes los gaps y los movimientos límite (el precio abre ya lejos del cierre anterior). Un cálculo de volatilidad basado solo en el rango máximo-mínimo del periodo actual **se perdería** esa volatilidad si ocurre en forma de gap. Por eso primero define el **True Range (TR)**, que es el mayor de estos tres valores:

1. Máximo actual − mínimo actual
2. |Máximo actual − cierre anterior|
3. |Mínimo actual − cierre anterior|

Los métodos 2 y 3 son los que capturan el gap: si el precio abre muy por encima o por debajo del cierre previo, el rango máximo-mínimo del día puede ser pequeño pero el movimiento real (desde el cierre anterior) fue grande.

### Cálculo del ATR

Periodo estándar: 14. El primer valor es un promedio simple de los primeros 14 TR; a partir de ahí se suaviza incorporando el valor anterior (igual que una EMA):

```
ATR actual = [(ATR anterior x 13) + TR actual] / 14
```

### Cómo se interpreta

Rangos amplios (TR grandes) suelen acompañar movimientos fuertes en cualquier dirección, especialmente al inicio de un movimiento; rangos estrechos acompañan fases de baja volatilidad. Esto lo hace útil como **validador**: una ruptura de soporte o resistencia acompañada de un ATR creciente tiene más peso que la misma ruptura con ATR plano, porque muestra convicción real detrás del movimiento.

### Limitación importante

El ATR es un valor absoluto (en las mismas unidades que el precio), no un porcentaje — por lo que **no es comparable directamente entre activos** de precio muy distinto (un valor de 20-30€ tendrá un ATR mucho menor que uno de 200-300€, sin que eso signifique que sea "menos volátil" en términos relativos). Para comparar volatilidad entre activos hace falta normalizar el ATR como porcentaje del precio (p. ej. `ATR / SMA(20, cierre) x 100`).

## On Balance Volume (OBV)

Desarrollado por Joe Granville (1963), es de los indicadores de volumen más antiguos. Parte de la idea de que **el volumen precede al precio**: si eso es cierto, un cambio en la presión compradora/vendedora debería verse en el volumen antes de verse en el precio.

### Cálculo

Un acumulado simple: se suma el volumen del periodo si el cierre fue superior al cierre anterior, se resta si fue inferior, y no cambia si fue igual.

```
Si cierre > cierre anterior: OBV = OBV anterior + volumen actual
Si cierre < cierre anterior: OBV = OBV anterior − volumen actual
Si cierre = cierre anterior: OBV = OBV anterior
```

El valor absoluto del OBV no importa (de hecho muchas plataformas ni lo muestran en el eje) — lo relevante es **la dirección de la línea**, no su nivel.

### Cómo se interpreta

- **Confirmación de tendencia**: si el OBV sube en paralelo al precio, el volumen está respaldando la tendencia. Si el precio sube pero el OBV no acompaña (o cae), es una señal de alerta — la subida no tiene detrás la presión compradora que aparenta.
- **Divergencias**: divergencia alcista cuando el precio marca un mínimo más bajo pero el OBV marca un mínimo más alto (o sube) — el volumen no confirma la debilidad del precio. Divergencia bajista, a la inversa. Igual que con el [RSI](osciladores.md) y el [MACD](macd.md), la lógica de divergencia es la misma; lo que cambia es qué se compara contra el precio.
- **Rangos laterales**: un OBV que sube mientras el precio se mueve en rango indica acumulación (compra silenciosa) — señal potencialmente alcista antes de que el precio lo confirme.

### Limitación

El OBV no es un indicador para usar solo — su valor está en **confirmar** una tendencia o una ruptura ya detectada por otros medios (precio, patrones de vela, medias móviles), o en servir de alerta temprana vía divergencia. Un salto puntual de volumen puede distorsionar la lectura durante un tiempo hasta que la serie se "asiente".

## Chaikin Money Flow (CMF)

Desarrollado por Marc Chaikin, mide la presión compradora o vendedora acumulada durante un periodo (típicamente 20-21 periodos), a diferencia del OBV, que acumula sin límite desde el origen de los datos. El resultado es un oscilador que fluctúa por encima y por debajo de cero.

### Cálculo

```
Multiplicador de flujo de dinero = [(Cierre - Mínimo) - (Máximo - Cierre)] / (Máximo - Mínimo)
Volumen de flujo de dinero       = Multiplicador x Volumen del periodo
CMF (20 periodos)                = Suma(Volumen de flujo de dinero, 20) / Suma(Volumen, 20)
```

El multiplicador va de -1 (cierre en el mínimo del rango) a +1 (cierre en el máximo del rango) según en qué punto de su rango diario cerró el precio — no según el cierre respecto al cierre anterior, que es la lógica que usa el OBV. El CMF resultante oscila entre -1 y +1, aunque en la práctica rara vez llega a esos extremos; lo habitual es que se mueva entre -0,50 y +0,50.

### Cómo se interpreta

CMF positivo indica presión compradora; negativo, presión vendedora. Se usa para **confirmar o poner en duda** la acción del precio: un CMF positivo respalda una tendencia alcista, uno negativo la cuestiona. Los cruces de la línea cero son la señal más directa, aunque muchos operadores aplican un margen (+0,05 / -0,05) para filtrar señales débiles y reducir whipsaws.

Una divergencia alcista en CMF (precio hace un mínimo más bajo, CMF hace un mínimo más alto) indica **menos presión vendedora**, no necesariamente compra activa — hace falta que el CMF cruce a positivo para confirmar acumulación real.

### Limitaciones

- Se vuelve poco fiable en mercados muy volátiles/erráticos (más whipsaws).
- Tiene una particularidad de cálculo: como se basa en dónde cierra el precio dentro del rango del día (no en el cierre respecto al anterior), un valor puede abrir con hueco a la baja y cerrar bien por debajo del cierre previo y aun así generar un multiplicador positivo, si ese cierre queda por encima del punto medio de su propio rango del día — puede desalinearse con lo que "parece" haber pasado con el precio.
- No se recomienda como indicador único: StockCharts sugiere combinarlo con osciladores de precio puro como el [RSI](osciladores.md) o el [MACD](macd.md).

## Money Flow Index (MFI)

Creado por Gene Quong y Avrum Soudack, se describe a menudo como un "RSI ponderado por volumen". Al igual que el RSI, produce un oscilador acotado entre 0 y 100 y usa la misma fórmula de normalización — pero en vez de partir de ganancias/pérdidas de precio, parte del **precio típico** ponderado por volumen.

### Cálculo (periodo estándar: 14)

```
Precio típico       = (Máximo + Mínimo + Cierre) / 3
Flujo de dinero bruto = Precio típico x Volumen
Ratio de flujo de dinero = Flujo de dinero positivo (14) / Flujo de dinero negativo (14)
MFI = 100 - [100 / (1 + Ratio de flujo de dinero)]
```

El flujo de dinero de un periodo es positivo si el precio típico sube respecto al periodo anterior, y negativo si baja (los periodos sin cambio no cuentan). El "flujo de dinero bruto" es efectivamente volumen en unidades monetarias — de ahí que a veces se llame "dollar volume".

### Cómo se interpreta

- **Sobrecompra/sobreventa**: por encima de 80, sobrecompra; por debajo de 20, sobreventa (mismos umbrales que el Estocástico, más exigentes que el 70/30 del RSI). Lecturas extremas (por encima de 90 o por debajo de 10) son raras e indican un movimiento de precio genuinamente insostenible.
- **Divergencias**: divergencia alcista cuando el precio marca un mínimo más bajo pero el MFI marca un mínimo más alto; divergencia bajista, a la inversa — misma lógica que en [RSI](osciladores.md#rsi) y [OBV](#on-balance-volume-obv).
- **Failure swings**: igual que en el RSI, pero sobre el MFI — un failure swing alcista es el MFI bajando de 20, rebotando y sosteniéndose por encima, y luego rompiendo su máximo previo (y el espejo para el bajista). Cuando divergencia y failure swing coinciden, la señal es notablemente más robusta que cualquiera de las dos por separado.

### MFI vs. OBV: en qué se diferencian

Aunque ambos son indicadores de volumen, no son intercambiables:

- El **OBV** es un acumulado sin límite (solo importa su dirección/pendiente, no su nivel) construido a partir del cierre frente al cierre anterior.
- El **MFI** es un oscilador acotado 0-100 (sí importa el nivel absoluto: sobrecompra/sobreventa) construido a partir del precio típico ponderado por volumen, y normalizado con la misma fórmula que el RSI.

En la práctica, el MFI aporta lo que el RSI no tiene (el componente de volumen) y lo que el OBV no tiene (un rango acotado con niveles de sobrecompra/sobreventa comparables entre activos). Por eso se suele preferir el MFI sobre el OBV cuando se busca timing de entrada/salida por extremos, y el OBV cuando se busca simplemente confirmar la dirección de una tendencia o detectar acumulación/distribución silenciosa en rango.

### Limitación

Como el resto de indicadores de esta página, el MFI no se recomienda como señal aislada — funciona mejor combinado con otros osciladores de momentum o con análisis de patrones de precio.

## Ver también

- [Bandas de Bollinger](bollinger.md) — otra forma de medir volatilidad, sobre la media móvil en vez de sobre rangos
- [Osciladores (RSI y Estocástico)](osciladores.md) — el MFI es, en el fondo, un RSI ponderado por volumen
- [MACD](macd.md)
- [ADX y Directional Movement](adx-dmi.md) — fuerza de tendencia, otra familia de indicador distinta de volumen/volatilidad
- [Cómo combinar indicadores](como-combinar-indicadores.md)
- [Velas japonesas](../basico/velas-japonesas.md) — la vela y el volumen se combinan a menudo para confirmar patrones
- [Expectativa matemática y ratio R:R](../gestion-riesgo/expectativa-y-ratio-rr.md) — el ATR es una forma habitual de dimensionar la distancia al stop loss (1R), el punto de partida de ese cálculo de riesgo/beneficio

## Fuentes

- [Average True Range (ATR) (StockCharts ChartSchool)](../raw/indicadores/stockcharts-atr.md) — artículo de referencia sobre el ATR: True Range, cálculo y por qué no basta con máximo menos mínimo.
- [On Balance Volume (OBV) (StockCharts ChartSchool)](../raw/indicadores/stockcharts-volumen.md) — artículo de referencia sobre el OBV como indicador representativo de volumen: cálculo, confirmación de tendencia y divergencias.
- [Chaikin Money Flow (CMF) (StockCharts ChartSchool)](../raw/indicadores/stockcharts-cmf.md) — artículo de referencia sobre el CMF: multiplicador de flujo de dinero, cálculo y cruces de la línea cero.
- [Money Flow Index (MFI) (StockCharts ChartSchool)](../raw/indicadores/stockcharts-mfi.md) — artículo de referencia sobre el MFI ("RSI ponderado por volumen"): cálculo, sobrecompra/sobreventa y failure swings.

---
tags: [basico, velas-japonesas, price-action]
updated: 2026-08-16
fuentes: [raw/basico/stockcharts-velas-japonesas.md]
---

# Velas japonesas

Las velas japonesas (candlesticks) son la forma más habitual de representar el precio en un gráfico de trading. Cada vela resume la actividad de un periodo de tiempo concreto (un minuto, una hora, un día...) usando cuatro datos: apertura (open), máximo (high), mínimo (low) y cierre (close) — el conjunto OHLC.

Se originaron en Japón en el siglo XVII para el comercio de arroz; el sistema moderno se atribuye a Homma, un legendario comerciante de arroz de Sakata, y se popularizó en Occidente sobre todo a través del libro de Steve Nison *Japanese Candlestick Charting Techniques*.

## Anatomía de una vela

Una vela tiene dos partes:

- **Cuerpo (body / real body)**: el rectángulo entre el precio de apertura y el de cierre.
  - Si el cierre queda por encima de la apertura, el cuerpo se dibuja hueco o de un color "alcista" (tradicionalmente blanco o verde) → indica presión compradora en ese periodo.
  - Si el cierre queda por debajo de la apertura, el cuerpo se dibuja relleno o de un color "bajista" (tradicionalmente negro o rojo) → indica presión vendedora.
- **Sombras / mechas (shadows / wicks)**: las líneas finas por encima y por debajo del cuerpo, que marcan el máximo y el mínimo del periodo.

Cuanto más largo es el cuerpo, más intensa fue la presión compradora o vendedora; los cuerpos cortos indican poco movimiento neto. Un caso extremo es el **Marubozu**: una vela sin sombras, donde el precio abrió en el extremo (máximo o mínimo) y cerró en el otro extremo — señal de control total de un bando durante toda la sesión.

Las sombras, por su parte, cuentan qué pasó *dentro* de la sesión: una sombra superior larga con sombra inferior corta indica que los compradores dominaron al principio pero los vendedores acabaron empujando el precio abajo antes del cierre (y viceversa para una sombra inferior larga).

## Patrones básicos de una sola vela

- **Doji**: apertura y cierre prácticamente iguales (cuerpo casi inexistente). Refleja indecisión — ni compradores ni vendedores tomaron el control. Su interpretación depende del contexto: tras una tendencia alcista sugiere que la presión compradora se agota; tras una bajista, que la vendedora se agota. Nunca se debe operar un doji aislado, requiere confirmación posterior (ruptura de gap, vela larga en la dirección contraria, etc.).
  - **Doji de piernas largas**: sombras superior e inferior largas y casi iguales — máxima indecisión.
  - **Doji libélula**: apertura, máximo y cierre coinciden, con sombra inferior larga (forma de "T"). Los vendedores dominaron la sesión pero los compradores recuperaron el control al cierre.
  - **Doji lápida**: apertura, mínimo y cierre coinciden, con sombra superior larga ("T" invertida). Lo contrario del anterior.
- **Peonza (spinning top)**: sombras superior e inferior largas con cuerpo pequeño — igual que el doji, señal de indecisión tras un movimiento direccional.
- **Martillo (hammer)** y **hombre colgado (hanging man)**: mismo aspecto (cuerpo pequeño, sombra inferior larga, apenas sombra superior), pero significado opuesto según el contexto — martillo es señal alcista de posible giro si aparece tras una caída; hombre colgado es señal bajista si aparece tras una subida. Ambos necesitan confirmación con la vela siguiente.
- **Estrella fugaz (shooting star)** y **martillo invertido (inverted hammer)**: mismo aspecto (cuerpo pequeño, sombra superior larga), significado opuesto según contexto — estrella fugaz es bajista tras una subida, martillo invertido es alcista tras una caída.

Una regla general de Greg Morris (*Candlestick Charting Explained*) que conviene recordar: **los patrones de vela son patrones de giro, y todo patrón de giro necesita una tendencia previa que revertir**. Un martillo en medio de un rango lateral no significa lo mismo que un martillo al final de una caída sostenida.

## Posicionamiento de velas (para patrones de dos velas)

- **Posición estrella**: la segunda vela abre con un gap respecto a la primera y queda "aislada" del movimiento anterior. Es donde aparecen dojis, martillos, estrellas fugaces, etc., cuando forman parte de patrones de dos o tres velas.
- **Posición harami** ("embarazada" en japonés): la segunda vela, de cuerpo pequeño, queda contenida dentro del cuerpo de la primera vela, de cuerpo grande.

## Qué no te dice una vela

Una vela solo resume la relación entre apertura, máximo, mínimo y cierre — no la secuencia de eventos dentro del periodo. Dos sesiones con dinámicas internas muy distintas pueden producir velas idénticas. Por eso las velas se interpretan mejor combinadas con otras herramientas, no de forma aislada.

## Velas frente a gráfico de barras (OHLC)

Las velas japonesas representan la misma información que un gráfico de barras tradicional (OHLC), pero de forma visualmente más rápida de interpretar: el ojo distingue el color/relleno del cuerpo de un vistazo, mientras que en un gráfico de barras hay que fijarse en las marcas laterales de apertura/cierre. Esto hace que patrones de indecisión o de reversión salten a la vista antes en velas que en barras — ver [tipos de gráfico](tipos-grafico.md) para la comparación completa entre línea, barras y velas.

## Para qué se usan en trading

Las velas y sus patrones no se usan como señal aislada; su valor está en **confirmar** (o contradecir) otras herramientas de análisis técnico:

- Confirman rebotes o rechazos en una [media móvil](../indicadores/medias-moviles.md) usada como soporte/resistencia.
- Confirman rupturas de patrones de figura chartista (triángulos, rangos) — un patrón bajista de vela justo en la ruptura de un triángulo ascendente añade peso a un escenario bajista, aunque el patrón chartista sea "técnicamente" alcista.
- Se refuerzan con volumen: un doji o una vela de reversión con volumen inusualmente alto pesa más que la misma vela con volumen bajo.

Los patrones de vela no dan objetivos de precio por sí mismos (a diferencia de figuras chartistas como el hombro-cabeza-hombro); para eso hace falta combinarlos con otra técnica.

## Ver también

- [Tipos de gráfico](tipos-grafico.md)
- [Estructura de mercado](estructura-mercado.md)
- [Soporte y resistencia](soporte-y-resistencia.md)
- [Tendencias y estructura de mercado](tendencias-y-estructura.md)
- [Medias móviles](../indicadores/medias-moviles.md)
- [Osciladores (RSI)](../indicadores/osciladores.md)

## Fuentes

- [Introduction to Candlesticks (StockCharts ChartSchool)](../raw/basico/stockcharts-velas-japonesas.md) — historia, anatomía y patrones de vela japonesa (incluye el artículo complementario "Candlesticks and Traditional Chart Analysis").

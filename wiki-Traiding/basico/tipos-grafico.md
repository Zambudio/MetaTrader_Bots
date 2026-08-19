---
tags: [basico, tipos-grafico, price-action]
updated: 2026-08-16
fuentes: [raw/basico/stockcharts-tipos-grafico.md, raw/basico/stockcharts-velas-japonesas.md, raw/basico/stockcharts-lineas-barras.md]
---

# Tipos de gráfico

Antes de leer indicadores, hace falta elegir cómo se representa el precio. Los tres tipos "base" que cualquier plataforma de trading ofrece son gráfico de líneas, de barras (OHLC) y de velas japonesas; por encima de esos tres existen formatos especializados (Heikin-Ashi, Renko, Kagi...) pensados para filtrar ruido o cambiar el eje de la representación.

## Los tres tipos base

### Gráfico de líneas

Une con una línea continua un único precio por periodo — normalmente el cierre. Es el más simple y el que menos ruido visual tiene, lo que lo hace útil para ver la tendencia general de un vistazo (por ejemplo, en marcos temporales muy largos, o para comparar varios activos entre sí). Su limitación es obvia: al usar solo el cierre, oculta toda la volatilidad intra-periodo (máximos, mínimos, y la relación entre apertura y cierre).

La elección de usar el cierre y no otro dato no es arbitraria: muchos inversores y traders consideran el nivel de cierre más relevante que la apertura, el máximo o el mínimo, porque resume "quién ganó" la sesión — el precio al que el mercado quedó valorado hasta la siguiente sesión. Además, el gráfico de líneas es en la práctica la única opción disponible cuando no hay datos completos de apertura/máximo/mínimo: es habitual en ciertos índices que solo publican valor de cierre, en valores poco negociados (baja liquidez, datos intradía incompletos) y en algunos feeds de precio intradía en tiempo real que solo entregan el último precio operado.

### Gráfico de barras (OHLC)

Cada periodo se representa con una línea vertical entre el máximo y el mínimo, con dos marcas horizontales cortas: una a la izquierda para la apertura (opcional — muchas plataformas la omiten) y otra a la derecha para el cierre, obligatoria. Contiene la misma información que una vela japonesa (open, high, low, close), pero exige leer las marcas laterales para saber si el periodo cerró al alza o a la baja — no hay un "golpe de vista" de color como en las velas.

Su ventaja frente a la vela es la densidad: al ser una simple línea vertical con marcas, el gráfico de barras permite mostrar mucha información en poco espacio y encajar más periodos en pantalla manteniendo la lectura clara del cierre respecto al rango máximo-mínimo de la sesión. La contrapartida aparece precisamente cuando se añade la marca de apertura: con las dos marcas laterales el gráfico se satura visualmente más rápido que uno de velas, que resuelve la misma información (relación apertura-cierre) con un simple color o relleno del cuerpo — el motivo por el que, comparados con los gráficos de barras OHLC tradicionales, muchos traders consideran las velas japonesas más legibles y visualmente más rápidas de interpretar (ver más detalle en la comparación de la página de [velas japonesas](velas-japonesas.md)).

### Gráfico de velas japonesas

Ver [velas japonesas](velas-japonesas.md) para el desarrollo completo. En resumen: mismo dato OHLC que el gráfico de barras, pero con un cuerpo relleno o hueco (o de un color u otro) que hace visualmente inmediato si el precio cerró por encima o por debajo de la apertura. Por eso StockCharts señala que los traders tienden a preferir velas sobre barras: patrones de indecisión o reversión (doji, martillo, envolvente...) se identifican más rápido.

## Formatos especializados

Más allá de los tres tipos base, existen variantes pensadas para objetivos concretos. Estas son las que cataloga la enciclopedia de StockCharts ChartSchool:

- **Heikin-Ashi**: una variante de vela que recalcula cada vela usando datos de dos periodos en vez de uno, suavizando el ruido y facilitando ver rachas de tendencia — a cambio, los valores de apertura/cierre ya no son los precios reales negociados, así que no sirven para marcar niveles exactos de entrada/salida.
- **Renko**: método de origen japonés en el que los "ladrillos" solo se dibujan cuando el precio se mueve una cantidad fija, ignorando el tiempo por completo. Filtra el ruido lateral a costa de perder la noción de cuándo ocurrió cada movimiento.
- **Kagi**: método japonés basado en volatilidad y en importes de reversión — cambia de dirección (y de grosor de línea) solo cuando el precio revierte más de un umbral definido.
- **Three Line Break**: parecido a Renko en que ignora el tiempo; dibuja una nueva barra solo cuando el precio rompe el rango de las N barras anteriores.
- **CandleVolume / Arms CandleVolume / EquiVolume**: combinan el eje de precio con el volumen, ensanchando o dando forma a cada barra en función del volumen negociado — así se ve de un vistazo si un movimiento de precio vino acompañado de mucho o poco volumen. Ver [volumen y ATR](../indicadores/volumen-y-atr.md).
- **Elder Impulse System**: no es un tipo de gráfico en sí, sino un sistema de coloreado de las barras/velas existentes según señales técnicas simples (típicamente combinando una media móvil y el histograma de [MACD](../indicadores/macd.md)).
- **Point & Figure, Relative Rotation Graphs, Seasonality Charts, Yield Curve, MarketCarpets**: herramientas de análisis más específicas (rotación relativa entre activos, estacionalidad mensual, curva de tipos, mapas de calor de un universo de valores) que no son "gráficos de precio" en el sentido estricto — quedan fuera del alcance de esta página introductoria.

## Cómo elegir

No hay un tipo de gráfico objetivamente mejor — depende de para qué se use:

- Para lectura de patrones de vela y price action de corto plazo → **velas japonesas**.
- Para ver la tendencia de fondo sin ruido, comparar varios activos o marcos temporales muy largos → **líneas**.
- Para filtrar ruido lateral y centrarse solo en movimientos direccionales significativos → **Renko o Kagi**.
- Para suavizar rachas de tendencia y hacerlas más fáciles de seguir visualmente (a costa de precisión en los valores OHLC reales) → **Heikin-Ashi**.

## Ver también

- [Velas japonesas](velas-japonesas.md)
- [Estructura de mercado](estructura-mercado.md)
- [Medias móviles](../indicadores/medias-moviles.md)

## Fuentes

- [Chart Types (StockCharts ChartSchool)](../raw/basico/stockcharts-tipos-grafico.md) — catálogo de los 11 tipos de gráfico especializados (Heikin-Ashi, Renko, Kagi, CandleVolume...).
- [Introduction to Candlesticks (StockCharts ChartSchool)](../raw/basico/stockcharts-velas-japonesas.md) — anatomía de la vela y su comparación con el gráfico de barras OHLC.
- [Chart Types: Line, Bar, and OHLC Charts (StockCharts ChartSchool)](../raw/basico/stockcharts-lineas-barras.md) — los tres tipos base de gráfico de precio (línea, barras y velas).

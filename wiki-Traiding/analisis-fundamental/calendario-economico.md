---
tags: [analisis-fundamental, calendario-economico, macro]
updated: 2026-08-16
fuentes: [raw/analisis-fundamental/fed-calendario-fomc.md, raw/analisis-fundamental/ecb-economic-bulletin.md, raw/analisis-fundamental/trading-economics-calendario.md]
---

# Calendario económico

## Qué es

Un calendario económico es un listado cronológico de las publicaciones de datos macroeconómicos y eventos de política monetaria programados de antemano: decisiones de tipos de interés, cifras de empleo, inflación, PIB, encuestas de sentimiento, subastas de deuda, etc. A diferencia del análisis técnico (que mira el precio) o del fundamental de largo plazo (que mira tendencias estructurales), el calendario económico sirve para el **corto plazo**: saber *cuándo* va a llegar información nueva al mercado que puede moverlo de golpe.

Cada evento suele venir acotado con:

- **Fecha y hora** exacta de publicación (normalmente en UTC).
- **Actual**: el valor real publicado.
- **Previous**: el valor del período anterior (para comparar tendencia).
- **Forecast / Consensus**: lo que el mercado esperaba (media de previsiones de analistas/economistas).
- **Impacto**: una calificación (baja/media/alta, o 1-3 estrellas) de cuánto puede mover el mercado.

Lo que realmente mueve el precio no es el valor "actual" en sí, sino la **sorpresa**: la diferencia entre el dato real y lo que el consenso esperaba. Un dato "bueno" pero en línea con lo esperado apenas mueve el mercado; un dato "malo" que sorprende negativamente por mucho puede generar un movimiento brusco aunque el nivel absoluto siga siendo razonable.

## Eventos que más importan

### Decisiones de tipos de interés de bancos centrales
Los eventos de mayor impacto en divisas e índices. Ver [bancos-centrales.md](bancos-centrales.md) para el detalle de cómo la Fed y el BCE mueven el mercado. Fechas oficiales:
- Fed / FOMC: calendario oficial en [`raw/analisis-fundamental/fed-calendario-fomc.md`](../raw/analisis-fundamental/fed-calendario-fomc.md) — ocho reuniones programadas al año, cuatro de ellas con proyecciones económicas (SEP / "dot plot").
- BCE: el ritmo de reuniones se refleja en la cadencia del Economic Bulletin, ver [`raw/analisis-fundamental/ecb-economic-bulletin.md`](../raw/analisis-fundamental/ecb-economic-bulletin.md) — ocho números al año, ~2 semanas después de cada reunión de política monetaria.

### NFP — Non-Farm Payrolls (EE. UU.)
Informe mensual de empleo no agrícola de EE. UU., publicado el primer viernes de cada mes por el Bureau of Labor Statistics. Es uno de los datos de mayor volatilidad inducida del calendario porque combina tres cifras en un solo comunicado: variación de nóminas, tasa de desempleo y crecimiento salarial (earnings). Afecta directamente a las expectativas de tipos de la Fed.

### CPI — Consumer Price Index (inflación)
Mide la variación de precios al consumo. Es el dato que los bancos centrales vigilan más de cerca para decidir tipos, porque su mandato de estabilidad de precios depende de él. Se publica tanto el dato general como el "core" (sin energía ni alimentos, más estable y el que más pesa en la decisión de política monetaria).

### Decisiones de tipos y PIB
El PIB (trimestral, con lecturas preliminar/revisada/final en EE. UU.) mide el crecimiento económico agregado. Junto con inflación y empleo forma el trío de datos que definen el "mandato dual" de la Fed (máximo empleo + estabilidad de precios) o el mandato único de estabilidad de precios del BCE.

### Otros eventos relevantes
PMI (encuestas de actividad manufacturera/servicios, adelantan tendencia antes que los datos "duros" — ver [indicadores-macro-clave.md](indicadores-macro-clave.md)), ventas al por menor, confianza del consumidor, subastas de deuda soberana, y comparecencias/discursos de miembros de bancos centrales (pueden mover mercado sin ser una "publicación de dato" formal — ver [forward-guidance-y-lectura-de-comunicados.md](forward-guidance-y-lectura-de-comunicados.md)).

Para qué mide y cómo afecta a los mercados cada uno de estos indicadores (no solo cuándo se publica), ver [indicadores-macro-clave.md](indicadores-macro-clave.md).

## Cómo se usa en trading

1. **Planificación de la sesión**: revisar el calendario antes de operar para saber qué eventos de alto impacto hay ese día y a qué hora. Herramientas como Trading Economics (ver [`raw/analisis-fundamental/trading-economics-calendario.md`](../raw/analisis-fundamental/trading-economics-calendario.md)) cubren 150+ países con esta información en un único dashboard.
2. **Gestión de riesgo alrededor del evento**: muchos traders reducen tamaño de posición, amplían stops o simplemente se mantienen fuera del mercado en los minutos previos y posteriores a una publicación de alto impacto, porque el spread se ensancha y la volatilidad puede saltar stops "razonables" en condiciones normales. Ver [expectativa y ratio R:R](../gestion-riesgo/expectativa-y-ratio-rr.md) para el tratamiento de position sizing en estos escenarios.
3. **Operar la sorpresa, no el nivel**: comparar el dato real contra el consenso (forecast), no contra el valor absoluto en sí. Un movimiento fuerte y sostenido tras una publicación normalmente refleja una sorpresa relevante frente al consenso.
4. **Contexto antes que evento aislado**: un solo dato rara vez cambia la tendencia por sí solo; lo relevante es si confirma o contradice la narrativa macro vigente (¿la inflación sigue bajando hacia el objetivo? ¿el mercado laboral se está enfriando?). Para eso conviene cruzar el calendario con el análisis narrativo de [bancos-centrales.md](bancos-centrales.md) y con series históricas de [fuentes-datos-macro.md](fuentes-datos-macro.md).

## Fuentes

- [Calendario FOMC de la Reserva Federal](../raw/analisis-fundamental/fed-calendario-fomc.md) — calendario oficial de reuniones de política monetaria de EE. UU., con fechas y proyecciones económicas (SEP).
- [Economic Bulletin del BCE](../raw/analisis-fundamental/ecb-economic-bulletin.md) — publicación periódica del BCE con el análisis económico y monetario que sustenta sus decisiones de tipos.
- [Calendario económico de Trading Economics](../raw/analisis-fundamental/trading-economics-calendario.md) — calendario que cubre 150+ países con próximas publicaciones de datos y su impacto esperado.

Estas tres fuentes son dashboards vivos: los datos concretos cambian constantemente, para información actualizada consultar siempre la fuente en vivo.

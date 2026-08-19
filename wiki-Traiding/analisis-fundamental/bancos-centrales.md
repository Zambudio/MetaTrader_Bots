---
tags: [analisis-fundamental, bancos-centrales, fed, bce, tipos-de-interes]
updated: 2026-08-16
fuentes: [raw/analisis-fundamental/fed-calendario-fomc.md, raw/analisis-fundamental/ecb-economic-bulletin.md, raw/analisis-fundamental/bis-overview.md]
---

# Bancos centrales y su rol en los mercados

## Por qué importan

Los bancos centrales fijan el precio del dinero (el tipo de interés de referencia) y controlan la cantidad de dinero en circulación. Esa decisión afecta en cascada al coste de financiación de empresas y estados, al atractivo relativo de mantener una divisa frente a otra, y a la valoración de cualquier activo cuyo precio dependa de descontar flujos futuros (acciones, bonos, materias primas). Por eso las decisiones de tipos y los mensajes de los bancos centrales están entre los eventos de mayor impacto del [calendario económico](calendario-economico.md).

## La Reserva Federal (Fed) y el FOMC

El FOMC (Federal Open Market Committee) es el comité que decide la política monetaria de EE. UU. Celebra ocho reuniones programadas al año (ver calendario completo en [`raw/analisis-fundamental/fed-calendario-fomc.md`](../raw/analisis-fundamental/fed-calendario-fomc.md)), de las cuales cuatro incluyen el *Summary of Economic Projections* (SEP): las proyecciones de PIB, desempleo e inflación de cada miembro, y el famoso "dot plot" con su expectativa individual de tipos a futuro.

Elementos clave de cada reunión:

- **Statement (comunicado)**: el texto oficial de la decisión, cuyo lenguaje se analiza palabra por palabra buscando cambios respecto al comunicado anterior (endurecimiento o suavización del tono, "hawkish" vs "dovish").
- **Rueda de prensa**: el presidente de la Fed responde preguntas de la prensa tras las reuniones principales; a menudo mueve el mercado más que el propio comunicado, porque matiza o reafirma el mensaje en tiempo real.
- **Actas (minutes)**: se publican tres semanas después de la reunión, con el detalle de la discusión interna — permiten calibrar cuán dividido estaba el comité y qué riesgos preocupaban a los miembros.

Ver [forward-guidance-y-lectura-de-comunicados.md](forward-guidance-y-lectura-de-comunicados.md) para qué es exactamente el forward guidance como herramienta de política (más allá de "el banco central cuenta lo que va a hacer") y cómo leer en la práctica el lenguaje de un comunicado o de unas actas.

La Fed opera bajo un **mandato dual**: máximo empleo sostenible y estabilidad de precios (inflación objetivo, habitualmente 2%). Cuando ambos objetivos entran en conflicto (por ejemplo, inflación alta pero mercado laboral debilitándose), el lenguaje de la Fed y las expectativas de tipos se vuelven especialmente sensibles a cada dato nuevo de CPI o NFP.

## El Banco Central Europeo (BCE)

El Consejo de Gobierno del BCE decide la política monetaria de la eurozona con una cadencia similar (~8 reuniones/año). El *Economic Bulletin* (ver [`raw/analisis-fundamental/ecb-economic-bulletin.md`](../raw/analisis-fundamental/ecb-economic-bulletin.md)) es el documento donde el BCE expone el análisis económico y monetario que sustenta sus decisiones — se publica dos semanas después de cada reunión, con cuatro números "completos" al año (marzo, junio, septiembre, diciembre) que incluyen proyecciones macroeconómicas del staff.

A diferencia de la Fed, el BCE tiene un **mandato principal único**: la estabilidad de precios. Esto simplifica en teoría la lectura de sus decisiones (todo gira en torno a la inflación y sus perspectivas), aunque en la práctica el BCE también vigila crecimiento y condiciones financieras de una unión monetaria con 20 economías heterogéneas — lo que puede generar mensajes más matizados que los de la Fed.

## Cómo mueven divisas e índices

- **Divisas**: subidas de tipos (o expectativas de subida) tienden a fortalecer una divisa, porque aumenta el atractivo de mantener activos denominados en ella (carry). El mercado de forex se mueve más por el **diferencial de tipos esperado** entre dos bancos centrales que por el nivel absoluto de tipos de cada uno — de ahí que pares como EUR/USD reaccionen tanto a las decisiones de la Fed como a las del BCE, y sobre todo a la diferencia relativa entre ambas trayectorias.
- **Índices bursátiles**: tipos más altos encarecen la financiación de empresas y reducen el valor presente de beneficios futuros, lo que suele presionar a la baja las valoraciones (especialmente de sectores de crecimiento/growth, más sensibles a tipos largos). Tipos más bajos o el anticipo de recortes suelen ser positivos para renta variable.
- **Materias primas**: el oro, al no pagar rendimiento, tiende a comportarse inversamente a los tipos reales (tipos reales altos = mayor coste de oportunidad de mantener oro). Ver [correlaciones-entre-activos.md](correlaciones-entre-activos.md) para el detalle cuantitativo de esta relación y sus matices (dólar, refugio, banca central compradora de oro).

Una misma decisión de tipos mueve divisas, índices y materias primas a la vez y en la misma dirección de fondo — por lo que posiciones abiertas simultáneamente en varios de estos activos alrededor de una reunión de política monetaria no son apuestas independientes. Ver [riesgo-de-cartera.md](../gestion-riesgo/riesgo-de-cartera.md) para cómo cuantificar ese riesgo correlacionado.

## El rol del BIS (Bank for International Settlements)

El BIS no fija tipos de interés — es el organismo de cooperación internacional entre bancos centrales y supervisores financieros (ver [`raw/analisis-fundamental/bis-overview.md`](../raw/analisis-fundamental/bis-overview.md)), a menudo descrito como "el banco central de los bancos centrales". Su relevancia para el trading es más estructural que táctica:

- Aloja el **Comité de Basilea**, origen de los marcos de regulación bancaria (Basilea III y sucesores) que determinan cuánto capital y liquidez deben mantener los bancos — con efecto indirecto sobre la disponibilidad de crédito y liquidez de mercado.
- Publica investigación macro-financiera rigurosa (working papers) y estadísticas de deuda/crédito transfronterizo, útiles para entender riesgo sistémico más que para operar el día a día.

## Fuentes

- [Calendario FOMC de la Reserva Federal](../raw/analisis-fundamental/fed-calendario-fomc.md) — calendario oficial de reuniones del FOMC, con fechas y materiales de proyecciones económicas.
- [Economic Bulletin del BCE](../raw/analisis-fundamental/ecb-economic-bulletin.md) — publicación periódica del BCE con el análisis económico y monetario que sustenta sus decisiones de tipos.
- [Overview del BIS](../raw/analisis-fundamental/bis-overview.md) — página principal del Bank for International Settlements, organismo de cooperación entre bancos centrales y origen del Comité de Basilea.

Los calendarios y publicaciones concretas cambian con cada reunión; para las decisiones y comunicados más recientes, consultar las fuentes en vivo enlazadas arriba.

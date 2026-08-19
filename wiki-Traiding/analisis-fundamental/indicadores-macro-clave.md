---
tags: [analisis-fundamental, indicadores-macro, cpi, empleo, pib, pmi, tipos-de-interes]
updated: 2026-08-16
fuentes: [raw/analisis-fundamental/bankofcanada-explainers-cpi-gdp-tipos.md, raw/analisis-fundamental/tradingeconomics-pmi-nfp-paro.md]
---

# Indicadores macro clave — qué significan y cómo mueven los mercados

Esta página complementa a [fuentes-datos-macro.md](fuentes-datos-macro.md) (que cataloga *dónde* consultar cada dato) y a [calendario-economico.md](calendario-economico.md) (que cataloga *cuándo* se publican): aquí el foco es **qué mide realmente cada indicador y por qué el mercado reacciona como reacciona** cuando se publica. Los cinco indicadores de esta página — inflación, empleo, PIB, PMI y tipos de interés — son los que con más frecuencia mueven divisas, índices y materias primas, y están interconectados entre sí (ver la sección final).

## Inflación (CPI / IPC)

**Qué mide**: el Índice de Precios al Consumo (Consumer Price Index) sigue cuánto gasta el hogar medio y cómo cambia ese gasto con el tiempo. Se construye con una "cesta de la compra" representativa (en el caso de EE. UU./Canadá, varios cientos de bienes y servicios: alimentación, vivienda, transporte, ropa, ocio, salud...), donde cada partida recibe un **peso** según cuánto gasta realmente un hogar en ella — un aumento de precio en una partida con mucho peso (como vivienda) afecta más al índice que el mismo aumento porcentual en una partida menor.

**Cómo se calcula**: se compara el coste de la cesta en un periodo frente a un año base fijado en 100. El dato que se publica y comenta cada mes es la **variación interanual** (% respecto al mismo mes del año anterior), no el nivel absoluto del índice — es la métrica comparable entre periodos.

**Headline vs. "core"**: el CPI general (headline) incluye todo; el CPI subyacente (core) excluye energía y alimentos frescos, categorías muy volátiles por factores de oferta puntuales (clima, geopolítica) que poco dicen sobre la tendencia de fondo de precios. Los bancos centrales prestan más atención al core porque refleja mejor la inflación persistente que su política de tipos puede realmente influir — ver [bancos-centrales.md](bancos-centrales.md).

**Limitaciones a tener en cuenta**: el CPI no captura bien la sustitución de consumo (la gente cambia de producto cuando uno sube de precio), incorpora productos nuevos con retraso, y no incluye el precio de la vivienda como activo (compra de inmuebles) — solo el coste de alquiler/uso, porque se considera un activo de inversión y no un bien de consumo corriente.

**Por qué mueve mercados**: es el dato que más directamente conecta con el mandato de los bancos centrales. Una sorpresa al alza en CPI (dato por encima de lo esperado) sube las expectativas de tipos más altos/durante más tiempo → normalmente fortalece la divisa y presiona a la baja a la renta variable (sobre todo sectores de crecimiento, más sensibles a tipos largos) y al oro (vía tipos reales, ver [correlaciones-entre-activos.md](correlaciones-entre-activos.md)). Como estos movimientos ocurren a la vez sobre varios activos, posiciones abiertas simultáneamente en divisa, índices y oro alrededor de una publicación de CPI heredan esa correlación — ver [riesgo-de-cartera.md](../gestion-riesgo/riesgo-de-cartera.md).

## Empleo: Nonfarm Payrolls y tasa de paro

**Nonfarm Payrolls (NFP, EE. UU.)**: informe de empleo publicado mensualmente (normalmente el primer viernes de mes) que cuenta la variación de puestos de trabajo no agrícolas. Procede de la encuesta a establecimientos (Establishment Survey / Current Employment Statistics), que en EE. UU. encuesta a decenas de miles de empresas y agencias públicas que representan varios cientos de miles de centros de trabajo, para dar datos detallados de empleo, horas trabajadas y salarios por industria. **Excluye** explícitamente a trabajadores agrícolas y autónomos — de ahí el nombre "no agrícola".

El NFP es uno de los datos de mayor volatilidad inducida del calendario porque combina en un solo comunicado tres cifras distintas: variación de nóminas, tasa de desempleo, y crecimiento salarial (average hourly earnings) — este último es clave porque salarios al alza alimentan la inflación por el lado de la demanda, así que el mercado lo cruza automáticamente con la lectura de CPI.

**Tasa de paro (unemployment rate)**: mide el número de personas que buscan activamente empleo como porcentaje de la fuerza laboral (labour force = ocupados + desempleados que buscan activamente). Un matiz importante para no leer el dato de forma ingenua: **una tasa de paro que baja no siempre significa un mercado laboral más sano** — puede reflejar personas que abandonan la búsqueda activa de empleo (y por tanto salen de la fuerza laboral) en lugar de creación neta de puestos de trabajo. Por eso conviene mirar en paralelo la **tasa de participación laboral** (participation rate) y, si se quiere una foto más completa del subempleo, la **tasa U-6** (que además de los desempleados oficiales incluye a quienes trabajan a tiempo parcial por necesidad económica y a quienes han dejado de buscar recientemente por desánimo).

**Por qué mueve mercados**: el empleo es la mitad del mandato dual de la Fed (junto a la estabilidad de precios) — ver [bancos-centrales.md](bancos-centrales.md). Un NFP mucho más fuerte de lo esperado (sorpresa positiva) tiende a reducir la probabilidad de recortes de tipos a corto plazo (fortalece el dólar); un NFP muy débil hace lo contrario. Como con cualquier dato del calendario, lo que mueve el precio es la sorpresa frente al consenso, no el nivel absoluto — ver [calendario-economico.md](calendario-economico.md).

## PIB (Producto Interior Bruto)

**Qué mide**: el valor total de todos los bienes y servicios producidos dentro de un país, habitualmente en un periodo de un año (aunque se publica trimestralmente, con lecturas preliminar, revisada y final en EE. UU.). Comparar el PIB actual con el previo indica si la economía crece o se contrae.

**Cómo se calcula (enfoque del gasto, el más habitual)**:

**PIB = consumo de los hogares + inversión empresarial + gasto público + (exportaciones − importaciones)**

**Por qué es un indicador "retrasado" (lagging)**: el PIB se calcula a partir de actividad económica que ya ha ocurrido, y su publicación llega con semanas o meses de retraso sobre el periodo que mide — para cuando se conoce el dato, buena parte de esa información ya se ha filtrado al mercado a través de indicadores más tempranos (empleo, PMI, ventas al por menor). Esto es justo lo contrario del PMI, que se trata más abajo.

**Limitaciones**: el PIB no captura el trabajo no remunerado (cuidados, voluntariado), la economía sumergida, ni aspectos de calidad de vida o sostenibilidad — es una medida de producción, no de bienestar.

## PMI (Purchasing Managers' Index) — manufacturero y de servicios

**Qué mide**: el PMI es un indicador basado en encuestas mensuales a gerentes de compras (purchasing managers) de empresas del sector privado, que preguntan sobre la evolución de su actividad respecto al mes anterior. Los dos grandes productores son S&P Global (cobertura global, más de 30 países, y creador de los PMI de servicios) y el ISM (Institute for Supply Management, origen de la encuesta manufacturera en EE. UU.).

**Cómo se calcula**: el índice principal es una media ponderada de cinco componentes — en la metodología de S&P Global: Nuevos Pedidos (30%), Producción/Output (25%), Empleo (20%), Tiempos de Entrega de Proveedores (15%) e Inventarios/Existencias de Compras (10%). El componente de tiempos de entrega se invierte en el cálculo para que una ralentización de las entregas (típica en fases de expansión con demanda fuerte) sume en la misma dirección que el resto de componentes.

**Cómo se interpreta**: la escala va de 0 a 100. **Por encima de 50 = expansión** respecto al mes anterior; **por debajo de 50 = contracción**. No es una escala de "bueno/malo" absoluto, sino de dirección de cambio mes a mes.

**Por qué es un indicador "adelantado" (leading)**: los gerentes de compras tienen visibilidad temprana sobre pedidos, producción y contratación de su empresa — antes de que esa actividad se traduzca en las cifras oficiales de PIB o empleo, que llegan con retraso. El PMI puede además anticipar señales de inflación 3-6 meses antes que los datos oficiales de CPI, porque los componentes de precios pagados/cobrados en la encuesta reflejan presiones de costes que aún no se han trasladado al consumidor final. Por eso el mercado lo usa como termómetro rápido de hacia dónde va la economía, no como confirmación de dónde ha estado.

**Manufacturero vs. servicios**: en economías desarrolladas los servicios pesan más en el PIB que la manufactura, así que el PMI de servicios suele tener más peso en la lectura macro agregada — pero el PMI manufacturero sigue siendo muy vigilado porque es más sensible al ciclo global de comercio e inventarios.

## Tipos de interés y su transmisión a los mercados

Ver [bancos-centrales.md](bancos-centrales.md) para el rol de la Fed y el BCE fijando el tipo oficial. Aquí el foco es **cómo** ese tipo oficial se traslada al resto de la economía y de los mercados — la llamada transmisión de política monetaria, que actúa por cuatro canales principales y con un desfase de entre 18 y 24 meses hasta su efecto pleno en la inflación:

1. **Tipos de interés comerciales**: tipos oficiales más bajos → préstamos e hipotecas más baratos, ahorro peor remunerado → incentiva gasto e inversión → presiona la inflación al alza. Tipos más altos hacen lo contrario.
2. **Tipo de cambio**: una bajada de tipos tiende a debilitar la divisa (menor atractivo relativo de mantener activos en ella), lo que encarece importaciones y abarata exportaciones — con efecto potencialmente inflacionario. Una subida de tipos tiende a fortalecer la divisa. Este es el canal que conecta directamente tipos de interés con forex — ver también [correlaciones-entre-activos.md](correlaciones-entre-activos.md) sobre el diferencial de tipos entre bancos centrales como motor de fondo del mercado de divisas.
3. **Expectativas de inflación**: si la gente espera precios más altos, adelanta consumo y exige salarios más altos, lo que puede volverse una profecía autocumplida — gestionar estas expectativas (vía comunicación, no solo vía tipos) es una parte central de la política monetaria moderna.
4. **Precios de los activos**: tipos al alza reducen el valor presente de los flujos futuros de acciones y bonos (bajan sus precios), reduciendo la riqueza percibida de hogares y empresas y, con ello, su gasto. Tipos a la baja tienen el efecto contrario.

## Cómo se relacionan estos indicadores entre sí

Estos cinco indicadores no se leen de forma aislada — forman una cadena de anticipación:

- **PMI** (adelantado) suele anticipar giros en **PIB** y en **empleo** (retrasados) con varios meses de antelación.
- **Empleo** (salarios) y **PMI** (precios pagados/cobrados) pueden anticipar movimientos de **CPI** con 3-6 meses de adelanto.
- **CPI** y el estado del mercado laboral son los dos inputs que más pesan en la decisión de **tipos de interés** de un banco central (ver el mandato dual de la Fed en [bancos-centrales.md](bancos-centrales.md)).
- Los **tipos de interés** resultantes retroalimentan el ciclo: afectan a gasto e inversión, lo que vuelve a mostrarse primero en PMI y empleo, cerrando el círculo.

Para operar con esto en la práctica: un solo dato aislado rara vez cambia la tendencia de fondo — lo relevante es si confirma o contradice la narrativa macro vigente (¿el PMI sigue en expansión mientras el empleo se enfría? ¿la inflación core converge hacia el objetivo del banco central?). Ver [calendario-economico.md](calendario-economico.md) para la gestión práctica de la sesión de trading alrededor de estas publicaciones.

## Fuentes

- [Bank of Canada — explainers de CPI, PIB y tipos](../raw/analisis-fundamental/bankofcanada-explainers-cpi-gdp-tipos.md) — serie oficial de explicadores sobre CPI, PIB y transmisión de política monetaria.
- [Trading Economics — PMI, NFP y tasa de paro](../raw/analisis-fundamental/tradingeconomics-pmi-nfp-paro.md) — páginas sobre PMI manufacturero de EE. UU., Nonfarm Payrolls y tasa de paro, con la metodología de S&P Global/ISM y de la encuesta de establecimientos de EE. UU.

Las cifras concretas citadas como ejemplo (lecturas de PMI, variación de nóminas de un mes dado, niveles de tasa de paro) son fotos de un periodo concreto, no valores permanentes — para el dato actual, consultar las fuentes en vivo catalogadas en [fuentes-datos-macro.md](fuentes-datos-macro.md).

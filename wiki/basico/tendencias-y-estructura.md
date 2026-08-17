---
tags: [basico, tendencia, dow-theory, estructura-mercado, price-action]
updated: 2026-08-16
fuentes: [raw/basico/stockcharts-dow-theory.md]
---

# Tendencias y estructura de mercado

Cómo se define objetivamente que un mercado está en tendencia (alcista, bajista o lateral), y cómo se detecta, también de forma objetiva, que esa tendencia ha cambiado. El marco de referencia clásico es la **Dow Theory**, desarrollada por Charles Dow (fundador de Dow Jones y del *Wall Street Journal*), refinada por William Hamilton y sistematizada más tarde por Robert Rhea. Es el origen histórico de buena parte del vocabulario del análisis técnico moderno (tendencia primaria, soporte/resistencia como "líneas", confirmación por volumen...).

## Tres premisas de partida

La Dow Theory no es solo un método de lectura de gráficos, también asume una filosofía de mercado concreta:

1. **La tendencia primaria no se puede manipular.** Movimientos de corto plazo sí pueden verse afectados por actores puntuales, pero el mercado en su conjunto es demasiado grande para que nadie sostenga una manipulación sobre la tendencia de fondo.
2. **El precio ya refleja toda la información disponible.** Expectativas de los participantes, previsiones de resultados, condiciones económicas — todo eso ya está incorporado al precio en cada momento (una idea emparentada con la hipótesis de mercados eficientes).
3. **La teoría no es infalible.** Es un conjunto de guías que requieren análisis objetivo y aplicación disciplinada, no un sistema mecánico que garantiza batir al mercado.

## Las tres tendencias (primaria, secundaria, menor)

Dow clasificó el movimiento de precio en tres escalas simultáneas, cada una anidada dentro de la anterior:

- **Tendencia primaria**: dura meses o años; es la dirección dominante de fondo (mercado alcista o bajista en sentido amplio).
- **Tendencia secundaria**: movimientos correctivos en contra de la tendencia primaria, de semanas a meses, que típicamente retroceden entre un 33% y un 67% del movimiento primario que corrigen, y suelen desarrollarse con más velocidad que la tendencia que interrumpen.
- **Tendencia menor (fluctuaciones diarias)**: movimientos de horas a días, con muy poco valor predictivo por sí solos — son el "ruido" dentro de las otras dos escalas.

Esta jerarquía es la razón por la que "la tendencia" nunca es una afirmación completa sin especificar el marco temporal: un activo puede estar en tendencia secundaria bajista (una corrección) dentro de una tendencia primaria alcista intacta, y ambas lecturas son correctas a la vez, cada una en su escala.

## Estructura de máximos y mínimos (peak and trough analysis)

La forma objetiva de identificar en qué tendencia está un mercado, sin depender de líneas de tendencia dibujadas a mano, es mirar la secuencia de máximos y mínimos:

- **Tendencia alcista**: una serie de máximos crecientes y mínimos crecientes (*higher highs* y *higher lows*) — cada rebote llega más arriba que el anterior, y cada corrección se detiene más arriba que la corrección anterior.
- **Tendencia bajista**: una serie de máximos decrecientes y mínimos decrecientes (*lower highs* y *lower lows*) — lo simétrico opuesto.

Una vez identificada la tendencia con este método, se asume válida **hasta que se demuestre lo contrario** — es decir, la carga de la prueba está en la señal de cambio, no en la continuidad.

## Cómo se define objetivamente que una tendencia ha cambiado

Este es el punto más útil de la Dow Theory para automatizar reglas de decisión: **no basta con que aparezca un único mínimo más alto (o más bajo) para dar por rota la tendencia**. La regla de confirmación es en dos pasos:

- **Fin de una tendencia bajista**: se considera válida hasta que (1) se forma un mínimo más alto que el mínimo anterior, **y además** (2) el posterior avance desde ese mínimo más alto supera el máximo de reacción previo. Solo con las dos condiciones cumplidas se confirma el cambio a alcista.
- **Fin de una tendencia alcista**: simétrico — hace falta (1) un máximo más bajo que el anterior, **y además** (2) que la caída posterior rompa de forma decisiva el mínimo de reacción previo.

Esta doble condición es justamente lo que separa una simple pausa o corrección normal (que no rompe la estructura) de un cambio de tendencia genuino — evita interpretar cada mínimo más alto aislado como el inicio de una reversión, cuando puede ser solo ruido dentro de la tendencia bajista vigente.

La Dow Theory identifica la *dirección* de la tendencia a partir de la estructura de precio pura, pero no cuantifica su *fuerza* — para eso hace falta un indicador dedicado como el [ADX](../indicadores/adx-dmi.md), que mide si una tendencia ya identificada tiene fuerza suficiente como para que merezca la pena seguirla. De forma parecida, el cruce de [medias móviles](../indicadores/medias-moviles.md) (golden/death cross) ofrece una definición de tendencia alternativa y más mecánica, basada en un indicador en vez de en la secuencia pura de máximos y mínimos.

## Fases de un mercado primario

La Dow Theory también describe la tendencia primaria como una secuencia de tres fases psicológicas, tanto al alza como a la baja — vocabulario que comparte con (y en parte anticipa a) el método de Wyckoff, aunque aquí se resume tal y como lo formula la Dow Theory:

**Mercado alcista primario:**
1. **Acumulación**: el pesimismo generalizado todavía domina; el "dinero inteligente" empieza a comprar de forma discreta en valoraciones deprimidas, mientras la mayoría sigue vendiendo o al margen.
2. **Movimiento fuerte (big move)**: la fase más larga y con las mayores ganancias, coincidiendo con la mejora visible de las condiciones de negocio y de las valoraciones — es donde se suma la mayoría de los seguidores de tendencia.
3. **Exceso**: participación masiva del público general, especulación excesiva y, a menudo, presión inflacionaria — el optimismo se desconecta de los fundamentales.

**Mercado bajista primario:**
1. **Distribución**: el dinero inteligente empieza a vender mientras el público general sigue comprando; las condiciones de negocio empiezan a no ser tan buenas como parecían.
2. **Movimiento fuerte (big move)**: la mayor parte de la caída, a medida que las condiciones económicas se deterioran de forma visible.
3. **Desesperación (despair)**: se abandona toda esperanza; las ventas continúan pese a valoraciones ya "bajas", hasta la capitulación final.

## Confirmación por volumen

El volumen se usa como validación de la calidad de un movimiento, no como señal por sí solo:

- **Confirmación**: en un mercado alcista sano, el volumen debería ser mayor en los avances que en las caídas; en uno bajista, mayor en las caídas que en los rebotes. Un movimiento en la dirección de la tendencia primaria con volumen creciente refuerza la validez de esa tendencia.
- **Aviso de posible giro**: un día de volumen muy elevado tras un avance prolongado puede ser señal de que la tendencia está a punto de cambiar (climax de compras, distribución silenciosa del dinero inteligente en pleno optimismo público).

Ver [volumen y ATR](../indicadores/volumen-y-atr.md) para el desarrollo de cómo se lee el volumen como herramienta independiente.

## Rangos laterales ("lines")

Cuando el precio se mueve en un rango horizontal estrecho durante un tiempo prolongado, la Dow Theory lo interpreta como una fase de acumulación o distribución silenciosa — el mercado permanece neutral hasta que una rotura direccional aclara cuál de los dos bandos ha ganado el control. Una rotura al alza sugiere acumulación (compra silenciosa completada); una rotura a la baja sugiere distribución (venta silenciosa completada). Ver [soporte y resistencia](soporte-y-resistencia.md) para el desarrollo completo de rotura vs. rechazo en estos rangos.

## Contexto histórico y limitaciones

Un estudio académico sobre 70 años de datos encontró que aplicar señales de Dow Theory batía a comprar y mantener (buy-and-hold) en torno a un 2% anualizado, asumiendo además significativamente menos riesgo — pero el mismo análisis señala que en los últimos 18 años de la muestra el rendimiento se quedó por detrás durante mercados alcistas muy prolongados y sostenidos, precisamente el escenario donde salir y entrar en base a correcciones secundarias penaliza frente a simplemente mantener la posición.

La regla de "doble confirmación" entre el Dow Jones Industrial y el Dow Jones Rail/Transportation (los ferrocarriles como indicador adelantado de actividad industrial, por transportar las materias primas antes de que se fabricara nada) es específica del mercado bursátil estadounidense de la época de Dow y no tiene un equivalente directo en forex o materias primas — pero el principio subyacente sí generaliza: **buscar confirmación de una señal de tendencia en un mercado o activo correlacionado**, no operar una señal aislada sin corroborar.

## Ver también

- [Soporte y resistencia](soporte-y-resistencia.md)
- [Estructura de mercado](estructura-mercado.md)
- [Velas japonesas](velas-japonesas.md)
- [Seguimiento de tendencia (trend-following)](../estrategias/seguimiento-tendencia.md)
- [Volumen y ATR](../indicadores/volumen-y-atr.md)
- [Medias móviles](../indicadores/medias-moviles.md)
- [ADX y Directional Movement](../indicadores/adx-dmi.md)

## Fuentes

- [Dow Theory (StockCharts ChartSchool)](../raw/basico/stockcharts-dow-theory.md) — las tres premisas, las tres tendencias, estructura de máximos/mínimos, fases de mercado, confirmación por volumen.

---
tags: [indicadores, adx, dmi, tendencia, fuerza-de-tendencia]
updated: 2026-08-16
fuentes: [raw/indicadores/stockcharts-adx.md]
---

# ADX y Directional Movement (+DI / -DI)

Desarrollado por J. Welles Wilder (el mismo creador del [RSI](osciladores.md) y el [ATR](volumen-y-atr.md)) y publicado en su libro de 1978 *New Concepts in Technical Trading Systems*. A diferencia de los osciladores de momentum ([RSI y Estocástico](osciladores.md)) y de los indicadores de tendencia direccional ([medias móviles](medias-moviles.md), [MACD](macd.md)), el ADX no dice si el precio va a subir o bajar — mide **la fuerza de la tendencia**, tenga la dirección que tenga. Por eso encaja en una familia distinta a la de los demás indicadores de esta wiki: es el complemento natural para filtrar señales de tendencia/momentum antes de operarlas.

El sistema completo tiene tres líneas:

- **+DI (Plus Directional Indicator)**: mide el movimiento direccional al alza.
- **-DI (Minus Directional Indicator)**: mide el movimiento direccional a la baja.
- **ADX (Average Directional Index)**: mide la fuerza de la tendencia, sin importar la dirección — se deriva de la diferencia suavizada entre +DI y -DI.

## Cálculo (nivel alto)

1. Se calcula el True Range (TR — el mismo concepto que usa el [ATR](volumen-y-atr.md)), el movimiento direccional positivo (+DM) y el negativo (-DM) de cada periodo.
2. Se suavizan con la técnica de Wilder (la misma que usa para el RSI y el ATR) sobre 14 periodos.
3. `+DI14 = 100 x (+DM suavizado / TR suavizado)`
4. `-DI14 = 100 x (-DM suavizado / TR suavizado)`
5. `DX = 100 x |(+DI14) - (-DI14)| / [(+DI14) + (-DI14)]`
6. `ADX` = media suavizada (estilo Wilder) de DX.

Por el doble/triple suavizado que arrastra el cálculo, StockCharts señala que hacen falta del orden de 150 periodos de datos para que los valores de ADX se consideren plenamente estables — con menos histórico, los primeros valores no son fiables.

## Cómo se interpreta

### Fuerza de tendencia (ADX)

- **ADX por encima de 25**: tendencia fuerte.
- **ADX entre 20 y 25**: zona gris — algunos analistas usan directamente 20 como umbral único.
- **ADX por debajo de 20**: tendencia débil o mercado sin tendencia clara (en rango).

El ADX tiene un lag considerable por la cantidad de suavizado que aplica — confirma que una tendencia ya está en marcha y es fuerte, no anticipa que vaya a empezar. Es, en ese sentido, parecido a las [medias móviles](medias-moviles.md): sigue, no predice.

### Señales de cruce (+DI / -DI)

- **Señal alcista**: +DI cruza por encima de -DI.
- **Señal bajista**: -DI cruza por encima de +DI.

Estos cruces, por sí solos, son muy frecuentes y generan bastantes señales falsas — de ahí que Wilder pensara el sistema para filtrarlos con el propio ADX: un cruce de +DI/-DI se considera más fiable cuando ocurre con el ADX ya por encima de ~20-25 (es decir, cuando ya hay una tendencia con fuerza suficiente para que el cruce signifique algo). Una colocación de stop inicial habitual es el mínimo de la vela de la señal para una compra, o el máximo para una venta.

## Uso práctico

El ADX no se usa para decidir dirección — se usa como **filtro previo**: antes de aplicar una estrategia de seguimiento de tendencia (cruces de medias móviles, rupturas del MACD sobre la línea central...), comprobar que el ADX está por encima de 20-25 ayuda a evitar operar esas señales en un mercado lateral, donde generan muchos whipsaws. A la inversa, un ADX bajo es la señal de que conviene tratar el mercado como un rango y preferir estrategias de reversión a la media u osciladores como el RSI o el Estocástico en vez de sistemas de seguimiento de tendencia.

Es un ejemplo directo de **confluencia entre familias de indicadores** (tendencia + fuerza de tendencia) en vez de apilar dos indicadores que miden lo mismo — ver [Cómo combinar indicadores](como-combinar-indicadores.md).

## Limitaciones

- Lag alto: al depender de suavizados sucesivos, reacciona tarde a los cambios de régimen (de tendencia a rango y viceversa).
- No indica dirección por sí solo (solo fuerza) — hace falta mirar +DI/-DI o el precio para saber hacia dónde.
- Los cruces de +DI/-DI sin filtro de ADX son frecuentes y de baja calidad; Wilder los diseñó para usarse en conjunto, no +DI/-DI aislados del ADX.

## Ver también

- [Volumen y ATR](volumen-y-atr.md) — el ATR comparte autor (Wilder) y técnica de suavizado con el ADX
- [Osciladores (RSI y Estocástico)](osciladores.md)
- [Medias móviles](medias-moviles.md)
- [MACD](macd.md)
- [Cómo combinar indicadores](como-combinar-indicadores.md)
- [Tendencias y estructura de mercado](../basico/tendencias-y-estructura.md) — la fuerza de tendencia que mide el ADX es el complemento cuantitativo a la lectura cualitativa de estructura (máximos/mínimos, Dow Theory) de esa página
- [Seguimiento de tendencia](../estrategias/seguimiento-tendencia.md) — el uso recomendado del ADX como filtro previo (operar cruces de medias o del MACD solo con ADX > 20-25) aplica directamente a esta familia de estrategias

## Fuentes

- [Average Directional Index (ADX) (StockCharts ChartSchool)](../raw/indicadores/stockcharts-adx.md) — artículo de referencia sobre el sistema ADX/+DI/-DI: cálculo de alto nivel, interpretación de fuerza de tendencia y señales de cruce direccional.

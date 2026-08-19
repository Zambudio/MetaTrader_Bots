---
tags: [indicadores, macd, momentum, tendencia]
updated: 2026-08-16
fuentes: [raw/indicadores/stockcharts-macd.md, raw/indicadores/investopedia-macd.md]
---

# MACD (Moving Average Convergence/Divergence)

Desarrollado por Gerald Appel a finales de los años 70, el MACD es de los indicadores más populares porque combina dos mundos: es un indicador de **tendencia** (se construye con [medias móviles](medias-moviles.md)) convertido en oscilador de **momentum**. A diferencia del [RSI](osciladores.md), el MACD no está acotado entre 0 y 100 — no es un buen indicador de sobrecompra/sobreventa, pero es muy usado para detectar cambios de momentum y de tendencia.

## Cálculo

```
Línea MACD   = EMA(12) - EMA(26)
Línea señal  = EMA(9) de la línea MACD
Histograma   = Línea MACD - Línea señal
```

Los parámetros estándar son **12, 26, 9** (periodos), aunque se pueden ajustar. Un MACD(5,35,5), por ejemplo, es más sensible y se suele preferir en gráficos semanales; alargar los periodos reduce la sensibilidad y el número de señales.

La línea MACD oscila por encima y por debajo de cero (la "línea central") según la EMA corta esté por encima o por debajo de la EMA larga. El histograma visualiza la distancia entre la línea MACD y su propia media (la línea señal): positivo cuando el MACD está por encima de la señal, negativo cuando está por debajo.

## Tres tipos de señal

### 1. Cruces de la línea señal (los más comunes)

Cruce alcista: el MACD gira al alza y cruza por encima de su línea señal. Cruce bajista: gira a la baja y cruza por debajo. Es la señal más frecuente, y por eso la que más falsas señales genera — conviene tratar con cautela los cruces que ocurren en niveles extremos (el MACD llevaba mucho recorrido en una dirección) y en valores muy volátiles.

### 2. Cruces de la línea central

Cruce alcista: el MACD pasa de negativo a positivo (la EMA corta supera a la larga). Cruce bajista: pasa de positivo a negativo. Suelen durar más que los cruces de señal — desde días hasta varios meses — y funcionan mejor cuando aparece una tendencia sostenida después del cruce; en mercados sin tendencia clara generan muchos cruces seguidos sin ninguna ganancia real (whipsaws).

### 3. Divergencias

Igual que en el [RSI](osciladores.md): divergencia alcista cuando el precio hace un mínimo más bajo pero el MACD hace un mínimo más alto (el momentum bajista se agota); divergencia bajista cuando el precio hace un máximo más alto pero el MACD hace un máximo más bajo. Igual que con el RSI, las divergencias bajistas son habituales dentro de tendencias alcistas fuertes (y viceversa) — no todas anticipan un giro real, hay que tratarlas con cautela.

## Limitaciones importantes

- **No es comparable entre activos.** El valor del MACD depende del precio absoluto del activo: un valor de 20€ puede tener un MACD entre -1,5 y 1,5, mientras que uno de 100€ puede moverse entre -10 y +10. Para comparar momentum entre varios activos hace falta un indicador normalizado como el PPO (Percentage Price Oscillator), no el MACD directamente.
- **No sirve para sobrecompra/sobreventa** — al no tener límites superior/inferior, no hay un nivel "objetivo" de sobrecompra como el 70 del RSI.

## Uso práctico

El valor del MACD está en combinar tendencia y momentum en un solo indicador, aplicable a cualquier marco temporal (diario, semanal, mensual). Se suele usar junto al histograma (que anticipa los cruces de señal) y, para robustecer las señales, junto a un análisis de tendencia de fondo — por ejemplo con [medias móviles](medias-moviles.md) largas — de forma parecida a como se combina el RSI con una media de 200 periodos.

## Ver también

- [Medias móviles](medias-moviles.md) — el MACD se construye con dos EMA
- [Osciladores (RSI y Estocástico)](osciladores.md)
- [Bandas de Bollinger](bollinger.md)
- [ADX y Directional Movement](adx-dmi.md) — mide fuerza de tendencia, útil como filtro antes de operar cruces del MACD
- [Cómo combinar indicadores](como-combinar-indicadores.md)
- [Seguimiento de tendencia](../estrategias/seguimiento-tendencia.md) — el cruce de línea central del MACD (EMA corta por encima/debajo de la larga) es, en esencia, la misma lógica de signo de tendencia que el time-series momentum de esta estrategia

## Fuentes

- [MACD (Moving Average Convergence/Divergence) Oscillator (StockCharts ChartSchool)](../raw/indicadores/stockcharts-macd.md) — artículo de referencia completo sobre el MACD: cálculo, cruces de señal y de línea central, divergencias y limitaciones.
- [MACD — Investopedia](../raw/indicadores/investopedia-macd.md) — captura parcial y de baja confianza (bloqueo anti-bot del dominio; el contenido recuperado es una síntesis genérica de otras webs financieras, no el texto verbatim de Investopedia), usada como referencia secundaria complementaria a StockCharts.

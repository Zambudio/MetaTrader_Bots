# Pairs trading: arbitraje estadístico y market neutral

> Síntesis de Gatev, Goetzmann & Rouwenhorst (2006) "Pairs Trading: Performance of a Relative-Value Arbitrage Rule" (Review of Financial Studies, Vol. 19 No. 3, pp. 797-827), y literatura complementaria sobre cointegración.

## Concepto

Pairs trading es una estrategia market-neutral que explota relaciones estadísticas entre dos activos correlacionados. Cuando el spread (diferencia de precios normalizada) entre dos activos históricamente correlacionados diverge significativamente, se apuesta a que revertirá a su media: se compra el activo relativamente barato y se vende (short) el relativamente caro.

Es una forma de arbitraje estadístico (stat-arb) que busca obtener retornos independientes de la dirección general del mercado (beta ≈ 0).

## Metodología: Distance Approach (Gatev et al., 2006)

### Fase de formación (12 meses típicamente)
1. Normalizar las series de precios de cierre de un universo amplio de acciones (dividir cada precio por su precio inicial para hacerlos comparables).
2. Para cada par posible, calcular la suma de las desviaciones al cuadrado entre las series de precios normalizados (SSD — Sum of Squared Deviations).
3. Seleccionar los N pares con menor SSD — los que se mueven más "juntos" históricamente.

### Fase de trading (6 meses típicamente)
1. Monitorizar el spread de cada par seleccionado.
2. **Abrir posición**: cuando el spread diverge más de 2 desviaciones estándar históricas. Comprar (long) el activo infravalorado, vender (short) el sobrevalorado.
3. **Cerrar posición**: cuando el spread revierte a su media (o a un umbral cercano).
4. **Stop**: cerrar al final del período de trading si el spread no ha revertido.

### Resultados del paper
- Período estudiado: 1962-2002, acciones de EEUU.
- Retorno medio anualizado: hasta 11% en exceso, después de costes de transacción.
- La estrategia es autofinanciada (long-short) y tiene exposición neta al mercado cercana a cero.

## Método alternativo: Cointegración (Engle-Granger)

### Concepto
Dos series de precios están cointegradas si existe una combinación lineal de ellas que es estacionaria (media-revertiente), aunque individualmente cada serie sea no estacionaria (paseo aleatorio).

### Proceso
1. Regresión: Y = β·X + ε (encontrar el hedge ratio β).
2. Test de Engle-Granger (ADF test) sobre los residuos ε.
3. Si los residuos son estacionarios → las series están cointegradas → el spread β·X - Y revierte a la media.
4. Operar cuando el spread se aleja de su media (entrar) y cuando revierte (cerrar).

### Ventaja sobre el distance approach
- Base estadística más formal (test de hipótesis formal para verificar la relación).
- El hedge ratio β se estima explícitamente (cuántas unidades de X por cada Y).

### Desventaja
- La cointegración puede romperse — las relaciones entre activos no son permanentes.
- Requiere reestimación periódica del hedge ratio (rolling window).

## Candidatos típicos para pairs trading

- Acciones del mismo sector (Coca-Cola / PepsiCo, Visa / Mastercard).
- ETFs correlacionados (SPY / IVV, GDX / GDXJ).
- Pares de divisas con divisa base o cotizada común (EUR/USD + GBP/USD comparten USD).
- Materias primas relacionadas (WTI / Brent, oro / plata).

## Riesgos y limitaciones

1. **Riesgo de divergencia permanente**: el spread puede no revertir nunca (cambio estructural, fusión, quiebra de una de las patas).
2. **Costes de mantener posiciones short**: short selling tiene costes (borrow fee, margin).
3. **Leg risk**: riesgo de que una pata se ejecute y la otra no (especialmente en mercados ilíquidos).
4. **Degradación del alpha**: Gatev et al. observaron que los retornos de pairs trading disminuyeron a lo largo del período de estudio, sugiriendo que el arbitraje se va arbitrando (más participantes explotan la misma ineficiencia).
5. **En forex**: no existe short selling propiamente (cada posición es long una divisa y short otra), pero los costes de swap overnight son el equivalente funcional.

## Relevancia para este proyecto
- Pairs trading en forex es conceptualmente natural: cada par ya es una relación entre dos divisas.
- Un EA puede monitorizar el spread entre dos pares correlacionados (p.ej. EUR/USD y GBP/USD) y operar la divergencia.
- Requiere estimación robusta de la relación de equilibrio y reestimación periódica.

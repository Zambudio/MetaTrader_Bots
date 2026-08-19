# Gestión de operaciones en vivo: trailing stops, breakeven, scaling

> Fuente sintetizada de literatura de trading sistemático (ProRealCode, MQL5 community, QuantFish, Rob Carver). Técnicas de trade management para bots.

## Concepto central

Trade management cubre todas las decisiones que se toman *después* de abrir una posición: cuándo y cómo mover el stop loss, cuándo tomar beneficios parciales, cuándo añadir a la posición. Es la fase entre la entrada y la salida final.

Cada regla de trade management altera la distribución de resultados de la estrategia — afecta al win rate, al average win, al average loss y, por tanto, a la expectativa. No es necesariamente beneficioso; debe validarse con backtest riguroso.

## Breakeven Stop

### Definición
Mover el stop loss al precio de entrada una vez que la operación alcanza un umbral de beneficio predefinido.

### Mecánica
1. Se abre posición con stop loss inicial (p.ej. -1 ATR).
2. Cuando el precio se mueve a favor un umbral (p.ej. +1 ATR o +1R), el SL se mueve al precio de entrada.
3. La operación ya no puede perder dinero (excluyendo gaps y slippage).

### Problema documentado
Múltiples fuentes de trading cuantitativo documentan que el breakeven stop **reduce la rentabilidad total** en muchas estrategias:
- El mercado frecuentemente retrocede al precio de entrada antes de continuar en la dirección original.
- El breakeven convierte lo que habría sido una operación ganadora en una operación neutral (cero).
- Proporciona confort psicológico pero a costa de reducir la expectativa matemática.
- Efecto de "whipsaw": ser expulsado de trades buenos por retrocesos normales.

### Cuándo tiene sentido
- Antes de eventos de alto impacto (noticias macro) para proteger beneficios no realizados.
- En estrategias de muy corto plazo donde cada pip cuenta.
- Como componente de un sistema más complejo (breakeven + trailing posterior).

## Trailing Stop

### Definición
Un stop loss que se mueve dinámicamente siguiendo al precio en la dirección favorable, bloqueando beneficios progresivamente.

### Métodos de implementación

#### 1. Trailing fijo (pips/puntos)
- El SL sigue al precio a una distancia fija.
- Simple pero rígido — no se adapta a la volatilidad del mercado.
- Ejemplo: trailing de 50 pips.

#### 2. Trailing basado en ATR
- La distancia del trailing stop se calcula como N × ATR (p.ej. 2 × ATR(14)).
- Se adapta automáticamente a la volatilidad: se amplía en mercados volátiles, se estrecha en mercados tranquilos.
- Preferido en trading sistemático por su adaptabilidad.
- Variante "Chandelier Exit" (Chuck LeBeau): trailing desde el máximo/mínimo del período más reciente menos N × ATR.

#### 3. Trailing por estructura (swing highs/lows)
- El SL se mueve al swing low más reciente (en operaciones largas) o al swing high (en cortas).
- Respeta la estructura de mercado pero es más complejo de automatizar.

#### 4. Trailing por media móvil
- Se usa una media móvil (EMA 20, SMA 50) como nivel de stop dinámico.
- El cierre por debajo de la MA señala salida.

### Consideraciones para un EA
- El trailing stop solo se mueve en una dirección (a favor) — nunca retrocede.
- Activar el trailing solo después de que la operación tenga un beneficio mínimo (evitar activación prematura).
- En MT5: `TRADE_ACTION_SLTP` para modificar el SL de una posición abierta.

## Scaling In (añadir a posición)

### Definición
Abrir la posición en tramos en lugar de al 100% de golpe, normalmente añadiendo a medida que el mercado confirma la dirección.

### Tipos
1. **Pyramiding**: añadir a una posición ganadora a medida que la tendencia se confirma. Cada adición es típicamente más pequeña que la anterior (pirámide).
2. **Dollar-cost averaging (DCA)**: añadir a intervalos fijos de precio o tiempo — común en inversión pasiva, arriesgado en trading activo.

### Regla cardinal
**NUNCA confundir scaling in con averaging down** (añadir a perdedoras). Averaging down en trading activo multiplica el riesgo y es una de las formas más rápidas de arruinar una cuenta.

### Implementación para un EA
- Definir condiciones claras de confirmación para cada tramo.
- Recalcular el tamaño total de la posición y el riesgo agregado con cada adición.
- Ajustar el stop loss para que el riesgo total de la posición combinada no exceda el máximo permitido.

## Scaling Out (salidas parciales)

### Definición
Cerrar la posición en tramos: tomar beneficios parciales a medida que se alcanzan objetivos, manteniendo una porción "runner" para capturar movimientos más amplios.

### Ejemplo típico
1. Cerrar 50% de la posición al alcanzar +1R (1× el riesgo inicial).
2. Mover SL del 50% restante a breakeven.
3. Activar trailing stop en el "runner" para capturar la tendencia extendida.

### Trade-off documentado
- **Ventaja**: captura algo de beneficio incluso si el mercado revierte después del primer objetivo; reduce la varianza.
- **Desventaja**: reduce el average win (la mitad de la posición se cierra "temprano"), lo que puede empeorar la expectativa si la estrategia necesita grandes ganadores para compensar muchas pérdidas pequeñas (típico de trend-following).

## Impacto en la distribución de resultados

| Técnica | Efecto en Win Rate | Efecto en Avg Win | Efecto en Avg Loss | Efecto neto |
|---|---|---|---|---|
| Breakeven | ↓ (trades buenos cerrados a 0) | ↑ (solo quedan los que corrieron) | ↓ (elimina pérdidas) | Variable — a menudo negativo |
| Trailing | ≈ | ↓ (limita upside en reversiones) | ↓ (bloquea beneficios) | Positivo en tendencias fuertes |
| Scaling out | ≈ | ↓ (cierre parcial temprano) | ≈ | Reduce varianza, puede reducir E |
| Scaling in | ↑ (posición completa solo en trades confirmados) | ↑ (mayor exposición en ganadores) | ≈ | Positivo si la confirmación funciona |

## Regla general para trading sistemático

Toda regla de trade management es una hipótesis que debe validarse con backtest (y preferiblemente walk-forward) sobre datos OOS. No asumir que "suena lógico" equivale a que mejora la estrategia.

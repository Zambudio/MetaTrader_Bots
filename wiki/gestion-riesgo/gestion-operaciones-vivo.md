---
tags: [gestion-riesgo, trade-management, trailing-stop, breakeven, scaling, position-sizing]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/trade-management-synthesis.md]
---

# Gestión de operaciones en vivo (trade management)

## Qué cubre esta página

Todo lo que pasa **después de abrir una posición**: cuándo y cómo mover el stop loss, cuándo tomar beneficios parciales, cuándo añadir a la posición. Es la fase entre la entrada y la salida final.

Cada regla de trade management altera la distribución de resultados de la estrategia — win rate, average win, average loss, y por tanto la [expectativa](expectativa-y-ratio-rr.md). No es necesariamente beneficioso: debe validarse con [backtest riguroso](../estrategias/backtesting-y-validacion.md) y preferiblemente [walk-forward](../estrategias/backtesting-y-validacion.md).

## Breakeven stop

### Mecánica

1. Abrir posición con stop loss inicial (p.ej. -1 [ATR](../indicadores/volumen-y-atr.md)).
2. Cuando el precio se mueve a favor un umbral (p.ej. +1R), mover el SL al precio de entrada.
3. La operación ya no puede perder dinero (excluyendo gaps y slippage).

### El problema documentado

Múltiples fuentes de trading cuantitativo documentan que el breakeven stop **reduce la rentabilidad total** en muchas estrategias:
- El mercado frecuentemente retrocede al precio de entrada antes de continuar en la dirección favorable.
- Convierte operaciones que habrían sido ganadoras en operaciones neutrales (cero).
- Proporciona confort psicológico (reduce la [aversión a la pérdida](../basico/sesgos-cognitivos-trading.md)) pero a costa de reducir la expectativa.

### Cuándo tiene sentido

- Antes de eventos de alto impacto (ver [calendario-economico.md](../analisis-fundamental/calendario-economico.md)).
- Como paso intermedio antes de activar un trailing stop.
- En estrategias de muy corto plazo donde cada pip cuenta.

## Trailing stop

### Concepto

Un stop loss que se mueve dinámicamente siguiendo al precio en la dirección favorable, bloqueando beneficios progresivamente. Solo se mueve a favor — nunca retrocede.

### Métodos de implementación

#### 1. Trailing fijo (pips/puntos)
Simple pero rígido — no se adapta a la volatilidad.

#### 2. Trailing basado en ATR (recomendado)
La distancia se calcula como N × [ATR](../indicadores/volumen-y-atr.md)(14). Se adapta automáticamente a la volatilidad: se amplía en mercados volátiles, se estrecha en tranquilos. Variante **Chandelier Exit**: trailing desde el máximo reciente menos N × ATR.

#### 3. Trailing por estructura (swing highs/lows)
El SL se mueve al [swing low](../basico/tendencias-y-estructura.md) más reciente (en longs). Respeta la estructura de mercado.

#### 4. Trailing por media móvil
Se usa una [EMA](../indicadores/medias-moviles.md) como nivel de stop dinámico.

### En MT5
Modificar el SL de una posición abierta con `TRADE_ACTION_SLTP` (ver [apis-datos-mercado.md](../infraestructura/apis-datos-mercado.md)).

## Scaling in (añadir a posición)

### Pyramiding
Añadir a una posición **ganadora** a medida que la tendencia se confirma. Cada adición es típicamente más pequeña (forma de pirámide).

### Regla cardinal
**NUNCA confundir con averaging down** (añadir a perdedoras). Averaging down en trading activo multiplica el riesgo y es una de las formas más rápidas de arruinar la cuenta — es una manifestación de la [aversión a la pérdida](../basico/sesgos-cognitivos-trading.md) documentada por Kahneman y Tversky.

### Implementación para un EA
- Condiciones claras de confirmación para cada tramo.
- Recalcular riesgo total de la posición combinada con cada adición.
- El riesgo total no debe exceder el máximo permitido por [position sizing](position-sizing-kelly.md).

## Scaling out (salidas parciales)

### Ejemplo típico

1. Cerrar 50% al alcanzar +1R.
2. Mover SL del 50% restante a breakeven.
3. Activar trailing stop en el "runner" para capturar la tendencia extendida.

### Trade-off

- **Ventaja**: captura beneficio incluso si el mercado revierte; reduce varianza.
- **Desventaja**: reduce el average win. Si la estrategia necesita grandes ganadores para compensar muchas pérdidas pequeñas (típico de [trend-following](../estrategias/seguimiento-tendencia.md)), scaling out puede empeorar la expectativa.

## Impacto en la distribución de resultados

| Técnica | Win Rate | Avg Win | Avg Loss | Efecto neto |
|---|---|---|---|---|
| Breakeven | ↓ | ↑ (solo quedan los que corrieron) | ↓ | Variable, a menudo negativo |
| Trailing | ≈ | ↓ (limita upside en reversiones) | ↓ | Positivo en tendencias fuertes |
| Scaling out | ≈ | ↓ (cierre parcial temprano) | ≈ | Reduce varianza, puede reducir E |
| Scaling in | ↑ | ↑ (mayor exposición en ganadores) | ≈ | Positivo si la confirmación funciona |

## Regla general

Toda regla de trade management es una hipótesis que debe validarse con backtest — y preferiblemente [walk-forward](../estrategias/backtesting-y-validacion.md) — sobre datos OOS. No asumir que "suena lógico" equivale a que mejora la estrategia.

## Relación con otras páginas

El trailing basado en ATR conecta directamente con [volumen-y-atr.md](../indicadores/volumen-y-atr.md). El sizing de cada tramo en scaling in/out está gobernado por [position-sizing-kelly.md](position-sizing-kelly.md) y el riesgo agregado por [riesgo-de-cartera.md](riesgo-de-cartera.md). La validación del impacto en la expectativa requiere las métricas de [metricas-rendimiento.md](../estrategias/metricas-rendimiento.md). La psicología que motiva el breakeven (aversión a la pérdida) se documenta en [sesgos-cognitivos-trading.md](../basico/sesgos-cognitivos-trading.md).

## Fuentes

- [Gestión de operaciones en vivo — síntesis](../raw/gestion-riesgo/trade-management-synthesis.md) — trailing stops, breakeven, scaling in/out, impacto en distribución de resultados, sintetizado de literatura de trading sistemático.

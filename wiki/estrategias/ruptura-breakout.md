---
tags: [estrategias, breakout, day-trading, intradia, ORB]
updated: 2026-08-16
fuentes: [raw/estrategias/zarattini-orb-day-trading.pdf, raw/estrategias/concretum-group-papers.md]
---

# Ruptura / breakout (Opening Range Breakout)

## Qué es

Una estrategia de ruptura (breakout) opera cuando el precio supera un nivel de referencia previo, asumiendo que la ruptura señala el inicio de un movimiento direccional que va a continuar. La variante más estudiada en day trading es el **Opening Range Breakout (ORB)**: se toma el rango de precio (máximo y mínimo) de los primeros n minutos de la sesión — habitualmente 5, 15, 30 o 60 minutos — y se opera en la dirección en la que el precio rompe ese rango inicial. Si la vela de apertura es alcista, solo se buscan largos al romper el máximo del rango; si es bajista, solo se buscan cortos al romper el mínimo.

Se atribuye a Toby Crabel la primera formalización del ORB en 1990 (*Day Trading with Short Term Price Patterns and Opening Range Breakout*). La idea de fondo: el rango de apertura refleja el desequilibrio inicial entre oferta y demanda institucional, y ese desequilibrio tiende a persistir durante la sesión, generando una tendencia intradía explotable.

## La fuente: Zarattini, Barbon & Aziz (2024)

*A Profitable Day Trading Strategy For The U.S. Equity Market* (Concretum Research / Universidad de St. Gallen / Swiss Finance Institute, 2024) es el estudio más completo hasta la fecha sobre el ORB de 5 minutos aplicado a acciones individuales de EEUU, con datos de más de **7.000 acciones** cotizadas en NYSE y Nasdaq entre **2016 y 2023**, libres de sesgo de supervivencia (incluye empresas que quebraron o fueron excluidas de cotización, como Twitter).

### Reglas de la estrategia base

Filtros de universo (para evitar penny stocks y baja liquidez):
1. Precio de apertura > $5.
2. Volumen medio de los 14 días previos ≥ 1.000.000 de acciones/día.
3. ATR de 14 días > $0,50.

Entrada: orden stop al nivel del máximo (si la vela de los primeros 5 minutos es alcista) o del mínimo (si es bajista) del rango de apertura. En caso de doji (apertura = cierre), no se opera ese día en esa acción.

Gestión de riesgo:
- **Stop loss** a una distancia del 10% del ATR de 14 días desde el precio de entrada.
- Si no salta el stop, la posición se cierra al final de la sesión (16:00 ET) — es una estrategia estrictamente intradía, sin overnight.
- Tamaño de posición calculado para que, si salta el stop, la pérdida sobre el capital sea del 1%.
- Apalancamiento máximo de 4x (límite típico de brokers regulados por FINRA en EEUU).

### Resultado de la estrategia base: decepcionante

Aplicada a todo el universo de acciones filtradas (sin ningún filtro adicional de selección), el ORB de 5 minutos rinde de forma mediocre entre 2016 y 2023: retorno total del 29% (IRR 3,2%), Sharpe de **0,48**, muy por debajo del Sharpe 0,78 del S&P 500 en buy-and-hold durante el mismo periodo (que rentó un 198%). El beta de la estrategia frente al S&P 500 es prácticamente 0 (0,01) — no hay correlación direccional con el mercado — con un alfa anualizado positivo pero modesto (3,3%).

Es decir: la idea básica del ORB, aplicada de forma indiscriminada a todo el universo de acciones líquidas, apenas bate su propio coste de oportunidad.

### El hallazgo clave: "Stocks in Play" y volumen relativo

El paper introduce el concepto de **Stocks in Play**: acciones que muestran actividad de negociación inusualmente alta en un día concreto, normalmente por un catalizador fundamental (resultados, guidance, aprobaciones regulatorias, fusiones/adquisiciones, rupturas de niveles técnicos clave, etc.). La hipótesis de los autores es que el ORB solo captura de verdad un desequilibrio institucional genuino cuando hay volumen anómalo detrás.

Para medirlo de forma sistemática, definen el **Volumen Relativo**: el volumen negociado en los primeros 5 minutos del día dividido por la media del volumen en esos mismos primeros 5 minutos de los 14 días anteriores.

El resultado es contundente: hay una relación positiva y monótona entre volumen relativo y rentabilidad media por operación (medida en unidades de riesgo R, donde 1R = la pérdida máxima si salta el stop):
- Volumen relativo < 100% (por debajo de lo normal): PnL medio de **-0,02R** por operación — ligeramente negativo.
- Volumen relativo > 100% (por encima de lo normal): PnL medio de **+0,08R** por operación.
- Volumen relativo > 30x (3.000% de lo normal): PnL medio de **+0,38R** por operación.

### La estrategia refinada: ORB + Top 20 por volumen relativo

Con este hallazgo, los autores refinan la estrategia añadiendo dos filtros a los tres iniciales:
4. Volumen relativo ≥ 100%.
5. Operar solo las 20 acciones con mayor volumen relativo del día (el resto del universo se descarta, aunque cumpla los filtros básicos).

El resto de reglas (entrada por ruptura, stop al 10% del ATR, cierre a fin de sesión, riesgo del 1% por operación, apalancamiento máximo 4x) se mantienen idénticas.

**Resultado — la cifra central de este paper**: sobre el mismo periodo 2016-2023, con el mismo capital inicial de $25.000, esta versión filtrada genera un retorno total neto de **1.637%** (frente al 198% del S&P 500 en el mismo periodo), con:

| Métrica | ORB base | ORB + Top 20 Vol. Relativo | S&P 500 (buy & hold) |
|---|---|---|---|
| Retorno total | 29% | **1.637%** | 198% |
| IRR anualizado | 3,2% | **41,6%** | 14,2% |
| Volatilidad anualizada | 6,6% | 14,8% | 18,3% |
| **Sharpe ratio** | 0,48 | **2,81** | 0,78 |
| Máximo drawdown | 13% | 12% | 34% |
| Peor día | -0,8% | -1,61% | -10,9% |
| Alfa anualizado | 3,3% | **35,8%** (~36%) | — |
| Beta vs. S&P 500 | 0,01 | 0,00 | 1,00 |

El filtro de volumen relativo, por sí solo, multiplica el Sharpe ratio casi por 6 (de 0,48 a 2,81) y el retorno anualizado más de 12 veces (de 3,2% a 41,6%), manteniendo un beta prácticamente nulo frente al mercado — es decir, esta rentabilidad no proviene de exposición direccional al S&P 500, sino de una fuente de retorno genuinamente distinta (alfa del 36% anual).

El coste de esta concentración: al operar solo 20 acciones en vez de todo el universo, la cartera es menos diversificada intradía, lo que se refleja en un peor "peor día" (-1,61% frente a -0,8% de la versión base), aunque sigue siendo mucho más suave que el peor día del S&P 500 (-10,9%, en el crash de marzo de 2020 por el COVID).

## Otros marcos temporales

El paper también prueba el ORB en marcos de 15, 30 y 60 minutos (en vez de 5), y construye un "COMBO" equiponderado de las cuatro versiones. La conclusión general es que el ORB con filtro de Stocks in Play se mantiene efectivo en varios marcos temporales dentro de la primera hora de sesión (9:30-10:30 ET, cuando la volatilidad y liquidez son máximas), no solo en el de 5 minutos.

## Consideraciones prácticas

- **Es una estrategia estrictamente intradía**: todas las posiciones se cierran al final de cada sesión, sin riesgo overnight.
- **El filtro de selección importa más que la señal de entrada**: la diferencia entre un Sharpe de 0,48 y uno de 2,81 no viene de cambiar la lógica de ruptura, sino de a qué acciones se aplica esa lógica (solo las que tienen un catalizador fundamental genuino detrás, medido por volumen anómalo).
- **Costes de comisión incluidos**: el backtest usa $0,0035 por acción (tarifa de entrada de Interactive Brokers Pro-Tiered a diciembre de 2023) — los resultados ya son netos de esa comisión, aunque no incluyen slippage por impacto de mercado, que puede ser relevante al operar solo 20 acciones concentradas con alto volumen relativo.
- **Position sizing basado en ATR y riesgo del 1%** es la pieza que hace que la estrategia sea escalable y comparable entre acciones de volatilidad muy distinta — ver [expectativa y ratio R:R](../gestion-riesgo/expectativa-y-ratio-rr.md) y [position sizing con Kelly](../gestion-riesgo/position-sizing-kelly.md) para profundizar en el concepto de dimensionamiento por riesgo fijo.
- Concretum Group tiene varios papers relacionados que aplican la misma familia de ideas (ORB, momentum intradía) a otros instrumentos como QQQ/TQQQ o SPY — ver [../raw/estrategias/concretum-group-papers.md](../raw/estrategias/concretum-group-papers.md) para el catálogo, pendientes de ingesta detallada si se quiere ampliar esta página.

## Relación con otras páginas de la wiki

- Comparte la lógica de "seguir la dirección iniciada" con [seguimiento-tendencia.md](seguimiento-tendencia.md) y [momentum.md](momentum.md), pero en el extremo más corto de plazo posible (minutos/horas en vez de meses/años).
- Es la contrapartida operativa, en el marco intradía, de la idea de "solo operar cuando hay una señal genuina" que aparece también en [reversion-media.md](reversion-media.md) (aunque allí el filtro es fundamental/valoración, aquí es volumen anómalo).
- El ATR (usado aquí tanto para el filtro de universo como para el stop loss) y el volumen relativo (la variable central del filtro "Stocks in Play") se documentan en detalle en [volumen y ATR](../indicadores/volumen-y-atr.md).

## Fuentes

- [Zarattini, Barbon & Aziz — A Profitable Day Trading Strategy For The U.S. Equity Market (Concretum Research / Universidad de St. Gallen / Swiss Finance Institute, 2024)](../raw/estrategias/zarattini-orb-day-trading.pdf) — el estudio central de esta página sobre el ORB de 5 minutos y el filtro "Stocks in Play".
- [Concretum Group — catálogo de papers](../raw/estrategias/concretum-group-papers.md) — índice de otros papers de Concretum sobre ORB y momentum intradía en otros instrumentos (QQQ/TQQQ, SPY), citado en "Consideraciones prácticas"; pendiente de ingesta detallada.

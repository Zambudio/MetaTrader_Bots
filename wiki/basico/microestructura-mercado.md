---
tags: [basico, microestructura, order-book, bid-ask, liquidez, ejecucion, almgren-chriss]
updated: 2026-08-16
fuentes: [raw/basico/microestructura-mercado-synthesis.md, raw/estrategias/almgren-chriss-optimal-execution.md]
---

# Microestructura de mercado y modelos de ejecución

## Qué es

La microestructura de mercado estudia los mecanismos concretos por los que los activos se negocian y los precios se forman — tick a tick, orden a orden. Mientras que el [análisis fundamental](../analisis-fundamental/indicadores-macro-clave.md) explica *por qué* un activo debería valer determinado precio, y los [indicadores técnicos](../indicadores/medias-moviles.md) analizan patrones en la historia de precios, la microestructura explica *cómo* se llega a cada precio en la práctica. Es la capa que un EA necesita entender para ejecutar órdenes eficientemente.

## El Limit Order Book (LOB)

El libro de órdenes limitadas es el mecanismo central de descubrimiento de precios en mercados electrónicos.

### Estructura

- **Bid side**: órdenes de compra pendientes, de mayor a menor precio.
- **Ask side**: órdenes de venta pendientes, de menor a mayor precio.
- **Best Bid / Best Ask (BBO)**: los mejores precios disponibles en cada lado.
- **Mid price**: `(Best Bid + Best Ask) / 2` — precio teórico de referencia.
- **Profundidad (depth)**: volumen acumulado disponible a cada nivel de precio. Más profundidad = más liquidez.

### Tipos de órdenes fundamentales

| Tipo | Qué hace | Liquidez |
|---|---|---|
| **Limit order** | Espera en el libro a un precio específico | Provee liquidez |
| **Market order** | Se ejecuta inmediatamente al mejor precio disponible | Consume liquidez |
| **Stop order** | Se convierte en market order al alcanzar un umbral | Consume liquidez (al activarse) |

La interacción entre órdenes limitadas (que proveen liquidez) y órdenes de mercado (que la consumen) es el motor del descubrimiento de precios.

## El Bid-Ask Spread

### Definición

```
Spread = Best Ask - Best Bid
```

Es el coste implícito de ejecutar inmediatamente: comprar al ask y vender al bid produce una pérdida inmediata igual al spread. Es el concepto que subyace al coste de transacción que domina la rentabilidad en [scalping](../estrategias/scalping.md).

### Componentes del spread (descomposición académica)

1. **Selección adversa** (Kyle, 1985; Glosten & Milgrom, 1985): el riesgo de negociar con alguien que tiene información superior. El market maker ensancha el spread para protegerse.
2. **Costes de inventario** (Stoll, 1978): el riesgo que asume el market maker por mantener posiciones.
3. **Costes de procesamiento**: costes operativos de ejecutar órdenes.

### Factores que afectan al spread

- **Volatilidad**: mayor volatilidad → spreads más amplios.
- **Volumen**: más volumen → spreads más estrechos (más competencia).
- **Horario**: spreads se ensanchan en horas de baja liquidez y antes de publicaciones macro.
- **Eventos**: spreads se disparan durante noticias de alto impacto (ver [calendario-economico.md](../analisis-fundamental/calendario-economico.md)).

## Price Impact y el Modelo de Ejecución Óptima de Almgren-Chriss (2000)

### Impacto Temporal vs. Permanente

- **Impacto temporal ($\eta$)**: Fricción transitoria generada al consumir la liquidez inmediata del libro de órdenes; se disipa conforme nuevos proveedores de liquidez rellenan el LOB.
- **Impacto permanente ($\gamma$)**: Desplazamiento duradero del precio de equilibrio causado por la información que el mercado infiere de la transacción.

### La solución de Almgren & Chriss (2000)

El modelo seminal de Robert Almgren y Neil Chriss formaliza el dilema entre ejecutar rápido (alto impacto temporal) o despacio (alta exposición a la volatilidad del mercado):

$$U(x) = E[\text{Coste de impacto}] + \lambda \text{Var}(\text{Coste})$$

- Si el operador es **neutral al riesgo ($\lambda = 0$)**: La trayectoria óptima de ejecución es lineal uniforme (**algoritmo TWAP**: *Time-Weighted Average Price*).
- Si el volumen varía intradía con patrón en U: La trayectoria óptima pondera por volumen histórico (**algoritmo VWAP**: *Volume-Weighted Average Price*).
- **Order Splitting**: Dividir una posición en $N$ fragmentos temporales reduce el impacto temporal total de forma cuadrática frente a una market order monolítica.

### Square-root law

Resultado empírico robusto: el impacto total de precio escala aproximadamente con la **raíz cuadrada** del tamaño relativo de la orden ($\text{Impacto} \propto \sigma \sqrt{V / V_{diario}}$). Duplicar el tamaño de la orden multiplica el impacto por ~1.41, no por 2.

### Order Flow Imbalance (OFI)

Cont, Kukanov y Stoikov (2010) demostraron que los cambios de precio a corto plazo están dominados por el desequilibrio neto entre órdenes de compra y venta al BBO. Este concepto es la base teórica de muchas estrategias cuantitativas de flujo de órdenes.

## Slippage

La diferencia entre el precio esperado y el precio real de ejecución, causada por:
- El spread (la ejecución siempre es al ask para compras o al bid para ventas).
- La profundidad del libro (si el volumen al BBO no es suficiente, la orden se ejecuta a precios sucesivamente peores).
- La latencia (el precio puede moverse entre el momento de enviar la orden y su ejecución).

**Importancia para backtesting**: todo backtest que ignore el slippage sobreestima el rendimiento. Es especialmente crítico en estrategias de alta rotación ([scalping.md](../estrategias/scalping.md)) y en activos ilíquidos.

## Qué significa para un EA

1. **Costes de transacción reales** = spread + comisión + slippage. Incluirlos siempre en el backtest.
2. **Timing de ejecución**: operar en horarios de máxima liquidez (superposición Londres-NY para forex) reduce el spread y el slippage.
3. **Evitar ejecutar durante noticias macro** si la estrategia no está diseñada para ello — el spread se dispara.
4. **Order splitting**: un EA que opera volúmenes significativos debe dividir las órdenes grandes (TWAP / VWAP) en lugar de enviar una sola market order.
5. **Depth of Market (DOM)**: en MT5, `MarketBookGet()` permite verificar la profundidad del libro antes de enviar órdenes grandes.

## Relación con otras páginas

La microestructura es el fundamento de los costes de transacción que dominan el [scalping](../estrategias/scalping.md), el slippage que todo [backtest](../estrategias/backtesting-y-validacion.md) debe modelar, y la mecánica que subyace a la [estructura de mercado](estructura-mercado.md) a nivel macro. Para la base empírica de órdenes en soporte y resistencia, ver [soporte-y-resistencia.md](soporte-y-resistencia.md). Para la API de MetaTrader que da acceso al DOM y a datos de tick, ver [apis-datos-mercado.md](../infraestructura/apis-datos-mercado.md).

## Fuentes

- [Microestructura de mercado — síntesis académica](../raw/basico/microestructura-mercado-synthesis.md) — síntesis de Kyle (1985), Glosten & Milgrom (1985), Stoll (1978), Cont-Kukanov-Stoikov (2010) sobre LOB, bid-ask spread y OFI.
- [Almgren & Chriss (2000) — Ejecución óptima e impacto de mercado](../raw/estrategias/almgren-chriss-optimal-execution.md) — paper seminal sobre trayectorias óptimas de liquidación, impacto temporal/permanente y fundamentación de algoritmos TWAP y VWAP.

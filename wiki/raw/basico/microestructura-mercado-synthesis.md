# Microestructura de mercado: order book, bid-ask spread y price impact

> Síntesis curada de literatura académica de referencia: Kyle (1985), Glosten & Milgrom (1985), Stoll (1978), Cont-Kukanov-Stoikov (2010), Biais-Glosten-Spatt (2005), Avellaneda & Stoikov (2008). Conceptos fundamentales para entender cómo se ejecutan las órdenes realmente.

## Qué es la microestructura de mercado

Campo de estudio que examina los mecanismos concretos por los que los activos se negocian, cómo se forman los precios, y cómo las reglas de negociación afectan a los resultados observados. A diferencia de la macroeconomía o el análisis fundamental (que explican *por qué* un activo debería tener un precio determinado), la microestructura explica *cómo* llega a ese precio en la práctica — tick a tick, orden a orden.

## Limit Order Book (LOB)

### Estructura
El LOB es el mecanismo central de descubrimiento de precios en la mayoría de mercados electrónicos. Contiene todas las órdenes limitadas pendientes:
- **Bid side**: órdenes de compra pendientes, ordenadas de mayor a menor precio.
- **Ask side**: órdenes de venta pendientes, ordenadas de menor a mayor precio.
- **Best Bid / Best Ask (BBO)**: los mejores precios disponibles en cada lado.
- **Mid price**: (Best Bid + Best Ask) / 2 — precio teórico de referencia.

### Tipos de órdenes
- **Limit order**: orden con precio máximo (compra) o mínimo (venta) especificado. Provee liquidez al libro.
- **Market order**: orden que se ejecuta inmediatamente al mejor precio disponible. Consume liquidez del libro.
- **Stop order**: orden condicional que se convierte en market order al alcanzar un precio umbral.

### Profundidad (Depth)
La cantidad de volumen acumulado disponible a cada nivel de precio. Más profundidad = más liquidez = menor impacto de mercado para una orden dada.

## Bid-Ask Spread

### Definición
Diferencia entre el Best Ask y el Best Bid:
```
Spread = Best Ask - Best Bid
```
Es el coste implícito de ejecutar inmediatamente (comprar al ask y vender al bid produce una pérdida inmediata igual al spread).

### Componentes del spread (descomposición académica)
1. **Adverse selection** (selección adversa): el riesgo de negociar con alguien que tiene información superior (insider, algoritmo con ventaja informacional). Modelo fundacional: Kyle (1985), Glosten & Milgrom (1985).
2. **Inventory costs** (costes de inventario): el riesgo que asume el market maker por mantener posiciones. Modelo: Stoll (1978).
3. **Order-handling costs**: costes operativos de procesar y ejecutar órdenes.

### Factores que afectan al spread
- Volatilidad: mayor volatilidad → spreads más amplios (más riesgo para proveedores de liquidez).
- Volumen: más volumen → spreads más estrechos (más competencia entre market makers).
- Horario: spreads se ensanchan en horas de baja liquidez (overnight, pre-market).
- Eventos: spreads se disparan antes/durante publicaciones macro importantes.

## Price Impact (Impacto de Mercado)

### Definición
Cuánto mueve el precio una operación por el mero hecho de ejecutarse. Componentes:
- **Impacto temporal**: movimiento transitorio causado por presión de oferta/demanda inmediata; tiende a revertir.
- **Impacto permanente**: movimiento informacional — el mercado actualiza su valoración al observar la operación.

### Square-root law
Resultado empírico robusto en la literatura: el impacto de precio escala aproximadamente con la raíz cuadrada del tamaño de la orden, no linealmente. Implicación: duplicar el tamaño de la orden no duplica el impacto — lo multiplica por ~1.41.

### Order Flow Imbalance (OFI)
Cont, Kukanov y Stoikov (2010) demostraron que los cambios de precio a corto plazo están dominados por el desequilibrio neto del flujo de órdenes — la diferencia entre órdenes de compra y venta al BBO. Este resultado es la base teórica de muchas estrategias de order flow y volume profile.

## Market Making

### Rol del market maker
Proveer liquidez poniendo órdenes limitadas en ambos lados del libro, cobrando el spread como compensación por:
- Riesgo de inventario (quedarse con posiciones no deseadas).
- Riesgo de selección adversa (ser "pisado" por traders informados).

### Avellaneda & Stoikov (2008)
Modelo de referencia para market making óptimo en un LOB: el market maker ajusta dinámicamente sus cotizaciones de bid y ask en función de su inventario actual y la volatilidad del activo, estrechando el spread cuando necesita atraer flujo y ensanchándolo cuando tiene demasiado inventario en un lado.

## Relevancia para trading algorítmico y bots

- **Slippage**: la diferencia entre el precio esperado y el precio real de ejecución. Directamente causado por el spread, la profundidad del libro y el impacto de mercado. Todo backtest que ignore el slippage sobreestima el rendimiento.
- **Costes de transacción reales**: spread + comisión + slippage. Dominan la rentabilidad en estrategias de alta frecuencia.
- **Timing de ejecución**: la microestructura dicta cuándo es mejor ejecutar (horarios de mayor liquidez, evitar justo antes de noticias macro).
- **Detección de liquidez**: un EA robusto debería verificar la profundidad del libro antes de enviar órdenes grandes — o dividirlas en tramos (order splitting / TWAP / VWAP).

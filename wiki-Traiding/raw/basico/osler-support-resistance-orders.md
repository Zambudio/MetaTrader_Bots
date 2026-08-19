# Microestructura y clustering de órdenes en soporte y resistencia (Carol Osler, 2000, 2003, 2005)

> Síntesis de la investigación seminal de Carol L. Osler publicada por el Federal Reserve Bank of New York (*Economic Policy Review*, 2000) y en el *Journal of International Money and Finance* (2003, 2005: "Support for Resistance: Technical Analysis and Intraday Exchange Rates" y "Stop-loss orders and price cascades in currency markets").

## El problema analizado

Durante décadas, la teoría financiera ortodoxa descartó el análisis técnico y los conceptos de "soporte" y "resistencia" como pseudociencia sin fundamento microeconómico. Carol Osler (profesora de Finanzas en Brandeis University y ex-economista de la Reserva Federal de Nueva York) analizó por primera vez microdatos empíricos de libros de órdenes interbancarios de divisas (Forex: USD/DEM, USD/JPY, GBP/USD, EUR/USD) para responder: **¿Existe una explicación basada en microestructura y flujo de órdenes real que justifique por qué los niveles de soporte y resistencia funcionan?**

## Hallazgos empíricos clave

### 1. Clustering masivo de órdenes en niveles técnicos y números redondos
- Al analizar millones de órdenes de clientes reales en bancos creadores de mercado, Osler demostró que las órdenes no se distribuyen uniformemente a lo largo del continuo de precios.
- Se concentran de forma estadísticamente significativa en:
  - **Números redondos** (terminaciones en `00`, `50`, `20`, `80`).
  - **Puntos de soporte y resistencia publicados por casas de análisis técnico**.
  - **Máximos y mínimos previos** de sesiones anteriores.

### 2. La asimetría funcional entre Take-Profit y Stop-Loss
Osler descubrió una diferencia crítica entre los dos tipos de órdenes condicionadas pendientes:
- **Órdenes Take-Profit (Límite)**:
  - Actúan como **fuerza estabilizadora / amortiguadora**.
  - Si el precio sube hacia una resistencia, las órdenes de venta take-profit se ejecutan proporcionando liquidez en el lado vendedor, frenando la subida y provocando el **rebote (rechazo)**.
  - Alrededor de los niveles de soporte, las órdenes de compra take-profit frenan la caída.
- **Órdenes Stop-Loss (Mercado al activarse)**:
  - Actúan como **fuerza desestabilizadora / aceleradora**.
  - Los stop-loss de posiciones cortas se sitúan típicamente *justo por encima* de la resistencia; los stop-loss de posiciones largas *justo por debajo* del soporte.
  - Cuando el precio rompe levemente un nivel técnico, **dispara una cascada de órdenes a mercado** (buy stops por encima de resistencia, sell stops por debajo de soporte), absorbiendo rápidamente la liquidez disponible y provocando un movimiento brusco y acelerado (**breakout / rotura**).

### 3. Dinámica de rebote vs. rotura (Bounces vs. Breakouts)
- Si el flujo de órdenes agresivo no es suficiente para consumir el colchón de órdenes límite (take-profit), el nivel resiste y el precio revierte hacia la media.
- Si el flujo agresivo perfora el nivel, la activación en cadena de los stop-loss genera un "price cascade", validando estadísticamente el fenómeno de ruptura y el aumento transitorio de volatilidad.

## Implicaciones directas para algoritmos y EAs

1. **Fundamentación microeconómica**: El soporte y la resistencia no son líneas místicas; son concentraciones de liquidez latente en el Limit Order Book.
2. **Colocación de Stops**: Situar el stop-loss en el número redondo o exactamente en el nivel técnico garantiza ser barrido por la concentración de liquidez institucional (stop hunting natural). Los stops deben situarse con un margen de seguridad (p. ej. basado en múltiplos de ATR) más allá de la zona de clustering.
3. **Validación de Breakouts**: Una ruptura técnica genuina debe ir acompañada de un pico de volumen/flujo que confirme la absorción de los stops acumulados.

## Referencias primarias

- Osler, C. L. (2000). *Support for Resistance: Technical Analysis and Intraday Exchange Rates*. Federal Reserve Bank of New York Economic Policy Review, 6(2), 53-68.
- Osler, C. L. (2003). *Currency orders and exchange rate dynamics: An explanation for technical analysis*. The Journal of Finance, 58(5), 1791-1820.
- Osler, C. L. (2005). *Stop-loss orders and price cascades in currency markets*. Journal of International Money and Finance, 24(2), 219-241.

---
tags: [basico, estructura-mercado, ordenes]
updated: 2026-08-16
fuentes: [raw/basico/sec-como-funcionan-los-mercados.md]
---

# Estructura de mercado

Cómo funciona "el mercado" por dentro: quién participa, qué tipos de orden existen, qué tipos de cuenta usa un inversor y qué pasa realmente entre que se pulsa "comprar" y la operación queda ejecutada. Basado en el material educativo de la SEC (regulador bursátil de EEUU) sobre mercados de acciones — los conceptos son generalizables a la mayoría de mercados regulados de contado, aunque algunos detalles (formularios, organismos concretos) son específicos de EEUU.

## Compañías cotizadas (públicas)

Una compañía se considera "pública" cuando cotiza en mercados públicos y/o tiene obligación de divulgar regularmente información financiera y de negocio. Esa obligación aparece al hacer una oferta pública (IPO), al superar cierto tamaño de base inversora, o de forma voluntaria. A cambio de poder captar capital de inversores externos, la compañía asume obligaciones de transparencia continua: informes anuales auditados, informes trimestrales, y comunicados inmediatos ante eventos relevantes (cambios de dirección, fusiones, resultados preliminares...). Esta transparencia es la base sobre la que un inversor externo puede analizar una compañía — es el motivo por el que invertir en compañías que no reportan públicamente es sustancialmente más arriesgado: hay mucha menos información disponible para tomar una decisión informada.

## Participantes del mercado

Un mercado no es solo "compradores y vendedores" — hay varios roles especializados que hacen que las operaciones se ejecuten y se liquiden de forma ordenada:

- **Broker-dealers**: intermediarios que cobran una comisión por casar compradores y vendedores. Pueden actuar como agente (buscan la contraparte) o como principal (compran/venden desde su propio inventario).
- **Bolsas / mercados regulados (securities exchanges)**: los mercados propiamente dichos, donde se cruzan órdenes de compra y venta.
- **Creadores de mercado (market makers)**: firmas que se comprometen a ofrecer precio de compra y venta de forma continua sobre un valor, aportando liquidez.
- **Cámaras de compensación (clearing agencies)**: gestionan la liquidación de las operaciones una vez cruzadas — comparan las operaciones de sus miembros, las compensan y preparan la liquidación automatizada. Incluyen tanto cámaras de compensación propiamente dichas como depositarios, que custodian los valores y mantienen el registro de titularidad.
- **Agencias de calificación crediticia**: valoran la solvencia de un emisor o de una emisión concreta (p. ej. "grado de inversión" vs "alto rendimiento"), información relevante sobre todo en renta fija.
- **Asesores de inversión**: prestan asesoramiento sobre inversión a cambio de compensación.
- **Sistemas alternativos de negociación (ATS)**: plataformas que cumplen la definición funcional de "mercado" pero operan bajo un régimen regulatorio más ligero que una bolsa tradicional.
- **Agentes de transferencia (transfer agents)**: llevan el registro de titularidad de los valores emitidos por una compañía.

Todos estos participantes están, en mayor o menor medida, supervisados por el regulador (en EEUU, la SEC, con organismos autorregulados como FINRA operando bajo su supervisión).

## Tipos de orden

- **Orden de mercado (market order)**: comprar o vender inmediatamente al mejor precio disponible. Garantiza la ejecución, **no garantiza el precio** — en mercados rápidos el precio final puede diferir bastante del último precio visto en pantalla.
- **Orden limitada (limit order)**: comprar o vender a un precio concreto o mejor. Una orden de compra limitada solo se ejecuta a ese precio o por debajo; una de venta limitada solo a ese precio o por encima. Garantiza el precio (o mejor), **no garantiza la ejecución** — si el mercado nunca llega a ese precio, la orden se queda sin ejecutar.
- **Orden de stop (stop-loss / stop order)**: se activa cuando el precio alcanza un nivel determinado, momento en el que se convierte en una orden de mercado. Se usa típicamente para limitar pérdidas o proteger beneficios en una posición ya abierta (stop de venta por debajo del precio actual en una posición larga; stop de compra por encima del precio actual en una posición corta). La distancia entre el precio de entrada y el stop es, en la práctica, la unidad de riesgo (1R) sobre la que se calcula el [ratio riesgo/beneficio y la expectativa de un sistema](../gestion-riesgo/expectativa-y-ratio-rr.md).

La elección entre estos tipos es, en el fondo, una decisión entre **certeza de ejecución** (orden de mercado) y **certeza de precio** (orden limitada) — no se puede tener ambas garantías a la vez.

## Tipos de cuenta de bróker

- **Cuenta al contado (cash account)**: solo se puede invertir el capital depositado, sin financiación del bróker.
- **Cuenta de margen (margin account)**: el bróker presta capital adicional usando la propia cartera como garantía, cobrando interés sobre lo prestado. Permite apalancar posiciones, pero implica riesgos serios: si el valor de la cartera cae, el bróker puede exigir aportar más garantía (margin call) y, si no se cubre a tiempo, **liquidar posiciones sin previo aviso y eligiendo qué vender**. El umbral a partir del cual salta un margin call lo puede cambiar el bróker en cualquier momento. Importante no confundir margen disponible con riesgo real: tener mucho margen libre no significa poder permitirse ese riesgo, sobre todo con varias posiciones simultáneas abiertas — ver [riesgo de cartera](../gestion-riesgo/riesgo-de-cartera.md).

## Posiciones largas y cortas

- **Posición larga**: poseer el activo, con la expectativa de que suba de precio.
- **Posición corta (short selling)**: vender un valor que no se posee (tomado prestado del bróker), con la expectativa de que baje de precio para recomprarlo más barato y devolverlo, embolsándose la diferencia. Si el precio sube en vez de bajar, la pérdida es, en teoría, ilimitada — de ahí que se considere una técnica para inversores con experiencia. Además del riesgo direccional, quien vende en corto paga intereses por el préstamo del valor y es responsable de abonar al prestamista cualquier dividendo que reparta el valor mientras dura el préstamo.

El short selling también cumple funciones de mercado más allá de la especulación bajista: aporta liquidez ante demanda inesperada, y permite cubrir (hedge) el riesgo de una posición larga en el mismo valor o en uno relacionado.

## Cómo se ejecuta realmente una orden

Un punto que suele pasar desapercibido: **el inversor no tiene conexión directa con el mercado**. Al enviar una orden (desde una app o por teléfono), esta llega primero al bróker, que decide a qué mercado o intermediario enviarla — a la bolsa donde cotiza el valor, a otra bolsa, a un market maker, o a un ECN (red electrónica que casa órdenes automáticamente). El bróker puede incluso ejecutarla internamente contra su propio inventario ("internalización"), beneficiándose del diferencial (spread) entre el precio al que adquirió el valor y el precio al que lo vende al cliente.

Este proceso no es instantáneo: aunque suele ser rápido, lleva tiempo, y en mercados que se mueven deprisa el precio final de ejecución puede diferir del que se vio en pantalla al enviar la orden. El bróker tiene, no obstante, el deber regulatorio de buscar la "mejor ejecución razonablemente disponible" para sus clientes, evaluando periódicamente qué mercados o intermediarios ofrecen las mejores condiciones — incluyendo la posibilidad de "mejora de precio" (price improvement), es decir, ejecutar a mejor precio que la cotización vigente en el momento de enviar la orden.

## Ver también

- [Velas japonesas](velas-japonesas.md)
- [Tipos de gráfico](tipos-grafico.md)
- [Soporte y resistencia](soporte-y-resistencia.md)
- [Tendencias y estructura de mercado](tendencias-y-estructura.md)
- [Expectativa y ratio riesgo/beneficio](../gestion-riesgo/expectativa-y-ratio-rr.md)
- [Riesgo de cartera](../gestion-riesgo/riesgo-de-cartera.md)

## Fuentes

- [How Stock Markets Work (SEC Investor.gov)](../raw/basico/sec-como-funcionan-los-mercados.md) — compañías cotizadas, participantes del mercado, tipos de orden y de cuenta, ejecución de órdenes.

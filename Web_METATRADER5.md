# Informe de referencia: MetaTrader 5

> **Documento:** Web_METATRADER5.md
> **Fuente:** Sitio web oficial https://www.metatrader5.com/es
> **Fecha de elaboración:** 6 de agosto de 2026
> **Propósito:** Documento de referencia para un proyecto que trabajará con el software MetaTrader 5.
> **Desarrollador:** MetaQuotes Ltd. (Copyright 2000-2026)

---

## 1. Resumen ejecutivo

MetaTrader 5 (MT5) es una plataforma de trading multimercado desarrollada por MetaQuotes, presentada como "el estándar de la industria para tráders y brókeres". Permite operar en Fórex, mercados bursátiles (bolsas de valores) y futuros desde una única plataforma. Combina un sistema de negociación flexible, análisis técnico y fundamental, trading algorítmico (robots/Expert Advisors), trading social (copy-trading vía señales) y un ecosistema de servicios (Market, Freelance, Biblioteca de códigos, hosting virtual VPS).

Está disponible como terminal de escritorio (Windows, macOS, Linux), aplicaciones móviles (Android e iOS) y plataforma web (cualquier navegador y sistema operativo). La interfaz está traducida a 31 idiomas. El sitio declara más de 7.000.000 de visitantes únicos mensuales.

**Nota legal importante:** MetaQuotes se ocupa exclusivamente del desarrollo de software y **no** proporciona servicios de inversión ni de corretaje en los mercados financieros.

---

## 2. La empresa: MetaQuotes

MetaQuotes comenzó a operar en el año **2000** como desarrollador de software B2B, y hoy es líder en producción de software para mercados financieros con oficinas por todo el mundo.

**Línea histórica de productos:**

- **2000 — FX Charts:** primer producto; solución económica y funcional para operar en fórex con análisis técnico y ejecución de órdenes.
- **Plataforma MetaQuotes:** introdujo el lenguaje de programación MQL (MetaQuotes Language), permitiendo por primera vez crear e iniciar robots comerciales.
- **MetaTrader (3ª plataforma):** añadió trading con futuros. En **2003** aparecieron las versiones móviles MetaTrader CE y MetaTrader for Palm.
- **2005 — MetaTrader 4 (MT4):** se convirtió en el estándar del comercio en fórex; introdujo una arquitectura distribuida y el entorno de desarrollo MQL4 IDE.
- **2010 — MetaTrader 5 (MT5):** plataforma multimercado (fórex, valores y futuros) con versiones de escritorio, móvil y web. Ese mismo año se lanzó el portal multilingüe **MQL5.community**.

MetaQuotes destaca por crear no solo productos sino un ecosistema completo alrededor de ellos.

---

## 3. Plataforma comercial: características principales

### 3.1. Sistema comercial flexible

- **Dos sistemas de registro de órdenes/posiciones:**
  - **Compensación (netting):** tradicional, usado en mercados de valores con profundidad de mercado ampliada.
  - **Cobertura (hedging):** permite abrir varias operaciones de un mismo instrumento, incluidas posiciones opuestas; especialmente útil en fórex.
- **Cuatro modos de ejecución:** instantánea, por pedido (request), por mercado (market) y bursátil (exchange).
- **Tipos de órdenes disponibles:** 2 órdenes de mercado, 6 órdenes pendientes, 2 órdenes stop y trailing stop.
- Incluye profundidad de mercado (Depth of Market) y registro separado de órdenes y operaciones.

### 3.2. Análisis técnico profesional

- Hasta **100 gráficos simultáneos** con cotizaciones de acciones y divisas.
- **21 periodos temporales (marcos temporales / timeframes)**; historia de cotizaciones de un minuto.
- **Más de 80 indicadores técnicos e instrumentos analíticos incorporados** (la página de plataforma menciona 38 indicadores incorporados y 44 objetos analíticos en el detalle de las diapositivas; la sección general cita "más de 80" entre indicadores e instrumentos).
- Ampliable con miles de indicadores gratuitos (Biblioteca/CodeBase), compra/alquiler en el Market, encargos en Freelance o desarrollo propio con MQL5.

### 3.3. Análisis fundamental

- **Noticias financieras** de agencias internacionales que llegan en tiempo real a la plataforma.
- **Calendario económico** con los principales índices macroeconómicos de distintos países para prever su impacto en los precios.

### 3.4. Alertas

- Sistema de alertas para no perder oportunidades comerciales, con notificaciones push conectando el terminal con la app móvil (Android/iOS) mediante el **MetaQuotes ID**.

### 3.5. Personalización e idiomas

- Aspecto de gráficos e indicadores totalmente configurable.
- Interfaz traducida a **31 idiomas**.

---

## 4. Trading algorítmico (automático)

El trading algorítmico consiste en operar de forma automática mediante **robots comerciales (Expert Advisors / asesores expertos)** que analizan cotizaciones y ejecutan operaciones sin intervención del tráder.

### 4.1. Entorno de desarrollo MQL5 IDE

Todos los componentes se integran en el **MQL5 IDE (Integrated Development Environment)**, que cubre el ciclo completo: crear, depurar, testar, optimizar y ejecutar robots. Componentes:

- **Lenguaje MQL5:** arquitectura orientada a objetos, alta velocidad computacional, sintaxis tipo C++.
- **MetaEditor:** editor de estrategias con resaltado de código, depurador y compilador.
- **Simulador de estrategias (Strategy Tester):** testing visual, optimización, algoritmos genéticos y red distribuida de agentes de simulación.
- **Módulo de ejecución:** la propia plataforma MT5, con alta velocidad y amplia cobertura de brókeres.
- **Documentación** completa del lenguaje y guía de usuario.
- **MQL5.community:** comunidad de desarrolladores, artículos, foro y servicios para monetizar habilidades.

Para principiantes existe el **MQL5 Wizard**, que genera un robot sencillo en pocos clics.

### 4.2. Formas de obtener robots

- Desarrollo propio (MQL5).
- Descarga gratuita desde la **Biblioteca / CodeBase**.
- Compra o alquiler en **MetaTrader Market**.
- Encargo a desarrolladores en la **Bolsa Freelance** (mql5.com/es/job).

### 4.3. Soporte de otros lenguajes

En el contexto de fondos de cobertura se indica que el entorno MQL5 IDE ofrece soporte de **R, Python y otros lenguajes**.

### 4.4. Automated Trading Championship

Campeonatos de trading algorítmico celebrados entre **2006 y 2012**, con 80.000 USD en premios; los robots operaban sin intervención humana durante 3 meses.

---

## 5. Servicios del ecosistema

### 5.1. MetaTrader Market

Tienda integrada (pestaña "Mercado") de robots comerciales e indicadores técnicos, descrita como la mayor del mundo.

- Más de **2.000 robots e indicadores** disponibles.
- Cada producto tiene **versión demo** probable en el simulador antes de comprar.
- Opciones de **compra, alquiler o descarga gratuita**.
- Clasificación por popularidad, precio y otros criterios; descripciones y capturas.
- **Métodos de pago:** sistema de pago de MQL5.com, tarjetas Visa, MasterCard y UnionPay, y monederos electrónicos PayPal, WebMoney, Neteller y ePayments.
- **Seguridad:** vendedores registrados y verificados; transacciones por conexiones cifradas; la compra se protege con un código de instalación y funciona solo en el equipo del comprador (con un número de activaciones definido por el vendedor).

### 5.2. Señales comerciales (Copy-trading / Trading social)

Copia automática de operaciones de una cuenta a otra en tiempo real.

- Cientos de señales, de cuentas demo y reales, gratuitas o de pago.
- Proveedores clasificados por ventas/rendimiento.
- **Control de seguridad:** si un solicitante muestra malos resultados durante un mes, su señal no se publica, reduciendo el riesgo para los suscriptores.
- Los tráders exitosos pueden convertirse en proveedores y obtener beneficios de sus suscriptores.
- Recomendado usar junto con **Forex VPS** para copiar 24 horas al día.

### 5.3. Hosting virtual (Forex VPS)

Permite el funcionamiento ininterrumpido de la plataforma aunque el ordenador esté apagado.

- Se alquila directamente desde MT5 en pocos clics; migra asesores, indicadores, scripts y suscripciones a señales.
- **Ping de red mínimo** hasta el servidor del bróker.
- Sin instalaciones ni ajustes adicionales.
- **Primeras 24 horas de uso gratuitas** para pruebas.

### 5.4. Bolsa Freelance

Servicio para encargar el desarrollo de robots e indicadores a programadores experimentados (mql5.com/es/job).

### 5.5. Biblioteca / CodeBase

Miles de robots e indicadores gratuitos, descargables directamente desde la plataforma sin interrumpir el trading.

### 5.6. MQL5.community

Portal internacional que conecta a desarrolladores MQL5 con tráders: documentación, artículos, foro y servicios para monetizar habilidades (venta en el Market, ejecución de encargos, etc.).

---

## 6. Disponibilidad multiplataforma

### 6.1. Escritorio (PC)

- **Windows:** descarga del instalador (mt5setup.exe) de forma gratuita.
- **macOS:** paquete .pkg gratuito.
- **Linux:** instalación mediante guía (artículo mql5.com/es/articles/625).

Funcionalidad de escritorio: conjunto completo de órdenes, 2 sistemas de registro (compensación y cobertura), gráficos ilimitados, 21 marcos temporales, historia de un minuto, más de 80 indicadores, análisis fundamental (noticias + calendario), MQL5 IDE, Market, señales, Forex VPS y alertas.

### 6.2. Web trading (WebTerminal)

- Accesible desde cualquier navegador y sistema operativo (Windows, Mac, Linux) — URL: web.metatrader.app/terminal.
- No requiere instalación; solo acceso a internet.
- Funcionalidad amplia: análisis del mercado y colocación de órdenes.

### 6.3. Móvil (Android e iOS)

Aplicaciones gratuitas totalmente compatibles con las funciones comerciales.

**iPhone / iPad (iOS):**
- 30 indicadores técnicos y 24 objetos analíticos.
- Sistema comercial completo con profundidad de mercado y todos los tipos de operaciones.
- Sistemas de compensación y cobertura.
- Órdenes completas (incluidas pendientes y stop).
- 3 tipos de gráfico y 9 periodos temporales.
- Chat incorporado, noticias financieras, notificaciones acústicas y push.
- Versión ampliada para iPad.

**Android (incluye APK y Huawei AppGallery):**
- 30 indicadores y 24 objetos analíticos.
- 2 sistemas comerciales (compensación y cobertura).
- Órdenes completas (pendientes y stop).
- 3 tipos de gráfico y 9 periodos temporales.
- Chat con usuarios de MQL5.community, noticias, notificaciones acústicas y push.
- Operativa en fórex, bolsa, futuros, opciones y acciones.
- Versión ampliada para tabletas.

---

## 7. MetaTrader 5 para Fondos de Cobertura (Hedge Funds)

Solución institucional para crear una infraestructura multimercado en una sola plataforma con sistema unificado de gestión de riesgos y análisis.

- **Más de 80 bolsas y proveedores de liquidez** conectados directamente, con puertas de enlace (gateways) gestionables.
- **Trading algorítmico** con MQL5 IDE y soporte de R, Python y otros lenguajes.
- **Automatización y flexibilidad:** accesos separados para empleados e inversores, control de gerentes, informes de efectividad, configuración de pagos (intereses, comisiones, métodos), propiedades personales por fondo.
- **Movilidad** vía PC y dispositivos móviles para gerentes e inversores.
- **Seguridad:** el cliente implementa el software en su propio hardware y gestiona por completo la infraestructura; **MetaQuotes no ofrece SaaS** ni tiene acceso a servidores, cuentas o historia comercial de los clientes.
- **Extras:** instalación e instrucción gratuitas, soporte técnico (chat online, mesa de servicio, línea directa, documentación, FAQ, artículos), acceso a la API de back office con ejemplos, y actualización automática.
- **Precio indicado:** **4.000 USD al mes**.

---

## 8. MetaTrader 5 para Brókeres y Bancos

Plataforma institucional multidivisa de **ciclo completo** para organizar servicios de corretaje en fórex, bolsa y futuros, sin necesidad de software adicional.

### 8.1. Funcionalidad Back-end

- Asignación de administradores por rol (contables, gerentes, agentes comerciales, gestores de riesgos, etc.).
- Control completo de condiciones comerciales: márgenes, contratos, límites de crédito, swaps, sesiones, spreads, marcado (markup) y comisiones.
- Monitorización automática de riesgos (tecnológicos, financieros, de margen/crédito y operacionales) antes de que ocurran.
- Diferenciación de derechos de acceso y operaciones multi-distributivas por cliente/segmento.
- Pagos masivos a clientes según posiciones (p. ej. dividendos por número de acciones).
- Desdoblamiento y agrupación de la historia de barras y ticks.

### 8.2. APIs de integración (MetaTrader 5 API)

- **Report API:** ampliar la funcionalidad de informes de los servidores comerciales.
- **Server API:** ampliar Trade Server y History Server.
- **Gateway API:** integrar con otros sistemas comerciales y crear fuentes de datos propias.
- **Manager API:** utilidades administrativas/de gestión propias o incluso un terminal de cliente propio.
- **Web API:** integración con recursos web y otros servicios de la compañía.

### 8.3. Puertas de enlace (Gateways)

Integración con proveedores de liquidez en fórex y conexión directa a bolsas mundiales. Permiten cobertura instantánea del riesgo (modelo STP) interactuando con otros brókeres de MT5.

### 8.4. Rendimiento y seguridad

- **Arquitectura distribuida** con funciones separadas entre servidores individuales; escalable añadiendo servidores.
- Toda la comunicación entre componentes va **cifrada**; autenticación y autorización modernas.
- Bases de datos cifradas con copia de seguridad y recuperación.
- Resistencia a ataques mediante múltiples puntos de acceso que protegen los servidores comerciales.
- El bróker implementa el software en su propio hardware; MetaQuotes no ofrece SaaS ni tiene acceso a los datos.

### 8.5. Política de licencias

Tres tipos: **Entry, Standard y Enterprise**, diferenciados por el número de cuentas reales admisibles y los componentes de sistema incluidos. Escalable a medida que crece el negocio.

---

## 9. Servicios adicionales para negocios

- **Analítica de extremo a extremo para brókeres:** integración con MetaTrader 5, 15 informes de tráfico, embudos de ventas en dos clics (integración con Finteza).
- **Contenido de mercado:** mercados financieros, ideas de trading y noticias económicas.

---

## 10. Novedades y versiones recientes (según el sitio)

- **MetaTrader 5 build 6090:** análisis y auditoría exhaustivos del código, resolución de problemas y mejoras internas orientadas a estabilidad, fiabilidad y rendimiento.
- **MetaTrader 5 build 6060:** integración de IA basada en agentes con soporte del **Protocolo de Contexto de Modelo (MCP)**, soporte de **Passkey** y edición sencilla de código en MetaEditor.
- Menciones de colaboraciones (iFX EXPO International 2026) y de pagos integrados (UniPayment) para depósito instantáneo de fondos.

## 11. Premios destacados (según el sitio)

- **Best Multi-Asset Trading Platform Including Web & Mobile:** 2025, 2024, 2023, 2022, 2021, 2020.
- **Best Multi-Asset Trading Platform:** 2025, 2024, 2023, 2022, 2019, 2017.

---

## 12. Tabla resumen de datos técnicos clave

| Característica | Dato |
|---|---|
| Mercados soportados | Fórex, bolsas de valores (acciones), futuros, opciones |
| Sistemas de registro | Compensación (netting) y cobertura (hedging) |
| Modos de ejecución | Instantánea, por pedido, por mercado, bursátil |
| Órdenes (escritorio) | 2 de mercado, 6 pendientes, 2 stop + trailing stop |
| Gráficos simultáneos (escritorio) | Hasta 100 (cantidad ilimitada según página de descarga) |
| Marcos temporales (escritorio) | 21 |
| Indicadores/objetos (escritorio) | +80 indicadores e instrumentos (38 indicadores + 44 objetos analíticos) |
| Indicadores/objetos (móvil) | 30 indicadores + 24 objetos analíticos |
| Gráficos/periodos (móvil) | 3 tipos de gráfico, 9 periodos temporales |
| Lenguaje de programación | MQL5 (orientado a objetos, sintaxis tipo C++) |
| Entorno de desarrollo | MQL5 IDE (MetaEditor + Strategy Tester + MQL5 Wizard) |
| Idiomas de interfaz | 31 |
| Productos en el Market | +2.000 robots e indicadores |
| Bolsas/proveedores de liquidez (hedge funds) | +80 |
| Licencias para brókeres | Entry, Standard, Enterprise |
| Precio hedge funds | 4.000 USD/mes |
| Sistemas operativos | Windows, macOS, Linux, Android, iOS, Web |

---

## 13. Enlaces de referencia (sitio oficial)

- Home: https://www.metatrader5.com/es
- Plataforma comercial: https://www.metatrader5.com/es/trading-platform
- Trading móvil: https://www.metatrader5.com/es/mobile-trading
- Trading automatizado: https://www.metatrader5.com/es/automated-trading
- MetaTrader Market: https://www.metatrader5.com/es/automated-trading/mql5market
- Señales comerciales: https://www.metatrader5.com/es/trading-platform/trading-signals
- Hosting virtual (VPS): https://www.metatrader5.com/es/trading-platform/vps
- Para brókeres: https://www.metatrader5.com/es/brokers
- Para fondos de cobertura: https://www.metatrader5.com/es/hedge-funds
- Descargas: https://www.metatrader5.com/es/download
- Web trading: https://web.metatrader.app/terminal
- Empresa (MetaQuotes): https://www.metatrader5.com/es/company
- Bolsa Freelance: https://www.mql5.com/es/job
- Comunidad MQL5: https://www.mql5.com

---

*Documento elaborado a partir de la información pública publicada en el sitio oficial de MetaTrader 5 / MetaQuotes. Los datos de versiones, precios y premios reflejan lo indicado en el sitio en la fecha de consulta y pueden cambiar.*

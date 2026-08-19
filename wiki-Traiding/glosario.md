---
tags: [glosario]
updated: 2026-08-16
fuentes: [todas las páginas de wiki-Traiding/]
---

# Glosario de trading

> Glosario de referencia rápida derivado de las 41 páginas de contenido de esta wiki (`basico/`, `indicadores/`, `estrategias/`, `analisis-fundamental/`, `gestion-riesgo/`, `infraestructura/`). No es una fuente ingerida de forma independiente: cada entrada resume en 2-4 frases lo que ya está desarrollado en profundidad en la página enlazada. Para el detalle, el contexto, los números concretos y las fuentes originales, seguir siempre el enlace. Pensado como consulta puntual de un término suelto — tanto para Pedro como para agentes de IA que necesiten resolver rápido un término técnico sin releer una página entera.

## A

**ADX (Average Directional Index)**: mide la fuerza de una tendencia, sin indicar su dirección, en una escala donde por encima de 25 se considera tendencia fuerte y por debajo de 20, mercado sin tendencia clara (sin tendencia clara = en rango). Desarrollado por J. Welles Wilder junto con el sistema +DI/-DI, tiene un lag considerable y se usa sobre todo como filtro previo antes de aplicar estrategias de seguimiento de tendencia. Ver [ADX y Directional Movement](indicadores/adx-dmi.md).

**+DI / -DI (Directional Movement Index)**: las dos líneas direccionales del sistema de Wilder que acompañan al ADX — +DI mide el movimiento direccional al alza y -DI el movimiento a la baja. Un cruce de +DI por encima de -DI es señal alcista (y viceversa), pero es más fiable cuando ocurre con el ADX ya por encima de 20-25. Ver [ADX y Directional Movement](indicadores/adx-dmi.md).

**Agencia de calificación crediticia**: entidad que valora la solvencia de un emisor o de una emisión concreta de deuda (p. ej. "grado de inversión" frente a "alto rendimiento"), información especialmente relevante en renta fija. Es uno de los participantes especializados que hacen funcionar un mercado regulado. Ver [Estructura de mercado](basico/estructura-mercado.md).

**Alfa (alpha)**: la parte de la rentabilidad de una estrategia que no se explica por su exposición al mercado (beta) — el retorno genuinamente "propio" de la estrategia. Ejemplo citado en la wiki: la versión refinada del Opening Range Breakout genera un alfa anualizado del ~36% con un beta prácticamente nulo frente al S&P 500. Ver [Ruptura / breakout](estrategias/ruptura-breakout.md).

**Almgren-Chriss (modelo de ejecución)**: marco matemático seminal (Almgren & Chriss, 2000) que resuelve la trayectoria óptima de liquidación de órdenes balanceando el coste por impacto de mercado temporal/permanente frente al riesgo de volatilidad, fundamentando formalmente los algoritmos TWAP y VWAP. Ver [Microestructura de mercado](basico/microestructura-mercado.md).

**Apalancamiento**: usar capital prestado (o instrumentos derivados) para tomar una posición mayor que el capital propio disponible, multiplicando tanto ganancias como pérdidas. El apalancamiento agregado de una cartera —la suma de la exposición nocional de todas las posiciones abiertas dividida entre el capital— es lo relevante para el riesgo real, no el apalancamiento de cada posición por separado. Ver [Riesgo de cartera](gestion-riesgo/riesgo-de-cartera.md) y [Estructura de mercado](basico/estructura-mercado.md).

**Asesor de inversión**: profesional o firma que presta asesoramiento sobre inversión a cambio de una compensación, uno de los participantes regulados del mercado. Ver [Estructura de mercado](basico/estructura-mercado.md).

**ATR (Average True Range)**: indicador de volatilidad (no de dirección) desarrollado por J. Welles Wilder, que mide el rango medio de movimiento de un activo incorporando los gaps mediante el concepto de True Range. Se usa como validador de rupturas (más ATR = más convicción) y como base para dimensionar stops y posiciones; no es comparable directamente entre activos de precio muy distinto sin normalizarlo. Ver [Volumen y ATR](indicadores/volumen-y-atr.md).

**ATS (Sistema Alternativo de Negociación)**: plataforma de negociación que cumple la función de un mercado pero opera bajo un régimen regulatorio más ligero que una bolsa tradicional. Ver [Estructura de mercado](basico/estructura-mercado.md).

## B

**Backtesting**: simulación histórica de cómo se habría comportado una estrategia de trading si se hubiera operado en el pasado, aplicando sus reglas a una serie de precios y calculando el resultado. Es la herramienta central para diseñar estrategias sistemáticas, pero también la más fácil de manipular sin darse cuenta por overfitting de parámetros y otros sesgos de diseño (look-ahead bias, survivorship bias). Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Bandas de Bollinger**: bandas de volatilidad construidas alrededor de una media móvil (SMA de 20 por defecto) más/menos dos desviaciones estándar, que se ensanchan con más volatilidad y se estrechan con menos. Tocar una banda no es señal de compra/venta por sí solo ("tags", no señales); se usan sobre todo para confirmar patrones de giro (W-Bottom, M-Top) y para medir la fuerza de una tendencia. Ver [Bandas de Bollinger](indicadores/bollinger.md).

**BCE (Banco Central Europeo)**: banco central de la eurozona, con mandato único de estabilidad de precios (a diferencia del mandato dual de la Fed). Publica su *Economic Bulletin* dos semanas después de cada reunión de política monetaria, y su lenguaje de comunicados y actas se analiza para anticipar giros de política. Ver [Bancos centrales](analisis-fundamental/bancos-centrales.md).

**Beta**: medida de la sensibilidad de un activo o estrategia a los movimientos del mercado de referencia (riesgo sistemático). Una estrategia con beta cercano a cero no tiene correlación direccional con el mercado —su rentabilidad, si la hay, es alfa genuino—; el paper de Lakonishok-Shleifer-Vishny usa la diferencia de beta entre carteras value y glamour para descartar que la ventaja del value sea solo compensación por mayor riesgo. Ver [Reversión a la media](estrategias/reversion-media.md) y [Ruptura / breakout](estrategias/ruptura-breakout.md).

**Bid-Ask Spread**: diferencia entre el mejor precio de venta (ask) y el mejor precio de compra (bid) en el libro de órdenes. Descompuesto formalmente en selección adversa (Kyle, Glosten-Milgrom), costes de inventario (Stoll) y costes operativos. Ver [Microestructura de mercado](basico/microestructura-mercado.md).

**BIS (Bank for International Settlements)**: organización de cooperación internacional entre bancos centrales y supervisores financieros, descrita a menudo como "el banco central de los bancos centrales". No fija tipos de interés — aloja el Comité de Basilea (regulación bancaria) y publica investigación macro-financiera y estadísticas globales de deuda y crédito. Ver [Bancos centrales](analisis-fundamental/bancos-centrales.md) y [Fuentes de datos macro](analisis-fundamental/fuentes-datos-macro.md).

**Black-Scholes-Merton (modelo)**: ecuación diferencial y solución analítica cerrada (Black, Scholes & Merton, 1973) para la valoración de opciones y derivación de la superficie de volatilidad implícita y sus sensibilidades (griegas). Ver [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

**Book-to-market**: ratio entre el valor contable de una empresa y su valor de mercado, usado para clasificar acciones como "value" (alto book-to-market, baratas) o "glamour" (bajo book-to-market, caras). Es el criterio central del estudio de Lakonishok-Shleifer-Vishny que documenta la ventaja histórica de las estrategias value. Ver [Reversión a la media](estrategias/reversion-media.md).

**Breakeven (stop)**: mover el stop loss al precio de entrada una vez que la posición alcanza un umbral de beneficio (p. ej. +1R). Aunque ofrece protección psicológica contra la aversión a la pérdida, los estudios cuantitativos muestran que frecuentemente reduce la expectativa matemática de la estrategia por sacarte de operaciones ganadoras tras un pullback normal. Ver [Gestión de operaciones en vivo](gestion-riesgo/gestion-operaciones-vivo.md).

**Breakout / Ruptura**: momento en que el precio supera de forma decisiva un nivel de soporte, resistencia o rango previo, señalando que un bando ha ganado el pulso entre oferta y demanda. Como estrategia (Opening Range Breakout), opera la ruptura del rango de los primeros minutos de sesión apostando a que el desequilibrio inicial persiste. Ver [Soporte y resistencia](basico/soporte-y-resistencia.md) y [Ruptura / breakout](estrategias/ruptura-breakout.md).

**Broker-dealer**: intermediario que cobra una comisión por casar compradores y vendedores, actuando como agente (busca la contraparte) o como principal (compra/vende desde su propio inventario). Ver [Estructura de mercado](basico/estructura-mercado.md).

**Bull set-up / Bear set-up**: variante de la divergencia clásica introducida por George Lane para el Estocástico. Un bull set-up es cuando el precio marca un máximo más bajo pero el oscilador marca un máximo más alto (momentum alcista reforzándose pese a la aparente debilidad del precio); el bear set-up es el espejo. Ver [Osciladores](indicadores/osciladores.md).

## C

**Calendario económico**: listado cronológico de publicaciones de datos macroeconómicos y eventos de política monetaria programados de antemano (tipos de interés, empleo, inflación, PIB...). Lo que mueve el precio no es el valor publicado en sí, sino la sorpresa frente al consenso esperado por el mercado. Ver [Calendario económico](analisis-fundamental/calendario-economico.md).

**Calmar (ratio)**: métrica de rendimiento ajustado a riesgo calculada como el retorno anualizado dividido por el drawdown máximo absoluto (`Calmar = Retorno / |MaxDD|`). Mide cuánto retorno genera la estrategia por cada unidad de su peor caída histórica. Ver [Métricas cuantitativas de rendimiento](estrategias/metricas-rendimiento.md) y [Drawdown](gestion-riesgo/drawdown.md).

**Cámara de compensación (clearing agency)**: entidad que gestiona la liquidación de operaciones ya cruzadas — las compara, compensa y prepara su liquidación automatizada; incluye también a los depositarios que custodian los valores y el registro de titularidad. Ver [Estructura de mercado](basico/estructura-mercado.md).

**Carry trade**: posición que pide prestado en una divisa de tipo de interés bajo para invertir en una divisa de tipo alto, capturando el diferencial. Se deshace de golpe en episodios "risk-off", reduciendo de golpe la demanda de divisas cíclicas o de alto rendimiento. Ver [Correlaciones entre activos](analisis-fundamental/correlaciones-entre-activos.md).

**CED (Conditional Expected Drawdown)**: medida de riesgo de cola propuesta por Goldberg y Mahmoud que calcula la media de la cola de la distribución de drawdowns máximos posibles (análoga al Expected Shortfall pero aplicada al drawdown), en vez de fiarse de un único drawdown observado en un backtest. Es especialmente sensible a la correlación serial de las pérdidas (rachas). Ver [Drawdown](gestion-riesgo/drawdown.md).

**Clustering de órdenes (Carol Osler)**: fenómeno microeconómico demostrado empíricamente por Carol Osler (FRBNY) donde las órdenes stop-loss y take-profit se concentran masivamente en números redondos y soportes/resistencias, explicando los rebotes por absorción de liquidez y las roturas por cascadas de stops. Ver [Soporte y resistencia](basico/soporte-y-resistencia.md).

**CMF (Chaikin Money Flow)**: oscilador de volumen desarrollado por Marc Chaikin que mide la presión compradora/vendedora acumulada en una ventana (típicamente 20-21 periodos), a partir de dónde cierra el precio dentro de su rango diario. Oscila entre -1 y +1 (en la práctica entre -0,5 y +0,5); positivo indica presión compradora. Ver [Volumen y ATR](indicadores/volumen-y-atr.md).

**Cointegración**: propiedad estadística de dos o más series temporales no estacionarias cuya combinación lineal sí es estacionaria (revertiente a la media). Es el fundamento econométrico riguroso (Engle-Granger) del pairs trading para modelar spreads que regresan al equilibrio. Ver [Pairs trading](estrategias/pairs-trading.md).

**Comité de Basilea**: comité alojado en el BIS, origen de los marcos de regulación bancaria (Basilea III y sucesores) que fijan cuánto capital y liquidez deben mantener los bancos, con efecto indirecto sobre la disponibilidad de crédito y liquidez de mercado. Ver [Bancos centrales](analisis-fundamental/bancos-centrales.md).

**Confluencia**: combinar indicadores de familias distintas (tendencia, momentum, volumen, volatilidad, fuerza de tendencia) que apuntan en la misma dirección, aportando cada uno un tipo de información que los demás no dan. No es lo mismo que apilar varios indicadores de la misma familia (p. ej. RSI + Estocástico + MFI), que es redundancia disfrazada de confirmación. Ver [Cómo combinar indicadores](indicadores/como-combinar-indicadores.md).

**Core CPI (CPI subyacente)**: el índice de precios al consumo excluyendo energía y alimentos frescos, categorías muy volátiles por factores de oferta puntuales. Los bancos centrales le prestan más atención que al CPI general porque refleja mejor la inflación persistente sobre la que su política de tipos puede influir. Ver [Indicadores macro clave](analisis-fundamental/indicadores-macro-clave.md).

**Correlación**: medida estadística de cómo se mueven dos activos entre sí, en una escala de -100% (inversos perfectos) a +100% (idénticos). No es una ley física sino una tendencia estadística que puede debilitarse o romperse, y que tiende a converger hacia +1 entre activos dispares durante crisis de mercado ("todas las correlaciones van a uno"). Ver [Correlaciones entre activos](analisis-fundamental/correlaciones-entre-activos.md) y [Riesgo de cartera](gestion-riesgo/riesgo-de-cartera.md).

**CPI / IPC (Consumer Price Index)**: índice que mide la variación de precios de una cesta representativa de bienes y servicios de consumo, publicado como variación interanual. Es el dato que los bancos centrales vigilan más de cerca para decidir tipos de interés, porque su mandato de estabilidad de precios depende directamente de él. Ver [Indicadores macro clave](analisis-fundamental/indicadores-macro-clave.md).

**Cruce de medias (Golden cross / Death cross)**: señal técnica en la que una media móvil corta cruza a una larga. El *golden cross* (cruce al alza) se interpreta como señal alcista y el *death cross* (cruce a la baja) como bajista; funciona bien en tendencias fuertes pero genera muchas señales falsas en mercados laterales por el lag inherente de las medias móviles. Ver [Medias móviles](indicadores/medias-moviles.md).

**CSCV (Combinatorially Symmetric Cross-Validation)**: método propuesto por Bailey, Borwein, López de Prado y Zhu para estimar la probabilidad de que un backtest esté sobreajustado (PBO), dividiendo el histórico en múltiples particiones combinatorias y simétricas de datos in-sample/out-of-sample, en vez de fiarse de una única partición hold-out. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Cuenta al contado / Cuenta de margen**: la cuenta al contado (cash account) solo permite invertir el capital depositado; la cuenta de margen (margin account) permite al bróker prestar capital adicional contra la propia cartera como garantía, con riesgo de margin call (exigencia de aportar más garantía) y liquidación forzosa si no se cubre a tiempo. Ver [Estructura de mercado](basico/estructura-mercado.md).

**Curve-fitting**: ajustar los parámetros de un indicador o estrategia hasta que "encaja" perfectamente con el histórico reciente, memorizando el ruido de esa ventana de datos en vez de capturar una propiedad genérica del mercado. Señal de alerta: los parámetros "óptimos" cambian mucho entre periodos de backtest, o un cambio pequeño en un parámetro cambia mucho el resultado. Ver [Cómo combinar indicadores](indicadores/como-combinar-indicadores.md) y [Backtesting y validación](estrategias/backtesting-y-validacion.md).

## D

**Day trading**: comprar y vender el mismo valor el mismo día, sin mantener posición overnight. La evidencia de Taiwán (Barber, Lee, Liu y Odean) muestra que la mayoría de day traders individuales pierden dinero neto de costes de transacción, aunque una minoría con habilidad genuina y persistente sí gana de forma consistente. Ver [Scalping](estrategias/scalping.md).

**Delta ($\Delta$)**: ratio de sensibilidad de una opción que mide el cambio esperado en su prima ante un movimiento unitario del subyacente, utilizado como ratio de cobertura (*hedge ratio*). Ver [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

**Disposición (efecto)**: tendencia psicológica documentada (Shefrin-Statman, Odean) a vender prematuramente las posiciones ganadoras para asegurar beneficios y mantener las perdedoras demasiado tiempo esperando recuperar, destruyendo sistemáticamente valor. Ver [Sesgos cognitivos y psicología de trading](basico/sesgos-cognitivos-trading.md).

**Distance approach**: metodología empírica de pairs trading formalizada por Gatev, Goetzmann y Rouwenhorst (2006) basada en minimizar la suma de desviaciones cuadradas (SSD) entre series de precios normalizados durante un período de formación. Ver [Pairs trading](estrategias/pairs-trading.md).

**Divergencia**: desajuste entre lo que muestra el precio y lo que muestra un indicador (RSI, MACD, Estocástico, OBV, MFI, CMF...). Una divergencia alcista ocurre cuando el precio marca un mínimo más bajo pero el indicador marca un mínimo más alto (el momentum bajista se agota); la divergencia bajista es la inversa. Son más fiables tras una lectura de sobrecompra/sobreventa, y habituales (sin implicar giro) dentro de tendencias fuertes. Ver [Osciladores](indicadores/osciladores.md).

**Doji**: vela japonesa con apertura y cierre prácticamente iguales (cuerpo casi inexistente), que refleja indecisión entre compradores y vendedores. Su interpretación depende del contexto: nunca se opera de forma aislada, requiere confirmación posterior. Variantes: doji de piernas largas, doji libélula, doji lápida. Ver [Velas japonesas](basico/velas-japonesas.md).

**Dow Theory**: marco clásico de análisis técnico desarrollado por Charles Dow que clasifica el movimiento de precio en tres tendencias anidadas (primaria, secundaria, menor) y define de forma objetiva, mediante la estructura de máximos y mínimos, cuándo una tendencia ha cambiado genuinamente. Es el origen histórico de buena parte del vocabulario técnico moderno (soporte/resistencia, confirmación por volumen, fases de mercado). Ver [Tendencias y estructura de mercado](basico/tendencias-y-estructura.md).

**Drawdown / Drawdown máximo**: caída de la curva de capital desde su máximo histórico hasta un punto dado; el drawdown máximo es la mayor de esas caídas en un periodo. Es la medida de riesgo más citada en hedge funds y CTAs, pero un único drawdown observado en un backtest es solo una muestra de una distribución posible de caídas, no una medida completa de riesgo (ver CED). Ver [Drawdown](gestion-riesgo/drawdown.md).

**DXY (US Dollar Index)**: índice que mide la fortaleza del dólar frente a una cesta de seis divisas (euro con el mayor peso, 57,6%), calculado por ICE Futures U.S. Al tener el euro tanto peso y con signo negativo en la fórmula, el DXY está casi mecánicamente correlacionado de forma inversa con el EUR/USD. Ver [Correlaciones entre activos](analisis-fundamental/correlaciones-entre-activos.md).

## E

**Edge**: la ventaja probabilística o estadística real que tiene una estrategia sobre el resultado esperado de una operación repetida muchas veces. Es el numerador de la fórmula de Kelly (`f* = edge / odds`) y, si es cero o negativo, ninguna gestión de riesgo puede hacer viable la estrategia a largo plazo. Ver [Kelly (criterio de)](gestion-riesgo/position-sizing-kelly.md) y [Expectativa y ratio R:R](gestion-riesgo/expectativa-y-ratio-rr.md).

**EMA (media móvil exponencial)**: media móvil que da más peso a los precios recientes mediante un multiplicador de suavizado, por lo que reacciona antes a los cambios de precio que una SMA del mismo periodo (a costa de mayor sensibilidad al ruido). Es la base de construcción del MACD (diferencia entre dos EMA). Ver [Medias móviles](indicadores/medias-moviles.md).

**Estocástico (Stochastic)**: oscilador de momentum desarrollado por George C. Lane que mide dónde cierra el precio dentro de su rango de los últimos N periodos (no la magnitud del movimiento, como el RSI), mediante las líneas %K y %D. Umbrales estándar 80/20 para sobrecompra/sobreventa; funciona mejor en mercados en rango que en tendencias sostenidas. Ver [Osciladores](indicadores/osciladores.md).

**Expectativa matemática**: la ganancia o pérdida media esperada por operación de un sistema de trading, dado su winrate y el tamaño medio de ganancias y pérdidas: `E = (winrate × R ganado medio) − ((1 − winrate) × R perdido medio)`. Un sistema solo es viable a largo plazo si `E > 0`; el winrate por sí solo no dice nada sobre la calidad de un sistema sin conocer también el ratio riesgo/beneficio. Ver [Expectativa y ratio R:R](gestion-riesgo/expectativa-y-ratio-rr.md).

**Expected Shortfall (CVaR)**: medida de riesgo de cola que calcula la pérdida media esperada más allá de un umbral de confianza (a diferencia del VaR, que solo marca ese umbral sin decir cuánto se puede perder más allá de él). El CED es el equivalente de esta idea aplicado específicamente al drawdown. Ver [Drawdown](gestion-riesgo/drawdown.md).

**Exposición neta**: la suma de la exposición direccional real a un activo o divisa subyacente tras descomponer todas las posiciones abiertas, en vez de contar cada posición como independiente. Tres pares con el USD en el mismo lado (EUR/USD, GBP/USD, AUD/USD) no son tres apuestas diversificadas sino, en esencia, una única apuesta concentrada contra el dólar. Ver [Riesgo de cartera](gestion-riesgo/riesgo-de-cartera.md).

## F

**Failure swing**: patrón que mira solo al propio oscilador (RSI o MFI), sin comparar contra el precio como hace una divergencia. Un failure swing alcista es cuando el oscilador baja del umbral de sobreventa, rebota por encima, retrocede sin volver a perforarlo, y luego supera su máximo previo. Ver [Osciladores](indicadores/osciladores.md).

**Fed / FOMC**: la Reserva Federal de EE. UU. y su comité de política monetaria (Federal Open Market Committee), que fija el tipo de interés de referencia bajo un mandato dual de máximo empleo y estabilidad de precios. Celebra ocho reuniones al año, cuatro con proyecciones económicas (SEP / dot plot). Ver [Bancos centrales](analisis-fundamental/bancos-centrales.md).

**Fibonacci (retrocesos y extensiones)**: herramientas técnicas basadas en los ratios de la secuencia de Fibonacci (23.6%, 38.2%, 50%, 61.8%, 78.6% para retrocesos; 127.2%, 161.8%, 261.8% para extensiones) que proyectan zonas potenciales de soporte/resistencia y objetivos de take profit. Su valor predictivo depende críticamente de la confluencia con medias móviles, soporte/resistencia previo y volumen. Ver [Fibonacci](indicadores/fibonacci.md).

**Flight to quality / safety**: desplazamiento del capital hacia activos de bajo riesgo de impago (deuda soberana de máxima calidad, oro, divisas refugio) durante episodios de incertidumbre o estrés de mercado — el mecanismo de fondo detrás del régimen "risk-off". Ver [Correlaciones entre activos](analisis-fundamental/correlaciones-entre-activos.md).

**Forward guidance**: herramienta de comunicación con la que un banco central da información sobre sus intenciones futuras de política monetaria para moldear las condiciones financieras de hoy, no solo para informar. Puede basarse en calendario (time-based / Delphic) o en condiciones económicas (state-contingent / Odyssean, el enfoque "data dependent" dominante hoy). Ver [Forward guidance y lectura de comunicados](analisis-fundamental/forward-guidance-y-lectura-de-comunicados.md).

**FRED (Federal Reserve Economic Data)**: base de datos de la Fed de St. Louis con más de 800.000 series temporales de datos económicos de EE. UU., la referencia por defecto para obtener histórico oficial y descargable de cualquier serie macro. Ver [Fuentes de datos macro](analisis-fundamental/fuentes-datos-macro.md).

## G

**Gamma ($\Gamma$)**: sensibilidad de segundo orden que mide la tasa de cambio de Delta ante movimientos del precio del subyacente; refleja el riesgo de aceleración no lineal en derivados. Ver [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

**Gap**: salto de precio entre el cierre de una sesión y la apertura de la siguiente, sin negociación intermedia, típico cuando ocurre una noticia relevante con el mercado cerrado. Es el riesgo estructural central del swing trading (riesgo overnight): un gap en contra puede ejecutar un stop loss muy por debajo (o por encima) del nivel planeado. Ver [Swing trading](estrategias/swing-trading.md).

**Gráfico de barras (OHLC)**: representación de precio donde cada periodo es una línea vertical entre máximo y mínimo con marcas laterales de apertura (opcional) y cierre (obligatoria). Contiene la misma información que una vela japonesa pero exige leer las marcas para saber si cerró al alza o a la baja. Ver [Tipos de gráfico](basico/tipos-grafico.md).

**Gráfico de líneas**: representación de precio que une con una línea continua un único dato por periodo (normalmente el cierre). Es el más simple, útil para ver tendencia general sin ruido, pero oculta toda la volatilidad intra-periodo. Ver [Tipos de gráfico](basico/tipos-grafico.md).

**Griegas (Delta, Gamma, Vega, Theta, Rho)**: derivadas parciales del modelo Black-Scholes-Merton que cuantifican la sensibilidad del precio de una opción frente al precio del subyacente, volatilidad implícita, tiempo y tipos de interés. Ver [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

## H

**Hawkish / Dovish**: vocabulario para describir el tono de un banco central. Hawkish (agresivo/duro) sugiere mayor disposición a subir tipos o actuar con contundencia contra la inflación; dovish (suave) sugiere no tener prisa, favoreciendo tipos bajos o recortes. Ver [Forward guidance y lectura de comunicados](analisis-fundamental/forward-guidance-y-lectura-de-comunicados.md).

**Heikin-Ashi**: variante de gráfico de velas que recalcula cada vela con datos de dos periodos, suavizando el ruido y facilitando ver rachas de tendencia — a cambio, sus valores de apertura/cierre ya no son precios realmente negociados. Ver [Tipos de gráfico](basico/tipos-grafico.md).

**HFT (High-Frequency Trading)**: trading algorítmico institucional en horizontes de milisegundos. El estudio de Kearns, Kulesza y Nevmyvaka muestra que el beneficio máximo teórico disponible cae en tres órdenes de magnitud al acortar el horizonte de mantenimiento de 10 segundos a 10 milisegundos, incluso para un operador "omnisciente" hipotético — evidencia de que el margen de beneficio en horizontes ultra-cortos es estructuralmente pequeño. Ver [Scalping](estrategias/scalping.md).

**HMM (Hidden Markov Models)**: modelos estadísticos que infieren estados latentes del mercado (bull, bear, rango, crisis) a partir de variables observables de retornos y volatilidad (Hamilton 1989), permitiendo a los algoritmos conmutar dinámicamente de estrategia. Ver [Regímenes de mercado y detección de régimen](estrategias/regimenes-mercado.md).

## I

**Impacto de mercado (Price impact)**: variación del precio provocada por la ejecución de una orden. Descompuesto por Almgren-Chriss (2000) en impacto temporal (fricción transitoria) e impacto permanente (informacional). Sigue aproximadamente la ley de la raíz cuadrada empírica. Ver [Microestructura de mercado](basico/microestructura-mercado.md).

**In-sample / Out-of-sample (IS / OOS)**: distinción central en backtesting entre el rendimiento medido sobre los mismos datos usados para diseñar o calibrar una estrategia (in-sample) y el medido sobre datos que la estrategia nunca "vio" durante su diseño (out-of-sample). Un backtest es realista cuando ambos rendimientos son consistentes; en la práctica esa consistencia es la excepción por el problema del overfitting. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Indicador adelantado / retrasado (leading / lagging)**: distinción entre indicadores que generan señal pronto pero con más falsos positivos (osciladores de momentum como RSI o Estocástico, mejores en mercados en rango) e indicadores que confirman una tendencia ya en marcha con retraso inherente (medias móviles, MACD, ADX, mejores en tendencias sostenidas). Ver [Cómo combinar indicadores](indicadores/como-combinar-indicadores.md).

## K

**Kagi**: tipo de gráfico de origen japonés basado en volatilidad e importes de reversión, que cambia de dirección y grosor de línea solo cuando el precio revierte más de un umbral definido, ignorando el tiempo por completo. Ver [Tipos de gráfico](basico/tipos-grafico.md).

**Kelly (criterio de)**: fórmula (Kelly, 1956) que determina qué fracción del capital arriesgar en cada repetición de una apuesta con edge conocido para maximizar la tasa de crecimiento del capital a largo plazo (`f* = edge / odds`). Es matemáticamente la estrategia más agresiva que un inversor racional debería considerar; en la práctica se usa una fracción de Kelly (half-Kelly, 1/4 Kelly) para reducir drásticamente la varianza a cambio de algo de crecimiento. Ver [Kelly (criterio de) y el tamaño de posición](gestion-riesgo/position-sizing-kelly.md).

## L

**Limit Order Book (LOB)**: registro electrónico continuo de todas las órdenes limitadas pendientes de compra (bid) y venta (ask) ordenadas por precio y prioridad temporal. Mecanismo central del descubrimiento de precios. Ver [Microestructura de mercado](basico/microestructura-mercado.md).

**Look-ahead bias (sesgo de anticipación)**: usar en un backtest, sin darse cuenta, información que no habría estado disponible en el momento real de la decisión — por ejemplo, un precio ajustado por un split que en su momento aún no se conocía. Invalida un backtest independientemente de cuántas configuraciones de parámetros se hayan probado. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

## M

**MACD (Moving Average Convergence/Divergence)**: indicador desarrollado por Gerald Appel que combina tendencia y momentum, calculado como la diferencia entre dos EMA (12 y 26 periodos) más una línea señal (EMA de 9 sobre esa diferencia). No está acotado entre 0 y 100, por lo que no sirve para sobrecompra/sobreventa; sus señales principales son cruces de señal, cruces de línea central y divergencias. Ver [MACD](indicadores/macd.md).

**Margen / Margin call**: el margen es el colateral que exige un bróker para mantener una posición apalancada abierta; un margin call es la exigencia de aportar más garantía cuando el valor de la cartera cae, con riesgo de liquidación forzosa si no se cubre a tiempo. Tener margen libre disponible no es lo mismo que poder permitirse el riesgo real de una posición. Ver [Estructura de mercado](basico/estructura-mercado.md) y [Riesgo de cartera](gestion-riesgo/riesgo-de-cartera.md).

**Market maker (creador de mercado)**: firma que se compromete a ofrecer precio de compra y venta de forma continua sobre un valor, aportando liquidez al mercado. Ver [Estructura de mercado](basico/estructura-mercado.md) y [Microestructura de mercado](basico/microestructura-mercado.md).

**Marubozu**: vela japonesa sin sombras, donde el precio abrió en un extremo (máximo o mínimo) y cerró en el otro — señal de control total de un bando durante toda la sesión. Ver [Velas japonesas](basico/velas-japonesas.md).

**Máximos y mínimos crecientes/decrecientes**: método objetivo de la Dow Theory para identificar la tendencia de un mercado sin depender de líneas dibujadas a mano. Una tendencia alcista muestra máximos crecientes y mínimos crecientes (*higher highs*, *higher lows*); una bajista, máximos y mínimos decrecientes (*lower highs*, *lower lows*). Ver [Tendencias y estructura de mercado](basico/tendencias-y-estructura.md).

**Media móvil (SMA / EMA)**: indicador que promedia el precio de los últimos N periodos, suavizando el ruido para hacer visible la dirección de la tendencia; siempre va con retraso respecto al precio. La SMA (simple) pesa todos los periodos igual; la EMA (exponencial) da más peso a los precios recientes y reacciona antes. Base de construcción de otros indicadores como MACD y Bandas de Bollinger. Ver [Medias móviles](indicadores/medias-moviles.md).

**MFI (Money Flow Index)**: oscilador descrito a menudo como "un RSI ponderado por volumen", que usa la misma fórmula de normalización 0-100 del RSI pero partiendo del precio típico ponderado por volumen en vez de ganancias/pérdidas de precio. Umbrales 80/20 para sobrecompra/sobreventa, iguales que el Estocástico. Ver [Volumen y ATR](indicadores/volumen-y-atr.md).

**Microestructura de mercado**: disciplina que estudia los mecanismos concretos de formación de precios, negociación por libro de órdenes, diferenciales bid-ask, impacto de mercado y slippage en la ejecución real. Ver [Microestructura de mercado](basico/microestructura-mercado.md).

**MinBTL (Minimum Backtest Length)**: concepto de Bailey et al. que establece la longitud mínima de datos históricos necesaria para que, dado un número N de configuraciones de estrategia probadas, el Sharpe ratio in-sample observado sea mínimamente fiable — crece logarítmicamente con N. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Minutes (actas)**: documento con el detalle de la discusión interna de una reunión de política monetaria, publicado semanas después de la decisión (tres semanas en la Fed, cuatro en el BCE). Revelan cuán dividido estaba el comité y qué riesgos concretos se discutieron. Ver [Forward guidance y lectura de comunicados](analisis-fundamental/forward-guidance-y-lectura-de-comunicados.md).

**Momentum**: en el sentido de estrategia cross-sectional (Jegadeesh & Titman, 1993), comprar las acciones que mejor lo han hecho recientemente y vender en corto las que peor lo han hecho, sobre horizontes de formación y mantenimiento de 3 a 12 meses. Es distinto del time-series momentum del trend-following, que mira el signo del propio retorno pasado de cada activo por separado, no comparado contra otros. Ver [Momentum](estrategias/momentum.md) y [Seguimiento de tendencia](estrategias/seguimiento-tendencia.md).

**Monte Carlo (simulación)**: técnica cuantitativa que aplica remuestreo bootstrap (IID o por bloques) sobre el historial de operaciones de un backtest para generar miles de curvas de capital sintéticas, obteniendo distribuciones empíricas de drawdown máximo y riesgo de ruina. Ver [Simulación Monte Carlo](gestion-riesgo/simulacion-monte-carlo.md).

**MQL5**: lenguaje orientado a objetos basado en C++ desarrollado por MetaQuotes para la programación de Expert Advisors (EAs), indicadores y scripts de trading automatizado sobre la plataforma MetaTrader 5. Ver [APIs de datos de mercado y ejecución](infraestructura/apis-datos-mercado.md).

**M-Top / W-Bottom**: patrones de techo doble (M-Top) y suelo doble (W-Bottom) confirmados con Bandas de Bollinger — en el W-Bottom, el segundo mínimo se sostiene por encima de la banda inferior (menos empuje bajista que el primero); en el M-Top, el segundo máximo no llega a tocar la banda superior. Ver [Bandas de Bollinger](indicadores/bollinger.md).

## N

**NFP (Non-Farm Payrolls)**: informe mensual de empleo no agrícola de EE. UU., publicado el primer viernes de cada mes, que combina variación de nóminas, tasa de desempleo y crecimiento salarial en un solo comunicado — uno de los datos de mayor volatilidad inducida del calendario económico. Ver [Indicadores macro clave](analisis-fundamental/indicadores-macro-clave.md).

## O

**OBV (On Balance Volume)**: indicador de volumen desarrollado por Joe Granville que acumula (suma o resta) el volumen de cada periodo según si el cierre subió o bajó respecto al anterior, partiendo de la idea de que el volumen precede al precio. Lo relevante es la dirección de la línea, no su nivel absoluto. Ver [Volumen y ATR](indicadores/volumen-y-atr.md).

**Odds**: en la fórmula de Kelly, el ratio riesgo/beneficio de la apuesta (`B` en `f* = (Bp − q)/B`) — cuánto se gana por unidad arriesgada si sale bien. Ver [Kelly (criterio de)](gestion-riesgo/position-sizing-kelly.md).

**Opening Range Breakout (ORB)**: estrategia intradía que toma el rango de precio de los primeros N minutos de sesión y opera la ruptura de ese rango, asumiendo que el desequilibrio inicial entre oferta y demanda institucional persiste durante el resto de la sesión. Zarattini et al. (2024) muestran que su rentabilidad depende críticamente de filtrar solo acciones con volumen anómalo ("Stocks in Play"). Ver [Ruptura / breakout](estrategias/ruptura-breakout.md).

**Optimal $f$ (Ralph Vince)**: generalización matemática del criterio de Kelly desarrollada por Ralph Vince (1990, 1992) para distribuciones empíricas continuas de trading, calculando la fracción exacta de capital que maximiza el crecimiento geométrico del Terminal Wealth Relative (TWR) por unidad de peor pérdida histórica. Ver [Kelly (criterio de) y el tamaño de posición](gestion-riesgo/position-sizing-kelly.md).

**Orden de mercado / limitada / stop**: los tres tipos básicos de orden. La orden de mercado garantiza ejecución inmediata pero no el precio; la orden limitada garantiza el precio (o mejor) pero no la ejecución; la orden de stop se activa al alcanzar un nivel y se convierte en orden de mercado, usada típicamente para limitar pérdidas. Ver [Estructura de mercado](basico/estructura-mercado.md).

**Ornstein-Uhlenbeck (proceso y half-life)**: ecuación diferencial estocástica que modela series revertientes a la media en pairs trading, permitiendo calcular la vida media ($t_{1/2} = \ln(2)/\theta$) o tiempo característico de convergencia del spread. Ver [Pairs trading](estrategias/pairs-trading.md).

**Osciladores**: familia de indicadores de momentum que se mueven dentro de un rango acotado (típicamente 0-100), lo que permite hablar de niveles de sobrecompra y sobreventa — a diferencia de precio o medias móviles, que no tienen límite. RSI y Estocástico son los dos más usados. Ver [Osciladores](indicadores/osciladores.md).

**Overfitting (sobreajuste)**: fenómeno por el cual, al probar suficientes configuraciones de parámetros sobre los mismos datos, se acaba "encontrando" una estrategia con buen resultado histórico aunque no exista ninguna ventaja real — el Sharpe ratio esperado de la mejor configuración in-sample crece con el número de configuraciones probadas incluso cuando el verdadero Sharpe de todas ellas es cero. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Overnight risk (riesgo overnight)**: el riesgo de mantener una posición abierta mientras el mercado está cerrado, expuesta a gaps por noticias que no se incorporan de forma gradual. Es la diferencia estructural de riesgo entre el swing trading y las estrategias estrictamente intradía. Ver [Swing trading](estrategias/swing-trading.md).

## P

**Pairs trading**: estrategia market-neutral de arbitraje estadístico que explota la divergencia transitoria en el spread de dos activos altamente correlacionados o cointegrados, apostando a su reversión a la media (Gatev-Goetzmann-Rouwenhorst 2006). Ver [Pairs trading](estrategias/pairs-trading.md).

**PBO (Probability of Backtest Overfitting)**: estimación formal, expresada como probabilidad, de cuánto se puede confiar en que el resultado de un backtest concreto sobreviva fuera de muestra, calculada mediante el método CSCV. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Petrodivisa**: moneda de un país cuyas exportaciones dependen en gran medida del petróleo (dólar canadiense, corona noruega, rublo). Muestra correlación negativa fuerte con el par USD correspondiente cuando sube el petróleo, aunque esa relación se ha debilitado desde que EE. UU. se convirtió en exportador neto de energía. Ver [Correlaciones entre activos](analisis-fundamental/correlaciones-entre-activos.md).

**PIB (Producto Interior Bruto)**: valor total de bienes y servicios producidos dentro de un país, publicado trimestralmente. Es un indicador retrasado (lagging) — se calcula sobre actividad ya ocurrida y llega con semanas o meses de retraso, a diferencia del PMI, que lo anticipa. Ver [Indicadores macro clave](analisis-fundamental/indicadores-macro-clave.md).

**PMI (Purchasing Managers' Index)**: indicador basado en encuestas mensuales a gerentes de compras del sector privado, en escala 0-100 donde por encima de 50 indica expansión respecto al mes anterior y por debajo, contracción. Es un indicador adelantado (leading) que suele anticipar giros en PIB y empleo con varios meses de antelación. Ver [Indicadores macro clave](analisis-fundamental/indicadores-macro-clave.md).

**Posición corta (short selling)**: vender un valor que no se posee (tomado prestado del bróker) con la expectativa de recomprarlo más barato; si el precio sube en vez de bajar, la pérdida es en teoría ilimitada. Ver [Estructura de mercado](basico/estructura-mercado.md).

**Posición larga**: poseer un activo con la expectativa de que suba de precio — la posición direccional más básica. Ver [Estructura de mercado](basico/estructura-mercado.md).

**PPO (Percentage Price Oscillator)**: versión normalizada del MACD (en porcentaje en vez de en unidades absolutas de precio), que sí permite comparar el momentum de activos con precios muy distintos entre sí, algo que el MACD no puede hacer directamente. Ver [MACD](indicadores/macd.md).

**Profit Factor**: ratio entre las ganancias brutas acumuladas y las pérdidas brutas acumuladas (`PF = Σ Ganancias / Σ Pérdidas`). Valores superiores a 1.5 indican un sistema robusto, siempre que no dependa de pocos eventos aislados. Ver [Métricas cuantitativas de rendimiento](estrategias/metricas-rendimiento.md).

**Prospect Theory**: teoría económica conductual (Kahneman & Tversky, 1979) que demuestra que los individuos evalúan decisiones en términos de ganancias y pérdidas relativas a un punto de referencia, experimentando la aversión a la pérdida con una intensidad ~2.25 veces mayor que una ganancia equivalente. Ver [Sesgos cognitivos y psicología de trading](basico/sesgos-cognitivos-trading.md).

**Pull-back**: retroceso de corto plazo dentro de una tendencia mayor, que el swing trading busca aprovechar como punto de entrada a favor de la tendencia de fondo, en vez de mantener la posición de forma continua como un sistema de trend-following puro. Ver [Swing trading](estrategias/swing-trading.md).

**Pyramiding**: técnica de escalado (scaling in) consistente en añadir tramos a una posición ganadora existente a medida que la tendencia confirma la dirección original, manteniendo el riesgo total acotado. Ver [Gestión de operaciones en vivo](gestion-riesgo/gestion-operaciones-vivo.md).

## R

**R (R-multiple)**: unidad de medida de resultado de una operación expresada como múltiplo del riesgo asumido en ella (1R = lo que se arriesga hasta el stop loss). Permite comparar el resultado de operaciones de tamaño y activo distintos en una misma escala. Ver [Expectativa y ratio R:R](gestion-riesgo/expectativa-y-ratio-rr.md).

**Ratio de Calmar**: ver **Calmar (ratio)**. Ver [Métricas cuantitativas de rendimiento](estrategias/metricas-rendimiento.md) y [Drawdown](gestion-riesgo/drawdown.md).

**Ratio riesgo/beneficio (R:R)**: relación entre lo que se arriesga (distancia al stop loss) y lo que se espera ganar (distancia al take profit o ganancia media realizada) en una operación. Conviene distinguir el R:R planificado (parámetro de diseño) del R:R realizado (resultado real, que puede diferir por trailing stops o slippage). Ver [Expectativa y ratio R:R](gestion-riesgo/expectativa-y-ratio-rr.md).

**Rechazo y rotura**: los dos desenlaces posibles cuando el precio llega a un nivel de soporte o resistencia. El rechazo confirma que el bando que defiende el nivel sigue teniendo el control (el precio rebota); la rotura señala que el bando contrario ha ganado el pulso. Un nivel roto tiende a cambiar de función (soporte roto pasa a resistencia, y viceversa). Ver [Soporte y resistencia](basico/soporte-y-resistencia.md).

**Regímenes de mercado**: estados estadísticos latentes en los que el mercado exhibe comportamientos diferenciados de retorno, volatilidad y autocorrelación (bull, bear, rango lateral, crisis/crash). Ver [Regímenes de mercado y detección de régimen](estrategias/regimenes-mercado.md).

**Renko**: tipo de gráfico de origen japonés donde los "ladrillos" solo se dibujan cuando el precio se mueve una cantidad fija, ignorando el tiempo por completo — filtra el ruido lateral a costa de perder la noción de cuándo ocurrió cada movimiento. Ver [Tipos de gráfico](basico/tipos-grafico.md).

**Reversión a la media**: en el sentido de estrategia de selección de acciones (Lakonishok, Shleifer & Vishny), comprar empresas "value" (baratas respecto a sus fundamentales) y evitar las "glamour" (caras), apostando a que el mercado extrapola en exceso el pasado reciente de una empresa y esa extrapolación se revierte. Es la lógica opuesta al momentum, y opera en horizontes de varios años. Ver [Reversión a la media](estrategias/reversion-media.md).

**Riesgo de cartera**: el riesgo total de varias posiciones simultáneas, que no es la simple suma de sus riesgos individuales salvo que sean estadísticamente independientes — depende de la correlación entre ellas (`riesgo = w·S·w'`). Posiciones correlacionadas positivamente pueden ser, en la práctica, una única apuesta más grande disfrazada de cartera diversificada. Ver [Riesgo de cartera](gestion-riesgo/riesgo-de-cartera.md).

**Riesgo de ruina (risk of ruin)**: probabilidad de que una estrategia repetida muchas veces acabe agotando el capital (o una parte inaceptable de él) antes de que su edge estadístico tenga oportunidad de manifestarse, incluso con expectativa positiva. Es extremadamente sensible al tamaño de posición (crece de forma no lineal) y a un ratio riesgo/beneficio alto con winrate proporcionalmente bajo, para una misma expectativa. Ver [Riesgo de ruina](gestion-riesgo/riesgo-de-ruina.md).

**Risk-on / Risk-off**: los dos modos dominantes de comportamiento inversor agregado. En risk-on el mercado tiene apetito por el riesgo (suben índices, cripto, divisas cíclicas); en risk-off huye hacia la seguridad (oro, bonos soberanos, JPY, CHF, USD) — el fenómeno de fondo se llama "flight to quality/safety". Ver [Correlaciones entre activos](analisis-fundamental/correlaciones-entre-activos.md).

**Risk overlay**: capa adicional de gestión de riesgo, externa a la lógica de entrada/salida de cada estrategia individual, que recalcula el riesgo de la cartera bajo un supuesto de peor caso de correlación (todas las posiciones moviéndose igual) y recorta tamaño si ese riesgo supera un múltiplo del objetivo. Ver [Riesgo de cartera](gestion-riesgo/riesgo-de-cartera.md).

**RSI (Relative Strength Index)**: oscilador de momentum desarrollado por J. Welles Wilder que mide la velocidad y magnitud de los cambios de precio en una escala 0-100, mediante la relación entre ganancia media y pérdida media de los últimos 14 periodos. Sobrecompra por encima de 70, sobreventa por debajo de 30; funciona mejor en mercados en rango que en tendencias fuertes sostenidas. Ver [Osciladores](indicadores/osciladores.md).

## S

**Scaling in / Scaling out**: gestión de posición por tramos. *Scaling in* añade exposición conforme se confirma la tendencia (ver Pyramiding); *scaling out* toma beneficios parciales en objetivos fijos mientras deja correr una parte con trailing stop. Ver [Gestión de operaciones en vivo](gestion-riesgo/gestion-operaciones-vivo.md).

**Scalping**: la operativa de plazo más corto, con entradas y salidas de segundos a pocos minutos buscando movimientos de precio muy pequeños repetidos muchas veces. El coste de transacción (spread, comisión, slippage) es la variable dominante que determina si puede funcionar en absoluto, porque no se reduce en la misma proporción que el movimiento esperado al acortar el horizonte. Ver [Scalping](estrategias/scalping.md).

**SEP / Dot plot**: el *Summary of Economic Projections* que la Fed publica en cuatro de sus ocho reuniones anuales, con las proyecciones de PIB, desempleo e inflación de cada miembro y su expectativa individual de tipos futuros (el "dot plot"). Ver [Bancos centrales](analisis-fundamental/bancos-centrales.md).

**Sesgos cognitivos**: desviaciones sistemáticas del juicio racional en trading (confirmación, anclaje, exceso de confianza, recencia) que llevan a violar el plan de trading. Los algoritmos automatizados actúan como antídoto disciplinario siempre que el diseñador no sobreajuste el sistema. Ver [Sesgos cognitivos y psicología de trading](basico/sesgos-cognitivos-trading.md).

**Sharpe (ratio)**: medida estándar de rendimiento ajustado a riesgo calculada como el exceso de retorno sobre la tasa libre de riesgo dividido entre la desviación estándar total (`Sharpe = (Rp - Rf) / σ`). Penaliza por igual volatilidad alcista y bajista. Ver [Métricas cuantitativas de rendimiento](estrategias/metricas-rendimiento.md).

**Slippage**: diferencia entre el precio al que se decide ejecutar una orden y el precio al que realmente se ejecuta. En scalping puede por sí solo consumir todo el margen de beneficio esperado de una operación; un backtest que no lo modela de forma realista sobreestima sistemáticamente el resultado. Ver [Scalping](estrategias/scalping.md), [Microestructura de mercado](basico/microestructura-mercado.md) y [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**SMA (media móvil simple)**: promedio aritmético directo de los últimos N cierres, con el mismo peso para todos los periodos. Reacciona más lento que la EMA pero suele funcionar mejor como referencia de soporte/resistencia. Ver [Medias móviles](indicadores/medias-moviles.md).

**Sobrecompra / Sobreventa**: niveles de un oscilador (RSI por encima de 70, Estocástico o MFI por encima de 80 para sobrecompra; simétricamente por debajo para sobreventa) que indican un movimiento de precio extendido. No es sinónimo de "vender/comprar ya": en tendencias fuertes el oscilador puede mantenerse en sobrecompra o sobreventa mucho tiempo sin que el precio revierta. Ver [Osciladores](indicadores/osciladores.md).

**Soporte y resistencia**: niveles de precio donde la demanda (soporte) o la oferta (resistencia) tienden a desequilibrarse de forma predecible, frenando una caída o una subida. No son barreras físicas sino zonas de memoria de mercado explicadas por el clustering de órdenes stop-loss y take-profit (Carol Osler). Ver [Soporte y resistencia](basico/soporte-y-resistencia.md).

**Sorpresa (vs. consenso)**: la diferencia entre un dato macro publicado y lo que el mercado esperaba (forecast/consensus) — es la sorpresa, no el nivel absoluto del dato, lo que realmente mueve el precio tras una publicación. Ver [Calendario económico](analisis-fundamental/calendario-economico.md).

**Sortino (ratio)**: métrica de rendimiento ajustado a riesgo calculada dividiendo el exceso de retorno entre la desviación estándar a la baja (*downside deviation*), evitando penalizar la volatilidad generada por ganancias. Ver [Métricas cuantitativas de rendimiento](estrategias/metricas-rendimiento.md).

**Spread**: diferencia entre el precio de compra (bid) y venta (ask/offer) de un instrumento — un coste de transacción implícito que tiende a ampliarse en momentos de baja liquidez o alta volatilidad, justo cuando más perjudica a estrategias de rotación alta como el scalping. Ver [Scalping](estrategias/scalping.md) y [Microestructura de mercado](basico/microestructura-mercado.md).

**Statement (comunicado)**: el texto oficial de una decisión de política monetaria, cuyo lenguaje se compara frase por frase con el comunicado anterior para detectar cambios de tono (hawkish/dovish, balance de riesgos, horizonte temporal). Ver [Forward guidance y lectura de comunicados](analisis-fundamental/forward-guidance-y-lectura-de-comunicados.md).

**Stocks in Play**: concepto de Zarattini et al. (2024) para acciones con actividad de negociación inusualmente alta en un día concreto, normalmente por un catalizador fundamental — medido con el volumen relativo. Filtrar solo estas acciones es lo que convierte el ORB de una estrategia mediocre en una con Sharpe de 2,81. Ver [Ruptura / breakout](estrategias/ruptura-breakout.md).

**Stop loss / Take profit**: el stop loss es el nivel de precio en el que se cierra una posición para limitar la pérdida; el take profit, el nivel en el que se cierra para asegurar la ganancia objetivo. La distancia a cada uno define el ratio riesgo/beneficio de la operación. Ver [Expectativa y ratio R:R](gestion-riesgo/expectativa-y-ratio-rr.md).

**Survivorship bias (sesgo de supervivencia)**: construir el universo de prueba de un backtest solo con activos que siguen existiendo hoy, excluyendo los que quebraron o fueron deslistados, lo que infla artificialmente el rendimiento medio. El estudio del ORB de Zarattini et al. es citado como ejemplo de muestra explícitamente libre de este sesgo. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Swing trading**: operativa de plazo intermedio (de días a semanas) que busca capturar un tramo de precio concreto —dentro de una tendencia mayor o de un rango lateral— apoyándose en análisis técnico de soporte/resistencia y patrones de gráfico. A diferencia de estrategias intradía, asume riesgo overnight. Ver [Swing trading](estrategias/swing-trading.md).

## T

**Tasa de paro / participación / U-6**: la tasa de paro mide quienes buscan empleo activamente como % de la fuerza laboral, pero puede bajar simplemente porque gente abandona la búsqueda (no por creación real de empleo) — de ahí la importancia de mirar en paralelo la tasa de participación laboral y la tasa U-6 (que añade subempleo por razones económicas y desanimados recientes) para una foto más completa. Ver [Indicadores macro clave](analisis-fundamental/indicadores-macro-clave.md).

**Tendencia primaria, secundaria y menor**: la clasificación de la Dow Theory del movimiento de precio en tres escalas anidadas simultáneas — primaria (meses/años, dirección de fondo), secundaria (semanas/meses, correcciones del 33%-67% de la primaria) y menor (horas/días, ruido). Un activo puede estar en tendencia secundaria bajista dentro de una tendencia primaria alcista intacta, y ambas lecturas son correctas a la vez. Ver [Tendencias y estructura de mercado](basico/tendencias-y-estructura.md).

**Theta ($\Theta$)**: sensibilidad de una opción que cuantifica la pérdida de valor de la prima por el paso del tiempo (*time decay*). Ver [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

**Trailing stop**: orden de stop loss dinámico que se desplaza automáticamente siguiendo al precio en dirección favorable a una distancia fija, en múltiplos de ATR o siguiendo estructuras de swing highs/lows, bloqueando beneficios. Ver [Gestión de operaciones en vivo](gestion-riesgo/gestion-operaciones-vivo.md).

**Trend-following (seguimiento de tendencia)**: familia de estrategias que compra activos que han subido recientemente y vende en corto los que han bajado, apostando a que la tendencia continúa. La versión académica de time-series momentum (AQR/Hurst-Ooi-Pedersen) muestra 137 años de rentabilidad consistente y un perfil de "sonrisa" que rinde especialmente bien en extremos de mercado (grandes subidas y grandes caídas). Ver [Seguimiento de tendencia](estrategias/seguimiento-tendencia.md).

**True Range (TR)**: el mayor de tres valores — máximo menos mínimo del periodo actual, o la diferencia absoluta entre el máximo/mínimo actual y el cierre anterior — usado para capturar la volatilidad real incluyendo gaps, base de cálculo del ATR y del ADX. Ver [Volumen y ATR](indicadores/volumen-y-atr.md).

## V

**VaR (Value-at-Risk)**: medida de riesgo que estima la pérdida máxima esperada con un nivel de confianza dado (p. ej. 95%) en un horizonte determinado, sin decir cuánto se podría perder más allá de ese umbral (a diferencia del Expected Shortfall). Ver [Drawdown](gestion-riesgo/drawdown.md).

**Vega ($\nu$)**: sensibilidad que mide la variación en la prima de una opción ante un cambio del 1% en la volatilidad implícita del subyacente. Ver [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

**Vela japonesa (candlestick)**: forma más habitual de representar el precio en un gráfico de trading, resumiendo apertura, máximo, mínimo y cierre (OHLC) de un periodo en un cuerpo (relación apertura-cierre) y sombras (rango del periodo). Su valor está en confirmar (o contradecir) otras herramientas de análisis, no como señal aislada. Ver [Velas japonesas](basico/velas-japonesas.md).

**VIX (Cboe Volatility Index)**: índice que mide la expectativa de volatilidad a 30 días vista del S&P 500 derivada de precios de opciones OTM. Actúa como indicador de sentimiento ("índice del miedo") y filtro de régimen macroeconómico. Ver [Volatilidad implícita y VIX](indicadores/volatilidad-implicita-vix.md).

**Volatilidad implícita (IV)**: expectativa de volatilidad futura proyectada por el mercado e incorporada en los precios de las opciones financieras, a diferencia de la volatilidad histórica o realizada que mide el pasado. Ver [Volatilidad implícita y VIX](indicadores/volatilidad-implicita-vix.md) y [Opciones — fundamentos y modelo Black-Scholes](basico/opciones-fundamentos.md).

**Volumen relativo**: el volumen negociado en una ventana concreta (p. ej. los primeros 5 minutos de sesión) dividido entre la media de ese mismo volumen en los días previos. Es la métrica clave del estudio de Zarattini et al. para identificar "Stocks in Play" y filtrar señales de ORB de baja calidad. Ver [Ruptura / breakout](estrategias/ruptura-breakout.md).

## W

**Walk-forward analysis**: método de validación que optimiza los parámetros de una estrategia sobre una ventana de datos, evalúa el resultado sobre la ventana siguiente (nunca vista en esa optimización), desliza la ventana hacia adelante y repite — el estándar práctico de la industria para comprobar que una ventaja sobrevive fuera de muestra de forma repetida, no solo una vez. Ver [Backtesting y validación](estrategias/backtesting-y-validacion.md).

**Whipsaw**: sucesión de señales falsas en direcciones opuestas en poco tiempo, típica de aplicar indicadores de tendencia (cruces de medias móviles, cruces de línea central del MACD, cruces +DI/-DI) en mercados sin tendencia clara o laterales. Ver [ADX y Directional Movement](indicadores/adx-dmi.md) y [MACD](indicadores/macd.md).

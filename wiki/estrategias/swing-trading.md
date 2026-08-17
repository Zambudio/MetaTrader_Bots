---
tags: [estrategias, swing-trading, analisis-tecnico, soporte-resistencia, overnight-risk]
updated: 2026-08-16
fuentes: [raw/estrategias/lo-mamaysky-wang-2000-foundations-technical-analysis.pdf]
---

# Swing trading

## Qué es

El swing trading es la operativa de plazo intermedio: posiciones que se mantienen desde un par de días hasta unas pocas semanas, buscando capturar un "swing" (oscilación) de precio concreto — ya sea un tramo dentro de una tendencia mayor (un pull-back que termina y el precio retoma la dirección principal), o un movimiento completo dentro de un rango lateral (de soporte a resistencia y vuelta). A diferencia del [scalping](scalping.md) o el [breakout intradía](ruptura-breakout.md), sí asume riesgo overnight (mantener la posición abierta mientras el mercado está cerrado); a diferencia del [seguimiento de tendencia](seguimiento-tendencia.md) sistemático de largo plazo o el value investing de [reversión a la media](reversion-media.md), no pretende capturar el movimiento completo de meses o años, sino un tramo concreto y más corto dentro de él.

Operativamente, el swing trading se apoya casi siempre en análisis técnico visual: identificar niveles de soporte y resistencia, patrones de gráfico (rangos, banderas, dobles techos/suelos, formaciones de giro), y usar esos niveles como referencia de entrada, salida y stop loss. Es, en este sentido, la aplicación más directa y clásica del análisis chartista clásico — el terreno donde nació buena parte de la terminología de "soporte", "resistencia" y "patrón de precio".

## Relación con seguimiento de tendencia y soporte/resistencia

El swing trading no es una filosofía opuesta al trend-following, sino un nivel de zoom distinto sobre la misma idea. Un sistema de [seguimiento de tendencia](seguimiento-tendencia.md) puro entra y mantiene la posición mientras dure la tendencia detectada, sin intentar cronometrar los altibajos dentro de ella. Un swing trader, en cambio, puede compartir la misma lectura direccional de fondo (operar solo a favor de la tendencia mayor) pero busca entrar específicamente en los "valles" de esa tendencia — tras un retroceso (pull-back) hacia un nivel de soporte, con el stop ajustado y el objetivo puesto en el siguiente máximo — en vez de mantener la posición de forma continua. Esto reduce el tiempo de exposición al mercado y puede mejorar el ratio riesgo/beneficio de cada entrada individual, a cambio de exigir más decisiones de timing (y por tanto más superficie para el error humano o el sobreajuste).

Cuando no hay una tendencia mayor clara y el precio oscila lateralmente entre dos niveles, el swing trading se convierte en una estrategia de rango: comprar cerca del soporte, vender cerca de la resistencia, en la lógica de que esos niveles seguirán conteniendo el precio hasta que se produzca una ruptura genuina (momento en el que la operativa pasa a ser la de [ruptura-breakout.md](ruptura-breakout.md)).

## La fuente: Lo, Mamaysky & Wang (2000) — validación estadística del análisis técnico

*Foundations of Technical Analysis: Computational Algorithms, Statistical Inference, and Empirical Implementation* (Andrew W. Lo, Harry Mamaysky y Jiang Wang, MIT Sloan / NBER Working Paper 7613, publicado en *The Journal of Finance*, 2000) es el intento académico más riguroso de responder a una pregunta que durante décadas separó al análisis técnico ("chartismo") de las finanzas académicas: ¿contienen los patrones de gráfico información real, o son formas arbitrarias que el ojo humano proyecta sobre ruido aleatorio? El propio paper cita que, hasta ese momento, el análisis técnico había sido comparado por algunos académicos con la astrología, y descrito por Burton Malkiel (*A Random Walk Down Wall Street*) como algo que "debe compartir pedestal con la alquimia" bajo escrutinio científico.

### Metodología

Los autores resuelven el problema de la subjetividad del chartismo (que un patrón "se vea" en un gráfico depende del ojo de quien mira) con un algoritmo automático de reconocimiento de patrones basado en **regresión kernel no paramétrica**: una técnica de suavizado estadístico que identifica los máximos y mínimos locales relevantes de una serie de precios, filtrando el ruido de corto plazo, y detecta de forma objetiva y reproducible la presencia de diez patrones técnicos clásicos: hombro-cabeza-hombro (y su inversa), techos y suelos en ensanche (*broadening tops/bottoms*), techos y suelos en triángulo, techos y suelos rectangulares, y techos y suelos dobles.

Aplican este algoritmo a los retornos diarios de una muestra amplia de acciones de NYSE/AMEX y Nasdaq entre **1962 y 1996** (34 años), usando datos del CRSP (Center for Research in Securities Prices). Para cada patrón detectado, comparan la distribución de retornos *condicionada* a la aparición de ese patrón frente a la distribución *incondicional* (el comportamiento normal de esa acción) — si el análisis técnico no aporta información real, ambas distribuciones deberían ser estadísticamente indistinguibles.

### Resultado principal

No lo son. Usando pruebas de bondad de ajuste y de Kolmogorov-Smirnov, los autores encuentran diferencias estadísticamente significativas entre la distribución condicionada y la incondicional para varios de los diez patrones — con resultados especialmente contundentes en acciones del Nasdaq, donde los diez patrones resultan significativos al 5% (varios con un p-valor prácticamente nulo), y resultados más mixtos pero todavía mayoritariamente significativos en NYSE/AMEX (siete de diez patrones significativos en la prueba de bondad de ajuste). Los autores contrastan además la frecuencia de aparición de estos patrones en los datos reales frente a una simulación de precios puramente aleatoria (movimiento browniano geométrico calibrado a la misma media y volatilidad) y encuentran diferencias sustanciales: por ejemplo, los patrones hombro-cabeza-hombro aparecen casi el triple de veces en los datos reales que en la simulación aleatoria equivalente.

Conclusión explícita y matizada de los autores: "varios indicadores técnicos sí proporcionan información incremental y pueden tener cierto valor práctico" — pero inmediatamente aclaran que esto **no implica necesariamente que el análisis técnico pueda usarse para generar beneficios "en exceso"** de trading; el hallazgo es sobre contenido informativo estadístico, no una prueba directa de rentabilidad neta de costes.

## Por qué es relevante para el swing trading

El paper es, en esencia, la validación más rigurosa disponible de la premisa sobre la que se construye el swing trading técnico: que los patrones de precio formados a lo largo de varios días o semanas (la ventana de suavizado usada por el algoritmo opera sobre historiales de precio de varias semanas, no de minutos) contienen señal genuina más allá del azar, en vez de ser pura ilusión de patrón. Esto no valida ninguna estrategia de swing trading concreta (el paper mide contenido informativo estadístico, no el resultado neto de una estrategia con stops, comisiones y position sizing reales), pero sí da soporte académico a la idea de que "leer" soportes, resistencias y formaciones de giro en gráficos diarios no es, como sugería Malkiel, un ejercicio equivalente a la alquimia.

## Gestión de riesgo típica: overnight y weekend risk

La diferencia de riesgo estructural más importante entre el swing trading y las estrategias estrictamente intradía ([scalping](scalping.md), [ORB](ruptura-breakout.md)) es que el swing trader mantiene la posición abierta mientras el mercado está cerrado — por la noche, y sobre todo durante el fin de semana en instrumentos que cierran (acciones, muchos índices). Durante ese tiempo pueden producirse noticias, resultados empresariales, decisiones de bancos centrales o eventos geopolíticos que el mercado no puede incorporar de forma gradual porque no hay negociación: el precio "salta" (gap) directamente al nivel que refleja la nueva información en la siguiente apertura, sin que el trader tenga oportunidad de reaccionar o de que su stop loss se ejecute al nivel exacto donde lo colocó.

Esto tiene dos implicaciones prácticas directas para el position sizing en swing trading:

- **El stop loss teórico no es una garantía de pérdida máxima**: un gap en contra puede ejecutar la salida muy por debajo (o por encima) del nivel del stop, especialmente relevante en cuentas apalancadas como las de CFDs o forex, donde un gap grande puede generar una pérdida bastante mayor a la planeada en R (ver [expectativa y ratio R:R](../gestion-riesgo/expectativa-y-ratio-rr.md)).
- **El riesgo agregado de la cartera debe contar el tiempo de exposición**, no solo el tamaño de cada posición: mantener varias posiciones de swing simultáneas durante el mismo fin de semana concentra el riesgo de gap en un único evento (p. ej. una sorpresa macro del lunes) de una forma que no ocurre en estrategias intradía, donde cada posición se cierra antes del cierre del mercado — el mismo tipo de razonamiento sobre rachas de pérdidas correlacionadas que se trata en [drawdown.md](../gestion-riesgo/drawdown.md).

La práctica habitual para mitigar esto es dimensionar la posición asumiendo una distancia de stop más generosa que en intradía (para dar margen al ruido normal de varios días) y ser consciente de eventos calendarizados conocidos (publicación de resultados, reuniones de bancos centrales — ver [calendario económico](../analisis-fundamental/calendario-economico.md)) que caen dentro de la ventana de mantenimiento prevista, reduciendo tamaño o evitando la entrada si el evento es de alto impacto y ocurre con el mercado cerrado.

## Consideraciones prácticas

- **Horizonte**: de un par de días a varias semanas — más corto que el momentum cross-sectional de Jegadeesh-Titman (3-12 meses, ver [momentum.md](momentum.md)) y mucho más corto que el value investing de [reversion-media.md](reversion-media.md) (varios años), pero mucho más largo que el [scalping](scalping.md) o el [ORB intradía](ruptura-breakout.md).
- **Dependencia del contexto de tendencia**: como en el trend-following, el swing trading tiende a funcionar peor en mercados extremadamente erráticos o sin estructura de rango/tendencia reconocible — si no hay niveles de soporte/resistencia fiables ni una tendencia de fondo, la premisa técnica sobre la que se apoya pierde fuerza.
- **Riesgo overnight como coste real, no solo teórico**: cualquier evaluación de una estrategia de swing trading debería incorporar el coste esperado del riesgo de gap (no solo el spread y la comisión) al comparar su rentabilidad esperada con la de una estrategia estrictamente intradía.

## Relación con otras páginas de la wiki

- Complementa a [seguimiento-tendencia.md](seguimiento-tendencia.md): comparte la lógica de operar a favor de la tendencia de fondo, pero en un horizonte de entrada/salida mucho más táctico.
- Es la contrapartida de plazo intermedio entre el [scalping](scalping.md)/[ruptura-breakout.md](ruptura-breakout.md) (intradía, sin riesgo overnight) y el [momentum](momentum.md)/[reversion-media.md](reversion-media.md) (meses/años, sin gestión activa de niveles de soporte-resistencia).
- La gestión del riesgo overnight se apoya en los conceptos generales de [expectativa y ratio R:R](../gestion-riesgo/expectativa-y-ratio-rr.md) y [drawdown](../gestion-riesgo/drawdown.md).
- Los niveles que el swing trading usa como referencia de entrada/salida se explican desde cero en [soporte y resistencia](../basico/soporte-y-resistencia.md).
- Para el timing dentro de un pull-back hacia el soporte (entrar cerca del "valle" en vez de en cualquier punto), los [osciladores RSI y Estocástico](../indicadores/osciladores.md) son la herramienta habitual para identificar zonas de sobreventa/sobrecompra locales dentro de la tendencia mayor.

## Fuentes

- [Lo, Mamaysky & Wang — Foundations of Technical Analysis: Computational Algorithms, Statistical Inference, and Empirical Implementation (NBER Working Paper 7613 / Journal of Finance, 2000)](../raw/estrategias/lo-mamaysky-wang-2000-foundations-technical-analysis.pdf) — la validación estadística de patrones de gráfico clásicos en la que se apoya toda esta página.

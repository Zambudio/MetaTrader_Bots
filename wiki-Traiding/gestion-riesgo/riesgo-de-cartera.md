---
tags: [gestion-riesgo, correlacion, exposicion-neta, apalancamiento, cartera, margen]
updated: 2026-08-16
fuentes: [raw/gestion-riesgo/rob-carver-risk-overlay.md, raw/gestion-riesgo/rob-carver-how-much-risk.md]
---

# Riesgo de cartera: gestionar varias posiciones simultáneas

## Qué es y por qué "sumar el riesgo por operación" no basta

Las páginas de [position-sizing-kelly.md](position-sizing-kelly.md), [riesgo-de-ruina.md](riesgo-de-ruina.md) y [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md) tratan el dimensionamiento de **una** posición aislada. En cuanto un EA — o un conjunto de EAs — puede tener varias posiciones abiertas a la vez, aparece una pregunta distinta: ¿cuál es el riesgo **total** de la cartera en ese momento?

La respuesta ingenua — sumar el riesgo asignado a cada posición individual (1% + 1% + 1% = 3% de riesgo total) — solo es correcta si esas posiciones son estadísticamente independientes. En la práctica casi nunca lo son: dos posiciones en pares de divisas que comparten una misma divisa (EUR/USD y GBP/USD comparten el USD), dos instrumentos que reaccionan al mismo factor macro (tipos de interés, apetito de riesgo global), o simplemente varias estrategias que tienden a entrar y salir en los mismos momentos de mercado, se mueven **juntas**. Cuando eso ocurre, el riesgo real de la cartera puede ser sustancialmente mayor (si las posiciones están correlacionadas en la misma dirección) o menor (si se compensan) que la simple suma aritmética.

## La matemática: por qué la correlación cambia el riesgo total (wSw')

Rob Carver, en el contexto de gestión de riesgo para carteras sistemáticas de futuros, formaliza el riesgo total de una cartera con la fórmula estándar de varianza de cartera de Markowitz:

```
riesgo de cartera = w · S · w'
```

donde `w` es el vector de pesos (posición de cada instrumento como % del capital) y `S` es la matriz de covarianzas — construida a partir de la volatilidad de cada instrumento y de la correlación entre cada par de instrumentos.

Para el caso más simple e ilustrativo — dos posiciones del mismo tamaño `w` y la misma volatilidad `σ`, con correlación `ρ` entre ambas — esta fórmula se reduce a:

```
riesgo conjunto = w·σ·√(2·(1+ρ))
```

frente a `w·σ` que sería el riesgo de una sola posición. Esto da tres casos de referencia muy intuitivos:

- **`ρ = +1`** (correlación perfecta, se mueven siempre juntas): el riesgo conjunto es exactamente **2×** el de una sola posición — dos "apuestas" que en la práctica son una sola apuesta del doble de tamaño.
- **`ρ = 0`** (independientes): el riesgo conjunto es **√2 ≈ 1.41×** — hay diversificación real, el riesgo crece menos que proporcionalmente al añadir la segunda posición.
- **`ρ = -1`** (correlación perfectamente negativa, se compensan): el riesgo conjunto es **0** — las posiciones se cancelan entre sí.

Generalizando a `n` posiciones del mismo tamaño y la misma correlación media `ρ` entre todas ellas, el riesgo conjunto es `w·σ·√(n + n(n-1)·ρ)`. Por ejemplo, con `n = 3` posiciones de 1% de riesgo cada una y una correlación media realista de `ρ = 0.7` (razonable para tres pares con USD en el mismo lado, ver más abajo), el riesgo conjunto es `√(3 + 6×0.7) = √7.2 ≈ 2.68` — es decir, un riesgo efectivo cercano al 2.7%, mucho más parecido a la suma ingenua (3%) que a lo que sugeriría asumir independencia (`√3 ≈ 1.73%`). Cuanto más alta la correlación entre las posiciones, más se acerca el riesgo real a una simple suma — y en el límite (`ρ = 1`), a superarla ligeramente en términos relativos por posición si además el tamaño de cada pata es distinto.

## Exposición neta por divisa o activo subyacente

Esta es la aplicación más directa y menos intuitiva del punto anterior en forex: cada par de divisas es, en realidad, dos apuestas simultáneas — una larga en la divisa base y otra corta en la divisa cotizada (o viceversa si la posición es corta). Estar largo en EUR/USD es estar largo en EUR y corto en USD. Estar largo en GBP/USD es estar largo en GBP y corto en USD. Estar largo en AUD/USD es estar largo en AUD y corto en USD.

Si un EA (o un conjunto de EAs) abre las tres posiciones a la vez con 1% de riesgo cada una, sobre el papel parece una cartera diversificada de tres apuestas distintas. En términos de exposición neta por divisa, sin embargo, es:

- Exposición larga en EUR, GBP y AUD por separado (moderada en cada una).
- Exposición **corta neta en USD equivalente a la suma de las tres** — la misma divisa en el lado corto de las tres operaciones.

Es, en la práctica, una única apuesta concentrada contra el dólar aproximadamente tres veces más grande que cualquiera de las patas individuales — no tres apuestas independientes — precisamente porque EUR, GBP y AUD frente al USD comparten un factor común muy fuerte (política monetaria de la Fed, apetito de riesgo global, el índice DXY como proxy). El cálculo de `wSw'` de la sección anterior es exactamente la forma correcta de cuantificar cuánto se acerca esa "cartera de tres pares" a ser, en efecto, una sola posición de mayor tamaño. Ver [correlaciones-entre-activos.md](../analisis-fundamental/correlaciones-entre-activos.md) para el detalle de por qué el DXY y estos pares se mueven juntos, y para tablas de correlación concretas entre pares mayores que comparten contra-divisa.

**Práctica recomendada**: antes de sumar el riesgo nominal por operación entre posiciones simultáneas, descompón cada posición en su exposición por divisa (o activo subyacente) y suma esas exposiciones netas, divisa por divisa. Un EA — o un conjunto de EAs — que opera varios pares o instrumentos debería llevar esta cuenta agregada, no solo el riesgo por operación individual.

## Apalancamiento agregado

El mismo problema aparece con el apalancamiento. El artículo de Rob Carver usado en [expectativa-y-ratio-rr.md](expectativa-y-ratio-rr.md) conecta el apalancamiento de una posición con el riesgo objetivo (`risk target = apalancamiento × riesgo del instrumento`) y sugiere un límite de apalancamiento "seguro" en torno a **2.17x** para poder sobrevivir a un crash del estilo de 1987 (caída del 23%) sin perder más de aproximadamente la mitad de la cuenta.

Ese límite tiene sentido para una sola posición o para la exposición nocional total — pero deja de ser útil si se aplica solo posición por posición sin sumar. Cinco posiciones al 2x de apalancamiento cada una, si están abiertas simultáneamente y correlacionadas, no son "cinco veces seguras": la exposición nocional total de la cartera puede superar con creces cualquier límite razonable, aunque cada posición individual respete su propio límite. El apalancamiento agregado relevante es:

```
apalancamiento agregado = Σ (exposición nocional de cada posición abierta) / capital de la cuenta
```

y es ese número — no el apalancamiento de la posición más reciente — el que hay que comparar contra un límite de seguridad tipo el de Carver.

## Por qué el margen disponible no es lo mismo que el riesgo real

Un error común, especialmente en brókeres retail con apalancamiento alto (30:1, 100:1 o más), es confundir "tengo margen libre disponible" con "puedo permitirme este riesgo". Son dos cosas completamente distintas:

- El **margen** es el colateral que exige el bróker para mantener una posición abierta — una función mecánica del apalancamiento ofrecido y del tamaño nocional de la posición. Con apalancamiento alto, el margen requerido es una fracción minúscula del valor nocional operado.
- El **riesgo real** es cuánto se puede perder — una función de la distancia al stop loss, el tamaño de posición en unidades monetarias, y (como se ha visto en las dos secciones anteriores) la correlación con el resto de posiciones abiertas.

Es perfectamente posible tener muchísimo margen libre disponible en la cuenta (porque el bróker permite un apalancamiento nominal enorme) mientras se está asumiendo un riesgo real muy superior al que uno cree, precisamente por no haber sumado la exposición correlacionada de varias posiciones. El margen disponible informa de cuántas posiciones más *puede abrir* el bróker sin cerrar nada por falta de fondos — no dice nada sobre cuánto se perdería si el mercado se mueve en contra. Confiar en el margen libre como métrica de seguridad es, en la práctica, una forma de sobreapalancarse sin darse cuenta — el mismo problema de fondo que el sobreapostar respecto a Kelly descrito en [riesgo-de-ruina.md](riesgo-de-ruina.md), pero a nivel de cartera en vez de a nivel de una sola operación.

## Cuando la correlación falla: gestión de riesgo endógena vs. exógena

Un matiz importante que aporta Carver: la correlación medida históricamente no es estable, y tiende a fallar precisamente cuando más se necesita que funcione — en episodios de estrés de mercado, las correlaciones entre activos que normalmente se comportan de forma más o menos independiente tienden a converger hacia +1 (todo cae a la vez, "todas las correlaciones van a uno en una crisis"). Es el mismo fenómeno que describe la sección de risk-on/risk-off de [correlaciones-entre-activos.md](../analisis-fundamental/correlaciones-entre-activos.md), y suele activarse alrededor de eventos de alto impacto del [calendario económico](../analisis-fundamental/calendario-economico.md) (decisiones de tipos, sorpresas de inflación o empleo). Un sistema que gestiona el riesgo de forma "endógena" (integrada en las reglas de la propia estrategia — escalado por volatilidad, sizing tipo Kelly) asume implícitamente que la volatilidad y la correlación son razonablemente predecibles a partir de datos históricos recientes; esa asunción se rompe exactamente en los momentos de mayor cola de riesgo.

Como capa adicional (un overlay "exógeno", externo a la lógica de entrada/salida de cada estrategia), Carver propone recalcular el riesgo esperado de la cartera bajo un supuesto de **peor caso de correlación** (asumir `ρ = 1` entre todas las posiciones abiertas) y recortar el tamaño de las posiciones si ese riesgo de peor caso supera un múltiplo del objetivo de riesgo — en su implementación, recortar posiciones si el riesgo esperado bajo correlación perfecta supera 4 veces el risk target. La idea general, trasladable a cualquier cartera de EAs sin necesitar la misma implementación exacta: antes de añadir una posición nueva, comprobar cuál sería el riesgo total de la cartera si todas las posiciones abiertas se movieran exactamente igual — y usar ese número, no el promedio histórico "de tiempos normales", como referencia de seguridad.

## Qué significa esto para diseñar/operar una cartera de EAs

- No sumes el riesgo por operación de posiciones simultáneas sin antes comprobar su correlación, aunque sea de forma cualitativa (¿comparten divisa? ¿reaccionan al mismo dato macro? ¿suelen entrar y salir en los mismos momentos?).
- Lleva la cuenta de la **exposición neta por divisa o activo subyacente**, no solo por instrumento — varios pares con USD en el mismo lado son, en la práctica, una sola apuesta concentrada contra o a favor del dólar.
- Calcula el **apalancamiento agregado** (suma de exposición nocional de todas las posiciones abiertas ÷ capital), no solo el apalancamiento de cada posición nueva.
- No uses el margen libre disponible en el bróker como métrica de seguridad — es una restricción operativa del bróker, no una medida de riesgo real.
- Ante varias estrategias/EAs corriendo a la vez sobre la misma cuenta, aplica un límite de riesgo a nivel de cartera (un "risk overlay") que recalcule el riesgo esperado asumiendo el peor caso de correlación entre todo lo que esté abierto, y recorte posiciones si ese peor caso supera un múltiplo razonable del objetivo de riesgo — la correlación medida en "tiempos normales" es la que menos importa, porque es precisamente la que se rompe en el peor momento.

## Relación con otras páginas

Esta página extiende a nivel de cartera lo que [position-sizing-kelly.md](position-sizing-kelly.md) y [riesgo-de-ruina.md](riesgo-de-ruina.md) tratan a nivel de una sola posición: sobreapostar respecto al riesgo real (ya sea por Kelly mal calibrado en una operación, o por correlación no contabilizada entre varias) es la misma clase de error de fondo. Ver también [drawdown.md](drawdown.md) para cómo la correlación serial de las pérdidas (rachas) agrava el riesgo de caídas de capital, un problema análogo al de la correlación entre posiciones simultáneas tratado aquí. Para el fundamento de por qué unos pares/activos concretos están correlacionados (DXY, petrodivisas, risk-on/risk-off), ver [correlaciones-entre-activos.md](../analisis-fundamental/correlaciones-entre-activos.md); para cuándo esas correlaciones tienden a romperse hacia +1, ver [calendario-economico.md](../analisis-fundamental/calendario-economico.md).

## Fuentes

- [Rob Carver — When Endogenous Risk Management Isn't Enough: A Simple Risk Overlay](../raw/gestion-riesgo/rob-carver-risk-overlay.md) — artículo (mayo 2020, "This Blog is Systematic") que formaliza el riesgo de cartera (`wSw'`) y propone un overlay exógeno que recorta posiciones bajo el supuesto de peor caso de correlación; fuente principal de esta página.
- [Rob Carver — How Much Risk Should We Take?](../raw/gestion-riesgo/rob-carver-how-much-risk.md) — artículo (marzo 2020) con el marco de sizing por instrumento y objetivo de riesgo, base del límite de apalancamiento "seguro" (~2.17x) citado en la sección de apalancamiento agregado.

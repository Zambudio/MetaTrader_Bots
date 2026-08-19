---
tags: [estrategias, trend-following, momentum, diversificacion, gestion-riesgo]
updated: 2026-08-16
fuentes: [raw/estrategias/aqr-century-trend-following.pdf, raw/estrategias/concretum-group-papers.md]
---

# Seguimiento de tendencia (trend-following)

## Qué es

El seguimiento de tendencia (*trend-following*) es de las familias de estrategias más antiguas de los mercados: comprar activos que han subido recientemente y vender (en corto) activos que han bajado recientemente, apostando a que la tendencia continúa. La versión académica moderna más estudiada se llama **time-series momentum**: a diferencia del momentum "cross-sectional" (comparar un activo contra otros, ver [momentum.md](momentum.md)), el time-series momentum mira el signo del propio retorno pasado de cada activo, de forma independiente — si un mercado ha subido en los últimos meses, se va largo en ese mercado; si ha bajado, se va corto. Cada posición se puede tomar en paralelo en muchos mercados distintos (índices bursátiles, bonos, materias primas, divisas), lo que la convierte en una estrategia naturalmente diversificada.

No es una idea nueva. David Ricardo (economista clásico) resumía la filosofía hace 200 años como "corta las pérdidas rápido, deja correr los beneficios". El trader Jesse Livermore decía que el dinero de verdad no está en las fluctuaciones individuales, sino en "calibrar el conjunto del mercado y su tendencia".

## Evidencia histórica — 137 años de datos

El paper de referencia (Hurst, Ooi & Pedersen, *A Century of Evidence on Trend-Following Investing*, AQR / Journal of Portfolio Management, 2017) es notable porque no se limita a las últimas décadas: reconstruye una estrategia de time-series momentum **desde 1880 hasta 2016**, usando datos de 67 mercados (29 materias primas, 11 índices bursátiles, 15 mercados de bonos, 12 pares de divisas), incluyendo datos de precios de materias primas transcritos a mano de los informes anuales del Chicago Board of Trade de finales del siglo XIX.

Metodología de la estrategia estudiada:
- Combinación equiponderada de tres señales de time-series momentum: mirando atrás 1 mes, 3 meses y 12 meses.
- Señal positiva (retorno pasado positivo) → posición larga; señal negativa → posición corta. Siempre hay posición (larga o corta) en cada mercado.
- Cada posición se dimensiona para apuntar a la misma volatilidad, y la cartera combinada se escala a una volatilidad objetivo del 10% anualizado.
- Rebalanceo mensual.

**Resultado principal**: la estrategia fue rentable de forma consistente a lo largo de las 13 décadas analizadas — incluyendo la Gran Depresión, múltiples guerras mundiales, la estanflación de los 70 y la crisis financiera de 2008 — con un Sharpe medio de aproximadamente 0,4 por mercado individual. Los primeros 100 años de la muestra son, además, evidencia genuinamente fuera de muestra respecto a la literatura académica original (que arrancaba en 1985), lo que descarta que el resultado sea fruto de *data mining* sobre un periodo concreto.

## Por qué funciona (el "porqué" del edge)

El paper no ofrece una única causa, pero apunta a un origen conductual y estructural más que a una prima de riesgo pura:

- **Sesgos de comportamiento**: anclaje (anchoring) y efecto rebaño (herding) entre inversores, que hacen que la información se incorpore a los precios de forma gradual en vez de instantánea.
- **Participantes no orientados a beneficio**: bancos centrales interviniendo para reducir volatilidad de divisas/tipos, o programas corporativos de cobertura — ambos ralentizan la velocidad de incorporación de información y generan tendencias explotables.

## El perfil de "sonrisa" frente al mercado

Uno de los hallazgos más útiles prácticamente: cuando se representan los retornos anuales de la estrategia frente a los retornos del mercado de renta variable de EEUU, aparece una curva en forma de sonrisa. El trend-following tiende a comportarse especialmente bien tanto en años alcistas extremos como en años bajistas extremos, y peor en mercados laterales sin tendencia clara. Esto tiene una explicación intuitiva: la mayoría de los mercados bajistas históricos ocurren de forma gradual a lo largo de varios meses (la caída media de mayor a menor de las 10 peores caídas de una cartera 60/40 duró unos 15 meses), lo que da tiempo a un sistema de seguimiento de tendencia a posicionarse corto y beneficiarse de la continuación de la caída. En crashes muy rápidos (como el de 1987) la estrategia no tiene tiempo de reaccionar y pierde parte de esa ventaja.

En las 10 mayores caídas históricas de una cartera 60/40 (60% acciones EEUU / 40% bonos) en 137 años, el trend-following tuvo retorno positivo en 8 de esas 10 caídas.

## Valor como diversificador de cartera

Los autores simulan añadir un 20% de asignación a la estrategia de time-series momentum sobre una cartera tradicional 60/40, financiada quitando ese 20% de la cartera 60/40. El resultado: reduce el drawdown máximo de la cartera combinada, reduce la volatilidad total, y aumenta el retorno — el triple beneficio típico de un activo con baja correlación estructural con acciones y bonos.

El propio trend-following tiene sus propias rachas malas: la mayor caída histórica de la estrategia (1880-2016) llegó a un -25%, en periodos donde muchos mercados sufren reversiones bruscas o entran en fases sin tendencia clara ("choppy").

## Robustez frente a entornos macro

El paper desglosa el rendimiento por entorno económico (recesión vs. expansión, guerra vs. paz, inflación alta vs. baja, tipos altos vs. bajos) y encuentra un patrón consistente: el rendimiento apenas varía entre regímenes, salvo por una variable — la **correlación media entre mercados**. La estrategia rinde mejor cuando los mercados están poco correlacionados entre sí (más oportunidades de diversificación entre señales independientes).

## Consideraciones prácticas

- **Costes y comisiones**: el estudio también simula el efecto de costes de transacción y de una estructura de comisiones tipo hedge fund (2% de gestión + 20% de éxito), y la estrategia se mantiene rentable neta, aunque con retorno reducido frente a la versión bruta.
- **Horizonte y paciencia**: como toda estrategia de tendencia, sufre en mercados laterales o de reversiones bruscas repetidas ("whipsaw") — no es una estrategia que gane en todos los meses, sino que su ventaja se manifiesta en el conjunto del ciclo y especialmente en colas de distribución (grandes subidas o caídas).
- **Escalabilidad multi-activo**: a diferencia de estrategias intradía como el [breakout](ruptura-breakout.md), el time-series momentum se aplica de forma natural a futuros de índices, bonos, materias primas y divisas — mercados líquidos y con bajo coste de apalancamiento —, lo que la hace apta para carteras institucionales grandes.
- Concretum Group (la misma casa de investigación detrás de [ruptura-breakout.md](ruptura-breakout.md)) tiene varios papers propios que revisitan el trend-following en otros universos — acciones individuales, sectores, y cripto — con resultados consistentes con el edge descrito aquí (ver [../raw/estrategias/concretum-group-papers.md](../raw/estrategias/concretum-group-papers.md) para el catálogo completo, pendiente de ingesta detallada).

## Relación con otras páginas de la wiki

- Es la contrapartida conceptual de [momentum.md](momentum.md) (cross-sectional, sobre acciones individuales) y de [reversion-media.md](reversion-media.md) (apuesta justo por lo contrario: que los extremos revierten en vez de continuar). Entender cuándo aplica cada lógica — continuación vs. reversión — depende del horizonte temporal y del activo.
- El [ADX](../indicadores/adx-dmi.md) es la herramienta de esta wiki más directamente pensada para filtrar cuándo aplicar una lógica de seguimiento de tendencia: mide la fuerza direccional del mercado, y la propia página de ADX señala que un ADX bajo es señal de preferir estrategias de reversión a la media en su lugar.
- El dimensionamiento por volatilidad objetivo descrito en la metodología del paper (misma volatilidad por posición, cartera escalada al 10% anualizado) es una aplicación práctica de los principios de [position sizing](../gestion-riesgo/position-sizing-kelly.md) y, al operar muchos mercados en paralelo, de [riesgo de cartera](../gestion-riesgo/riesgo-de-cartera.md).

## Fuentes

- [Hurst, Ooi & Pedersen — A Century of Evidence on Trend-Following Investing (AQR, 2017)](../raw/estrategias/aqr-century-trend-following.pdf) — el paper central de esta página: reconstruye una estrategia de time-series momentum sobre 137 años de datos (1880-2016) en 67 mercados.
- [Concretum Group — catálogo de papers](../raw/estrategias/concretum-group-papers.md) — índice de investigación propia de Concretum sobre trend-following en otros universos (acciones individuales, sectores, cripto), citado en "Consideraciones prácticas"; pendiente de ingesta detallada.

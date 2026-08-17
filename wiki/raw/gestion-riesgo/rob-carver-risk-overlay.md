---
fuente_url: https://qoppac.blogspot.com/2020/05/when-endogenous-risk-management-isnt.html
capturado: 2026-08-16
metodo: WebFetch (extracción vía modelo, no HTML crudo)
---

# When Endogenous Risk Management Isn't Enough: A Simple Risk Overlay — Rob Carver

**Autor:** Rob Carver
**Fecha:** mayo de 2020
**Blog:** "This Blog is Systematic" (qoppac.blogspot.com)

> Nota de captura: el contenido de abajo es una extracción/reformulación del artículo obtenida vía WebFetch (pasa el HTML por un modelo pequeño que lo convierte a texto), no un volcado literal del HTML original. Se conserva la estructura y las cifras concretas del artículo tal como las devolvió la extracción; se marcan como aproximadas las cifras del ejemplo de correlación que la extracción no pudo reproducir de forma consistente entre dos pasadas.

## Por qué la gestión de riesgo "endógena" no basta

El sistema de Carver ya gestiona el riesgo de forma endógena — integrada en las propias reglas de trading vía escalado de posición inverso a la volatilidad, un predominio de reglas de tendencia, y uso liberal del criterio de Kelly: "risk management is something it just does without even trying". Pero ese enfoque descansa en supuestos "heroicos" que a veces fallan:

- Los retornos de los activos siguen una distribución conjunta gaussiana.
- Los co-movimientos son lineales.
- Tanto la volatilidad como las correlaciones son perfectamente predecibles a partir de datos históricos.
- La gestión de riesgo opera correctamente "en promedio a largo plazo" — no necesariamente protege en el corto plazo cuando esos supuestos se rompen (shocks de correlación, saltos de volatilidad).

Cuando los mercados violan estos supuestos, hace falta un overlay "exógeno": restricciones externas que se sitúan "ligeramente fuera del sistema principal" y recortan posiciones cuando se cruzan umbrales predefinidos.

## La fórmula de riesgo de cartera: wSw'

Carver calcula el riesgo total de la cartera como:

```
riesgo de cartera = w S w'
```

donde `w` son los pesos (posición como % del capital) y `S` es la matriz de covarianzas, compuesta por las desviaciones estándar de cada instrumento y las correlaciones entre sus retornos. Esta es la misma fórmula estándar de varianza de cartera de Markowitz aplicada al contexto de futuros sistemáticos.

## Ejemplo de correlación (cualitativo)

El artículo ilustra, con un ejemplo de dos subsistemas (bonos a 10 años de EEUU y futuros del S&P 500) en posiciones largas de igual tamaño, cómo el riesgo conjunto depende fuertemente de la correlación entre ambos: con correlación +1 el riesgo conjunto es sustancialmente mayor que con correlación 0, y con correlación -1 las posiciones se compensan casi por completo. Las dos pasadas de extracción no devolvieron cifras exactas coincidentes para ese ejemplo concreto (una devolvió "2x / √2 / ~0" sobre el riesgo de una sola posición, la otra "2.8x / 2.0x / 0" sobre un "riesgo medio" no especificado con precisión) — no se deben citar como cifras literales del artículo, solo como ilustración cualitativa del efecto. La fórmula `wSw'` sí es una cita fiable y es matemáticamente verificable de forma independiente.

## Los tres multiplicadores del risk overlay

El overlay calcula tres multiplicadores de posición, cada uno entre 0 y 1, y aplica el más conservador (el mínimo) de los tres:

**1. Riesgo esperado máximo:**
```
multiplicador = min(1, 2 × risk target / riesgo esperado actual)
```
Se activa cuando los forecasts o un shock de correlación empujan el riesgo esperado por encima del doble del risk target.

**2. Riesgo de correlación (peor caso):**
```
multiplicador = min(1, 4 × risk target / riesgo esperado con correlación = 1 en todos los pares)
```
Recalcula el riesgo esperado asumiendo el peor caso de correlación (+1 entre todos los instrumentos) para protegerse de un shock de correlación súbito entre posiciones que hoy están descorrelacionadas o compensándose.

**3. Riesgo de desviación estándar (volatilidad de cola):**
```
multiplicador = min(1, 6 × risk target / riesgo esperado con volatilidad del percentil 99)
```
Usa la volatilidad histórica del percentil 99 en vez de la volatilidad "normal", para protegerse de eventos de cola.

## Resultados del backtest con el overlay aplicado

- Sharpe ratio: 0.956 (sin overlay) → 0.940 (con overlay) — prácticamente idéntico.
- Rentabilidad anual: reducción de aproximadamente un 3%.
- Riesgo: reducción de aproximadamente un 3% (de ahí que el Sharpe apenas cambie).
- Cola izquierda (percentil 1%): mejora.
- Drawdowns: ligeramente menos profundos.
- Skew: ligera reducción (menos asimetría positiva).

Conclusión del propio artículo: el coste de rendimiento es modesto y el overlay funciona como una protección de "caso extremo" (corner case) más que como un componente central de la estrategia — vale la pena el pequeño coste a cambio de la mejora en riesgo de cola.

---
fuente_url: https://qoppac.blogspot.com/2020/03/how-much-risk-should-we-take.html
capturado: 2026-08-16
metodo: WebFetch (extracción vía modelo, no HTML crudo)
---

# How Much Risk Should We Take? — Rob Carver

**Autor:** Rob Carver
**Fecha:** 5 de marzo de 2020
**Blog:** "This Blog is Systematic" (qoppac.blogspot.com)

> Nota de captura: el contenido de abajo es una extracción/reformulación del artículo obtenida vía WebFetch (pasa el HTML por un modelo pequeño que lo convierte a texto), no un volcado literal del HTML original. Se conserva la estructura y las cifras concretas del artículo tal como las devolvió la extracción.

## Resumen general

El artículo aborda la pregunta fundamental del position sizing: cuánto riesgo tomar en una operativa. Se centra en seis factores clave que determinan el tamaño de posición:

1. **Tamaño de la cuenta** — el capital total de trading.
2. **Riesgo del instrumento** — la volatilidad de lo que se está operando.
3. **Objetivo de riesgo (risk target)** — el nivel de riesgo deseado.
4. **Escalado por forecast/confianza** — cuánta confianza se tiene en la señal.
5. **Tamaño de la cartera** — número de posiciones simultáneas.
6. **Escalado a posición** — convertir exposición en unidades reales (contratos, lotes, acciones).

## Tamaño de la cuenta

El capital debe definirse como "el dinero que estás dispuesto a perder operando". Carver recomienda usar el valor actual de la cuenta en lugar de mantener reservas externas, porque mantener reservas fuera de la cuenta fomenta el hábito de estar reponiendo pérdidas continuamente.

## Riesgo del instrumento

El riesgo se mide como "desviación estándar anualizada esperada de los retornos". Ejemplos citados:

- Acciones del S&P 500: ~16% anual.
- Bonos de gobierno a 10 años: ~8% anual.
- Bitcoin: ~100% anual.

## Objetivo de riesgo (risk target)

El risk target depende de varios factores:

- **Apetito de riesgo:** cuánta volatilidad diaria se puede tolerar psicológicamente.
- **Apalancamiento del bróker:** apalancamiento máximo × riesgo del instrumento = risk target máximo permitido.
- **Apalancamiento "seguro":** Carver sugiere un apalancamiento máximo de 2.17x para poder sobrevivir a un crash estilo 1987 (caída del 23%) con una pérdida de cuenta de alrededor del 50%.
- **Rendimiento esperado (Kelly Criterion):** "El risk target óptimo = Sharpe Ratio esperado".

Carver da valores de referencia de Sharpe Ratio:

- Trader minorista medio: -1.0
- Sistema mecánico simple: 0.24
- Trader discrecional experimentado: 0.1–0.3
- Warren Buffett: 0.7
- Trader de sistemas diversificado profesional: 1.0
- Hedge funds de primer nivel: 1.5–2.0
- Mejores traders de alta frecuencia: 10.0+

**Recomendación:** la mayoría de traders amateur usan risk targets injustificadamente altos (a menudo >100%). Carver sugiere empezar con un 12% para sistemas simples.

## Escalado por forecast (confianza)

Asignar puntuaciones de confianza de -20 a +20 (con un valor absoluto medio de 10) para diferenciar entre operaciones "de convicción total" (slam dunk) y operaciones "mediocres" (so-so), permitiendo que el tamaño de posición refleje el grado de convicción en cada señal.

## Tamaño de cartera

Carteras más grandes requieren un riesgo proporcionalmente menor por posición: con 5 posiciones, se usa aproximadamente 1/5 del riesgo medio por operación.

## Fórmula de position sizing

```
(1/N) × C × (T/V) × (F/10)
```

Donde:
- **N** = número esperado de posiciones simultáneas.
- **C** = capital en riesgo.
- **T** = risk target (desviación estándar anualizada objetivo).
- **V** = volatilidad del instrumento (desviación estándar anualizada).
- **F** = puntuación de forecast (-20 a +20).

## Aplicación práctica

Para determinar el tamaño final de posición:

- Acciones: dividir la exposición entre el precio de la acción.
- Futuros: dividir entre (precio del contrato × valor del punto).
- Forex: convertir a la divisa apropiada y ajustar por tamaño de lote.

## Conclusión

"Deberías usar el risk target más conservador" entre las cuatro restricciones (apetito, límites del bróker, apalancamiento seguro, y rendimiento esperado). Carver personalmente opera al 25% pero recomienda un 12% para principiantes con sistemas simples.

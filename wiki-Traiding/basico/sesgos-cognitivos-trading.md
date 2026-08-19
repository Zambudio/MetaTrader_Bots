---
tags: [basico, psicologia, sesgos, behavioral-finance, prospect-theory, disciplina]
updated: 2026-08-16
fuentes: [raw/basico/sesgos-cognitivos-trading-synthesis.md]
---

# Sesgos cognitivos y psicología de trading

## Por qué importa — incluso con un bot

Un EA elimina la ejecución emocional en tiempo real, pero **el sesgo del diseñador** puede infiltrarse en el diseño del sistema. Entender los sesgos cognitivos es esencial tanto para el trader discrecional como para el quant que diseña el bot.

## Prospect Theory (Kahneman & Tversky, 1979)

Base teórica de la psicología de trading moderna, por la que Kahneman recibió el Nobel de Economía en 2002. Desafía la asunción clásica de racionalidad en la toma de decisiones.

### Principios fundamentales

#### 1. Dependencia del punto de referencia

Las personas evalúan resultados como ganancias o pérdidas relativas a un **punto de referencia** (generalmente el precio de entrada), no en términos absolutos.

**En trading**: el precio de entrada se convierte en un ancla psicológica que distorsiona todas las decisiones posteriores.

#### 2. Aversión a la pérdida (*Loss Aversion*)

El dolor de una pérdida se siente **~2.25× más intenso** que el placer de una ganancia equivalente.

**En trading**:
- Mantener perdedoras demasiado tiempo (para evitar el dolor de realizar la pérdida).
- Cerrar ganadoras demasiado pronto (para asegurar el placer de la ganancia).
- Mover el stop loss para evitar que salte (rechazar aceptar que la tesis era errónea).

#### 3. Sensibilidad decreciente

El impacto marginal de cada unidad adicional de ganancia/pérdida disminuye. Perder 100€ cuando ya has perdido 1000€ duele menos que los primeros 100€.

**En trading**: conforme una pérdida se agranda, el trader se vuelve más dispuesto a tomar riesgos para "recuperar" — exactamente lo contrario de lo racional.

#### 4. Ponderación de probabilidades

Sobrevaloran eventos de baja probabilidad (mentalidad de lotería) y subvaloran probabilidades moderadas-altas.

## El efecto disposición

Fenómeno documentado por Shefrin & Statman (1985) y confirmado empíricamente por Odean (1998): los inversores **venden ganadoras demasiado pronto y mantienen perdedoras demasiado tiempo**.

Odean analizó 10.000 cuentas de broker retail: las acciones vendidas (ganadoras) rentaron un **3.4% más** en los 12 meses siguientes que las mantenidas (perdedoras). El efecto disposición destruye valor sistemáticamente.

## Sesgos principales en trading

| Sesgo | Definición | Manifestación en trading |
|---|---|---|
| **Confirmación** | Buscar información que confirma la posición tomada | Ignorar señales de salida; buscar análisis que justifiquen una posición perdedora |
| **Anclaje** | Fijarse en un dato concreto como referencia desproporcionada | "No vendo hasta que vuelva al precio al que compré" |
| **Exceso de confianza** | Sobreestimar la capacidad predictiva propia | Overtrading, sizing excesivo, ignorar gestión de riesgo |
| **Recencia** | Dar más peso a eventos recientes | Aumentar sizing tras una racha ganadora; abandonar la estrategia tras pocas pérdidas |
| **Aversión al arrepentimiento** | Evitar decisiones que podrían generar arrepentimiento | No cortar perdedoras porque "si la corto y después sube..." |
| **Efecto rebaño** | Seguir a la mayoría | Comprar en techos de burbuja; vender en pánico de crash |

## La paradoja del diseñador: sesgos en el desarrollo de un EA

| Sesgo del diseñador | Manifestación |
|---|---|
| Confirmación | Overfitting del backtest = "confirmación" de que la estrategia funciona (ver [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md)) |
| Aversión a la pérdida | No descartar una estrategia en vivo que pierde porque "el backtest era genial" |
| Exceso de confianza | Sobrecargar el EA con indicadores = complejidad como falsa sensación de robustez (ver [como-combinar-indicadores.md](../indicadores/como-combinar-indicadores.md)) |
| Recencia | Reoptimizar compulsivamente tras unas pocas pérdidas |

## El EA como antídoto disciplinario

El bot ejecuta el plan sin emoción — pero **el plan debe diseñarse con conciencia de estos sesgos**:

- **Stop losses fijos y no removibles** → contrarrestan la aversión a la pérdida.
- **Take profits predefinidos** → contrarrestan la toma de beneficios prematura.
- **[Position sizing](../gestion-riesgo/position-sizing-kelly.md) automático** → contrarresta el overtrading y el sizing emocional.
- **Validación OOS estricta** → contrarresta el confirmation bias del diseñador.
- **Reglas de [trade management](../gestion-riesgo/gestion-operaciones-vivo.md) automatizadas** → eliminan la intervención emocional post-entrada.

## Relación con otras páginas

La aversión a la pérdida explica por qué los traders mueven stops ([gestion-operaciones-vivo.md](../gestion-riesgo/gestion-operaciones-vivo.md)) y por qué averaging down es tan tentador (y peligroso). El efecto disposición es el opuesto exacto de lo que prescribe un sistema de [trend-following](../estrategias/seguimiento-tendencia.md) (cortar pérdidas rápido, dejar correr ganancias). El exceso de confianza es la causa psicológica del overfitting documentado en [backtesting-y-validacion.md](../estrategias/backtesting-y-validacion.md). La evidencia empírica sobre day trading retail citada en [scalping.md](../estrategias/scalping.md) (Barber-Lee-Liu-Odean) es en gran parte un estudio de estos sesgos en acción.

## Fuentes

- [Sesgos cognitivos y psicología de trading — síntesis](../raw/basico/sesgos-cognitivos-trading-synthesis.md) — Prospect Theory de Kahneman & Tversky, efecto disposición, sesgos cognitivos principales, y su aplicación al diseño de bots de trading.

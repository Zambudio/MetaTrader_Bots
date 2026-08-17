# Sesgos cognitivos y psicología de trading

> Síntesis basada en Kahneman & Tversky (1979) — Prospect Theory (Econometrica, 47(2), pp. 263-291), CFA Institute behavioral finance publications, y literatura aplicada a trading. Sesgos documentados que afectan la toma de decisiones en mercados financieros.

## Prospect Theory (Kahneman & Tversky, 1979)

### Contexto
La teoría económica clásica asume que los agentes son racionales y maximizan la utilidad esperada (Expected Utility Theory de von Neumann-Morgenstern). Kahneman y Tversky demostraron experimentalmente que los humanos violan sistemáticamente estas asunciones.

### Principios fundamentales

#### 1. Dependencia del punto de referencia (Reference Dependence)
- Las personas evalúan los resultados como ganancias o pérdidas relativas a un punto de referencia (generalmente el status quo o el precio de compra), no en términos absolutos.
- Implicación para trading: el precio de entrada de una posición se convierte en un ancla psicológica que distorsiona todas las decisiones posteriores.

#### 2. Aversión a la pérdida (Loss Aversion)
- El dolor de una pérdida se siente aproximadamente **el doble de intenso** que el placer de una ganancia equivalente.
- Formalmente: v(-x) ≈ -2.25 · v(x) para pequeños x.
- Implicación: los traders mantienen posiciones perdedoras demasiado tiempo (para evitar el dolor de realizar la pérdida) y cierran ganadoras demasiado pronto (para asegurar el placer de la ganancia).

#### 3. Sensibilidad decreciente (Diminishing Sensitivity)
- El impacto marginal de cada unidad adicional de ganancia o pérdida disminuye.
- Perder 100€ cuando ya has perdido 1000€ duele menos que perder los primeros 100€.
- Implicación: conforme una pérdida se agranda, el trader se vuelve más dispuesto a tomar riesgos para "recuperar" — comportamiento contrario a lo racional.

#### 4. Ponderación de probabilidades (Probability Weighting)
- Las personas sobrevaloran eventos de baja probabilidad (cola) y subvaloran eventos de probabilidad moderada-alta.
- Implicación: los traders sobrestiman la probabilidad de "ganar a lo grande" (mentalidad de lotería) y subestiman los riesgos cotidianos.

## El efecto disposición (Disposition Effect)

Fenómeno documentado por Shefrin & Statman (1985) y confirmado empíricamente por Odean (1998): los inversores venden las posiciones ganadoras demasiado pronto y mantienen las perdedoras demasiado tiempo.

- **Causa**: aversión a la pérdida + dependencia del punto de referencia.
- **Consecuencia**: el portfolio se llena progresivamente de "losers" y se vacía de "winners".
- **Evidencia cuantitativa**: Odean analizó 10.000 cuentas de broker retail y encontró que las acciones vendidas (ganadoras) rentaron un 3.4% más en los 12 meses siguientes que las acciones mantenidas (perdedoras).

## Sesgos cognitivos principales en trading

### Sesgo de confirmación (Confirmation Bias)
- Buscar, interpretar y recordar información que confirma la posición ya tomada, ignorando evidencia contraria.
- En trading: una vez abierta una posición, el trader busca noticias/análisis que la justifiquen y descarta las que la cuestionan.

### Sesgo de anclaje (Anchoring Bias)
- Fijarse en un dato concreto (precio de entrada, máximo del día, un nivel de precio "importante") como referencia desproporcionada para decisiones posteriores.
- En trading: "no vendo hasta que vuelva al precio al que compré" — incluso cuando el fundamento de la operación ya no es válido.

### Exceso de confianza (Overconfidence)
- Sobreestimar la propia capacidad de predecir el mercado.
- Conduce a: overtrading (demasiadas operaciones), sizing excesivo, ignorar reglas de gestión de riesgo.
- Barber y Odean (2000) documentaron que los traders retail más activos tienen los peores rendimientos netos.

### Sesgo de recencia (Recency Bias)
- Dar más peso a los eventos recientes que a los históricos.
- Ejemplo: después de 5 operaciones ganadoras seguidas, aumentar el sizing asumiendo que "la racha continuará" (gambler's fallacy invertida).

### Aversión al arrepentimiento (Regret Aversion)
- Evitar tomar decisiones que podrían generar arrepentimiento, incluso cuando son racionalmente correctas.
- Manifestación: no cerrar una posición perdedora porque "si la cierro y después sube, me arrepentiré".

### Efecto rebaño (Herding)
- Seguir las acciones de la mayoría en lugar de analizar independientemente.
- En mercados: contribuye a burbujas (todos compran porque todos compran) y crashes (ventas de pánico en cascada).

## Por qué esto importa para bots de trading

### La paradoja del diseñador humano
Un bot elimina la ejecución emocional en tiempo real, pero **el sesgo del diseñador** puede infiltrarse en el diseño del sistema:
- Overfitting del backtest = confirmación de que "la estrategia funciona" (confirmation bias del diseñador).
- No cortar una estrategia en vivo que está perdiendo porque "el backtest era genial" (aversión a la pérdida aplicada al desarrollo).
- Sobrecargar el EA con indicadores = complejidad como falsa sensación de robustez (overconfidence).

### Reglas de un EA como antídoto disciplinario
- El bot ejecuta el plan sin emoción — pero el plan debe diseñarse con conciencia de estos sesgos.
- Stop losses fijos y no removibles → contrarrestan la aversión a la pérdida.
- Take profits predefinidos → contrarrestan la toma de beneficios prematura.
- Position sizing automático → contrarresta el overtrading y el sizing emocional.
- Validación out-of-sample estricta → contrarresta el confirmation bias del diseñador.

## Fuentes académicas de referencia
- Kahneman, D. & Tversky, A. (1979). Prospect Theory: An Analysis of Decision under Risk. Econometrica, 47(2), 263-291.
- Shefrin, H. & Statman, M. (1985). The Disposition to Sell Winners Too Early and Ride Losers Too Long.
- Odean, T. (1998). Are Investors Reluctant to Realize Their Losses? Journal of Finance.
- Barber, B.M. & Odean, T. (2000). Trading Is Hazardous to Your Wealth. Journal of Finance.

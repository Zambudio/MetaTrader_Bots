# Diagnóstico Codex — Iteración 3

> Extraído de `scratchpad/codex-out-3.txt` (efímero). Preservado para el registro del bucle /loop 2026-08-29.

===BEGIN DIAGNOSIS===

## CLASIFICACION

**I — panel pre-backtest mal calibrado que produce falsos negativos.**

No es II porque nunca se genera ni compila el MQL5. No es III porque no existe backtest ni ejecución sobre los que evaluar gestión o ventaja estadística.

## CAUSA_RAIZ

La lectura de Claude es correcta, con un matiz: el problema no es solamente que el panel sea exigente, sino que confunde dos decisiones distintas:

1. **Apto para ser backtesteado.**
2. **Validado estadísticamente o autorizado para operar en vivo.**

En este pipeline, `GO` solo habilita la primera. Sin embargo, el Refutador y el Razonador lo interpretan como aprobación definitiva y exigen demostrar rentabilidad antes de permitir generar el backtest que produciría esa demostración. Es una dependencia circular.

El run `JP_clZd_s9` confirma el falso negativo:

- SELL alineado con la tendencia: precio bajo SMA200 y EMA20 bajo EMA50.
- Condición mecánica y repetible: `Cierre anterior >= EMA20 Y Cierre actual < EMA20`.
- Dos predicados.
- Geometría correcta: `1.16034 > 1.15870 > 1.15608`.
- SL = `0.00164 / 0.00082 = 2 ATR`.
- TP = `0.00262 / 0.00082 ≈ 3.2 ATR`.
- R:R = `0.00262 / 0.00164 ≈ 1.60`.
- El propio Validador declara correctas geometría, R:R y condición mecánica.

A pesar de ello, el panel bloquea por criterios que no pertenecen al gate:

- Eleva unilateralmente el mínimo R:R de 1.5 a 2.
- Convierte RSI/MACD del snapshot puntual en requisitos permanentes de la regla.
- Exige un tercer o cuarto predicado, contradiciendo el máximo de dos.
- Pide volumen, ADX, correlaciones y calendario que el snapshot no proporciona.
- Exige KPIs de un backtest que solo se crea después de `GO`.
- Trata recomendaciones de robustez como defectos bloqueantes.

Además, el Refutador incurre en errores cuantitativos que el Razonador no corrige: en el run 4 llama “157 pips” a una distancia de 15.7 pips, “300 pips” a 30 pips y afirma que `1.15523` está por debajo de `1.15514`. Esto demuestra que su sobre-estrictez no añade rigor fiable.

El cambio de máxima palanca es **C**: sincronizar Refutador y Razonador como un único cambio lógico, transformando el panel en un gate cerrado de elegibilidad para backtest. A por sí sola dejaría al Razonador expuesto a una lista extensa de objeciones espurias; B por sí sola no impediría que el Razonador inventara requisitos adicionales.

## CAMBIO_PROPUESTO

**Archivo:** `trading-agents-dashboard/server/src/data/agents.json`

**Ubicación 1:** final de `agente-refutador.systemPrompt`.

**TEXTO EXACTO a añadir:**

```text
GATE DE ELEGIBILIDAD PARA BACKTEST — INSTRUCCIÓN DE MÁXIMA PRIORIDAD:

Este panel NO autoriza operar en vivo y NO demuestra que una estrategia sea rentable. Su única función en esta fase es decidir si la tesis tiene coherencia estructural suficiente para generar un EA y someterlo al backtest real. Los resultados estadísticos se obtienen únicamente DESPUÉS de un GO.

Clasifica expresamente cada hallazgo como BLOQUEANTE o NO_BLOQUEANTE. Solo puede ser BLOQUEANTE si existe evidencia concreta en los datos recibidos de al menos uno de estos defectos:

1. Geometría inválida: para BUY no se cumple TP > entrada > SL, o para SELL no se cumple SL > entrada > TP.
2. Dirección inequívocamente contraria a la tendencia dominante del timeframe: SELL cuando precio > SMA200 Y EMA20 > EMA50, o BUY cuando precio < SMA200 Y EMA20 < EMA50. Si la tendencia es mixta, no inventes una oposición.
3. condicionEntrada no mecánica, no repetible, mutuamente imposible, dependiente de un nivel anecdótico actual, con más de dos predicados booleanos, o basada en un dato que el sistema no puede codificar.
4. R:R numérico exacto inferior a 1.50.
5. SL manifiestamente incoherente con el ATR: menos de 1 ATR o más de 2.5 ATR desde la entrada sin una justificación estructural explícita; o TP a más de 6 ATR sin un objetivo estructural citado en los datos disponibles.
6. SL o TP ausente, no numérico, invertido o incompatible con la dirección.

NO son motivos de rechazo ni pueden clasificarse como BLOQUEANTES:

- Pedir un tercer filtro cuando la condición ya tiene uno o dos predicados mecánicos y direccionalmente coherentes.
- RSI, MACD, Bollinger, máximo/mínimo reciente u otra circunstancia del snapshot puntual si la regla propuesta no los utiliza.
- Que el SL no quede más allá del máximo o mínimo completo de 20 velas cuando ya está correctamente orientado y entre 1 y 2.5 ATR.
- Preferir R:R 2.0, 3.0 u otro valor superior: el mínimo de este gate es 1.50 y no puedes elevarlo.
- Ausencia de volumen, ADX, order book, correlaciones de cartera, exposición en otros pares, calendario económico fiable o cualquier dato no incluido en el snapshot.
- Ausencia de número de trades, win-rate, profit factor, expectancy, Sharpe, drawdown, slippage histórico, curva de equity o cualquier KPI de backtest.
- Riesgo de sobreoperación, baja frecuencia, falsos cruces o falta de ventaja estadística cuando todavía no existe medición histórica.

El snapshot disponible contiene únicamente precio y velas, EMA20/EMA50, SMA20/SMA50/SMA200, RSI14, MACD línea/señal/histograma, Bollinger(20,2), ATR14 y máximo/mínimo de 20 velas. No exijas otros datos. Si la propuesta depende ella misma de un dato ausente, eso sí es un defecto de codificabilidad; no lo propongas como filtro adicional.

Si no encuentras ningún defecto de la lista cerrada de BLOQUEANTES, termina con la frase exacta: "SIN BLOQUEANTES: tesis apta para backtest". Puedes añadir mejoras como observaciones NO_BLOQUEANTES, pero nunca convertirlas en condiciones previas para generar el backtest.
```

**Ubicación 2:** final de `agente-razonador.systemPrompt`.

**TEXTO EXACTO a añadir:**

```text
DECISIÓN DE ELEGIBILIDAD PARA BACKTEST — INSTRUCCIÓN DE MÁXIMA PRIORIDAD:

GO significa únicamente "generar el EA y medir esta tesis en el backtest real". GO NO significa que la estrategia sea rentable, esté validada estadísticamente ni esté autorizada para operar en vivo.

Antes de decidir, recalcula con los valores numéricos recibidos la geometría, la distancia del SL en ATR y el R:R. No adoptes una objeción por su extensión o tono: debe estar respaldada por los números y pertenecer a esta lista cerrada de bloqueantes:

1. Geometría inválida: BUY sin TP > entrada > SL o SELL sin SL > entrada > TP.
2. Dirección inequívocamente contraria a la tendencia dominante: SELL con precio > SMA200 Y EMA20 > EMA50, o BUY con precio < SMA200 Y EMA20 < EMA50.
3. condicionEntrada no mecánica, no repetible, mutuamente imposible, con más de dos predicados booleanos, anecdótica o imposible de codificar con los datos disponibles.
4. R:R exacto < 1.50.
5. SL a menos de 1 ATR o a más de 2.5 ATR sin justificación estructural explícita; TP a más de 6 ATR sin objetivo estructural citado; o niveles ausentes, no numéricos o invertidos.

AJUSTAR requiere al menos un bloqueante concreto de esa lista que pueda corregirse con los datos disponibles. Incluye en objeciones únicamente bloqueantes. NO_OPERAR se reserva para una contradicción grave que no pueda corregirse proponiendo otros niveles o una regla mecánica alineada.

Debes emitir GO si no existe ningún bloqueante de la lista, aunque el Refutador recomiende más filtros, un R:R superior, KPIs, correlaciones, volumen, ADX, calendario, límites diarios o confirmaciones adicionales.

Nunca uses para AJUSTAR o NO_OPERAR:

- RSI, MACD, Bollinger o estructura del snapshot puntual si no forman parte de condicionEntrada, salvo para comprobar la dirección dominante y el dimensionamiento por ATR.
- La ausencia de volumen, ADX, order book, correlaciones de cartera, calendario fiable u otros datos no incluidos en el snapshot.
- La ausencia de trades históricos, win-rate, profit factor, expectancy, Sharpe, drawdown, slippage o curva de equity: todavía no existen porque este veredicto precede al backtest.
- La preferencia por R:R 2.0 o superior: 1.50 es el mínimo vinculante.
- La posibilidad teórica de falsos cruces, sobreoperación, baja frecuencia o falta de ventaja: esas hipótesis las decide el backtest real.
- La falta de un tercer predicado cuando la regla ya contiene uno o dos predicados mecánicos y direccionalmente válidos.

Caso de referencia obligatorio: una estrategia SELL alineada con precio < SMA200 y EMA20 < EMA50, condicionEntrada "Cierre anterior >= EMA20 Y Cierre actual < EMA20", geometría SELL correcta, SL = 2 ATR y R:R = 1.60 debe recibir GO. Las dudas sobre frecuencia, falsos cruces, RSI/MACD actuales o rentabilidad se anotan como limitaciones a medir en el backtest, no como objeciones bloqueantes.
```

Es un solo cambio lógico: redefinir el panel como **gate estructural pre-backtest con lista cerrada de bloqueantes**, aplicado tanto donde nacen las objeciones como donde se decide el veredicto.

## RIESGO_REGRESION

El riesgo es que lleguen al backtest reglas sencillas con muchos falsos cruces o sin ventaja. Eso no equivale a rebajar el rigor real:

- Continúan bloqueadas geometría rota, dirección claramente contraria, condiciones no mecánicas, reglas con más de dos predicados, R:R < 1.5 y stops absurdos.
- `GO` no habilita trading real; solo permite obtener evidencia.
- Frecuencia, costes, drawdown, profit factor y expectativa pertenecen precisamente al Quality Gate posterior.

El riesgo principal del cambio es aumentar backtests fallidos y consumo de tiempo, no aceptar estrategias perdedoras para producción.

## COMO_VERIFICAR_QUE_NO_SE_RELAJO_DEMASIADO

Ejecutar una batería fija de casos, idealmente tres veces cada uno por la variabilidad del modelo:

1. **Control positivo — run 5:** cruce bajista EMA20, SELL alineado, SL 2 ATR y R:R 1.60. Resultado esperado: `GO`.
2. **Geometría invertida:** SELL con SL por debajo de la entrada. Esperado: `AJUSTAR`.
3. **Contra-tendencia:** SELL con precio > SMA200 y EMA20 > EMA50. Esperado: `AJUSTAR`.
4. **No mecánica:** `Vender ahora cerca de 1.1587 si parece débil`. Esperado: `AJUSTAR`.
5. **R:R insuficiente:** misma regla válida con R:R 1.49. Esperado: `AJUSTAR`.
6. **SL absurdo:** misma regla con SL 0.3 ATR y, por separado, 6 ATR. Esperado: `AJUSTAR`.
7. **Datos ausentes:** añadir al Refutador una recomendación de volumen, ADX, correlación y KPIs sin cambiar la estrategia válida. Esperado: sigue siendo `GO`; esas recomendaciones aparecen solo como no bloqueantes.
8. **Snapshot puntual:** cambiar únicamente RSI/MACD entre sobreventa, neutral y momentum contrario. Si la regla no usa esos indicadores y sigue alineada con la tendencia, el resultado debe permanecer `GO`.

La prueba decisiva es metamórfica: las objeciones no bloqueantes no deben cambiar el veredicto, mientras que modificar cualquiera de los cinco hard gates sí debe cambiarlo a `AJUSTAR`.

## ALTERNATIVA_SI_FALLA

Si, después del cambio, alguno de los agentes vuelve a elevar umbrales o inventar bloqueantes, dejar de confiar esta decisión a texto libre:

- Incorporar en el orquestador un `preBacktestEligibilityGate` determinista.
- Calcular por código geometría, R:R, distancias en ATR y número de predicados.
- Hacer que el Refutador devuelva `blockerCodes` pertenecientes a un enum cerrado.
- Rechazar cualquier código desconocido o sin evidencia numérica.
- Obligar al Razonador a emitir `GO` cuando la lista validada de bloqueantes quede vacía.

Esto conservaría al LLM para evaluar codificabilidad y coherencia direccional, pero impediría que recomendaciones subjetivas vuelvan a convertirse en requisitos de aprobación.

## OTROS_CANDIDATOS

- **A solamente:** menor cambio físico, pero mantiene al Razonador bajo la presión de objeciones extensas y espurias del Refutador.
- **B solamente:** reduce ruido en origen, pero el Razonador aún puede elevar por sí mismo R:R o exigir filtros/KPIs.
- **D — gate determinista de frecuencia:** útil después; no corrige que una tesis limpia nunca alcance el backtest.
- Renombrar `GO` como `APTO_BACKTEST` y crear más adelante un veredicto distinto `APTO_LIVE`; reforzaría semánticamente la separación de fases.
- Proporcionar al panel R:R, pips y múltiplos de ATR ya calculados por código para evitar errores aritméticos como los observados en el run 4.

===END DIAGNOSIS===

# Diagnóstico Codex — Iteración 4

> Extraído de `scratchpad/codex-out-4.txt` (efímero). Preservado para el registro del bucle /loop 2026-08-29.

===BEGIN DIAGNOSIS===

## CLASIFICACION

**Tipo I — tesis/regla de entrada poco selectiva.**

No es II: el EA implementa fielmente `price_close < EMA20 AND EMA20 < EMA50`.

III es una hipótesis secundaria, no la causa principal. Breakeven o trailing podrían modificar PF/DD, pero el problema nace antes: una condición de **estado** permite reentrar repetidamente mientras persiste el régimen bajista.

La aritmética confirma el diagnóstico:

`0.42 × 1.59955 − 0.58 = 0.0918 R`

Coincide prácticamente exactamente con la esperanza observada. El EA está ejecutando una señal con 42 % de acierto y payoff 1.60; no hay evidencia de un error de implementación. Para superar simultáneamente esperanza y PF necesita seleccionar algunas operaciones mejores, no limitarse a cambiar el mismo SL/TP.

Los 300 trades no son por sí solos inválidos, pero, junto con PF 1.136, esperanza 0.0918 R y reentradas mientras el estado continúa, constituyen evidencia de ventaja diluida. La lectura de Claude es correcta, aunque el cruce deberá validarse por backtest: no puede asegurarse de antemano que tendrá mejor PF.

## CAUSA_RAIZ

La restricción actual de `agente-riesgo` limita el número de predicados y muestra ejemplos de cruces, pero deja un agujero: no prohíbe que el disparador entero sea una condición persistente de estado.

Así, esta regla pasa formalmente el prompt:

```text
price_close < EMA20 AND EMA20 < EMA50
```

Tiene dos predicados, es mecánica, repetible y direccionalmente coherente, pero no define el momento de entrada. Tras cerrar una operación, el EA vuelve a entrar en la siguiente barra si el estado continúa. Eso explica la muestra muy grande y la exposición repetida dentro de tramos laterales o tendencias agotadas.

Un filtro de régimen añadido únicamente en MQL5 no es la solución correcta: violaría la obligación de implementar exactamente `condicionEntrada`. El régimen o la fuerza deben formar parte de la tesis aprobada.

## POR_QUE_FALLO_EL_BUCLE_DE_REINTENTO

El bucle sí se activó y sí intentó reconsiderar la tesis. La evidencia de `run6.json` es inequívoca:

- `backtestFeedbackCount: 1`.
- `strategyFeedbackCycles: 1`.
- `agente-riesgo` quedó en `status: "error"`, `attempt: 2`.
- Error exacto:

```text
OmniRoute respondió 404: {"error":{"message":"[cerebras/gpt-oss-120b] [404]: Model zai-glm-4.7 is archived and unavailable for the organization. (reset after 1m 38s)"}}
```

- Validador, Refutador y Razonador quedaron en `waiting`.
- El run terminó en `status: "error"`.
- `retryCount` seguía en 0 y `maxRetries` era 3: no se agotaron los reintentos ordinarios.
- El fallo ocurrió durante la llamada del Gestor de Riesgos, no por el reinicio posterior del backend.

Secuencia exacta:

1. `generateWithStrategyFeedbackLoop()` detecta el QG_FAIL.
2. `retryStrategyForBacktestFailure()` incrementa `backtestFeedbackCount`.
3. `resetForRetry()` borra las salidas del subgrafo.
4. `runPass()` llama a `agente-riesgo`.
5. OmniRoute devuelve 404.
6. `runPass()` marca el agente y el run como error y devuelve `false`.
7. `retryStrategyForBacktestFailure()` devuelve `ok:false`.
8. La ruta incrementa `cycles` **antes** de comprobar `ok` y ejecuta `break`.
9. El job MQL5 se completa conservando el EA anterior, sin `finalStrategy` y sin exponer el motivo del fallo.

Por tanto hay dos conclusiones distintas:

- **Causa inmediata de no obtener otra estrategia:** fallo externo/model routing de OmniRoute, no un defecto en `computeRetrySubgraph` ni falta de contexto.
- **Bug real del pipeline:** el fallo se degrada silenciosamente a “ciclo consumido”, destruye en el run la estrategia/veredicto anterior y no propaga `retryResult.error` al resultado del job.

Sí, debe arreglarse. Como mínimo, un `ok:false` debe hacer fallar explícitamente el job y restaurar el estado anterior; no debe contar como ciclo de estrategia. Sin embargo, ese arreglo mejora fiabilidad y observabilidad, pero no mejora por sí mismo las métricas de esta tesis. Forzado a elegir un único cambio para acercar este backtest a 6/6, el cambio de mayor palanca es corregir aguas arriba el tipo de señal.

## CAMBIO_PROPUESTO

**Elección: (a), endurecer `agente-riesgo` para distinguir EVENTO de ESTADO.**

**Archivo:** `src/agents.json`  
**Ubicación:** `agente-riesgo.systemPrompt`, dentro de `RESTRICCIONES BLOQUEANTES DE SALIDA`.  
**Operación:** sustituir íntegramente el punto 1 actual por este texto exacto:

```text
1) GATE DE TIPO DE SEÑAL: la condicionEntrada puede contener COMO MÁXIMO DOS COMPONENTES LÓGICOS: (a) un disparador de EVENTO obligatorio y (b), opcionalmente, un único filtro de régimen o fuerza. El disparador debe describir una transición entre la vela cerrada anterior y la última vela cerrada —por ejemplo, cruce de precio/EMA, cruce de dos medias, cruce de MACD o ruptura confirmada de un máximo/mínimo o banda— y debe identificar el instante en que nace la señal. Una relación persistente que solo describe ESTADO, como "precio < EMA20", "EMA20 < EMA50", "RSI < 50" o cualquier combinación de ellas, queda PROHIBIDA como único disparador: puede utilizarse únicamente como filtro del evento. Un cruce temporal completo cuenta como UN componente lógico aunque para codificarlo requiera comparar la vela anterior y la actual. Como segundo componente opcional puedes usar un filtro de régimen/fuerza construible exclusivamente con los indicadores disponibles en el snapshot, por ejemplo pendiente de EMA en el sentido de la operación, separación EMA20-EMA50 expresada en múltiplos de ATR, o ancho de Bollinger expresado en múltiplos de ATR; no uses ADX ni datos ausentes. No añadas ese segundo filtro si vuelve improbable alcanzar 15 operaciones en ~12 meses. Antes de devolver la propuesta, clasifica internamente cada componente como EVENTO o ESTADO; si no existe exactamente un EVENTO de entrada, reescribe condicionEntrada.
```

Es materialmente distinto de los cambios anteriores: aquellos limitaban predicados y sugerían una reanudación tras pullback; este texto convierte la presencia de un evento temporal en una condición bloqueante y cierra explícitamente el agujero que permitió la regla de estado del run 6.

En el repositorio real debe sincronizarse mecánicamente el mismo texto en los tres sitios exigidos por el plan: `agents.json`, `DEFAULT_AGENTS` y el preset activo. Eso sigue siendo un único cambio lógico de prompt.

No se toca el Quality Gate, no se modifica ningún umbral y no se fuerza una frecuencia inferior a 15.

## RIESGO_REGRESION

- Un cruce puede sufrir whipsaws y obtener un PF incluso peor; es una hipótesis que debe decidir el backtest.
- El filtro opcional de fuerza puede reducir demasiado la muestra o inducir sobreajuste si se elige un umbral arbitrario.
- Considerar un cruce como un componente lógico debe traducirse correctamente a dos comparaciones temporales en MQL5.
- La frecuencia probablemente caerá desde 300, pero no existe garantía previa de que siga por encima de 15.

La validación correcta es ejecutar el siguiente backtest sin alterar el gate. Si queda con menos de 15 trades, la respuesta no es relajar el umbral: debe ensancharse el evento o eliminarse el filtro opcional.

## ALTERNATIVA_SI_FALLA

Si el siguiente run vuelve a generar una regla de estado, o el reintento vuelve a terminar con error de proveedor, el siguiente cambio debe ser la reparación transaccional del bucle:

- No incrementar `strategyFeedbackCycles` cuando `retryResult.ok === false`.
- Propagar `retryResult.error` y marcar el job como fallido.
- Restaurar las salidas y el estado anteriores del run si falla la reejecución.
- Permitir que el ciclo se repita posteriormente sin haber consumido `backtestFeedbackCount`.

Si se obtienen **dos QG_FAIL con tesis de evento distintas y reintentos técnicamente correctos**, entonces se activa el disparador del plan para el probe histórico barato: frecuencia y expectativa aproximada antes del veredicto. Esa evidencia sería más útil que seguir acumulando reglas en prompts.

## OTROS_CANDIDATOS

- **(b) Bucle de reintento:** necesario como arreglo de fiabilidad, pero el run demuestra que sí fue invocado; lo detuvo un 404 externo. No mejora directamente la ventaja de la regla actual.
- **(c) Breakeven/trailing/filtro MQL5:** no elegido. El EA entregado carece de ellos, pero añadir un filtro no aprobado rompería la fidelidad. Además, `iteration: 2` solo demuestra que se inició un ciclo de optimización, no dos optimizaciones exitosas.
- **(d) Gate de frecuencia con máximo M:** no elegido. El mínimo ya pasa holgadamente. Un máximo arbitrario puede reducir operaciones sin crear edge; frecuencia y rentabilidad no son equivalentes. El gate inferior del plan se justificaba para reglas muertas, no para este caso.
- **ADX recomendado por `qualityGate.ts`:** no está disponible en el snapshot y `recommendedAction` es una heurística rígida, no evidencia de que ADX sea la solución.
- **Warning MQL5:** `OnTradeTransaction` tiene firma incorrecta y produjo warning 70 pese a `compileStatus: ok`. Debe corregirse aparte, pero el handler está vacío y no explica PF, esperanza ni drawdown.
- **Arreglo estructural histórico:** todavía prematuro con un único QG_FAIL. Pasa a ser el candidato principal después de dos tesis distintas que fallen con el feedback loop funcionando.

===END DIAGNOSIS===

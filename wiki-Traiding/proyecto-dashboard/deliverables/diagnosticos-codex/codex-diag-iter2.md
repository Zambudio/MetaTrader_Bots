# Diagnóstico Codex — Iteración 2

> Extraído de `scratchpad/codex-out-2.txt` (efímero). Preservado para el registro del bucle /loop 2026-08-29.

===BEGIN DIAGNOSIS===

## CLASIFICACION

**I — tesis floja, agravada por una calibración inconsistente del panel.**

No es II: no se generó MQL5.  
No es III: todavía no hubo backtest ni gestión real de operaciones.

## CAUSA_RAIZ

La causa inmediata es `agente-riesgo`. Tras tres reintentos —la salida final figura como `attempt: 4`— siguió entregando una estrategia que incumple su propio prompt:

- Apila cuatro predicados cuando el límite indicado es dos.
- Para un SELL usa `RSI < 30` junto con `MACD_histogram > 0`: vende tarde, en sobreventa, mientras el momentum empieza a girar al alza.
- El R:R exacto es `0.00194 / 0.00130 = 1.4923`, realmente inferior a 1.50. No es un simple error de redondeo y el spread lo empeoraría.
- El SL cumple 1.67 ATR desde la entrada, pero queda prácticamente sobre EMA20: solo 0.00003 por encima.
- La regla probablemente tendrá poca frecuencia, aunque todavía no hay histórico que permita afirmarlo cuantitativamente.

El código permite que esto llegue al panel porque `validateStrategyProposal()` solo comprueba geometría, campos y R:R; además usa `minRrRatio = 1.49`, mientras los prompts exigen 1.50. No valida número de filtros, compatibilidad semántica ni frecuencia.

También está confirmada una descalibración secundaria:

- `agente-refutador` exige backtest, curva de equity y KPIs inexistentes en esta fase.
- `agente-razonador` convierte esa carencia en motivo de `AJUSTAR`, contradiciendo su instrucción de usar únicamente datos disponibles.
- Varias recomendaciones del panel son incorrectas para un SELL: colocar el SL “bajo EMA20” o usar EMA50 —por encima de la entrada— como TP invertiría la geometría.
- El umbral `MACD > 0.0005` es arbitrario y no está normalizado por ATR ni respaldado por histórico.

Sin embargo, eliminar ahora la objeción de backtest solo retiraría una de seis objeciones. La propuesta seguiría mereciendo `AJUSTAR` por defectos observables. Por ello, el cambio que desbloquea antes el bucle sin rebajar rigor debe ir primero en `agente-riesgo`.

El Arreglo (c) todavía **no está justificado**: su disparador requiere varios GO seguidos de QG_FAIL o descartes repetidos. Aquí aún no se ha alcanzado el primer GO.

## CAMBIO_PROPUESTO

**Archivo:** `trading-agents-dashboard/server/src/data/agents.json`  
**Ubicación:** `agente-riesgo.systemPrompt`  
**Cambio:** añadir exactamente este bloque al final del prompt:

```text
RESTRICCIONES BLOQUEANTES DE SALIDA — compruébalas antes de llamar a propose_strategy:

1. condicionEntrada puede contener COMO MÁXIMO DOS predicados booleanos totales. Las condiciones de régimen o tendencia, como “EMA20 < EMA50” o “precio < SMA200”, también cuentan como predicados. Si hay tres o más condiciones unidas por Y/O, la propuesta es inválida y debes simplificarla antes de devolverla.

2. No uses sobreventa como disparador de una VENTA ni sobrecompra como disparador de una COMPRA. En particular, están prohibidas “SELL con RSI(14) < 30” y “BUY con RSI(14) > 70”. Tampoco combines una entrada tendencial con momentum que ya gira en sentido contrario, como SELL con MACD_histogram > 0 o BUY con MACD_histogram < 0. Para continuación tendencial usa un único disparador de reanudación tras pullback y un único filtro de régimen; ejemplo válido de SELL: “Cierre cruza de arriba abajo EMA20 Y EMA20 < EMA50”.

3. Calcula los niveles con los valores numéricos exactos antes de responder. El SL debe quedar a 1.25–2.5 ATR de la entrada y más allá del nivel técnico de invalidación, no prácticamente encima de él. El R:R calculado debe ser >= 1.60 para conservar margen sobre el mínimo operativo de 1.50. Si cualquiera de estas restricciones falla, reescribe la propuesta antes de devolverla.
```

Es un solo cambio lógico de prompt. Al aplicarlo deberá sincronizarse, como exige el plan, en las copias equivalentes de `DEFAULT_AGENTS` en `agentsStore.ts` y del preset activo en `agentConfigs.json`.

Este cambio actúa aguas arriba: evita que los tres reintentos vuelvan a discutir una tesis estructuralmente defectuosa. Cambiar primero `agente-refutador` o `agente-razonador` podría silenciar críticas incorrectas, pero no convertiría esta propuesta en una regla apta para backtest.

## RIESGO_REGRESION

Limitar la regla a dos predicados aumentará la frecuencia, pero también puede introducir más señales falsas. El riesgo está contenido porque:

- El validador y el refutador siguen revisando geometría, tendencia y ATR.
- Se refuerza el margen R:R en vez de relajarlo.
- El Quality Gate posterior decidirá con datos reales si la regla sencilla tiene ventaja.

El objetivo de 1.60 puede producir TP menos alcanzables; precisamente eso deberá decidirlo el backtest, no una aproximación verbal del panel.

## ALTERNATIVA_SI_FALLA

Si la siguiente iteración vuelve a producir tres o más filtros, menos de 15 operaciones o una regla semánticamente contradictoria, quedará demostrado que el modelo no respeta de forma fiable una restricción de prompt. Entonces procede el **Arreglo (b)**:

- Evaluar determinísticamente `condicionEntrada` antes de los validadores.
- Rechazarla dentro del reintento in situ cuando tenga frecuencia estimada inferior a 15 operaciones/año o no pueda evaluarse.
- Devolver al `agente-riesgo` el número estimado de señales y exigir una regla más ancha.

No sustituiría esto por el Arreglo (c): (b) corrige la generación de la regla; (c) informa al veredicto sobre su rendimiento histórico.

## OTROS_CANDIDATOS

- Si una estrategia ya limpia vuelve a quedar bloqueada **exclusivamente** por ausencia de KPIs, añadir a `agente-razonador.systemPrompt`:  
  `En esta fase todavía NO existe backtest ni curva de equity: se generan únicamente después de un GO. La ausencia de win-rate, profit factor, expectancy, Sharpe, drawdown o número histórico de operaciones no puede aparecer en objeciones ni justificar AJUSTAR/NO_OPERAR; evalúa aquí solo coherencia estructural comprobable con los datos recibidos.`

- Alinear posteriormente `strategyValidator.ts` con el umbral nominal de 1.50; ahora acepta 1.49 mientras el panel exige 1.50.

- Corregir en `agente-refutador` la geometría direccional del SL/TP y prohibir umbrales absolutos arbitrarios de MACD sin normalización por ATR.

- Investigar por separado las noticias inventadas por `agente-fundamental`; no fueron la causa determinante de este NO_GO.

===END DIAGNOSIS===

# Diagnóstico Codex — Iteración 5

> Extraído de `scratchpad/codex-out-5.txt` (efímero). Preservado para el registro del bucle /loop 2026-08-29.

===BEGIN DIAGNOSIS===

## CLASIFICACION

**Tipo II: codegen MQL5 inválido.**

No afecta a la Regla 17: `GenerateSignal()` sí implementa el evento de cruce y los filtros aprobados. El fallo está en APIs auxiliares de ejecución y logging.

## CAUSA_RAIZ

Es una combinación, en este orden:

1. **Contrato MQL5 insuficientemente preciso en el prompt.** Se exige `OnTradeTransaction` aunque no sea necesario, pero no se proporciona una implementación mínima segura ni las firmas exactas. Ya en la iteración anterior produjo el warning 70.

2. **Bucle de reparación incapaz de compensarlo.** `runMql5Pipeline()` entrega los errores al mismo modelo, pero el KB solo contiene recetas genéricas para `error 199` y `error 256`, asociadas a problemas diferentes. `codeReviewer.ts` no ayuda porque se ejecuta únicamente después de compilar y tampoco reconoce estos tres patrones.

3. **El fallback débil es un amplificador, no la causa raíz.** Un modelo mejor podría autocorregirse, pero el pipeline debe soportar variaciones de modelo. Además, el EA anterior generado por el modelo primario ya declaró incorrectamente `OnTradeTransaction`.

Forzar la sección 8 explica dos errores, pero no el séptimo argumento de `CTrade::Sell`; por eso hacer únicamente opcional `OnTradeTransaction` no basta.

La referencia oficial confirma que `CTrade::Sell` acepta seis argumentos y que el resultado se consulta mediante `ResultRetcode()`/`ResultDeal()`; no existe un parámetro de salida para el ticket. [`MqlTradeTransaction` tampoco contiene `profit`](https://www.mql5.com/en/docs/constants/structures/mqltradetransaction), y [`TRADE_TRANSACTION_POSITION_DELETE` no pertenece a la enumeración oficial](https://www.mql5.com/en/docs/constants/tradingconstants/enum_trade_transaction_type). [Firma oficial de `CTrade::Sell`](https://www.mql5.com/en/docs/standardlibrary/tradeclasses/ctrade/ctradesell).

Limitación de evidencia: el `run8.json` suministrado no contiene `mql5Result`, `compileErrors` ni `attempts`; termina en `retryCount`/`maxRetries`. Los tres intentos se sostienen en `diag-input-5.md` y en el límite `MAX_COMPILE_ATTEMPTS = 3`, no pueden verificarse directamente en ese JSON.

## CAMBIO_PROPUESTO

**Elección: (b), sustituir la Regla 1 por un contrato exacto de las APIs implicadas.**

**Archivo:** `src/mql5Generator.ts`  
**Ubicación:** `MQL5_STANDARD_SYSTEM_PROMPT`, Regla 1.  
**Único cambio:** reemplazar íntegramente la Regla 1 actual por este texto:

```diff
-1. NO INVENTES APIS/CONSTANTES: Usa únicamente identificadores oficiales del MQL5 Reference.
-   - Constantes prohibidas/inexistentes: TRADE_RETCODE_DONE_PARTIAL, TRADE_RETCODE_INVALID_ORDER,
-     TRADE_RETCODE_NO_CHANGES, trans.magic, ORDER_MAGIC_NUMBER, AccountBalanceDouble.
-   - Retcodes oficiales: TRADE_RETCODE_DONE (10009), TRADE_RETCODE_PLACED (10008). Usa CTrade para ejecución limpia.
+1. NO INVENTES APIS, CAMPOS, CONSTANTES NI SOBRECARGAS: Usa únicamente identificadores y firmas oficiales del MQL5 Reference.
+   - Identificadores prohibidos/inexistentes: TRADE_RETCODE_DONE_PARTIAL, TRADE_RETCODE_INVALID_ORDER,
+     TRADE_RETCODE_NO_CHANGES, TRADE_TRANSACTION_POSITION_DELETE, trans.magic, trans.profit,
+     ORDER_MAGIC_NUMBER y AccountBalanceDouble.
+   - CTrade::Buy y CTrade::Sell aceptan COMO MÁXIMO estos 6 argumentos:
+     volume, symbol, price, sl, tp, comment. El sexto argumento es el comentario.
+     NUNCA añadas un séptimo argumento de salida para ticket.
+     Patrón correcto para venta:
+     bool sent = trade.Sell(volume, _Symbol, 0.0, slPrice, tpPrice, "EA");
+     Después de la llamada consulta trade.ResultRetcode(), trade.ResultOrder() y trade.ResultDeal();
+     no intentes recibir el ticket como argumento de Buy o Sell.
+   - MqlTradeTransaction NO tiene un campo profit y no existe TRADE_TRANSACTION_POSITION_DELETE.
+     Si la estrategia no requiere lógica de transacciones, implementa la sección 8 exactamente como un handler vacío:
+     void OnTradeTransaction(const MqlTradeTransaction &trans,
+                             const MqlTradeRequest &request,
+                             const MqlTradeResult &result)
+       {
+       }
+   - Si la estrategia exige registrar cierres, detecta TRADE_TRANSACTION_DEAL_ADD; selecciona trans.deal
+     con HistoryDealSelect(trans.deal), comprueba DEAL_ENTRY_OUT o DEAL_ENTRY_OUT_BY mediante
+     HistoryDealGetInteger(trans.deal, DEAL_ENTRY), y obtiene el beneficio mediante
+     HistoryDealGetDouble(trans.deal, DEAL_PROFIT). Nunca leas el beneficio desde trans.
+   - Retcodes oficiales de éxito: TRADE_RETCODE_DONE (10009) y TRADE_RETCODE_PLACED (10008).
+     Usa CTrade para una ejecución limpia y valida siempre su resultado.
```

Este único cambio cubre los tres errores desde la primera generación, conserva la sección 8 exigida y no modifica `condicionEntrada`, la Regla 17 ni el Quality Gate.

## RIESGO_REGRESION

- El modelo puede preferir sistemáticamente el handler vacío, perdiéndose logging de cierres no esencial. No altera ejecución, señal ni backtest.
- Sigue siendo una defensa mediante prompt, no una garantía formal contra cualquier API inventada futura.
- `ResultOrder()` puede ser cero en determinadas ejecuciones de mercado; por eso el texto exige consultar también `ResultDeal()` y `ResultRetcode()`. Esto afecta al logging, no a la compilación.

## ALTERNATIVA_SI_FALLA

Si reaparece cualquiera de estos patrones después del cambio, el siguiente paso debe ser un **preflight determinista antes de `compileMql5()`**:

- Rechazar literalmente `TRADE_TRANSACTION_POSITION_DELETE` y `trans.profit`.
- Detectar llamadas `trade.Buy`/`trade.Sell` con más de seis argumentos.
- Añadir diagnósticos específicos al `buildFixPrompt()` y repetir la generación antes de consumir un intento de compilación.

Ese cambio sería más fiable, pero también mayor y más invasivo; no está justificado antes de probar el contrato exacto.

## OTROS_CANDIDATOS

- **(a) Hacer opcional `OnTradeTransaction`:** reduce superficie de error, pero deja intacto el `Sell` de siete argumentos y entra en conflicto con la Regla 14 actual de `codeReviewer.ts`. El handler vacío correcto obtiene el mismo beneficio sin cambiar la estructura.

- **(c) Sembrar el KB:** no es la primera opción. Ya existen las firmas genéricas `error 199` y `error 256`, pero apuntan a correcciones no relacionadas. Añadir más entradas sin cambiar la normalización puede mezclar recetas distintas bajo la misma firma.

- **(d) Cambiar de modelo:** puede elevar la tasa de éxito, pero no corrige el contrato defectuoso ni garantiza que otro modelo no invente las mismas APIs. Debe evaluarse después del cambio propuesto.

- **`codeReviewer.ts`:** contiene un punto ciego real: se ejecuta después de compilar y considera suficiente encontrar el texto `OnTradeTransaction`. Convertirlo en preflight bloqueante sería el endurecimiento posterior si el prompt no basta.

- **Defecto posterior no relacionado con compilación:** `InpSL_Pips * _Point` e `InpTP_Pips * _Point` convierten 15,2/30,4 “pips” en 1,52/3,04 pips en un EURUSD de cinco dígitos. Además, una orden de mercado debería normalmente usar precio `0.0` en `Sell`, no el cierre histórico. Deben revisarse después, como fidelidad de SL/TP y ejecución, sin mezclarlos con este único cambio.

===END DIAGNOSIS===

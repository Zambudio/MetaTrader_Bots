# Auditoría extrema end-to-end — pipeline de agentes IA / MQL5 / MetaTrader

Fecha: 2026-09-26. Alcance: auditoría completa del pipeline (análisis de mercado → agentes IA → StrategyProposal → juez/validador → generación MQL5 → compilación → backtest → frontend), siguiendo el encargo de auditoría extrema de 33 secciones. Trabajo realizado en `main` (working tree en progreso, heredado de sesiones previas) y en la rama `validacion-real-forex` (validación real end-to-end con datos y modelos reales).

## Resumen ejecutivo

El pipeline **no estaba roto de forma generalizada** — la mayoría de sus capas (parseo LLM, timeouts, reintentos, reconciliación de runs huérfanos, mutex de compilación/backtest, normalización JSON) ya estaban bien resueltas de sesiones de auditoría anteriores (commits previos a esta sesión: mutex E1, schema validation D1, SSRF/rate-limiting). El síntoma reportado por el usuario ("agentes completados pero pipeline pausado por error", "propuesta ejecutada pero veredicto ajustar") tenía una **causa raíz puntual y bien localizada**: un commit reciente (`b8ff5b6`) relajó el estado del run cuando el juez emitía GO con objeciones sin resolver, sin actualizar el gate real que decide si se puede generar MQL5 — dos definiciones distintas de "validado" conviviendo en el mismo campo `finalState`.

Además, al ejecutar el pipeline real end-to-end por primera vez con datos y modelos reales (rama `validacion-real-forex`, preset `forex_v1.1`), se reprodujo y corrigió el defecto real que impedía llegar nunca a un veredicto GO legítimo: el propio juez sobre-bloqueaba, y el agente de estrategia proponía sistemáticamente un Stop Loss fuera del rango de riesgo permitido. Tras corregir ambos, el pipeline completó por primera vez el recorrido íntegro: análisis → estrategia → juez GO → generación MQL5 real → compilación 0 errores → backtest headless completado.

## Arquitectura real encontrada

- **Pipeline por defecto en `main`** (`server/data/agents.json`): 3 agentes — `fx-simple-analyst → fx-simple-strategy → fx-simple-judge`. El último combina explícitamente validar y decidir veredicto en un solo agente (viola la separación de responsabilidades recomendada).
- **Pipeline riguroso validado en esta sesión** (preset `forex_v1.1`, rama `validacion-real-forex`): 8 agentes (`fx-structure`, `fx-momentum-volatility`, `fx-session`, `fx-macro`, `fx-strategy`, `fx-risk`, `fx-critic`, `fx-judge`), con Refutador/Crítico independiente del juez. No es el pipeline que corre por defecto para el usuario — es un preset separado. Decisión pendiente: promoverlo a default.
- **Orquestador** (`server/src/engine/orchestrator.ts`): máquina de estados por `Run.status` (`running|done|error`) y `Run.finalState` (`validated|rejected|insufficient_data|invalid_result|error`), sin locks/transacciones (mutaciones directas en memoria + persistencia a JSON). `reconcileOrquestadorRuns`/`runsStore.ts` sí reconcilia runs `running` huérfanos al arrancar el servidor (cubre el caso de reinicio a mitad de ejecución).
- **Generación MQL5**: el LLM escribe el Expert Advisor completo de una sola vez vía tool-call (`deliver_ea`), no hay una capa determinista de plantilla/StrategyIR real (el generador "de plantilla" solo existe como fallback en modo mock sin API key). Mitigado por un `systemPrompt` muy prescriptivo y un `CodeReviewer` post-hoc de 22 reglas — pero no hay verificación automática de que el código implemente literalmente la `condicionEntrada` aprobada (hueco real, sección 16 del encargo).
- **Compilación/backtest**: mutex global (`mt5Mutex.ts`) vigente y correcto; detección de `terminal64.exe` corriendo antes de backtest headless (falla rápido con mensaje claro en vez de colgarse 180s); límite de 3 intentos de auto-reparación de compilación sin bucle infinito.
- **Capa de normalización LLM**: única y no duplicada (`omniClient.sanitizeJsonResponse` + `buildJsonSchemaSystemMessage`), reutilizada literalmente por los adapters de Claude y Codex CLI — buena práctica ya existente, ahora reforzada (ver hallazgo #6).

## Problemas encontrados y corregidos

### #1 — Invariante de estado run/MQL5-gate rota (commit `b8ff5b6`)
- **SEVERIDAD:** alta. **COMPONENTE:** `server/src/engine/orchestrator.ts`.
- **ROOT CAUSE:** el commit `b8ff5b6e0` cambió el manejo de "veredicto GO con `unresolvedBlockers` no vacío" de `status='error'/finalState='invalid_result'` a `status='done'/finalState='validated'` (degradando el error a warning), pero **no tocó** `mql5Eligibility.validateMql5SourceRun`, que sigue exigiendo `unresolvedBlockers.length===0`. Dos consumidores del mismo campo `finalState` con definiciones distintas de "validado".
- **IMPACT:** exactamente el síntoma reportado: run mostrado como completado/validado en el frontend (botón habilitado), pero el backend rechaza generar MQL5 citando objeciones sin resolver al pulsar el botón.
- **FIX:** revertir la relajación cosmética; GO con blockers sin resolver vuelve a fallar cerrado (`error`/`invalid_result`/`CONTRACT_ERROR`).
- **TEST:** `server/test/orchestratorVerdictContract.test.ts` (2 casos: GO+blockers falla cerrado; GO limpio valida).
- **Commit:** `56448aa`.

### #2 — Botón de generación MQL5 sin defensa en profundidad
- **SEVERIDAD:** media. **COMPONENTE:** `src/components/StrategyResultCard.tsx`.
- **ROOT CAUSE:** `canGenerate` dependía solo de `isRunComplete` (`run.status==='done'`) y `verdictDecision==='go'`, sin comprobar `unresolvedBlockers` — delegaba 100% en el backend la garantía de "sin objeciones". Runs persistidos con el bug #1 antes del fix aún pueden tener ese estado inconsistente guardado en disco.
- **FIX:** `canGenerate` ahora exige también `unresolvedBlockers` vacío, espejando literalmente `mql5Eligibility.validateMql5SourceRun`; mensaje explícito en la UI para ese caso en vez de un botón deshabilitado sin explicación.
- **Commit:** `577f6d4`.

### #3 — `compileStatus:'unverified'` tratado como compilación exitosa
- **SEVERIDAD:** alta. **COMPONENTE:** `server/src/engine/mql5Compiler.ts`, `mql5Generator.ts`, `routes/mql5.ts`.
- **ROOT CAUSE:** si `METAEDITOR_PATH` no resolvía a un ejecutable real, o MetaEditor no escribía el log esperado, `compileMql5Internal` devolvía `{status:'unverified'}` (sin lanzar). Todo el código aguas abajo (`compile.status==='ok' || compile.status==='unverified'`) trataba ambos como equivalentes para pasar a code review, backtest y entrega al usuario.
- **IMPACT:** viola directamente el requisito "ningún MQL5 se considera correcto sin compilar" — un EA nunca compilado podía entregarse como si hubiera compilado con 0 errores.
- **FIX:** ambos casos ahora lanzan una excepción explícita en vez de devolver un status blando; se propaga hasta `failMql5Job` con el mensaje real. El modo mock (sin `OMNIROUTE_API_KEY`) no se ve afectado — hace `return` antes de llegar a esta función.
- **TEST:** `server/test/metaeditorCompiler.test.ts` (nuevo caso: `METAEDITOR_PATH` inexistente debe lanzar, no devolver `unverified`).
- **Commit:** `aa7e2c4`.

### #4 — `JSON.parse` falla con control characters sin escapar en código multilínea
- **SEVERIDAD:** alta. **COMPONENTE:** `server/src/engine/omniClient.ts` (`sanitizeJsonResponse`).
- **ROOT CAUSE:** descubierto reproduciendo en vivo la primera generación real de MQL5 (rama `validacion-real-forex`): Claude devolvió el tool-call `deliver_ea` con un salto de línea real (no escapado como `\n`) dentro del campo `code` (fuente MQL5 multilínea) → `JSON.parse` = `SyntaxError: Bad control character in string literal`. La capa de normalización única ya limpiaba fences de markdown y prefijo SSE, pero no este caso.
- **IMPACT:** aborta toda la generación del EA sin posibilidad de recuperación — exactamente el tipo de "posible fallo de parsing / JSON mal formado" que el encargo de auditoría pide cubrir explícitamente. Afecta a cualquier generación de código multilínea, no solo FOREX.
- **FIX:** `escapeUnescapedControlCharsInStrings` recorre el texto siguiendo el propio estado dentro/fuera-de-cadena de JSON y escapa cualquier control character encontrado dentro de un string a su forma válida, sin tocar nada fuera de cadenas.
- **TEST:** `server/test/sanitizeJsonResponse.test.ts` (4 casos, incluida la reproducción exacta del fallo real).
- **Commit:** `7e0a0ab` (también portado a `validacion-real-forex`, commit `4a14e23`).

### #5 — `codeReviewer` Regla 16: falso negativo en variables de guard prefijadas
- **SEVERIDAD:** baja. **COMPONENTE:** `server/src/engine/codeReviewer.ts`.
- **ROOT CAUSE:** descubierto auditando el primer EA MQL5 real compilado: el código tenía el guard de nueva barra correcto (`if(currentBarTime == g_lastBarTime) return;`) pero la regex de la Regla 16 solo reconocía los nombres exactos sin prefijo (`currentBarTime`/`lastBarTime`/`barTime`), marcando "no_cumple" sobre un guard que sí existía.
- **FIX:** ampliar el patrón a `\w*nombre\w*` en ambos lados de la comparación, tolerando convenciones de prefijo/sufijo sin cambiar el criterio real de la regla.
- **TEST:** `server/test/codeReviewer.test.ts` (nuevo caso con el patrón de nombres exacto del fallo real).
- **Commit:** `7f23be9` (también portado a `validacion-real-forex`, commit `5ae863f`).

### #6-#7 — Defectos de FASE 6 en `forex_v1.1` (solo en la rama de validación, no en `main`)
Ver detalle completo en `wiki-Traiding/proyecto-dashboard/informes/VALIDACION_REAL_FOREX.md` §"Continuación 2026-09-26": `fx-strategy` proponía sistemáticamente SL=1,00×ATR fuera de rango (PROMPT_ERROR, corregido con ejemplo numérico explícito en el prompt), y la heurística de detección de alucinaciones de liquidez tenía falsos positivos en negaciones con palabras intermedias (corregido ampliando el patrón de negación).

## Cierre de huecos (sesión de seguimiento, mismo día — el usuario pidió cerrar todo)

Todos los huecos H1-H7 identificados en la primera pasada de esta auditoría se cerraron en la misma sesión, a petición explícita del usuario ("quiero todo finalizado, sin deuda técnica"):

| # | Hueco | Estado | Fix |
|---|---|---|---|
| H1 | Sin test de fidelidad semántica EA↔StrategyProposal | ✅ **RESUELTO** | `mql5FidelityChecker.ts` nuevo: verificación determinista **advisory** (no bloqueante) de dirección de entrada (BUY/SELL debe coincidir con `trade.Buy()`/`trade.Sell()`) e indicadores declarados realmente invocados en el código (`iMA`/`iRSI`/`iATR`/...). Visible en `Mql5GenerationResult.fidelityCheck` y en la UI (`Mql5CodeBlock.tsx`). Advisory a propósito: un check nuevo y estricto tiene alto riesgo de falso positivo (ver H3 más abajo). Commit `19c1761`. |
| H2 | Sin lock de idempotencia en `POST /runs/:id/resume` | ✅ **RESUELTO** | `runLockRegistry.ts` nuevo: lock en memoria por `run.id`, check+set síncrono sin `await` de por medio — dos peticiones "a la vez" quedan serializadas por el propio event loop. Se libera en cualquier salida temprana o cuando el resume termina. Commit `4ea2f9e`. |
| H3 | `codeReviewer` Regla 20 falso positivo en `Print()` de error de orden | ✅ **RESUELTO** | Solo marca spam si el `Print()` en `else` NO coincide con un patrón de reporte de resultado/error de orden (`retcode`, `ResultRetcodeDescription`, etc.). Commit `1805224`. |
| H4 | `AGENT_CLI_RETRIES`/`isTransientCliError` no mergeados en `main` | ✅ **RESUELTO** | Portado a `main` con cuidado de preservar mejoras propias de `main` que la rama forex no tenía (soporte de `AbortSignal` del botón "Detener", `describeClaudeFailure` mejorado) — `isTransientCliError` adaptado a los mensajes de error reales de `main`. De paso se corrigió el único error de typecheck preexistente (`routes/agents.ts:151`, schema de activación sin validar contra el enum real). Commit `42d1a16`. |
| H5 | Pipeline por defecto (3 agentes, juez=validador combinado) | 🟡 **Mitigado, decisión de producto sigue abierta** | Se corrigió el síntoma concreto y de mayor riesgo: el prompt del juez pedía "recalcular geometría/R:R/ATR" — exactamente lo que `strategyValidator.ts` ya garantiza deterministamente antes de que la propuesta le llegue. Reescrito para prohibir esa recomputación redundante y centrar su juicio en lo que el backend no puede validar (evidencia real, contradicciones, dependencia de datos ausentes). Commit `729bb0a`. La decisión de fondo — promover el panel de 8 agentes de `forex_v1.1` a pipeline por defecto, o mantenerlos separados — es una decisión de producto que corresponde al usuario, no se fuerza aquí. |
| H6 | OmniRoute no operativo con la cuenta actual | ✅ **RESUELTO en código** (la causa externa — la cuenta OmniRoute — sigue igual, pero deja de ser un bloqueo operativo) | `mql5Generator.requestEaCompletion` cae automáticamente a `claude:sonnet` (router de CLI) cuando OmniRoute agota su cadena de fallback interna, sin necesitar configuración manual. Nunca sustituye una elección explícita de fuente CLI del usuario. Commit `208fe2d`. |
| H7 | `fx-session` erraba la aritmética de pips (10x) | ✅ **RESUELTO** (rama `validacion-real-forex`) | Ejemplo numérico resuelto añadido a la instrucción compartida de conversión a pips, mismo patrón que el fix de SL=1×ATR de FASE 6. Verificado con una corrida real posterior: aritmética correcta. De paso se encontró y corrigió un segundo bug en la propia heurística de auditoría (`hasUnsupportedLiquidityClaim`: "fina" matcheaba sin límite de palabra dentro de "refinar", falso positivo de alucinación). Commits `52344c0` (fix) + `0047594` (docs). |

## Cambios realizados (resumen completo de commits)

**`main`:**
- `56448aa` — fix: revert cosmetic status relaxation that broke run/MQL5-gate invariant.
- `577f6d4` — fix(frontend): defense-in-depth for MQL5 generation gate vs unresolvedBlockers.
- `aa7e2c4` — fix: never treat unresolvable MetaEditor compilation as compiled MQL5.
- `7e0a0ab` — fix: escape unescaped control chars inside JSON string literals before parse.
- `7f23be9` — fix: codeReviewer Rule 16 false negative on prefixed bar-guard variables.
- `42d1a16` — fix: port CLI retry infra to main; fix agent activation schema type error (H4).
- `208fe2d` — fix: mql5Generator falls back to CLI automatically when OmniRoute is exhausted (H6).
- `4ea2f9e` — fix: idempotency lock for POST /runs/:id/resume (H2).
- `19c1761` — feat: deterministic (advisory) fidelity check between generated MQL5 and StrategyProposal (H1).
- `1805224` — fix: codeReviewer Rule 20 false positive on order-error-report Print() (H3).
- `729bb0a` — fix: stop asking fx-simple-judge to redundantly recompute risk geometry (H5, mitigación).
- `c3cec16` — docs: auditoría extrema end-to-end del pipeline (este documento, primera versión).

**`validacion-real-forex`:**
- `a9c2413` — fix(forex): widen liquidity-negation heuristic in audit false-positive guard.
- `4a14e23` — fix: escape unescaped control chars inside JSON string literals before parse (portado).
- `5ae863f` — fix: codeReviewer Rule 16 false negative on prefixed bar-guard variables (portado).
- `9574ea7` — fix(forex): validación real forex_v1.1 completa — VALIDATED_REAL.
- `52344c0` — fix(forex): pip-arithmetic worked example (H7) + liquidity-heuristic word-boundary bug.
- `0047594` — docs(forex): cierre de huecos H1-H7 del informe de auditoría.
- Además, ya en la rama previamente: `7d86764` (FASE 6, rango SL/ATR explícito), `6c5cf84`, `d55fa69`, `0071f66`, y demás commits del carril `validacion-real-forex` documentados en `HANDOFF_CONTINUACION.md`.

## Tests añadidos y ejecutados

| Test | Casos | Resultado |
|---|---:|---|
| `orchestratorVerdictContract.test.ts` | 2 | ✅ |
| `metaeditorCompiler.test.ts` (+1 caso) | 2 | ✅ |
| `sanitizeJsonResponse.test.ts` | 4 | ✅ |
| `codeReviewer.test.ts` (+3 casos entre las dos rondas) | 7 | ✅ |
| `cliClientsShared.test.ts` | 10 | ✅ |
| `claudeCliRetries.test.ts` | 4 | ✅ |
| `mql5GeneratorCliFallback.test.ts` | 6 | ✅ |
| `runLockRegistry.test.ts` | 4 | ✅ |
| `runsResumeConcurrency.test.ts` | 4 | ✅ |
| `mql5FidelityChecker.test.ts` | 8 | ✅ |
| `forexAuditRules.test.ts` (+2 casos, rama forex) | 9 | ✅ |
| Suite completa `main` | 186 | ✅ 186/186 |
| Suite completa `validacion-real-forex` | 113 | ✅ 113/113 |
| `npm run typecheck` (ambas ramas) | — | ✅ **100% limpio, cero errores** (el único preexistente en `routes/agents.ts:151` se corrigió como parte de H4) |
| `npm run build` (frontend) | — | ✅ |

Hallazgo de entorno (no de código): la suite de tests y el build fallan si se ejecutan desde la ruta UNC (`\\Zambu-nas\...`) por un bug de resolución de paquetes de Vite/Node con rutas de red — funcionan correctamente ejecutados desde la unidad mapeada `Z:\`. Puede explicar falsos "está roto" en verificaciones previas.

## Matriz de proveedores/modelos

| Proveedor | Uso en el pipeline | Estado final |
|---|---|---|
| Claude (CLI, suscripción) | Análisis de agentes (`claude:sonnet`) y generación de código MQL5 | ✅ Funcional end-to-end (8 agentes + generación de EA real, compilación, backtest). |
| Codex/OpenAI (CLI, suscripción) | Alternativa de análisis/orquestación | No re-verificado en esta sesión (auditado en sesiones previas, ver memoria del proyecto). |
| OmniRoute (`auto/best-reasoning`, `auto/pro-coding`, `auto/smart`, y sub-modelos `mistral/*`, `oc/*`) | Generación de código MQL5 (ya no es un punto único de fallo) | ⚠️ La cuenta configurada sigue sin acceso a modelos funcionales de codegen, pero el pipeline ya **no depende de que el usuario lo sepa ni lo arregle manualmente**: cae automáticamente a Claude CLI (H6). |

## Estado de MQL5 / compilación / backtesting

- **Generado:** sí, real (no mock), desde un run `validated+go+0 blockers` real.
- **Compilado:** sí, MetaEditor64 real instalado en esta máquina, 0 errores, 0 warnings, 1 intento.
- **Backtest:** sí, smoke headless completado limpio (MetaTrader cerrado, sin intervención manual): 336 deals, 168 operaciones cerradas, 0 órdenes rechazadas. Resultado económico negativo (PF 0,84, esperanza -0,10R) — **no exigido ni optimizado**, por política explícita de esta validación; confirma únicamente que el EA ejecuta la lógica aprobada sin errores técnicos sobre datos reales.

## Riesgos pendientes (tras el cierre)

1. **H5 (decisión de producto)**: el pipeline por defecto de 3 agentes queda mitigado (ya no le pide al LLM recalcular geometría) pero sigue siendo estructuralmente más simple que el panel de 8 agentes validado en `forex_v1.1`. Requiere una decisión explícita del usuario: promover el panel de 8 a default, mantenerlos como presets separados, o fusionar `validacion-real-forex` completa a `main`.
2. La cuenta OmniRoute en sí (no el código) sigue sin acceso a modelos de codegen funcionales — el fallback automático (H6) lo hace invisible operativamente, pero conviene resolver la suscripción/cuenta cuando sea posible por coste/latencia (el fallback añade una llamada extra fallida antes de recurrir a Claude).
3. Ninguno de los huecos originales queda abierto como bug de código sin mitigar.

## Resultado final

- **LIVE TRADING permanece bloqueado**: 0 órdenes reales en toda la sesión (esta y la de seguimiento), todo el trabajo fue análisis, compilación y backtest headless.
- El pipeline se considera **estable para paper trading / backtesting** sobre el preset `forex_v1.1` (panel de 8 agentes) y sobre el pipeline por defecto de `main` (3 agentes, con la mitigación de H5 aplicada) — typecheck 100% limpio, 186+113 tests en verde en ambas ramas, sin deuda técnica de código conocida pendiente. La única decisión que queda explícitamente en manos del usuario es de **producto** (H5: qué pipeline debe ser el default), no de corrección.
- Ver `wiki-Traiding/proyecto-dashboard/informes/VALIDACION_REAL_FOREX.md` para el detalle completo de la validación real de FOREX y `HANDOFF_CONTINUACION.md`/`HANDOFF_CODEX.md` para el histórico previo a esta sesión.

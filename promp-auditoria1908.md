# Prompt de corrección — Auditoría técnica trading-agents-dashboard (2026-08-19)

> **Instrucciones de uso**: este documento se entrega literalmente a una IA ejecutora (Claude Code u otra) como instrucción de trabajo. Está redactado en segunda persona porque es un prompt, no un informe para humanos. Ejecuta las fases en orden — no empieces la Fase 2 sin haber cerrado la Fase 1, no toques la Fase 4 si quedan pendientes de fases anteriores. Cada hallazgo incluye archivo, evidencia, qué debes construir y cómo se verifica que quedó bien.

---

## 1. Rol y misión

Eres un ingeniero senior de trading algorítmico y programación MQL5, actuando como responsable técnico de `trading-agents-dashboard` dentro del proyecto `MetaTrader_Bots`. Tu misión es llevar el sistema de agentes IA y el generador de código MQL5 a cumplir el estándar que **el propio proyecto ya se ha fijado** en `wiki-Traiding/proyecto-mt5-bots/` — no estás inventando requisitos nuevos, estás cerrando la brecha entre lo que el proyecto dice que hace y lo que el código realmente hace hoy. Los documentos de referencia obligatorios son:

- `wiki-Traiding/proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md` — 22 reglas obligatorias para cualquier EA generado por IA.
- `wiki-Traiding/proyecto-mt5-bots/05_Gestion_Riesgo_EAs.md` — política de riesgo y `hard_limits` deterministas.
- `wiki-Traiding/proyecto-mt5-bots/07_Backtesting_Optimizacion_y_Validacion_Quant.md` — protocolo de validación quant.
- `wiki-Traiding/proyecto-mt5-bots/04_Modelo_Trading_Ordenes_Deals_Posiciones.md` — modelo de órdenes/deals/posiciones.
- `wiki-Traiding/proyecto-mt5-bots/03_Arquitectura_Expert_Advisors.md` — arquitectura modular de EAs.
- `wiki-Traiding/proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md` — pipeline de backtest agéntico (documentado pero **no implementado** hoy).
- `wiki-Traiding/proyecto-mt5-bots/00_Contexto_y_Objetivos_Proyecto.md` §4 — principio arquitectónico central: la IA es capa de investigación, nunca el motor de ejecución.

## 2. Reglas de trabajo no negociables

1. **No marques nada como "hecho" sin compilar contra MetaEditor real** cuando el cambio afecte código MQL5 generado. Si `metaeditor64.exe` no está disponible en el entorno de ejecución, dilo explícitamente en tu resumen final — no asumas que "no hay errores visibles" equivale a "compila".
2. **La IA no es el motor de ejecución.** No implementes nada que haga que un LLM decida en tiempo real si se abre una operación. `real_money_trading: false` y `ai_initiated_trading: false` deben permanecer así en cualquier política de riesgo que definas o toques.
3. **Sigue el orden de fases.** Fase 1 (Crítico) antes que Fase 2 (Alto), antes que Fase 3 (Medio), antes que Fase 4 (Bajo). Si una tarea de fase posterior es un prerrequisito técnico de una tarea de fase anterior, dilo explícitamente y reordénalo, pero no lo hagas en silencio.
4. **Nunca dejes el contrato (`wiki-Traiding/proyecto-mt5-bots/*`) desactualizado en silencio.** Si decides que el código debe divergir deliberadamente de un documento (como ya pasó con la regla de logging vs. anti-spam, ver 1.7), actualiza el documento en el mismo cambio, explicando el motivo.
5. **No inventes APIs de MQL5.** Ante cualquier duda sobre una función, constante o comportamiento de MQL5, dilo explícitamente en vez de asumir — es la causa raíz de la reincidencia de errores documentada en 2.6.
6. Cuando una tarea sea grande (p. ej. 1.5, el pipeline de backtest), puedes descomponerla en sub-PRs/commits, pero el resultado final de la Fase 1 debe dejar el flujo completo (generar → compilar → revisar → backtest → Quality Gate → entrega) operativo de punta a punta, no a medias.

---

## 3. Resumen ejecutivo de hallazgos

| Fase | Nº hallazgos | Foco |
|---|---|---|
| 1 — Crítico | 9 | Integridad de la estrategia y del código MQL5 entregado; riesgo real de que se entregue un EA roto, sin SL, sin backtest, o basado en reglas desactualizadas |
| 2 — Alto | 6 | Robustez del pipeline, consistencia entre módulos, seguridad básica |
| 3 — Medio | 6 | Calidad de datos, trazabilidad, cobertura de tests |
| 4 — Bajo | 6 | Limpieza, consistencia documental, detalles de UX |

Todos los hallazgos provienen de una auditoría de código línea por línea contra el estándar documentado en `wiki-Traiding/proyecto-mt5-bots/`, realizada el 2026-08-19 sobre el estado del working tree en ese momento (incluye cambios sin commitear en `orchestrator.ts`, `realExecutor.ts`, `routes/runs.ts`, `Dashboard.tsx`, `api.ts`, `store.ts`, y el nuevo `AgentLogsPanel.tsx`).

---

## 4. FASE 1 — CRÍTICO

### 1.1 Validación determinista de coherencia numérica de la propuesta de estrategia

- **Archivos**: `server/src/types.ts` (`StrategyProposalLite`: `puntoEntrada`, `stopLoss`, `takeProfit` son `string` libres), `server/src/engine/realExecutor.ts` (`STRATEGY_TOOL` líneas ~14-37, `runRealAgent` líneas 231-283 — castea a string sin validar contenido), `server/src/engine/orchestrator.ts` (ningún punto del código parsea o verifica estos valores).
- **Problema**: la coherencia de la estrategia (`TakeProfit > Entrada > StopLoss` en compra, inverso en venta) depende al 100% de que `agente-validador-tecnico` razone correctamente sobre texto libre. No existe ni una sola línea de código que parsee estos campos a número y verifique el orden. Un LLM que se equivoque —o alucine— pasa la validación si el `agente-razonador` no lo detecta.
- **Qué construir**: cambia el schema de `STRATEGY_TOOL` para que `puntoEntrada`, `stopLoss`, `takeProfit` sean campos numéricos estructurados (o añade campos numéricos paralelos `entryPriceNum`, `stopLossNum`, `takeProfitNum`, `direction: 'buy'|'sell'`) y añade, en `orchestrator.ts`, un paso determinista tras la ejecución de `agente-riesgo` que: (a) parsea esos valores, (b) verifica el orden correcto según `direction`, (c) verifica una relación R:R mínima (coherente con la regla que ya exige `agente-riesgo` en su `systemPrompt`, R:R ≥ 1:1.5). Si falla, marca el resultado del agente como `error` con un mensaje explícito — no dejes que la propuesta siga adelante "porque el LLM dijo que estaba bien".
- **Criterio de aceptación**: test unitario con 4 casos sintéticos (compra válida, compra con stops invertidos, venta válida, venta con stops invertidos) que confirme que el código —sin llamar a ningún LLM— rechaza los casos inválidos.

### 1.2 Forzar Stop Loss obligatorio y position sizing por riesgo real en el MQL5 generado

- **Archivos**: `server/src/engine/mql5Generator.ts` (`MQL5_STANDARD_SYSTEM_PROMPT` líneas 27-85, `DELIVER_EA_TOOL` líneas 87-110, `buildMockResult` líneas 193-240).
- **Problema**: la regla 5 del prompt solo exige normalizar el volumen a `SYMBOL_VOLUME_STEP` *si* el modelo decide poner un volumen — no hay ninguna regla que obligue a que toda apertura de posición lleve SL, ni una fórmula de sizing por % de riesgo de cuenta. El propio `StrategyProposal` no lleva un campo `riskPercent`/`lotSize` estructurado — todo depende de cómo el LLM interprete texto libre.
- **Qué construir**: añade una regla obligatoria explícita al `MQL5_STANDARD_SYSTEM_PROMPT`: *"Toda apertura de posición (OrderSend/trade.Buy/trade.Sell) DEBE incluir un Stop Loss válido — está prohibido enviar una orden sin SL salvo justificación explícita y documentada en el propio código."* Añade también la fórmula de sizing obligatoria: `volumen = riesgo_monetario / (distancia_SL_en_ticks × tick_value)`, usando `SymbolInfoDouble(SYMBOL_TRADE_TICK_VALUE)`/`AccountInfoDouble(ACCOUNT_BALANCE)` en tiempo real, normalizado a `SYMBOL_VOLUME_STEP` y acotado a `[VOLUME_MIN, VOLUME_MAX]` (ver `wiki-Traiding/proyecto-mt5-bots/05_Gestion_Riesgo_EAs.md` §4). Pasa `riskPercentPerTrade` como input estructurado desde la propuesta de riesgo (reutiliza el trabajo de 1.1).
- **Criterio de aceptación**: para una estrategia de prueba, el `.mq5` generado siempre asigna SL antes de cualquier llamada de apertura, y el cálculo de volumen usa las propiedades reales del símbolo/cuenta, no un lote fijo hardcodeado.

### 1.3 Implementar `hard_limits` deterministas (kill switch de riesgo)

- **Archivos**: no existen hoy — solo aparecen como comentario placeholder en `mql5Generator.ts:221-222` (`// [SIMULADO] Aquí iría: ... RiskManager.validate() -> ...`); referencia de diseño en `wiki-Traiding/proyecto-mt5-bots/05_Gestion_Riesgo_EAs.md` §5.
- **Problema**: el documento de riesgo exige que la pérdida diaria máxima/drawdown máximo detengan nuevas entradas de forma determinista ("kill switch local"), sin esperar a que ningún agente lo decida. Hoy no existe ningún código —ni módulo común, ni bloque inyectado— que implemente esto en el `.mq5` generado.
- **Qué construir**: añade al prompt de generación (o, si decides construir el flujo de includes de 4.6, como módulo separado) un bloque obligatorio que, en `OnTick()`, calcule la pérdida/drawdown del día contra `AccountInfoDouble` y bloquee nuevas entradas determinísticamente si se supera el umbral configurado — sin intervención de ningún LLM en tiempo real.
- **Criterio de aceptación**: el código generado incluye ese chequeo antes de cualquier llamada de apertura de posición; un test manual simulando pérdida acumulada por encima del umbral confirma que no se abren nuevas posiciones.

### 1.4 Bloquear la entrega de código con errores de compilación o sin verificar

- **Archivos**: `src/components/Mql5CodeBlock.tsx` (líneas ~54-117 — los botones Copiar/Descargar permanecen activos sea cual sea `compileStatus`).
- **Problema**: un EA con `compileStatus: 'errors'` (falló tras 3 intentos) o `'unverified'` (MetaEditor no disponible en el servidor) se muestra igual que uno compilado limpio, con los mismos botones de acción disponibles.
- **Qué construir**: deshabilita Copiar/Descargar (o exige una confirmación explícita de "descargar de todos modos, bajo tu responsabilidad", con advertencia roja no descartable) cuando `compileStatus !== 'ok'` **y**, tras completar 1.5, cuando el Quality Gate del backtest no haya pasado.
- **Criterio de aceptación**: con `compileStatus: 'errors'` simulado, la UI bloquea o exige confirmación explícita antes de permitir copiar/descargar.

### 1.5 Construir el pipeline de backtest automático headless + Quality Gate (doc 20)

- **Archivos**: `server/src/engine/mt5LogParser.ts` (no calcula drawdown), `server/src/routes/backtest.ts` (requiere pegar el log a mano), `trading-agents-dashboard/scripts/run_backtest.ps1` (script standalone que sí automatiza `terminal64.exe` pero no está conectado a ningún código del servidor), `wiki-Traiding/proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md`.
- **Problema**: el doc 20 promete literalmente *"garantizar que la plataforma nunca entregue código MQL5 al usuario sin haber sido validado y testeado al 100% de forma autónoma con datos históricos reales"*. Hoy eso es falso: el backtest es 100% manual (el usuario arrastra un `.log`), no hay Quality Gate cuantitativo aplicado en código, no hay cálculo de drawdown, y no hay ningún bucle que conecte un backtest fallido con una nueva generación corregida. El script que sí sabe automatizar `terminal64.exe` (`run_backtest.ps1`) existe pero no está conectado a nada.
- **Qué construir**:
  1. Generación dinámica de `autotester_<id>.ini` (símbolo, timeframe, rango 6-12 meses, modelo de tick "every tick based on real ticks", depósito, apalancamiento) — usa `run_backtest.ps1` como referencia de los parámetros correctos.
  2. Invocación headless de `terminal64.exe /config:...` desde Node (`child_process`, con el mismo cuidado que `mql5Compiler.ts` ya tiene con el exit code no fiable — usa el log/reporte como fuente de verdad, no el código de salida).
  3. Amplía `mt5LogParser.ts` para calcular **drawdown máximo** (no existe hoy) además de las métricas actuales.
  4. Aplica el **Quality Gate cuantitativo del doc 20 §4**, con los umbrales fijados de antemano (no ajustables después de ver el resultado, por la misma razón que documenta `07_...md` §7): ≥15 operaciones, 0 órdenes rechazadas, esperanza matemática >0.10R, Profit Factor ≥1.20, beneficio neto >0, drawdown máximo ≤15%.
  5. Conecta el resultado del gate al bucle de generación: si falla, aplica una acción correctiva concreta (breakeven dinámico, trailing ATR, filtro de régimen ADX/EMA, reajuste SL/TP por ATR — según doc 20 §5) y regenera, hasta un máximo de 3-5 ciclos; si sigue sin pasar, marca el EA como "descartado" explícitamente en vez de entregarlo silenciosamente.
- **Criterio de aceptación**: generar una estrategia dispara el backtest automáticamente sin que el usuario pegue ningún log; la UI muestra el veredicto del Quality Gate con cada umbral individual (pasa/no pasa); un EA que falla el gate entra en el bucle de iteración y, si agota los ciclos, se marca como descartado en vez de entregarse como si fuera válido.

### 1.6 Añadir un `CodeReviewerAgent` que verifique las 22 reglas del doc 17

- **Archivos**: `server/src/store/agentsStore.ts` (roster de 6 agentes, ninguno cumple este rol), `wiki-Traiding/proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md` §3 (*"El cumplimiento de la sección 1 no se da por supuesto porque el prompt lo pida: se verifica con una revisión posterior (CodeReviewerAgent)"*).
- **Problema**: ese agente de revisión, que el propio estándar del proyecto exige, no existe. Hoy la única "verificación" del cumplimiento de las 22 reglas es que el prompt de generación las pida — exactamente lo que el documento dice que no es suficiente.
- **Qué construir**: añade un paso (agente LLM dedicado, o una combinación de checks deterministas + LLM) que se ejecute tras la compilación exitosa y antes del backtest (1.5), y que evalúe explícitamente cada una de las 22 reglas de `17_...md` §1 contra el código generado, produciendo un veredicto por regla.
- **Criterio de aceptación**: la salida de este paso lista las 22 reglas con un veredicto individual (cumple/no cumple/no aplica); un "no cumple" en cualquier regla bloquea el avance a backtest hasta corregirse.

### 1.7 Corregir la contradicción entre "logging completo" (doc 17 regla 20) y "prohibición anti-spam" (prompt real regla 12)

- **Archivos**: `server/src/engine/mql5Generator.ts:51-53` (regla 12 actual: prohíbe `Print()` en ramas no ejecutadas de `OnTick()`), `wiki-Traiding/proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md` regla 20 (vigente, exige registrar "señal filtrada y por qué").
- **Problema**: el commit `a42b1c2` resolvió un problema real (logs de varios GB que congelaban MetaTrader en backtest) prohibiendo directamente el logging de señales filtradas, sin actualizar el documento "contrato" que sigue exigiendo justo eso. Hoy el código y el estándar del proyecto se contradicen activamente.
- **Qué construir**: sustituye la prohibición total por un patrón de logging **limitado por barra** (aprovechando el guard de nueva vela ya obligatorio, regla 10): registra la razón de filtrado como máximo una vez por barra, no una vez por tick. Actualiza `wiki-Traiding/proyecto-mt5-bots/17_...md` regla 20 para reflejar la política final acordada (con la justificación del límite por barra), de forma que el documento y el prompt de producción dejen de contradecirse.
- **Criterio de aceptación**: el código generado registra razones de señal filtrada como máximo una vez por barra procesada (verificable inspeccionando el `.mq5` generado); el texto de la regla 20 en `17_...md` coincide con el comportamiento realmente exigido.

### 1.8 Aviso explícito a los agentes cuando el snapshot de mercado es `null` en modo real

- **Archivos**: `server/src/engine/realExecutor.ts` (`buildUserPrompt`, líneas ~208-217 — omite el bloque de snapshot sin más si es `null`), compárese con `server/src/engine/mockExecutor.ts:32` (sí avisa explícitamente: *"Snapshot de mercado recibido: no (sin velas disponibles)"*).
- **Problema**: en modo real, si `buildMarketSnapshot` devuelve `null` (proveedor caído, símbolo no soportado, menos de 15 velas), los agentes simplemente no ven la sección de snapshot en su prompt, sin ninguna indicación de que falta. El prompt del Analista Técnico exige basarse "EXCLUSIVAMENTE" en el snapshot — si no hay aviso, el modelo puede alucinar datos de mercado sin que el sistema lo marque de ninguna forma.
- **Qué construir**: cuando `snapshot` sea `null` en modo real, antepone al prompt un bloque de aviso explícito equivalente al de `mockExecutor.ts`, instruyendo al modelo a no inventar datos de precio/indicadores y a señalar expresamente esa limitación en su análisis.
- **Criterio de aceptación**: al forzar un fallo de proveedor de datos (símbolo inválido o mock de red caída), la salida de los agentes reconoce explícitamente la ausencia de datos de mercado en vez de proceder como si los tuviera.

### 1.9 Versionar `agents.json` y eliminar la divergencia con `DEFAULT_AGENTS`

- **Archivos**: `trading-agents-dashboard/.gitignore:26` (ignora toda `server/src/data/`), `server/src/store/agentsStore.ts:9-70` (`DEFAULT_AGENTS`, fallback hardcodeado), `server/src/data/agents.json` (roster vivo, no versionado).
- **Problema**: el roster vivo tiene `systemPrompt` más estrictos para `agente-riesgo` y `agente-validador-tecnico` que su fallback en código (que además referencia un mecanismo de "Objeciones del Razonador" ya no vigente en el prompt real), y usa un modelo distinto (`auto/best-chat` vs `auto/chat`). Como `server/src/data/` no está versionado, si esa carpeta se pierde o se despliega en una máquina nueva, el sistema revierte silenciosamente a reglas de coherencia numérica menos estrictas — sin ningún aviso al usuario de que el comportamiento cambió.
- **Qué construir**: versiona el contenido canónico del roster (ajusta `.gitignore` para excluir específicamente `agents.json` de la exclusión general de `data/`, o mueve el roster a un archivo de configuración versionado separado de los datos volátiles como `runs/`). Sincroniza `DEFAULT_AGENTS` en `agentsStore.ts` para que sea textualmente idéntico al roster versionado (mismo `systemPrompt`, mismo modelo) en los 6 agentes.
- **Criterio de aceptación**: `git status` muestra el archivo de roster (o su semilla) trackeado; una clonación nueva del repo + `npm install` reproduce exactamente los prompts estrictos actuales sin pasos manuales adicionales; `DEFAULT_AGENTS` y el archivo versionado son idénticos campo a campo.

---

## 5. FASE 2 — ALTO

### 2.1 Cuelgue indefinido de un run en estado `'running'`

- **Archivos**: `server/src/engine/orchestrator.ts:233-237` (cálculo de estado final), `buildLevels` líneas 25-61 (nivel "huérfano" para dependencias cíclicas/inexistentes), `src/lib/store.ts` (`runWorkflow`/`resumeWorkflow`, bucle `while (true)` de polling, líneas ~84-125).
- **Problema**: si tras `runPass` quedan agentes en `waiting` permanente (dependencias huérfanas o cíclicas en un `agents.json` editado a mano), el run queda marcado `'running'` para siempre sin ningún proceso activo trabajándolo; el polling del frontend nunca termina, sin timeout ni mensaje de error visible.
- **Qué construir**: valida `agents.json` al cargarlo (reutiliza `detectCycle` de `routes/agents.ts:78`) y rechaza arrancar un run si el grafo de dependencias no es válido, en vez de dejarlo fallar en silencio en tiempo de ejecución. Añade un timeout global de run (p. ej. si no hay progreso en N minutos, márcalo `error` explícitamente). Añade un límite/timeout también en el bucle de polling del frontend, con mensaje de error visible al usuario si se alcanza.
- **Criterio de aceptación**: un `agents.json` con dependencias huérfanas o cíclicas hace que la creación del run falle con un error claro, no que quede colgado; un run simulado sin progreso durante el timeout configurado termina en `error` visible en la UI.

### 2.2 Unificar el cliente OmniRoute entre `realExecutor.ts` y `mql5Generator.ts`

- **Archivos**: `server/src/engine/realExecutor.ts` (`fetchWithTimeout`/`chatCompletion`, líneas ~89-164 — retry, fallback JSON ante 400, sanitización de fences/SSE), `server/src/engine/mql5Generator.ts` (`chatCompletion`, líneas 152-191 — sin retry, sin fallback, sin sanitización).
- **Problema**: dos implementaciones independientes del mismo tipo de llamada HTTP, con robustez muy distinta, pese a que la de `mql5Generator.ts` genera código de trading ejecutable — arguiblemente más crítica que el análisis de texto.
- **Qué construir**: extrae un módulo cliente HTTP compartido (retry, backoff, fallback a JSON-prompt ante 400, `sanitizeJsonResponse`) y úsalo desde ambos sitios.
- **Criterio de aceptación**: módulo único importado por ambos flujos; una respuesta simulada de OmniRoute envuelta en fences de markdown, o un primer intento con 400, se maneja igual de bien en la generación de MQL5 que en el análisis de agentes.

### 2.3 Exponer `maxRetries` en la UI

- **Archivos**: `src/lib/api.ts:30-31` (`startRun` nunca envía `maxRetries`), `src/components/Dashboard.tsx`.
- **Problema**: el backend soporta `maxRetries` configurable (tope `MAX_RETRIES_CAP = 3`), pero no hay ningún control de UI para fijarlo — todo run usa siempre el valor por defecto (2).
- **Qué construir**: añade un control simple (selector/número, acotado a 0-3) en el flujo de inicio de análisis, y pásalo a través de `api.startRun`.
- **Criterio de aceptación**: iniciar un análisis con un valor de `maxRetries` elegido se refleja en el campo `maxRetries` del `Run` creado.

### 2.4 Autenticación mínima en la API Express

- **Archivos**: configuración de la app Express (`cors()` sin restricción de origen), todas las rutas en `server/src/routes/*.ts`.
- **Problema**: no hay autenticación ni autorización en ningún endpoint — cualquier proceso con acceso de red al puerto del servidor puede disparar runs, modificar/borrar agentes, o generar código MQL5.
- **Qué construir**: añade un middleware de clave compartida simple (variable de entorno, p. ej. `DASHBOARD_API_KEY`) exigido al menos en los endpoints mutantes (POST/PUT/DELETE). Documenta la configuración en `server/README.md`.
- **Criterio de aceptación**: peticiones sin la clave correcta reciben `401`; el README explica cómo configurarla.

### 2.5 Validar no-vacío en campos de estrategia/veredicto

- **Archivos**: `server/src/engine/realExecutor.ts` (`runRealAgent`, líneas ~231-283 — castea con `typeof === 'string' ? valor : ''` sin comprobar no-vacío), `server/src/routes/mql5.ts` (`isValidStrategy`, líneas ~9-21 — mismo patrón).
- **Problema**: una estrategia con `puntoEntrada: ""`, `stopLoss: ""`, etc. pasa como formalmente "válida" y sigue el flujo completo, incluida la generación de MQL5.
- **Qué construir**: tras parsear los argumentos de la tool call, exige no-vacío en los campos críticos (`resumen`, `puntoEntrada`, `stopLoss`, `takeProfit`, dirección); si falta alguno, marca el agente en error en vez de dejarlo pasar.
- **Criterio de aceptación**: una respuesta simulada del LLM con `puntoEntrada` vacío produce un error de agente, no una tarjeta de estrategia "exitosa" aguas abajo.

### 2.6 Reforzar la base de conocimiento de errores MQL5 (56 repeticiones de la misma firma)

- **Archivos**: `server/src/store/mql5KnowledgeStore.ts` (`normalizeSignature` líneas 29-34, `recordConfirmedFix` líneas 76-107), `server/src/data/mql5-known-issues.json`.
- **Problema**: la firma de error `error 256: undeclared identifier` (constantes `TRADE_RETCODE_*` inventadas) se registró como "corregida" 56 veces entre el 15 y el 17 de agosto de 2026 — la lección inyectada en el prompt no está previniendo estructuralmente la reincidencia.
- **Qué construir**: investiga por qué la inyección de la lección no reduce la recurrencia; refuerza el mecanismo incluyendo un fragmento de código correcto (no solo una descripción textual del error) en la lección inyectada, y/o añade una lista explícita de identificadores comúnmente alucinados (`TRADE_RETCODE_*`, etc.) directamente en la regla "no inventes APIs" del prompt de generación.
- **Criterio de aceptación**: instrumenta el registro de reincidencia por firma de error y confirma una tendencia descendente tras el cambio, o añade una verificación previa al envío al compilador que bloquee identificadores conocidos como alucinados antes de gastar un ciclo de compilación.

---

## 6. FASE 3 — MEDIO

### 3.1 Validación de frescura temporal del snapshot de mercado
- **Archivo**: `server/src/engine/marketSnapshot.ts` (`buildMarketSnapshot`, líneas ~229-246).
- **Fix**: compara el timestamp de la última vela contra la hora actual; si excede un umbral razonable para el timeframe, márcalo explícitamente como snapshot obsoleto (no solo ausente).

### 3.2 `pipMultiplier` heurístico por substring
- **Archivo**: `server/src/engine/marketSnapshot.ts` (línea ~145, heurística `pair.includes('JPY') ? 100 : ... : 10000`).
- **Fix**: sustituye la heurística de substring por consulta real de propiedades del instrumento (o una tabla explícita de especificación por símbolo), especialmente para materias primas/índices/acciones vía Twelve Data donde el multiplicador por defecto probablemente es incorrecto.

### 3.3 Aproximaciones de `mt5LogParser` (contrato/cotización/comisión/swap)
- **Archivo**: `server/src/engine/mt5LogParser.ts` (comentario líneas ~111-114, asume contrato estándar 100.000 unidades y cotización directa a USD, ignora comisión/swap).
- **Fix**: calcula estas cifras a partir de datos reales del reporte/log cuando estén disponibles, o marca explícitamente en la UI (no solo en el nombre del campo) que son aproximaciones para pares no cotizados directo contra USD.

### 3.4 Suite mínima de tests automatizados
- **Archivos**: no existe framework de testing en ningún `package.json` del monorepo (frontend ni backend).
- **Fix**: añade un framework de test (recomendado: vitest, coherente con el stack Vite) con cobertura mínima de: construcción de niveles/subgrafo de reintento del orquestador, el validador numérico determinista de 1.1, el parseo de logs de `mql5Compiler`/`mt5LogParser`, y el cálculo de indicadores de `marketSnapshot`.

### 3.5 Circuit breaker / rate limiting hacia OmniRoute
- **Archivos**: `realExecutor.ts`, `mql5Generator.ts`.
- **Fix**: añade un breaker simple (N fallos consecutivos en una ventana → cortocircuita llamadas siguientes con error claro) para no machacar un gateway caído.

### 3.6 Trazabilidad completa del código compilado (`agent_provenance`)
- **Archivos**: `server/src/engine/mql5Compiler.ts:78-82` (borra `.mq5`/`.log`/`.ex5` temporales sin dejar rastro), `wiki-Traiding/proyecto-mt5-bots/16_Observabilidad_Auditoria_y_Reproducibilidad.md` §6.
- **Fix**: persiste el `.mq5` final entregado (idealmente también el `.ex5` compilado) junto a metadatos de procedencia (agente/modelo/versión de prompt/timestamp) en vez de borrar todos los artefactos.

---

## 7. FASE 4 — BAJO

### 4.1 Estado `'idle'` muerto en `AgentRunResult.status`
- **Archivo**: `server/src/types.ts`. El valor `'idle'` está en el tipo pero nunca se asigna en el backend (los resultados nacen en `'waiting'`). Elimínalo del tipo o dale un uso real y documentado.

### 4.2 `clipboard.writeText` sin manejo de rechazo
- **Archivo**: `src/components/AgentLogsPanel.tsx:68`. Añade `.catch` con feedback visible al usuario si falla (puede fallar por permisos del navegador).

### 4.3 Protección ante múltiples agentes con `outputType: 'verdict'`
- **Archivos**: `server/src/store/agentsStore.ts` / `server/src/routes/agents.ts`, `server/src/engine/orchestrator.ts:207` (usa `agents.find` — solo el primero controla el retry). Valida en la creación/edición de agentes que como máximo exista un agente `outputType: 'verdict'` (y considera la misma restricción para `'strategy'`); rechaza la configuración si no se cumple.

### 4.4 Diferenciación de errores en el store del frontend
- **Archivo**: `src/lib/store.ts`. Un único campo `error` global es compartido por todas las operaciones (carga inicial, ejecución de run, resume, favoritos, dependencias). Da a cada dominio de error su propio campo o etiqueta de contexto/severidad.

### 4.5 Documentar por qué difiere el modelo de fallback final
- **Archivos**: `realExecutor.ts:238` (`'auto/best-reasoning'`) vs `mql5Generator.ts:283` (`'auto/best-coding'`). Añade un comentario explicando que es intencional (modelo de razonamiento para análisis vs. modelo de código para generación MQL5), para que quede claro que no es una deriva accidental.

### 4.6 Resolver la contradicción documental sobre arquitectura modular
- **Archivos**: `wiki-Traiding/proyecto-mt5-bots/17_...md` / `03_Arquitectura_Expert_Advisors.md` (piden módulos comunes `RiskManager.mqh`/`TradeExecutor.mqh`/etc.) vs. el prompt real de producción (`mql5Generator.ts:75-78`, exige explícitamente un único archivo `.mq5` autocontenido sin includes propios). Decide explícitamente una postura — mantener autocontenido por simplicidad de compilación aislada (documentando el motivo en `17_...md`/`03_...md`), o migrar a includes compartidos (mayor trabajo, pero más cercano al estándar) — y deja el código y la documentación coherentes entre sí, no contradictorios como hoy.

---

## 8. Checklist de verificación final

No des ninguna fase por terminada solo porque "el LLM dice que está bien" — es exactamente el principio que el propio estándar del proyecto exige para el código (`17_...md` §3) y debe aplicarse igual a tu propio trabajo. Antes de reportar esta auditoría como resuelta, verifica explícitamente, uno por uno:

**Las 22 reglas de `wiki-Traiding/proyecto-mt5-bots/17_Estandar_Desarrollo_EAs_con_IA.md` §1**, contra el prompt real de generación (`MQL5_STANDARD_SYSTEM_PROMPT`) y contra el código que ese prompt produce:
1. No inventar APIs de MQL5.
2. Consultar documentación oficial ante cualquier duda.
3. Compilar siempre antes de considerar un cambio terminado.
4. Cero warnings salvo justificación explícita por escrito.
5. No usar look-ahead.
6. No mezclar lógica de señal y ejecución.
7. No asumir equivalencia pip/tick/point.
8. Consultar propiedades reales del símbolo en runtime, nunca hardcodear.
9. Normalizar volumen a `SYMBOL_VOLUME_STEP`, acotado a `VOLUME_MIN`/`VOLUME_MAX`.
10. Validar stops contra `SYMBOL_TRADE_STOPS_LEVEL`/`SYMBOL_TRADE_FREEZE_LEVEL`.
11. Usar Magic Number en toda operación.
12. Tratar errores y retcodes explícitamente.
13. No asumir que `OrderSend() == true` implica fill.
14. Observar `OnTradeTransaction()` para reconstruir estado real.
15. Impedir duplicación de posiciones por ticks repetidos.
16. Distinguir nueva barra de nuevo tick.
17. Evitar operaciones múltiples por la misma señal.
18. Documentar los `input` (comentario de qué representa y su unidad).
19. Separar parámetros optimizables de hard risk limits.
20. Logging suficiente para reconstruir decisiones (ver 1.7 — versión revisada con throttling por barra).
21. Código versionado.
22. Backtest reproducible.

**Umbrales del Quality Gate de `wiki-Traiding/proyecto-mt5-bots/20_...md` §4** (implementados en 1.5): ≥15 operaciones en 6-12 meses; 0 órdenes rechazadas; esperanza matemática >0.10R; Profit Factor ≥1.20; beneficio neto >0 USD; drawdown máximo ≤15%.

**Hard limits deterministas de `wiki-Traiding/proyecto-mt5-bots/05_Gestion_Riesgo_EAs.md` §5** (implementados en 1.3): `real_money_trading: false`, `ai_initiated_trading: false`, límite de pérdida diaria/drawdown como kill switch, límite de posiciones simultáneas, límite de exposición por activo — todos en código común, no en `input` de cada EA.

## 9. Qué NO tocar

- No conviertas el dashboard en una plataforma de ejecución real. El README raíz declara explícitamente que "nunca ejecuta operaciones ni se conecta a ningún broker" — esto debe seguir siendo cierto después de tus cambios.
- No implementes ningún camino donde un LLM decida en tiempo real si abrir/cerrar una operación (`00_Contexto_y_Objetivos_Proyecto.md` §4).
- No habilites `ai_initiated_trading` en ninguna política de riesgo que crees o edites.
- No uses servidores MCP de terceros que envuelvan `order_send` — fuera de alcance del proyecto (`wiki-Traiding/proyecto-mt5-bots/10_...md` §2).

## 10. Definición de terminado

Este trabajo está completo cuando:
1. Las 9 tareas de la Fase 1 están implementadas y verificadas según su criterio de aceptación individual.
2. Las 6 tareas de la Fase 2 están implementadas.
3. Las 6 tareas de la Fase 3 están implementadas (o, si alguna se pospone deliberadamente, queda documentada explícitamente como pendiente, con motivo).
4. Las 6 tareas de la Fase 4 están implementadas.
5. El checklist de la sección 8 se ha recorrido explícitamente, regla por regla, contra el código final — no contra el prompt que se lo pide al LLM.
6. `wiki-Traiding/proyecto-mt5-bots/17_...md` (y cualquier otro documento tocado) refleja fielmente el comportamiento final del código — sin contradicciones silenciosas.
7. Entregas un resumen final indicando, para cada fase, qué se hizo, qué se verificó y cómo (compilación real, test automatizado, prueba manual reproducible) — no una declaración genérica de "completado".

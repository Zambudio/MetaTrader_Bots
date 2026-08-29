---
tags: [proyecto-dashboard, agentes, mql5, backtest, loop, autonomo, completado]
updated: 2026-08-29
---

# Plan: bucle autónomo hasta Quality Gate verde en EUR/USD H1

> **✅ COMPLETADO 2026-08-29 (iteración 6).** El Quality Gate pasó 6/6 en EUR/USD H1. Estrategia y métricas en el informe vivo `../informes/2026-08-29-loop-quality-gate-verde-eurusd.md` §Cierre. Hizo falta corregir 5 bugs del pipeline (panel con dependencia circular, tesis de tipo estado, fiabilidad de modelo OmniRoute, contrato de APIs MQL5, y — el crítico — el parser de backtest medía sobre la sesión equivocada).

> **Carta operativa de un bucle `/loop` auto-ritmo.** No es un plan de implementación tarea-a-tarea al uso: describe el **procedimiento que se repite en cada iteración** hasta que un ciclo completo agentes → MQL5 → backtest real pase el Quality Gate cuantitativo. Contexto: [`../informes/2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md`](../informes/2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md) dejó el panel funcionando bien pero **ningún análisis llegó a "GO"** y `retryStrategyForBacktestFailure` sigue sin verificarse en vivo; [`../informes/2026-08-20-diagnostico-veredicto-vs-backtest-real.md`](../informes/2026-08-20-diagnostico-veredicto-vs-backtest-real.md) identificó la causa estructural. El registro vivo de la ejecución de este plan está en [`../informes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../informes/2026-08-29-loop-quality-gate-verde-eurusd.md).

## Objetivo

Iterar el sistema (prompts de agentes, generador MQL5, y — con autorización explícita, ver §"Arreglos estructurales" — la propia arquitectura del pipeline) **hasta que un ciclo completo produzca un Expert Advisor que pase el Quality Gate en un backtest real de EUR/USD H1**, documentando y commiteando cada iteración.

Diagnóstico de partida: el panel da (o debería dar) "GO" juzgando solo coherencia puntual sobre el snapshot; el backtest juzga rentabilidad sobre ~12 meses de histórico. Los dos no se hablaban bien. Hay que descubrir, iteración a iteración, si el fallo está en (I) la calidad de la tesis que propone `agente-riesgo`, (II) la fidelidad del código MQL5 a la `condicionEntrada` aprobada, o (III) la gestión de la operación (SL/TP/breakeven/filtro de régimen) — y cerrarlo.

## Definición de "terminado" (condición de éxito, única y estricta)

`evaluateQualityGate(stats).passed === true` (los 6 criterios en verde) sobre el backtest headless real de **EUR/USD H1**, rango por defecto del backtester (`2025.08.01`–`2026.08.18`, ~12,5 meses, "every tick"). Umbrales (`server/src/engine/qualityGate.ts:20-27`):

| Criterio | Umbral | id |
|---|---|---|
| Operaciones cerradas | ≥ 15 | `min_trades` |
| Órdenes rechazadas | 0 | `zero_rejections` |
| Esperanza matemática | > 0.10 R | `expectancy_r` |
| Profit Factor | ≥ 1.20 | `profit_factor` |
| Beneficio neto | > 0 USD | `net_profit` |
| Drawdown máximo | ≤ 15 % | `max_drawdown` |

Cuando esto se cumpla: escribir el cierre en el informe vivo, commit final, **`ScheduleWakeup({stop:true})`** y avisar a Pedro. No seguir "por si mejora".

## Vehículo: `/loop` en modo auto-ritmo

### Cómo se lanza (Pedro)

```
/loop Ejecuta una iteración del bucle definido en wiki-Traiding/proyecto-dashboard/planes/2026-08-29-loop-quality-gate-verde-eurusd.md — lee antes el "Estado actual" del informe vivo para saber por dónde vas.
```

`/loop` **sin intervalo** ⇒ modo dinámico: en cada turno se ejecuta UNA iteración completa del procedimiento de abajo y al final se llama a `ScheduleWakeup` con el mismo prompt y un `delaySeconds` (900–1800 s típico; ver §"Paso 7"). Pedro puede interrumpir en cualquier momento escribiendo en el prompt; para pararlo del todo, `/loop` de nuevo con `stop` o pedirlo por texto.

### Persistencia de estado entre wake-ups

Cada wake-up es un turno nuevo y el contexto puede haberse resumido. **La fuente de verdad del estado es el informe vivo** `wiki-Traiding/proyecto-dashboard/informes/2026-08-29-loop-quality-gate-verde-eurusd.md`:

- Su sección **`## Estado actual`** (al principio) se **reescribe entera** cada iteración: nº de iteración, fase en la que está, hipótesis viva, lista de cambios ya probados y su efecto, notas de cuota, y "siguiente acción concreta".
- Debajo, **`## Log de iteraciones`** es append-only: una subsección `### Iteración N (fecha hora)` por vuelta.
- Al arrancar cada iteración: leer ese archivo entero + `git log --oneline -15` para reconstruir dónde se está. No fiarse de la memoria de la conversación.

## Procedimiento de iteración

### Paso 0 — Salud del entorno (idempotente)

1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/api/agents` → si no es `200`, arrancar el backend **sin `tsx watch`** (el watch sobre disco de red genera reinicios fantasma que dejan runs huérfanos — lección del informe 29-ago):
   ```bash
   cd trading-agents-dashboard/server && ./node_modules/.bin/tsx --env-file-if-exists=.env src/index.ts
   ```
   con `run_in_background: true`. Esperar a que `/api/agents` responda `200` (reintentar cada 3 s, máx 60 s). `reconcileOrphanedRuns` limpia runs `running` huérfanos al arrancar.
2. Calentar la caché de velas: `curl -s "http://localhost:5175/api/candles?pair=EUR/USD&timeframe=H1" > /dev/null`. Si tarda >30 s o da error (Twelve Data free tier intermitente), reintentar una vez; si vuelve a fallar, anotar "sin datos de mercado" en el informe y **saltar la iteración** (programar wake-up en ~1200 s) — un análisis sin snapshot se desperdicia porque los agentes trabajan a ciegas.
3. Verificar MetaEditor/terminal presentes: `ls "/c/Program Files/MetaTrader 5/metaeditor64.exe"` y `terminal64.exe`. Si faltan, parar el loop y avisar (no se puede validar nada sin backtest real).

### Paso 1 — Análisis (`POST /api/runs`)

```bash
curl -s -X POST http://localhost:5175/api/runs -H 'Content-Type: application/json' \
  -d '{"pair":"EUR/USD","timeframe":"H1","maxRetries":3}'
```
Devuelve `202` + objeto `Run` con `id`. Hacer polling a `GET /api/runs/:id` cada 10 s hasta `status` `done` o `error` (timeout duro 12 min — el panel son 6 llamadas a OmniRoute de hasta 180 s + reintentos).

- `status: error` → leer qué agente falló (`results[].status === 'error'`, `results[].error`). Si es OmniRoute (timeout/503) → reintentar el run una vez; si persiste, anotar y programar wake-up largo (OmniRoute inestable, esperar). No cuenta como iteración de progreso.
- `status: done` → extraer del `Run`:
  - **estrategia**: `results.find(r => r.strategy).strategy` — es un `StrategyProposalLite` completo (ya incluye `pair`, `timeframe`, `condicionEntrada`, `direction`, SL/TP numéricos, etc., puestos en `realExecutor.ts:150`).
  - **veredicto**: `results.find(r => r.verdict).verdict` — `{ veredicto: 'go'|'ajustar'|'no_operar', razon, objeciones[] }`.
  - **retryCount** alcanzado.

### Paso 2 — Ramificar por veredicto

- **`no_operar`** o **`ajustar` tras agotar `maxRetries`** (= el panel no da GO):
  Esto es un dato de "tesis demasiado floja / panel demasiado estricto". → **Paso 4** con `contexto = "NO_GO"`: mandar a Codex el `Run` JSON completo (las 6 salidas de agente) + los prompts actuales de los 6 agentes, y pedir el diagnóstico de por qué no hay GO y qué edición concreta de prompt lo arreglaría **sin relajar el rigor** (no vale "haz que diga GO siempre"). Aplicar (Paso 5), documentar (Paso 6), siguiente iteración.
- **`go`** → **Paso 3**.

### Paso 3 — Generación + compilación + backtest (`POST /api/mql5/generate`)

Replicar exactamente lo que hace el frontend (`src/lib/api.ts:57`, `StrategyResultCard.tsx:47`): `POST /api/mql5/generate` con body `{ "strategy": <objeto StrategyProposalLite tal cual salió del Run>, "model": "auto/best-chat", "runId": "<run.id>" }`.

**No hay `jq` instalado** en este entorno — construir el body escribiendo el JSON a un fichero (`scratchpad/gen-body-<iter>.json`) con `node -e` o `python`, o con `Write`, y mandarlo con `curl -d @scratchpad/gen-body-<iter>.json`. `model` = el de `agente-riesgo` (`auto/best-chat`). **`runId` es obligatorio** — sin él, `retryStrategyForBacktestFailure` (el bucle backtest→panel) no se dispara nunca (`routes/mql5.ts:59`).

Devuelve `{ jobId }`. Polling a `GET /api/mql5/generate/:jobId` cada 5 s hasta `status` `completed` o `failed` (timeout duro 25 min — hasta 3 compilaciones + hasta 2 ciclos de optimización de código + hasta 2 ciclos de re-estrategia, cada uno con backtest real de ~3 min). Si da `404` ("Job no encontrado — el servidor se reinició") → el backend cayó a mitad; volver al Paso 0.

Del `job.result` (un `Mql5GenerationResult`) extraer:
- `compileStatus` (`ok` / `errors` / `unverified`), `compileErrors[]`.
- `backtestSession?.stats` (métricas parseadas) y `qualityGate` (`{ passed, criteria[], score, recommendedAction }`).
- `strategyFeedbackCycles`, `discarded` + `discardReason`, `optimizationNotes[]`, `qualityNotes[]`.
- La ruta del `.mq5` entregado (para que Codex lo lea).

Ramas:
- **`qualityGate.passed === true`** → **✅ TERMINADO.** Ir a "Definición de terminado": cierre en informe, commit, `ScheduleWakeup({stop:true})`, avisar a Pedro con el resumen de métricas.
- **`compileStatus: 'errors'`** tras los 3 intentos → **Paso 4** con `contexto = "COMPILE"`: Codex diagnostica el fallo de generación / la regla 17 del estándar.
- **`discarded === true`** (el Razonador emitió NO_OPERAR informado del backtest real) → dato fuerte: la tesis de `agente-riesgo` para este setup no tiene ventaja. **Paso 4** con `contexto = "DISCARDED"`: ¿qué hace que `agente-riesgo` proponga sistemáticamente tesis sin ventaja en EUR/USD H1? ¿Falta el arreglo estructural (c)?
- **`qualityGate.passed === false`** y no descartada (ya se gastaron los 2 ciclos de `retryStrategyForBacktestFailure` + los 2 de optimización de código) → **Paso 4** con `contexto = "QG_FAIL"` + todas las métricas + el `.mq5` + la `condicionEntrada` aprobada.

### Paso 4 — Diagnóstico delegado a Codex

Codex (cuota ChatGPT, separada de la de Claude) hace la lectura pesada y propone; Claude decide y aplica.

1. Escribir `scratchpad/diag-input-<iter>.md` con **todo** lo que Codex necesita para el `contexto` en cuestión:
   - `contexto` (NO_GO / COMPILE / DISCARDED / QG_FAIL) y nº de iteración.
   - Resumen de las últimas 3-5 iteraciones y sus cambios (del informe vivo) — para que no reproponga algo ya probado.
   - Rutas absolutas a: el `Run` JSON persistido, `server/src/data/agents.json`, el `.mq5` entregado, `server/src/engine/mql5Generator.ts`, `qualityGate.ts`, `strategyValidator.ts`, `marketSnapshot.ts`, `realExecutor.ts`, y este plan.
   - Para QG_FAIL: las 6 métricas con su umbral y si pasa/falla cada una, + `optimizationNotes` ya intentadas.
2. Llamar:
   ```bash
   codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high \
     "Lee $ABS/scratchpad/diag-input-<iter>.md y todos los archivos que referencia. \
      Diagnostica la causa raíz del fallo del contexto indicado. Clasifícalo en I (tesis floja del panel), \
      II (código MQL5 infiel a la condicionEntrada aprobada), o III (gestión de operación: SL/TP/breakeven/filtro de régimen). \
      Propón CAMBIOS CONCRETOS: archivo, función, y el texto nuevo exacto (prompt) o el diff (código). \
      Cada cambio debe ser pequeño y atribuible. Si crees que hace falta uno de los 3 arreglos estructurales del plan, dilo y justifícalo. \
      NO edites nada. Envuelve tu respuesta entre las marcas ===BEGIN DIAGNOSIS=== y ===END DIAGNOSIS===, \
      con las secciones: CLASIFICACION, CAUSA_RAIZ, CAMBIOS_PROPUESTOS, RIESGO_REGRESION, ALTERNATIVA_SI_FALLA."
   ```
   `$ABS` = ruta absoluta del repo. `--sandbox read-only` para que solo lea. Capturar stdout, extraer lo que va entre las marcas.
3. Si Codex falla (sin cuota / error): registrarlo en el informe y hacer el diagnóstico con un subagente Claude (`Agent` tool, `subagent_type: general-purpose`) como fallback. Si también falla, hacerlo Claude en línea (más caro).

### Paso 5 — Aplicar el cambio, verificar, commit

1. **Juicio de Claude sobre la propuesta de Codex**: ¿es coherente con el diagnóstico? ¿es el cambio más pequeño que ataca la causa? ¿ya se probó algo equivalente sin efecto (mirar informe)? Si no convence, ajustarlo o pedir a Codex una alternativa. No aplicar a ciegas.
2. **Aplicar** con `Edit`. Si el cambio toca un prompt de agente: **sincronizar los 3 sitios** — `server/src/data/agents.json`, `DEFAULT_AGENTS` en `server/src/store/agentsStore.ts`, y el preset activo `"La primera completa"` en `server/src/data/agentConfigs.json` (lección del informe 29-ago: se desincronizaron y el cambio no tuvo efecto). `agents.json` se relee de disco en cada petición, así que no hace falta reiniciar el backend para probar prompts; los cambios de código `.ts` **sí** requieren reiniciar el proceso del backend (matarlo y relanzarlo en el Paso 0 de la iteración siguiente).
3. **Verificar**: `cd trading-agents-dashboard && npx tsc --noEmit -p server` (y `-p .` si se tocó cliente) → debe pasar limpio. `npm run lint` si se tocó mucho.
4. **Commit** (uno por iteración, mensaje descriptivo):
   ```
   loop(iter N): <qué se cambió y por qué en una línea>

   Contexto: <NO_GO|COMPILE|DISCARDED|QG_FAIL>. Diagnóstico (Codex): <clasificación I/II/III>.
   Métricas backtest previas: <si aplica>.
   Ver informe vivo §Iteración N.

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_01Uz1xJxiE797FbedxVzMR5K
   ```
   Incluir en el mismo commit el archivo de código/prompt **y** la actualización del informe vivo (Paso 6). Estamos en `main`; Pedro aprobó commit directo por iteración.

### Paso 6 — Documentar en el informe vivo

Reescribir `## Estado actual` entero y **añadir** `### Iteración N (fecha hora)` con: contexto, veredicto del panel, métricas exactas del backtest (las 6, con pasa/falla), clasificación de Codex, cambio aplicado (archivo + resumen), hash del commit, nota de cuota (¿cuánta cuota Claude queda? ¿Codex respondió?). Fecha/hora vía `date "+%Y-%m-%d %H:%M"` en bash.

### Paso 7 — Programar siguiente wake-up o parar

- **Parar** (`ScheduleWakeup({stop:true})`) si: Quality Gate verde | 15 iteraciones sin progreso hacia verde (definir progreso: nº de criterios del QG en verde aumenta, o se pasa de NO_GO a GO de forma estable) | bloqueo de entorno irrecuperable (MetaEditor ausente, OmniRoute caído >2 h, disco de red inaccesible) → en estos dos últimos casos, avisar a Pedro con qué hace falta.
- Si no, `ScheduleWakeup`:
  - `delaySeconds: 900` si la iteración avanzó normal y OmniRoute/Twelve Data respondían bien.
  - `delaySeconds: 1800` si hubo flakiness de infra (dar aire).
  - `noop: false` si se aplicó un cambio y se commiteó; `noop: true` si la iteración se saltó por infra.
  - `prompt`: el mismo texto que Pedro pasó a `/loop` (verbatim).
  - `reason`: una frase concreta ("iter N aplicó fix de prompt a agente-riesgo; espero al siguiente análisis").

## Los 3 arreglos estructurales autorizados

Pedro dio vía libre para cerrarlos, pero **solo cuando el loop demuestre que hacen falta** — nunca los tres de golpe, nunca sin que una iteración previa lo justifique en el informe. Cada uno, cuando se aborde, se trata como sub-tarea: diseño breve en el informe → implementación mínima → `tsc --noEmit` → commit → seguir iterando.

### Arreglo (b) — gate determinista de `condicionEntrada` [riesgo bajo]
**Disparador**: 2+ iteraciones donde el backtest da "0 operaciones" o `<15`, o donde Codex clasifica el fallo como "regla que casi nunca dispara".
**Qué**: en `strategyValidator.ts` / `orchestrator.ts`, tras generar la estrategia y antes de dejarla pasar a los validadores, evaluar `condicionEntrada` (parseada a una expresión sobre indicadores) contra las ~500 velas más recientes ya en caché; si dispararía `<15` veces/año estimado, tratarlo como fallo de validación numérica (mismo mecanismo de reintento in-situ que ya existe para R:R mal calculado, `orchestrator.ts:233-259`) con un mensaje que empuje a `agente-riesgo` a ensanchar la regla. Cierra el agujero de que la "mecanicidad" hoy solo la juzga el LLM.

### Arreglo (c) — señal histórica barata para el veredicto [riesgo medio]
**Disparador**: el panel llega a GO pero el backtest real pierde de forma repetida (2+ iteraciones QG_FAIL con tesis distintas), o descarta repetidamente — señal de que el veredicto no puede distinguir tesis buenas de malas sin ver histórico.
**Qué**: módulo nuevo (p. ej. `engine/entrySignalProbe.ts`) que, dada la `condicionEntrada` y las velas recientes (las 5000 de Twelve Data ya disponibles), cuenta señales y calcula un win-rate/expectativa aproximados de una regla SL/TP simple, y devuelve un bloque de texto ("En los últimos ~12 meses esta condición habría disparado ~N veces; con SL/TP propuestos, win-rate aprox X %, expectativa aprox Y R"). Se inyecta como contexto extra a `agente-refutador` y `agente-razonador` (vía `extraContextByAgentId`, mecanismo que ya existe) **antes** del veredicto. Así "GO" pasa a estar informado por histórico, no solo por el snapshot puntual. Es una aproximación (no el backtest real de MT5), pero suficiente para que el panel deje de aprobar reglas que un vistazo al histórico tumbaría.

### Arreglo (a) — fidelidad del código a la `condicionEntrada` [riesgo medio]
**Disparador**: Codex clasifica un QG_FAIL como tipo II (el `.mq5` no implementa la regla aprobada, la relaja, o inventa lógica desde `puntoEntrada`).
**Qué**: endurecer la regla 17 del `MQL5_STANDARD_SYSTEM_PROMPT` (`mql5Generator.ts:66-71`) y **hacer bloqueante** parte de `reviewMql5Code` (`codeReviewer.ts`) — hoy solo hace `console.warn` (`mql5Generator.ts:508-510`): al menos las comprobaciones de que el Signal Generator referencia los indicadores de `condicionEntrada` y no usa `puntoEntrada` como lógica de señal deben abortar la entrega y volver al bucle de fix.

## Barandillas (qué NO hacer)

- **Nunca** reescribir código no relacionado, refactorizar "de paso", ni tocar el frontend salvo que un cambio de tipos lo obligue.
- **Nunca** relajar el Quality Gate ni sus umbrales para "llegar a verde". El objetivo es una estrategia que de verdad los pase.
- **Nunca** un prompt que fuerce "GO siempre" o "no critiques". El rigor del panel es la única defensa contra estrategias perdedoras.
- Un cambio por iteración (uno o dos archivos de prompt sincronizados, o un archivo de código + su informe). Si Codex propone 5 cambios, aplicar el de mayor palanca y anotar el resto como "candidatos" en el informe.
- `tsc --noEmit` verde antes de cada commit. Sin excepción.
- Los 3 sitios del roster siempre sincronizados tras tocar un prompt.
- No borrar el informe vivo ni reescribir el log de iteraciones — solo `## Estado actual` se sobrescribe.

## Condiciones de parada

| Condición | Acción |
|---|---|
| Quality Gate verde (6/6) en EUR/USD H1 | Cierre en informe, commit final, `stop:true`, avisar a Pedro con métricas |
| 15 iteraciones sin progreso | Parar, informe con el análisis de por qué está atascado y qué recomienda (¿otro par? ¿arreglo estructural mayor? ¿límite del enfoque?) |
| MetaEditor/terminal ausente | Parar, pedir a Pedro que verifique la instalación de MT5 |
| OmniRoute caído > 2 h continuas | Parar, avisar; reanudable con `/loop` cuando vuelva |
| Pedro interrumpe | Obedecer lo que pida |

## Política de cuota

- **Baseline**: Claude orquesta (curl, polling, parseo de JSON, juicio, `Edit`, commit, informe); **Codex hace todo el diagnóstico pesado** (leer `Run` JSON de 30-80 KB, leer `.mq5`, leer prompts, razonar la causa raíz, redactar diffs). Coste Claude por iteración: bajo.
- Registrar en cada `### Iteración N` una estimación de cuota Claude restante (por sensación de los avisos del entorno) y si Codex respondió.
- **Si la cuota Claude se acerca al límite**: mover también a `codex exec` el análisis del `Run` (clasificar veredicto, decidir rama) y la redacción de los `Edit` (Codex escribe el texto nuevo exacto, Claude solo lo pega y commitea). Anotarlo en `## Estado actual`.
- **Si Codex se queda sin cuota**: fallback a subagente Claude (`Agent`, `general-purpose`) para el diagnóstico; si ese también, Claude en línea. Anotarlo.
- **Alternativa de más potencia** (no usar salvo que Pedro lo pida): `orca orchestration` — workers supervisados con worktree aislado (`orca orchestration worker-start --task <id> --agent codex`). Más setup; el `/loop` + `codex exec` cubre el caso.

## Riesgos de entorno conocidos y mitigación

| Riesgo | Mitigación (ya incorporada arriba) |
|---|---|
| `tsx watch` sobre disco de red → reinicios fantasma, runs huérfanos | Arrancar backend **sin** `watch` (Paso 0) |
| Twelve Data free tier → timeout al pedir 5000 velas de EUR/USD H1 | Calentar caché antes (Paso 0.2); saltar iteración si falla dos veces |
| OmniRoute → timeouts 180 s y 503 de endpoints free en `auto/best-chat` | Timeouts y reintentos ya subidos en `omniClient.ts` (informe 29-ago); reintentar run una vez; wake-up largo si persiste |
| `npx tsx` cayó una vez con exit 127 sobre disco de red | Usar el binario local `./node_modules/.bin/tsx`, no `npx` |
| Job de generación se pierde si el backend reinicia a mitad (estado en memoria) | Detectar `404` en el polling → volver al Paso 0; no cuenta como iteración |

## Ver también

- [`../informes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../informes/2026-08-29-loop-quality-gate-verde-eurusd.md) — registro vivo de la ejecución de este plan (estado + log de iteraciones).
- [`../informes/2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md`](../informes/2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md) — estado del sistema justo antes de este bucle.
- [`../informes/2026-08-20-diagnostico-veredicto-vs-backtest-real.md`](../informes/2026-08-20-diagnostico-veredicto-vs-backtest-real.md) — la causa estructural que este bucle termina de cerrar.
- [`../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md`](../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md) — el pipeline de Quality Gate / iteración que esto ejercita.
- [`../../../trading-agents-dashboard/server/README.md`](../../../trading-agents-dashboard/server/README.md) — arquitectura técnica del orquestador y el backtester.

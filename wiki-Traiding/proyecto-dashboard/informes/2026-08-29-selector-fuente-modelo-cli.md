---
tags: [proyecto-dashboard, agentes, modelos, cli, frontend, backend, orquestador, informe, terminado]
updated: 2026-08-29
---

# Informe: selector de fuente/modelo/esfuerzo por CLI de suscripción + ejecución en paralelo + motor de MQL5 elegible

> Implementación del plan [`../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md`](../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md) y de dos mejoras que Pedro pidió al probarlo.
> **✅ TERMINADO — 2026-08-29.** Rama `feat/selector-fuente-modelo-cli`, 3 commits, pusheada a `origin`. `tsc` (server + front) y `vite build` limpios; backend arranca sin `tsx watch`; test de aceptación pasado entero.

## Resumen — 3 entregas

| # | Commit | Qué |
|---|---|---|
| 1 | `9e199bb` | **Selector en cascada fuente → modelo → esfuerzo** en el modal de cada agente. Claude por CLI `claude` (suscripción), OpenAI por CLI `codex` (ChatGPT). Cero claves de API de pago. |
| 2 | `706d489` | **Ejecución en paralelo** de los agentes de un mismo nivel del grafo (antes: uno a uno). |
| 3 | `5992ea4` | **Selector de motor propio para la generación de MQL5** (antes: usaba implícitamente el modelo del agente de estrategia). |

---

## Entrega 1 — Selector fuente / modelo / esfuerzo, con llamadas por CLI de suscripción

### Diseño

- **`Agent.model`** sigue siendo un `string`, ahora con formato **`"<fuente>:<modelo>[:<esfuerzo>]"`**. Compatible hacia atrás: cualquier valor sin prefijo de fuente conocido (`"cerebras/gpt-oss-120b"`, `"auto/best-reasoning"`, `""`) se trata como `omniroute`. Parseo/serialización en `server/src/utils/modelString.ts` y su copia `src/lib/modelString.ts` (vite no cruza a `server/`; ~45 líneas, mantener en sync).
  - `""` → modelo por defecto del servidor. `"claude:sonnet"`. `"openai:gpt-5.6-sol:high"`. `"omniroute:cerebras/gpt-oss-120b"` (equivalente a sin prefijo).
- **Router** `server/src/engine/llmRouter.ts` → `routeChatCompletion(model, messages, tool?, options?)`, **misma firma** que `omniClient.chatCompletion`. `realExecutor.ts` y `mql5Generator.ts` cambian solo el import (`routeChatCompletion as chatCompletion`). Despacha:
  - `omniroute` / desconocido → `omniClient.chatCompletion` tal cual (con su cadena de fallback de modelo).
  - `claude` → `cliClients/claudeCli.ts`.
  - `openai` → `cliClients/codexCli.ts`.
  - `opencode` → `throw` explícito (fuente futura, adaptador no implementado).
  - **No hay fallback entre fuentes**: si el CLI falla, el agente queda `error` (igual que hoy ante fallo de LLM).
- **Adaptadores CLI** (`cliClients/{claudeCli,codexCli,shared}.ts`): aplanan `messages[]` a un prompt de texto; si hay `tool`, añaden el bloque de `buildJsonSchemaSystemMessage` (extraído de `omniClient`, endurecido: "primer carácter `{`, último `}`, sin prosa ni markdown"); spawnean el CLI con timeout; extraen el JSON (`sanitizeJsonResponse` quita fences, `extractBalancedJson` rescata el objeto si viene envuelto en prosa); devuelven `{ choices: [{ message: { content } }] }` — la forma que **ya** lee `parseToolArgs` (realExecutor) y `requestEa` (mql5Generator), sin tocarlas.
- **`GET /api/models`** reescrito: devuelve `{ sources: [...], modelsBySource: {...} }` en vez de `string[]`. `omniroute` sale de `/v1/models` de OmniRoute (con fallback estático); `claude` y `openai` son listas estáticas en `routes/models.ts`.
- **Frontend:** tipo `ModelsResponse` (`src/types/model.ts`), `store` (`sources` + `modelsBySource`), componente `<ModelSelector>` (3 selects en cascada + aviso de latencia para Claude/OpenAI), usado por `AgentConfigModal.tsx`.

### Los comandos CLI exactos que funcionan (verificados desde `child_process` de Node en Windows)

**Claude** — `cliClients/claudeCli.ts`:
```
C:\Users\fadwe\.local\bin\claude.exe -p --output-format json \
  --model <sonnet|opus|haiku> \
  --system-prompt "<systemPrompt del agente>" \
  --disallowedTools Bash Edit Write Read Glob Grep WebFetch WebSearch Task NotebookEdit
```
- El user prompt aplanado va **por stdin** (evita límites de longitud/escape).
- `claude` en `~/.local/bin/claude` es un **`.exe` nativo** (el plan decía "script bash" — estaba desactualizado); se spawnea directo, sin `shell: true`.
- `--system-prompt` reemplaza el system prompt por defecto de Claude Code (que trae todo el prompt del agente de herramientas). `--disallowedTools` evita que intente usar herramientas en una petición de puro texto (en las pruebas `num_turns` fue siempre 1).
- stdout = objeto JSON envoltorio → se toma `.result` (string). `.is_error` o `.subtype != 'success'` → throw. `.total_cost_usd` es **informativo** (lo que costaría por API; la suscripción no cobra por token).

**OpenAI / codex** — `cliClients/codexCli.ts`:
```
node C:\Users\fadwe\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js exec - \
  -o <ficheroTemporalLocal> \
  --skip-git-repo-check --sandbox read-only --color never \
  -c model_reasoning_effort=<minimal|low|medium|high> \
  [-m gpt-5.6-sol]
```
- Prompt aplanado (con system incluido) **por stdin** (`exec -`). El `<ficheroTemporal>` recibe EXACTAMENTE el mensaje final del modelo, sin ruido de hooks.
- Se lanza con `node <codex.js>` (no el wrapper `codex.cmd`) porque Node ≥18.20 exige `shell: true` para spawnear `.cmd`. `codex.js` se resuelve desde `%APPDATA%\npm\...` o `CODEX_CLI_JS`.
- **`cwd` = un directorio temporal LOCAL nuevo** (`os.tmpdir()`), no el disco de red: el sandbox `read-only` de codex deniega `\\Zambu-nas\` de forma intermitente ([[agent-delegation-options]]).
- `codex exec` **sí acepta `-m/--model`**. PERO con una cuenta **ChatGPT Plus** solo funciona **`gpt-5.6-sol`** (el modelo por defecto de `~/.codex/config.toml`). `gpt-5`, `gpt-5-codex`, `gpt-5.1-codex-mini`, `gpt-5.6`, `gpt-5.6-codex` → todos `400 "The '<m>' model is not supported when using Codex with a ChatGPT account."`. La fuente OpenAI lista solo `gpt-5.6-sol`; **el `effort` es la palanca real**.
- codex a veces escribe `ERROR: {json}` en stdout ante errores de API con exit 0 → el adaptador falla si el fichero de salida está vacío **O** el exit ≠ 0, y extrae ese `ERROR:` para el mensaje.

**Común a los dos adaptadores:**
- **Quitan `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `OPENAI_API_KEY`** del `env` del proceso hijo (`stripPaidApiKeys`). Si estuvieran presentes, los CLIs facturarían por API en vez de consumir la suscripción. **No ponerlas nunca en `server/.env`.** (Verificado: no están ni en `.env` ni en el entorno del shell.)
- Overrides opcionales: `CLAUDE_CLI_BIN`, `CODEX_CLI_JS` (ver `server/.env.example`).

---

## Entrega 2 — Ejecución en paralelo de los agentes de un mismo nivel

`orchestrator.ts` `runPass` ejecutaba los agentes **uno a uno**. `buildLevels` ya agrupa en el mismo nivel a los agentes independientes entre sí (topológico por capas), así que:

- **Nivel 0** (agentes sin `dependsOn`) → arrancan **todos a la vez** al pulsar "Ejecutar análisis".
- Un nivel dependiente **no arranca hasta que TODOS sus padres terminan**. Ej.: Técnico ∥ Fundamental → Gestor de Riesgos → Validador ∥ Refutador → Razonador.
- Tope configurable **`AGENT_MAX_CONCURRENCY`** (def. **5**) — evita disparar una avalancha de procesos/llamadas si un roster tiene muchos agentes en el mismo nivel.
- Si un agente de un nivel falla, se **deja terminar a sus hermanos** (su trabajo se guarda) y **no** se ejecutan los niveles dependientes — misma semántica de "parar en error", a nivel de nivel en vez de agente.
- Aplica también a las **pasadas de reintento** (`onlyAgentIds` / subgrafo): Validador + Refutador se reejecutan en paralelo.
- `jsonStore.writeJson` ya serializa las escrituras por fichero (cola por path) → los `saveRun` concurrentes de los agentes en paralelo **no corrompen** el `.json` del run.

**Implementación:** helper `mapWithConcurrency` (sin dependencias) + `executeAgentInPass` (no lanza: refleja el fallo en `result.status` y devuelve `'done' | 'error' | 'skipped'`).

---

## Entrega 3 — Selector de motor propio para la generación de MQL5

El generador de MQL5 (`mql5Generator.ts`) usaba, sin decirlo, `agent.model` del **agente de estrategia** (`agente-riesgo`). Ahora se elige aparte:

- Componente reutilizable **`src/components/ModelSelector.tsx`** (el mismo cascada) extraído de `AgentConfigModal.tsx`, que ahora lo consume (sin cambio de comportamiento en el modal).
- `StrategyResultCard.tsx`: bloque desplegable **"Motor de generación del EA"** junto al botón de generar. La elección se guarda en `localStorage` (`tad:mql5Model`) — preferencia de máquina, no del run. `null` = **heredar el modelo del agente de estrategia** (comportamiento histórico); botón "↺ volver a heredar".
- El valor se pasa como `model` a `POST /api/mql5/generate` y `/optimize` — **ya lo aceptaban, sin cambios de servidor**. El bucle `retryStrategyForBacktestFailure` (reejecuta el panel de agentes) sigue usando los modelos de los agentes, no este.

---

## Test de aceptación (todo verde)

Backend sin watch (`node ./node_modules/tsx/dist/cli.mjs --env-file-if-exists=.env src/index.ts`), `/api/health` `/api/agents` → 200, `/api/models` → shape nuevo (`sources: [omniroute, claude, openai]`, `modelsBySource.claude=[sonnet,opus,haiku]`, `modelsBySource.openai=[gpt-5.6-sol]`, `omniroute`=152).

| Prueba | Config | Resultado |
|---|---|---|
| **Run mixto** (`POST /api/runs EUR/USD H1`) | tecnico=`claude:sonnet`, fundamental=`openai::low`, resto OmniRoute | ✅ `done`. tecnico → output 4176 chars coherente. fundamental → 2895 chars. riesgo (OmniRoute) → `strategy` completa. razonador → `verdict` `go`. Log: `[llmRouter] fuente=claude/openai`, `[claudeCli]/[codexCli] spawn… terminó (código 0)`. Sin errores de auth. |
| **Tool-output por CLI** | agente-riesgo=`claude:sonnet` (tool `propose_strategy`) | ✅ `parseToolArgs` extrajo la strategy del `content` JSON (dir, condicionEntrada de evento, entry/SL/TP/risk, resumen 1018 chars). Claude devolvió JSON limpio. |
| **Codegen por CLI** | `POST /api/mql5/generate model:"openai:gpt-5.6-sol:medium"` | ✅ `compileStatus: ok`, 1 intento, 0 errores, EA 15 183 chars. `deliver_ea` parseado. |
| **Paralelismo** | tecnico ∥ fundamental (`openai::low`) | ✅ `startedAt` **idéntico** (`14:08:52.732Z`), solapados; riesgo arrancó solo al terminar el más lento. |
| **Motor de MQL5 elegible** | `POST /api/mql5/generate model:"claude:sonnet"` (≠ agente de estrategia) | ✅ enrutó a `[llmRouter] fuente=claude modelo=sonnet tool=deliver_ea`. |

**Tests automatizados nuevos:** `server/src/engine/cliClients/cliClients.test.ts` (11), `server/test/orchestratorRunPass.test.ts` (3: paralelismo por nivel, `AGENT_MAX_CONCURRENCY=1` fuerza serie, fallo de hermano no arranca dependientes). Todos pasan.

### Latencia observada (Windows, disco de red)

| Llamada | Tiempo |
|---|---|
| claude/sonnet, texto | ~103 s |
| claude/sonnet, con tool | ~146 s |
| codex/gpt-5.6-sol, texto, effort=low | ~62 s |
| codex/gpt-5.6-sol, con tool, effort=medium | ~143 s |

Con paralelismo, un nivel tarda lo que su agente más lento (no la suma). Un run de 6 agentes con 1 nivel de 2 agentes por CLI ≈ 2–3 min; OmniRoute solo: < 1 min.

---

## Cómo usarlo

1. **Elegir motor de un agente:** ⚙️ del agente → "Fuente del modelo" → Claude / OpenAI / OmniRoute → modelo → esfuerzo (si aplica) → Guardar.
2. **Elegir motor del generador de MQL5:** en la tarjeta "Propuesta de estrategia", desplegar "Motor de generación del EA" antes de pulsar 🚀. Por defecto hereda el del agente de estrategia.
3. **Salida estructurada** (agente `strategy` / `verdict`, y el codegen): **Claude por CLI ha sido más fiable** respetando el esquema JSON. `codex/gpt-5.6-sol` a veces devuelve la estrategia con campos vacíos → el agente queda `error` ("campos esenciales vacíos"). Para texto libre, codex va bien.
4. **Paralelismo:** automático. Para limitarlo, `AGENT_MAX_CONCURRENCY=<n>` en `server/.env`.
5. **Recomendación de latencia:** usar CLI solo para 1–2 agentes clave y el resto en OmniRoute; o poner los dos especialistas de nivel 0 por CLI (corren en paralelo, "gratis" en tiempo).

---

## Riesgos observados

| Riesgo | Nota |
|---|---|
| **Latencia por CLI** | 60–150 s/llamada (arranque del CLI + razonamiento). El paralelismo por nivel lo mitiga pero no lo elimina; niveles con un solo agente (riesgo, razonador) siguen en serie. `store.ts` tiene `MAX_POLL_ATTEMPTS=600` (10 min) — un run con varios agentes lentos en niveles distintos puede rozarlo. |
| **`codex/gpt-5.6-sol` y tool-calling** | No siempre respeta el esquema JSON de la tool → estrategia/veredicto con campos vacíos. Preferir Claude por CLI para agentes de salida estructurada. `extractBalancedJson` + prompt endurecido cubren el caso "JSON envuelto en prosa", no el "JSON incompleto". |
| **ChatGPT Plus solo da `gpt-5.6-sol`** | `codex` rechaza cualquier otro modelo. El `effort` es la única variable de esa fuente. |
| **Límites de suscripción** | Si `claude` / `codex` devuelven "usage/rate limit", el adaptador hace throw → agente `error`, sin reintento en bucle. |
| **`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` en el entorno** | Harían que los CLIs facturasen por API. El adaptador las quita del `env` del hijo; **no ponerlas en `server/.env`**. |
| **Windows: UNC vs cmd.exe** | `npm` / `npx tsc` NO pueden usar `\\Zambu-nas\...` como cwd. Trabajar desde la unidad mapeada (`N:` o `Z:`) → `N:\IA\02_Proyectos\MetaTrader_Bots`. Los adaptadores CLI no sufren esto (usan `spawn` directo). |
| **2 runs simultáneos** | Ahora con paralelismo intra-run, dos runs a la vez multiplican los procesos CLI concurrentes. `AGENT_MAX_CONCURRENCY` es por-`runPass`, no global. Pedro lanza runs de uno en uno; si cambia, meter un semáforo global. |
| **Tests pre-existentes en rojo** | `server/test/strategyValidator.test.ts` — 5 fallan por orden de validación. **Ya fallaban en `main`** (verificado con `git stash`); fuera de alcance (seguimiento del bucle `/loop`). |
| **`opencode` como fuente** | NO implementada, NO listada en `/api/models`. `llmRouter` tiene el `case` con `throw` explícito. Receta para añadirla abajo. |

---

## Cómo añadir una fuente nueva (p. ej. `opencode`)

1. `server/src/engine/cliClients/<nombre>Cli.ts` con la misma forma que los dos existentes (aplana prompt, inyecta schema si hay tool, spawnea, extrae JSON, devuelve `{ choices: [{ message: { content } }] }`).
2. `server/src/engine/llmRouter.ts` → `case '<nombre>':`.
3. `server/src/routes/models.ts` → entrada en `SOURCES` + lista en `modelsBySource`.
4. Añadir `'<nombre>'` a `LLM_SOURCES` en **los dos** `modelString.ts` (server + front).
5. El front (`ModelSelector`) sale solo — se llena de `sources`.

Nota `opencode` ([[agent-delegation-options]]): en esta máquina está mal configurado (apunta a un modelo Anthropic inexistente) y consumiría cuota Claude. Antes de implementar su adaptador: configurarlo y loguearlo bien, y confirmar su comando no-interactivo y formato de salida.

---

## Ficheros

```
NUEVOS  server/src/engine/llmRouter.ts
        server/src/engine/cliClients/shared.ts
        server/src/engine/cliClients/claudeCli.ts
        server/src/engine/cliClients/codexCli.ts
        server/src/engine/cliClients/cliClients.test.ts     (11 tests)
        server/src/utils/modelString.ts
        server/test/orchestratorRunPass.test.ts             (3 tests)
        src/lib/modelString.ts
        src/types/model.ts
        src/components/ModelSelector.tsx
MODIF   server/src/engine/omniClient.ts     (+ export buildJsonSchemaSystemMessage)
        server/src/engine/realExecutor.ts   (import -> llmRouter)
        server/src/engine/mql5Generator.ts  (import -> llmRouter)
        server/src/engine/orchestrator.ts   (runPass en paralelo por nivel)
        server/src/routes/models.ts         (reescrito: sources + modelsBySource)
        server/package.json                 (+ scripts test / typecheck)
        server/.env.example                 (fuentes CLI, AGENT_MAX_CONCURRENCY)
        server/README.md                    (router de LLM, paralelismo, /api/models)
        docs/ESQUEMA_AGENTES_ANALISIS.md    (nota de paralelismo por nivel)
        src/lib/api.ts                      (listModels -> ModelsResponse)
        src/lib/store.ts                    (sources/modelsBySource; mql5Model + localStorage)
        src/components/AgentConfigModal.tsx (usa <ModelSelector>)
        src/components/StrategyResultCard.tsx (selector de motor de MQL5)
```

El roster (`agents.json`, `DEFAULT_AGENTS`, preset `agentConfigs.json`) **no** se tocó como parte del código — la config de modelos la decide Pedro desde la UI.

## Estado al cerrar

- Rama `feat/selector-fuente-modelo-cli`, 3 commits (`9e199bb`, `706d489`, `5992ea4`) + el commit del plan (`bb99011`), **pusheada a `origin`**. No mergeada a `main`.
- Backend corriendo sin watch en `:5175` con el código de la rama. Frontend en `vite` dev (`:5173`) — recarga en caliente.
- `.claude/settings.local.json` (gitignored) tiene `ECC_DISABLED_HOOKS` para GateGuard — autorizado por Pedro para la sesión de implementación.

## Ver también

- [`../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md`](../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md) — el plan.
- [`2026-08-29-loop-quality-gate-verde-eurusd.md`](2026-08-29-loop-quality-gate-verde-eurusd.md) §Cierre → "Estado de la configuración de modelos al cerrar" — el contexto que motivó esta tarea.
- [[agent-delegation-options]] — qué CLIs funcionan en esta máquina y sus comandos.
- [[dashboard-selector-fuente-modelo-cli]] — memoria del estado de esta implementación.
- `trading-agents-dashboard/server/README.md` §"Router de LLM y fuentes por CLI".

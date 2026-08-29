---
tags: [proyecto-dashboard, agentes, modelos, cli, frontend, backend, informe, terminado]
updated: 2026-08-29
---

# Informe: selector de fuente + modelo + esfuerzo para los agentes, con llamadas por CLI de suscripción

> Registro de la implementación del plan [`../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md`](../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md).
> **✅ TERMINADO — 2026-08-29.** Rama `feat/selector-fuente-modelo-cli` (NO pusheada). `tsc` (server + front) y `vite build` limpios; backend arranca sin `tsx watch`; test de aceptación pasado entero (run real con un agente en Claude, otro en OpenAI, + tool-output por CLI + codegen por CLI).

## Qué se implementó

Selector en cascada en el modal de configuración de agente: **Fuente** (`OmniRoute` / `Claude` / `OpenAI`) → **Modelo** de esa fuente → **Esfuerzo de razonamiento** (solo OpenAI). Claude se llama por la CLI `claude` con la suscripción de Pedro; OpenAI por la CLI `codex` con su ChatGPT. **Cero claves de API de pago.**

- **`Agent.model`** sigue siendo un `string`, ahora con formato `"<fuente>:<modelo>[:<esfuerzo>]"`. Compatible hacia atrás: cualquier valor sin prefijo de fuente conocido (`"cerebras/gpt-oss-120b"`, `"auto/best-reasoning"`, `""`) se trata como `omniroute`.
- **Router nuevo** `server/src/engine/llmRouter.ts` → `routeChatCompletion(model, messages, tool?, options?)`, misma firma que `omniClient.chatCompletion`. `realExecutor.ts` y `mql5Generator.ts` cambian solo el import (`routeChatCompletion as chatCompletion`).
- **Adaptadores CLI** `server/src/engine/cliClients/{claudeCli,codexCli,shared}.ts`. Aplanan `messages[]` a un prompt de texto, inyectan el JSON-schema de la tool si la hay (`buildJsonSchemaSystemMessage`, extraída de `omniClient`), spawnean el CLI, extraen el JSON balanceado (`extractBalancedJson` cubre prosa; `sanitizeJsonResponse` cubre markdown) y devuelven `{ choices: [{ message: { content } }] }` — la forma que ya lee `parseToolArgs`.
- **`GET /api/models`** reescrito: devuelve `{ sources: [...], modelsBySource: {...} }` en vez de `string[]`.
- **Frontend:** `src/types/model.ts` (tipo `ModelsResponse`), `src/lib/modelString.ts` (`parseModelString`/`buildModelString`, duplicado deliberado del util del server), `store.ts` (`sources` + `modelsBySource` en vez de `models`), `AgentConfigModal.tsx` (3 selects en cascada + aviso de latencia para Claude/OpenAI).

### Ficheros

```
NUEVOS  server/src/engine/llmRouter.ts
        server/src/engine/cliClients/shared.ts
        server/src/engine/cliClients/claudeCli.ts
        server/src/engine/cliClients/codexCli.ts
        server/src/engine/cliClients/cliClients.test.ts   (11 tests, pasan)
        server/src/utils/modelString.ts
        src/lib/modelString.ts
        src/types/model.ts
MODIF   server/src/engine/omniClient.ts        (+ export buildJsonSchemaSystemMessage)
        server/src/engine/realExecutor.ts      (import -> llmRouter)
        server/src/engine/mql5Generator.ts     (import -> llmRouter)
        server/src/routes/models.ts            (reescrito: sources + modelsBySource)
        server/package.json                    (+ scripts test / typecheck)
        src/lib/api.ts                         (listModels -> ModelsResponse)
        src/lib/store.ts                       (models -> sources + modelsBySource)
        src/components/AgentConfigModal.tsx     (selector en cascada)
```

El roster (`agents.json`) se dejó como estaba: **los 6 agentes en `cerebras/gpt-oss-120b`** (esta tarea es el SELECTOR, no cambiar la config). `agentsStore.ts` `DEFAULT_AGENTS` y el preset `agentConfigs.json` no se tocaron.

## Los comandos CLI exactos que funcionan (verificados desde `child_process` de Node en Windows)

### Claude — `server/src/engine/cliClients/claudeCli.ts`

```
C:\Users\fadwe\.local\bin\claude.exe -p --output-format json \
  --model <sonnet|opus|haiku> \
  --system-prompt "<systemPrompt del agente>" \
  --disallowedTools Bash Edit Write Read Glob Grep WebFetch WebSearch Task NotebookEdit
```

- El **user prompt aplanado va por stdin** (evita límites de longitud/escape de la línea de comandos).
- `claude` en `~/.local/bin/claude` es un **`.exe` nativo** (el plan decía "script bash" — está desactualizado). Se spawnea directo, sin `shell: true`.
- `--system-prompt` REEMPLAZA el system prompt por defecto de Claude Code (que trae todo el prompt del agente de herramientas). `--disallowedTools` evita que intente leer ficheros / ejecutar comandos en una petición de puro texto. En las pruebas `num_turns` fue siempre 1 (no divaga).
- stdout = objeto JSON envoltorio: se toma `.result` (string). Si `.is_error` o `.subtype != 'success'` → throw.
- `.total_cost_usd` del envoltorio es **informativo** (lo que costaría por API); la suscripción no cobra por token.

### OpenAI / codex — `server/src/engine/cliClients/codexCli.ts`

```
node C:\Users\fadwe\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js exec - \
  -o <ficheroTemporalLocal> \
  --skip-git-repo-check --sandbox read-only --color never \
  -c model_reasoning_effort=<minimal|low|medium|high> \
  [-m gpt-5.6-sol]
```

- El **prompt aplanado (con system incluido) va por stdin** (`exec -` lee de stdin). El `<ficheroTemporal>` recibe EXACTAMENTE el mensaje final del modelo, sin ruido de hooks.
- Se lanza con `node <codex.js>` en vez del wrapper `codex.cmd` porque Node ≥18.20 exige `shell: true` para spawnear `.cmd` (y eso reabre los problemas de escape). El `codex.js` se resuelve desde `%APPDATA%\npm\...` o `CODEX_CLI_JS`.
- **`cwd` = un directorio temporal LOCAL nuevo** (`os.tmpdir()`), no el disco de red del proyecto: el sandbox `read-only` de codex deniega `\\Zambu-nas\` de forma intermitente ([[agent-delegation-options]]).
- `codex exec` **SÍ acepta `-m/--model`** (el plan lo daba por dudoso). PERO con una cuenta **ChatGPT Plus** solo funciona **`gpt-5.6-sol`** (el modelo por defecto de `~/.codex/config.toml`). `gpt-5`, `gpt-5-codex`, `gpt-5.1-codex-mini`, `gpt-5.6`, `gpt-5.6-codex` → todos `400 "The '<m>' model is not supported when using Codex with a ChatGPT account."`. Por eso la fuente OpenAI lista solo `gpt-5.6-sol`; **el `effort` es la palanca real**.
- codex a veces escribe `ERROR: {json}` en stdout ante errores de API con exit 0 → el adaptador falla si el fichero de salida está vacío O si el exit != 0, y extrae ese `ERROR:` para el mensaje.

### Común

- Ambos adaptadores **quitan `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `OPENAI_API_KEY`** del `env` del proceso hijo (`stripPaidApiKeys`). Si estuvieran presentes, los CLIs facturarían por API en vez de consumir suscripción. Verificado: no están ni en `server/.env` ni en el entorno del shell.
- El router **no hace fallback entre fuentes** (a diferencia de OmniRoute). Si el CLI falla, el agente falla → el orquestador lo marca `error`.

## Resultado del test de aceptación

Backend arrancado sin watch (`node ./node_modules/tsx/dist/cli.mjs --env-file-if-exists=.env src/index.ts`), `/api/health`, `/api/agents` → 200, `/api/models` → shape nuevo (`sources: [omniroute, claude, openai]`, `modelsBySource.claude = [sonnet, opus, haiku]`, `modelsBySource.openai = [gpt-5.6-sol]`, `omniroute` = 152 modelos).

| Prueba | Config | Resultado |
|---|---|---|
| **1 — run mixto** (`POST /api/runs EUR/USD H1 maxRetries=1`, run `PumnQVUjUi`) | `agente-tecnico`=`claude:sonnet`, `agente-fundamental`=`openai::low`, resto OmniRoute | ✅ `status: done`. tecnico → `done`, output 4176 chars (análisis técnico coherente). fundamental → `done`, output 2895 chars. riesgo (OmniRoute) → `strategy` con `direction=sell`, `condicionEntrada`, `entry/SL/TP/riskPercent` presentes. razonador (OmniRoute) → `verdict` `veredicto=go`. Log: `[llmRouter] fuente=claude` / `fuente=openai`, `[claudeCli] spawn... terminó en Xs (código 0)`, `[codexCli] spawn... terminó`. **Sin errores de auth ni de API key.** |
| **2 — tool-output por CLI** (run `4lR1t4Z94o`) | `agente-riesgo`=`claude:sonnet` (outputType `strategy`, tool `propose_strategy`) | ✅ `parseToolArgs` extrajo la strategy del `content` JSON: `direction=sell`, `condicionEntrada` (evento), `entry=1.1588 SL=1.1603 TP=1.1559 risk=0.5`, `resumen` 1018 chars. Claude/sonnet devolvió JSON limpio (el `--system-prompt` + el bloque endurecido de `buildJsonSchemaSystemMessage` bastan; no hizo falta el rescate por regex de `{...}`). razonador → `go`. |
| **3 — codegen por CLI** (`POST /api/mql5/generate`, job `lzfCYa21Gydp`) | `model: "openai:gpt-5.6-sol:medium"` | ✅ `compileStatus: ok`, `attempts: 1`, 0 errores / 0 warnings, EA de 15 183 chars. `DELIVER_EA_TOOL` parseado del `content`. Log: `[llmRouter] fuente=openai modelo=gpt-5.6-sol esfuerzo=medium tool=deliver_ea`. |

### Latencia observada (Windows, disco de red)

| Llamada | Tiempo |
|---|---|
| claude/sonnet, texto | ~103 s |
| claude/sonnet, con tool (strategy) | ~146 s |
| codex/gpt-5.6-sol, texto, effort=low | ~62 s |
| codex/gpt-5.6-sol, con tool (deliver_ea), effort=medium | ~143 s |

Un run de 6 agentes con **1** agente por CLI ≈ 3 min; con el agente de estrategia en Claude ≈ 5 min. OmniRoute solo: < 1 min.

## Riesgos observados

| Riesgo | Nota |
|---|---|
| **Latencia** | Cada llamada por CLI son 60–150 s (arranque del CLI + razonamiento del modelo). El orquestador ejecuta los agentes en serie, así que se acumula. **Recomendación: usar CLI solo para 1–2 agentes clave** y el resto en OmniRoute. El `store.ts` del front tiene `MAX_POLL_ATTEMPTS = 600` (10 min) — un run con 4+ agentes por CLI puede rozarlo. |
| **ChatGPT Plus solo da `gpt-5.6-sol`** | `codex` con cuenta Plus rechaza cualquier otro modelo. Codex-mini / gpt-5 requieren otro plan. El `effort` (`minimal|low|medium|high`) sí funciona y es la única variable de esa fuente. |
| **Límites de suscripción** | Si `claude` o `codex` devuelven "usage limit" / "rate limit", el adaptador hace throw → el agente queda `error` → el orquestador no reintenta en bucle (comportamiento actual). No se llegó a ver en las pruebas. |
| **`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` en el entorno del backend** | Harían que los CLIs facturasen por API. El adaptador las quita del `env` del hijo, pero conviene **no ponerlas nunca en `server/.env`**. |
| **Windows: UNC vs cmd.exe** | `npm` / `npx tsc` NO pueden usar `\\Zambu-nas\...` como cwd (cmd.exe rechaza rutas UNC). Hay que trabajar desde la unidad mapeada `N:` (o `Z:`) → `N:\IA\02_Proyectos\MetaTrader_Bots`. Los adaptadores CLI no sufren esto (usan `spawn` directo, no cmd.exe). |
| **codex y stdout ruidoso** | Los hooks de codex (`hook: SessionStart`…) van a stdout, no al `-o`. El adaptador lee SOLO el fichero `-o`, así que no afecta. |
| **Tests pre-existentes en rojo** | `server/test/strategyValidator.test.ts` — 5 tests fallan por orden de validación (`condicionEntrada` vacía se comprueba antes que R:R). **Ya fallaban en `main`** (verificado con `git stash`); fuera del alcance de esta tarea (seguimiento del bucle `/loop`). |
| **`opencode` como fuente** | NO implementada, NO listada en `/api/models` (se añade cuando exista el adaptador — receta en el plan §6). El `llmRouter` tiene el `case 'opencode'` que hace throw explícito. |

## Cómo añadir una fuente nueva

Ver el plan §"Añadir una fuente nueva". Resumen: (1) `cliClients/<nombre>Cli.ts` con la misma forma que los dos existentes; (2) `case '<nombre>':` en `llmRouter.ts`; (3) entrada en `SOURCES` + `modelsBySource` de `routes/models.ts`; (4) el front sale solo. Añadir también `'<nombre>'` a `LLM_SOURCES` en **los dos** `modelString.ts` (server + front).

## Estado al cerrar

- Rama `feat/selector-fuente-modelo-cli`, 1 commit, **sin pushear** (`main` está 10 commits por delante de `origin`).
- Backend corriendo sin watch en `:5175` con el código de la rama (log en `scratchpad/backend2.log`).
- `.claude/settings.local.json` (gitignored) tiene `ECC_DISABLED_HOOKS` para GateGuard — autorizado por Pedro para esta sesión.

## Ver también

- [`../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md`](../planes/2026-08-29-selector-fuente-modelo-agentes-cli.md) — el plan que este informe registra.
- [`2026-08-29-loop-quality-gate-verde-eurusd.md`](2026-08-29-loop-quality-gate-verde-eurusd.md) §Cierre → "Estado de la configuración de modelos al cerrar" — el contexto que motivó esta tarea.
- [[agent-delegation-options]] — qué CLIs funcionan en esta máquina.

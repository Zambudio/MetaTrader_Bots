---
tags: [proyecto-dashboard, agentes, modelos, cli, frontend, backend, plan]
updated: 2026-08-29
---

# Plan: selector de fuente + modelo + esfuerzo para los agentes, con llamadas por CLI de suscripción

> **Estado:** pendiente de implementar. **Para quién:** un agente que lo ejecute de principio a fin sin interrumpir a Pedro, hasta que compile, arranque, y pase el test de aceptación del final.
> **Contexto previo obligatorio:** lee `../informes/2026-08-29-loop-quality-gate-verde-eurusd.md` §Cierre -> subsección "Estado de la configuración de modelos al cerrar". El bucle `/loop` que cerró ese informe dejó los 6 agentes en `cerebras/gpt-oss-120b` vía el OmniRoute self-hosted, que es poco fiable.

## Objetivo

Que en el modal de configuración de cada agente (`AgentConfigModal.tsx`, el desplegable "Modelo") se pueda elegir, en cascada:

1. **Fuente** — de dónde sale el modelo: `OmniRoute` (lo actual), `Claude` (CLI `claude`, suscripción de Pedro), `OpenAI` (CLI `codex`, suscripción ChatGPT de Pedro). Diseñado para añadir `opencode` (u otras) después con una receta corta (ver §"Añadir una fuente nueva").
2. **Modelo** — la lista de modelos disponibles de la fuente elegida.
3. **Esfuerzo de razonamiento** — solo si la fuente/modelo lo soporta (OpenAI/codex: `minimal|low|medium|high`; OmniRoute y Claude: no, de momento).

**Requisito duro de Pedro:** las llamadas a Claude y OpenAI se hacen **por CLI usando la autenticación de suscripción** (`claude` logueado con su cuenta, `codex` "Logged in using ChatGPT"). **NADA de claves de API de pago por token.** El backend NO debe tener `ANTHROPIC_API_KEY` ni `OPENAI_API_KEY` en su entorno (haría que los CLIs facturasen por API en vez de consumir suscripción).

## Estado actual del código (verificado 2026-08-29)

### Cómo se llama al LLM hoy

- **Único punto de entrada:** `trading-agents-dashboard/server/src/engine/omniClient.ts` -> `export async function chatCompletion(model, messages, tool?, options?)`.
  - Ya tiene (desde el bucle `/loop`) una **cadena de fallback de modelo**: si el modelo pedido agota reintentos, prueba `OMNIROUTE_FALLBACK_MODELS` (default `auto/pro-coding,auto/smart`). El cuerpo per-modelo se llama `chatCompletionOnce`.
  - Hace `POST ${OMNIROUTE_BASE_URL}/v1/chat/completions` (OpenAI-compatible). `OMNIROUTE_BASE_URL=http://192.168.1.3:20128` en `server/.env`.
  - Tiene `chatCompletionJsonFallback(...)`: cuando un proveedor no soporta `tool_choice` y devuelve 400, reintenta **inyectando el JSON-schema de la tool en un mensaje `system`** y pidiendo "devuelve SOLO JSON". **Reutilizable para los adaptadores CLI.**
- **Quién lo llama:**
  - `server/src/engine/realExecutor.ts` -> `runRealAgent(agent, ...)`:
    - `const model = agent.model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-reasoning'`
    - `outputType === 'strategy'` -> `chatCompletion(model, messages, STRATEGY_TOOL)` -> `parseToolArgs(data)`
    - `outputType === 'verdict'` -> `chatCompletion(model, messages, VERDICT_TOOL)` -> `parseToolArgs(data)`
    - `outputType === 'text'` -> `chatCompletion(model, messages, null)` -> `data.choices[0].message.content`
  - `server/src/engine/mql5Generator.ts:437` -> `chatCompletion(model, messages, DELIVER_EA_TOOL, { timeoutMs: 180_000 })` para generar el `.mq5`. `resolvedModel = model || OMNIROUTE_DEFAULT_MODEL || 'auto/best-coding'`.
- **`parseToolArgs(data)`** (en `realExecutor.ts`) ya maneja el caso sin `tool_calls`:
  ```
  const toolCall = message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(sanitizeJsonResponse(toolCall.function.arguments));
  if (typeof message?.content === 'string' && message.content.trim()) return JSON.parse(sanitizeJsonResponse(message.content));
  throw new Error('El modelo no devolvió la respuesta estructurada esperada');
  ```
  -> **Un adaptador CLI que devuelva `{ choices: [{ message: { content: '<json>' } }] }` funciona con el parseo existente sin tocarlo.** `sanitizeJsonResponse` ya quita fences markdown y prefijos `data:`.
- **Concurrencia:** `orchestrator.ts` -> `runPass` ejecuta los agentes **en serie** (`for (const agent of toRun) { await ... }`, por niveles). El codegen también es secuencial dentro de un job. No hay `Promise.all` de agentes. -> **No hace falta cola/semáforo para spawnear CLIs** (salvo que se lancen 2 runs a la vez, caso raro; ver §Riesgos).

### El endpoint de modelos hoy

- `server/src/routes/models.ts` -> `GET /api/models` -> hace `GET ${OMNIROUTE_BASE_URL}/v1/models`, filtra los que NO tienen `type` (chat models), devuelve `string[]`. Fallback `['auto/best-reasoning','auto/best-coding','auto/best-fast','auto/best-chat','auto/best-vision']`.
- `src/lib/api.ts:39` -> `listModels: () => request<string[]>('/models')`.
- `src/lib/store.ts` -> `loadInitialData` hace `api.listModels()` en el `Promise.all` inicial y guarda `models: string[]`.

### El selector hoy

- `src/components/AgentConfigModal.tsx` líneas ~171-183: un único `<select>` con `models` del store, `value = model` (string), `option value="" -> "Modelo por defecto del servidor"`. Al guardar: `onSave({ ..., model: model || undefined })`.
- Tipo `Agent` (idéntico en `src/types/agent.ts` y `server/src/types.ts`): `model?: string`.
- El roster vive en **3 sitios que hay que mantener sincronizados** (lección del bucle `/loop`): `server/src/data/agents.json`, `DEFAULT_AGENTS` en `server/src/store/agentsStore.ts`, y el preset activo en `server/src/data/agentConfigs.json` (gitignored). `agents.json` se relee de disco en cada request.

### CLIs disponibles (verificado)

| CLI | Ruta | Versión | Salida limpia para parsear |
|---|---|---|---|
| `claude` (Claude Code) | `C:\Users\fadwe\.local\bin\claude` (script bash) | 2.1.251 | `claude -p "<prompt>" --output-format json --model <m>` -> JSON con campo `.result` (texto del modelo). También trae `usage`, `total_cost_usd` (informativo, es lo que costaría por API — la suscripción no cobra por token). |
| `codex` (codex-cli) | `C:\Users\fadwe\AppData\Roaming\npm\codex` (npm bin) | 0.150.1 | `codex exec "<prompt>" --output-last-message <fichero> --skip-git-repo-check --sandbox read-only [-c model_reasoning_effort=<e>]` -> el `<fichero>` contiene EXACTAMENTE el mensaje final del modelo, sin ruido de hooks. Probado: devolvió `{"ok": true, "n": 42}` limpio. |

**Windows:** `claude` es un script bash (hay git-bash en la máquina); `codex` es un `.cmd`/bin de npm. Spawnear con `execFile`/`spawn` requiere el intérprete correcto — usar `spawn` con `{ shell: true }` o resolver el `.cmd`. **Probar los dos comandos exactos desde Node (`child_process`) antes de dar por bueno el adaptador.**

## Diseño

### 1. Formato del string `model` (compatible hacia atrás)

`"<fuente>:<modelo>[:<esfuerzo>]"`. Ejemplos:
- `""` -> modelo por defecto del servidor (igual que hoy).
- `"cerebras/gpt-oss-120b"` o `"auto/best-reasoning"` -> **sin prefijo `<fuente>:` conocido -> se trata como `omniroute`** (compatibilidad con todos los valores actuales).
- `"omniroute:cerebras/gpt-oss-120b"` -> explícito.
- `"claude:sonnet"` -> CLI `claude`, modelo `sonnet`.
- `"openai:gpt-5-codex:high"` -> CLI `codex`, modelo `gpt-5-codex`, `model_reasoning_effort=high`.

Parser (backend, en el router nuevo): split por `:`. Si `parts[0]` pertenece a `{omniroute, claude, openai, opencode}` -> `source = parts[0]`, `model = parts[1]`, `effort = parts[2]`. Si no -> `source = 'omniroute'`, `model = string entero`.

> **Alternativa considerada y descartada:** cambiar `Agent.model` de `string` a `{source, model, effort}`. Descartada porque toca los 3 sitios del roster, los tipos front+back, las migraciones de `agents.json`/`agentConfigs.json`, y `parseToolArgs`. El string con prefijo es un cambio mínimo. Si en el futuro se quiere el objeto, que sea otra tarea.

### 2. Backend: router de LLM

**Fichero nuevo:** `server/src/engine/llmRouter.ts`.

```ts
// firma idéntica a la chatCompletion actual, para no tocar a los llamadores
export async function routeChatCompletion(
  model: string,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options?: OmniClientOptions
): Promise<any>   // devuelve SIEMPRE la forma { choices: [{ message: { content?: string, tool_calls?: [...] } }] }
```

- Parsea `model` -> `{ source, model, effort }`.
- `source === 'omniroute'` (o desconocido) -> llama a la `chatCompletion` de `omniClient.ts` **tal cual está hoy** (con su cadena de fallback). Pasa `model` (sin el prefijo `omniroute:` si lo llevaba).
- `source === 'claude'` -> `claudeCliChatCompletion(model, messages, tool, options)`.
- `source === 'openai'` -> `codexCliChatCompletion(model, effort, messages, tool, options)`.
- `source === 'opencode'` -> aún no; lanzar `Error('fuente opencode no implementada')` (o implementarla ya, ver §"Añadir una fuente nueva").

**Cambio en los llamadores (mínimo):**
- `realExecutor.ts`: cambiar `import { chatCompletion } from './omniClient.js'` -> `import { routeChatCompletion as chatCompletion } from './llmRouter.js'`. (alias para no tocar el resto del fichero).
- `mql5Generator.ts`: igual.
- **NO** tocar `omniClient.ts` salvo para exportar lo que el router necesite (`ChatMessage`, `ToolDefinition`, `OmniClientOptions`, `sanitizeJsonResponse`, y la función interna de inyección de schema — refactorizarla a una helper exportada `buildJsonSchemaSystemMessage(tool)` reutilizable).

### 3. Adaptadores CLI

**Ficheros nuevos:** `server/src/engine/cliClients/claudeCli.ts` y `server/src/engine/cliClients/codexCli.ts`.

Ambos hacen lo mismo conceptualmente:

1. **Aplanar `messages` a un solo prompt de texto:**
   - `system` -> prefijo `INSTRUCCIONES DEL SISTEMA:\n<...>\n\n` (o usar el flag nativo si existe — `claude --append-system-prompt`).
   - `user`/`assistant` -> concatenar con etiquetas `USUARIO:` / `ASISTENTE:`.
2. **Si `tool` != null:** añadir al final del prompt el bloque de `buildJsonSchemaSystemMessage(tool)` — es decir: "Devuelve tu respuesta EXCLUSIVAMENTE como un objeto JSON válido (sin texto antes ni después, sin markdown) que cumpla este esquema: <JSON.stringify(tool.function.parameters)>". (Esto ya existe en `omniClient.chatCompletionJsonFallback` — extraerlo a helper.)
3. **Spawnear el CLI** con timeout (`options.timeoutMs ?? 180_000`), capturar salida:
   - **claude:** `claude -p <PROMPT> --output-format json --model <model>` (+ `--append-system-prompt <SYS>` si se separa el system). Parsear stdout como JSON, tomar `parsed.result` (string). Si `parsed.is_error` o no hay `result` -> throw con el mensaje.
   - **codex:** escribir el prompt a un fichero temporal (evita problemas de longitud/escape en la línea de comandos), `codex exec "$(cat tmpPrompt)" --output-last-message <tmpOut> --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=<effort>` (+ `-m <model>` si `codex` lo acepta — **verificar con `codex exec --help`**; si `codex` no permite elegir modelo por flag, documentar que "OpenAI" usa el modelo por defecto de la config de `codex` y el selector de modelo de esa fuente queda deshabilitado o informativo). Leer `<tmpOut>`. Borrar los temporales en `finally`.
4. **Devolver** `{ choices: [{ message: { content: <texto extraído> } }] }`.
   - `parseToolArgs` y el codegen ya saben leer `content` como JSON. `sanitizeJsonResponse` quita fences.
5. **Errores:** si el CLI sale con código != 0, o timeout, o el JSON no parsea -> throw `Error` con contexto (`[claudeCli] ...` / `[codexCli] ...`). El router NO hace fallback entre fuentes (a diferencia de OmniRoute) — si el CLI falla, el agente falla y el orquestador lo marca `error` (comportamiento actual ante fallo de LLM).

**Auth:** el backend corre como el usuario `fadwe`, así que `claude` lee `~/.claude` y `codex` lee `~/.codex` (o `%USERPROFILE%\.codex`) automáticamente. **Verificar en el arranque** (o en un endpoint de salud) que `claude -p "di OK" --output-format json` y `codex exec "di OK" --output-last-message x` responden sin pedir login. Si `ANTHROPIC_API_KEY` está en el entorno del proceso del backend, quitarla antes de spawnear `claude` (pasar un `env` explícito a `spawn` sin esas claves).

### 4. Endpoint de modelos por fuente

**Reescribir `server/src/routes/models.ts`** -> `GET /api/models` devuelve:

```jsonc
{
  "sources": [
    { "id": "omniroute", "label": "OmniRoute (router local)", "supportsEffort": false },
    { "id": "claude",    "label": "Claude (mi suscripción)",   "supportsEffort": false },
    { "id": "openai",     "label": "OpenAI / codex (mi ChatGPT)", "supportsEffort": true, "efforts": ["minimal","low","medium","high"] }
  ],
  "modelsBySource": {
    "omniroute": ["auto/best-reasoning", "cerebras/gpt-oss-120b", "..."],
    "claude":    ["sonnet", "opus", "haiku"],
    "openai":    ["gpt-5", "gpt-5-codex", "o3", "o4-mini"]
  }
}
```

- `omniroute`: la lógica actual (query `/v1/models`, filtrar sin `type`, fallback a la lista corta).
- `claude` / `openai`: listas estáticas en el propio `models.ts` (constantes). Documentar en un comentario de dónde salen (`claude --help`, `codex --help`). No hace falta llamar a los CLIs para listarlos.
- `src/lib/api.ts` -> `listModels: () => request<ModelsResponse>('/models')` (nuevo tipo `ModelsResponse`).
- `src/lib/store.ts` -> guardar `modelsBySource` y `sources` en vez de `models: string[]`. Ajustar el `set(...)`.

### 5. Frontend: selector en cascada

**`src/components/AgentConfigModal.tsx`**, reemplazar el bloque del `<select>` de modelo (líneas ~171-183) por:

- Estado local: `const [source, setSource] = useState(...)`, `const [modelName, setModelName] = useState(...)`, `const [effort, setEffort] = useState(...)`.
- **Al montar / cuando `agent` cambia:** parsear `agent.model` -> `(source, modelName, effort)` con la misma lógica del backend (extraer a `src/lib/modelString.ts` compartida: `parseModelString(s)` y `buildModelString(source, model, effort)`).
- **3 selects:**
  1. `Fuente` -> opciones de `sources` del store. `onChange` -> `setSource`, y resetear `modelName` al primer modelo de esa fuente, resetear `effort`.
  2. `Modelo` -> opciones de `modelsBySource[source]`. Opción vacía `""` -> "Por defecto del servidor" (solo tiene sentido para omniroute; para claude/openai obligar a elegir uno).
  3. `Esfuerzo` -> solo se renderiza si `sources.find(s=>s.id===source)?.supportsEffort`. Opciones de `.efforts`. Default `medium` (o el que recomiende codex).
- **Al guardar:** `model: buildModelString(source, modelName, effort) || undefined`.
- Mantener la opción "Modelo por defecto del servidor" -> `model: undefined` (source implícito omniroute, `OMNIROUTE_DEFAULT_MODEL`).

**Detalle UX:** cuando la fuente sea Claude u OpenAI, mostrar un aviso pequeño: "Usa tu suscripción vía CLI. Más lento que OmniRoute (~2-5 s de arranque por llamada)."

### 6. Añadir una fuente nueva (p. ej. `opencode`) — receta

1. `server/src/engine/cliClients/<nombre>Cli.ts` -> función `<nombre>CliChatCompletion(model, effort, messages, tool, options)` que aplana el prompt, inyecta el schema si hay `tool`, spawnea el CLI, extrae el texto, devuelve `{ choices: [{ message: { content } }] }`.
2. `server/src/engine/llmRouter.ts` -> añadir `case '<nombre>':` en el `switch (source)`.
3. `server/src/routes/models.ts` -> añadir la entrada en `sources` y la lista en `modelsBySource`.
4. `AgentConfigModal.tsx` -> sale sola (el select de fuente se llena de `sources`).

**Nota sobre `opencode`:** según la memoria [[agent-delegation-options]], el `opencode` de esta máquina está mal configurado (apunta a un modelo Anthropic inexistente) y "consumiría cuota Claude". Antes de implementar su adaptador hay que: (a) `opencode` bien configurado y logueado, (b) confirmar qué comando no-interactivo tiene (`opencode run` / `opencode -p` o similar) y su formato de salida. Dejarlo listado como fuente futura, adaptador NO implementado hasta que Pedro lo pida.

## Pasos de implementación (en orden, el agente los sigue al dedillo)

1. **Rama.** Crear rama `feat/selector-fuente-modelo-cli` desde `main` (main está 9-10 commits por delante de origin; NO pushear salvo que Pedro lo pida).
2. **Probar los CLIs desde Node.** Script de scratchpad que haga `spawn` de los dos comandos exactos (claude y codex) con un prompt de prueba que pida JSON, y confirme que se extrae el JSON. Ajustar los comandos/flags a lo que de verdad funcione en esta máquina Windows. **No seguir hasta que esto funcione.**
3. **Backend — helpers compartidas.** En `omniClient.ts`: exportar `ChatMessage`, `ToolDefinition`, `OmniClientOptions`, `sanitizeJsonResponse` (ya se exporta), y extraer la inyección de schema de `chatCompletionJsonFallback` a `export function buildJsonSchemaSystemMessage(tool): string`.
4. **Backend — adaptadores.** `cliClients/claudeCli.ts` y `cliClients/codexCli.ts` según §3. Con tests unitarios mínimos (mock de `spawn`, o test de integración marcado `skip` por defecto que llama al CLI real).
5. **Backend — router.** `llmRouter.ts` según §2. La lógica de parseo del string va en `server/src/utils/modelString.ts` (y se comparte con el front si el bundler lo permite; si no, se duplica — son ~10 líneas).
6. **Backend — cambiar los 2 imports** en `realExecutor.ts` y `mql5Generator.ts` a `routeChatCompletion`.
7. **Backend — endpoint.** Reescribir `routes/models.ts` según §4.
8. **`npx tsc --noEmit -p server`** limpio.
9. **Frontend — tipos + api + store.** `ModelsResponse`, `api.listModels`, `store`.
10. **Frontend — `AgentConfigModal.tsx`** según §5. + `src/lib/modelString.ts`.
11. **`npx tsc --noEmit` (front)** + `npm run build` limpio.
12. **Arrancar el backend SIN watch:** matar el `tsx src/index.ts` que haya (`Get-CimInstance Win32_Process ... CommandLine -like '*tsx*src/index.ts*'`), y `cd trading-agents-dashboard/server && ./node_modules/.bin/tsx --env-file-if-exists=.env src/index.ts` en background. Confirmar `/api/agents` -> 200 y `/api/models` -> el JSON nuevo.
13. **Test de aceptación** (ver abajo). No dar por terminado hasta que pase.
14. **Sincronizar los 3 sitios del roster** si se han cambiado modelos de agentes durante el test. Dejar los 6 agentes en la config que Pedro quiera (por defecto: dejarlos como estaban, `cerebras/gpt-oss-120b`, salvo que Pedro diga otra cosa — el objetivo de esta tarea es el SELECTOR, no cambiar la config).
15. **Commit** en la rama (mensaje descriptivo, `Co-Authored-By` + `Claude-Session`). Documentar en un informe nuevo `wiki-Traiding/proyecto-dashboard/informes/2026-08-29-selector-fuente-modelo-cli.md` con: qué se implementó, los comandos CLI exactos que funcionan, el resultado del test de aceptación, y los riesgos observados. Actualizar `00_INDEX.md`.

## Test de aceptación (obligatorio antes de decir "terminado")

1. En el modal de un agente `text` (p. ej. `agente-tecnico`), elegir fuente **Claude**, modelo **sonnet**, guardar. En otro (`agente-fundamental`), fuente **OpenAI**, modelo por defecto, esfuerzo **low**, guardar. Dejar el resto en OmniRoute.
2. `POST /api/runs {"pair":"EUR/USD","timeframe":"H1","maxRetries":1}`. Pollear hasta `done`/`error`.
3. **Verificar:**
   - `agente-tecnico` (Claude) -> `status: done`, `output` no vacío, texto coherente.
   - `agente-fundamental` (OpenAI) -> `status: done`, `output` no vacío.
   - `agente-riesgo` (OmniRoute) -> `strategy` parseada OK (los campos `condicionEntrada`, `stopLossNum`, etc. presentes).
   - `agente-razonador` (OmniRoute) -> `verdict` con `veredicto` en `{go, ajustar, no_operar}`.
   - En el `backend.log`: se ven líneas de spawn de `claude` y `codex`, sin errores de auth.
4. **Prueba de tool-output por CLI:** poner `agente-riesgo` en fuente **Claude** (`sonnet`) y relanzar un run. Verificar que `parseToolArgs` extrae la `strategy` del `content` JSON (puede requerir ajustar el prompt de inyección de schema si el modelo envuelve en prosa/markdown — `sanitizeJsonResponse` cubre markdown; si envuelve en prosa, endurecer el prompt: "SIN texto explicativo, el primer carácter debe ser `{`").
5. **Codegen por CLI (opcional pero recomendado):** `POST /api/mql5/generate` con `model: "openai:gpt-5-codex:medium"` y una `strategy` válida. Verificar `compileStatus: ok` (o al menos que el `.mq5` se genera y el `DELIVER_EA_TOOL` se parsea).
6. **Latencia:** anotar cuánto tarda un run completo con 2 agentes por CLI vs todo OmniRoute. Si es > 5 min, anotarlo como riesgo (no bloquea).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Tool-calling por CLI: el modelo devuelve JSON envuelto en prosa/markdown -> `JSON.parse` falla | `sanitizeJsonResponse` ya quita fences. Endurecer el prompt de inyección de schema ("primer carácter `{`, último `}`, nada más"). Si persiste, en el adaptador: regex para extraer el primer bloque `{...}` balanceado antes de parsear. |
| Latencia: cada spawn de CLI son ~2-5 s + tiempo del modelo. 6 agentes + reintentos + codegen = varios minutos | Aceptar y documentar. No paralelizar (rompería el orden de dependencias y multiplicaría el consumo de suscripción). Si molesta, dejar solo 1-2 agentes clave por CLI y el resto en OmniRoute. |
| Límites de suscripción (Claude Max / ChatGPT) | Documentar. Si un CLI devuelve "rate limit"/"usage limit", el agente falla -> el orquestador lo marca `error` (comportamiento actual). No reintentar en bucle. |
| `ANTHROPIC_API_KEY` en el entorno del backend -> `claude` factura por API | Al spawnear `claude`, pasar `env` explícito sin `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN`. Verificar en el arranque. |
| Windows: `spawn` de un script bash (`claude`) o `.cmd` (`codex`) | Paso 2 del plan lo prueba primero. Usar `shell: true` o resolver `claude.cmd`/`codex.cmd`. Probar con `child_process` real, no asumir. |
| `codex exec` no acepta `-m <modelo>` por flag | Comprobar con `codex exec --help`. Si no: la fuente OpenAI usa el modelo de `~/.codex/config`; el select de modelo de esa fuente muestra solo "(por defecto de codex)" y el `effort` sí se pasa con `-c model_reasoning_effort=`. |
| 2 runs simultáneos -> 2 spawns de CLI a la vez | Poco probable (Pedro lanza runs de uno en uno). Si se quiere robustez: un semáforo simple (`p-limit(1)`) alrededor de los adaptadores CLI. Opcional. |
| El backend se reinicia a mitad de un spawn de CLI | Igual que hoy con OmniRoute: el job se pierde, se relanza. Sin cambio. |

## Fuera de alcance (NO hacer en esta tarea)

- Cambiar la configuración de modelos de los agentes (esta tarea es el SELECTOR; la config la decide Pedro después).
- Implementar el adaptador de `opencode` (dejarlo listado como fuente futura).
- El objeto `{source, model, effort}` en el tipo `Agent` (queda el string con prefijo).
- Arreglar los seguimientos del informe del bucle `/loop` (el `lastBarTime` del EA, el parser `periodStart/End`, etc.).
- Claves de API de pago.

## Ver también

- [`../informes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../informes/2026-08-29-loop-quality-gate-verde-eurusd.md) §Cierre -> "Estado de la configuración de modelos al cerrar".
- [[agent-delegation-options]] — qué CLIs funcionan en esta máquina.
- `trading-agents-dashboard/server/src/engine/omniClient.ts` — el cliente actual y su `chatCompletionJsonFallback` (patrón de inyección de schema a reutilizar).

# Timeout de 180s agotado en producción + botón "Detener análisis"

**Fecha:** 2026-09-06. **Estado: ✅ DESPLEGADO** (`main` `a0dcc0f`, `npm run build` + `pm2 restart trading-dashboard`, arranque limpio verificado en logs, dos veces).

## Síntoma reportado

Tras desplegar el fix del [2026-09-05](2026-09-05-fix-reintentar-modelo-vivo-openai.md) (sincronización de modelo vivo al reintentar), Pedro seguía viendo agentes rechazados con `[claudeCli] timeout (180s) esperando a claude` — esta vez con el badge de modelo mostrando correctamente `claude:sonnet` (no era el bug anterior: aquí modelo mostrado = modelo usado, y aun así fallaba).

## Diagnóstico

Dos hallazgos, ninguno relacionado con el fix del día anterior:

1. **El servidor en vivo nunca tuvo configurado `AGENT_CLI_TIMEOUT_MS`.** El código soporta este override desde hace semanas (`resolveAgentCliTimeoutMs`, `cliClients/shared.ts`), pero `server/.env` en la máquina de producción no lo definía, así que cada llamada real a `claude -p` corría con el límite duro de 180 s. La documentación de validación real de FOREX (`VALIDACION_REAL_FOREX.md`) ya había registrado llamadas reales de `fx-risk`/`fx-critic` de hasta 239-240 s — muy por encima de ese límite. Confirmado en logs: una llamada de "Validador de Riesgo" terminó en 172,3 s (justo por debajo, con código 0) mientras otra de "Crítico Adversarial" murió a los 180,1 s (código `null` = matada por timeout) en el mismo minuto.
2. **`main` (la rama que corre en producción) nunca recibió el fix de resiliencia de CLI (`resolveAgentCliRetries`/`isTransientCliError`) que sí se construyó y validó durante el trabajo de validación real de FOREX** (rama `validacion-real-forex`, nunca mergeada). Nota aparte, sin embargo: ese fix explícitamente **no reintenta timeouts** (`isTransientCliError` los excluye a propósito — reintentar un prompt que ya tardó demasiado solo agrava el problema), así que backportearlo no habría arreglado este síntoma concreto por sí solo. La causa raíz real y suficiente es (1).

## Fix aplicado

- **`server/.env`**: añadido `AGENT_CLI_TIMEOUT_MS=600000` (10 min), con comentario explicando la evidencia real (239-240 s observados) que justifica el margen. Cambio de configuración pura, sin tocar código. `.env` está gitignorado — este cambio no aparece en ningún commit; queda documentado aquí.
- Pendiente, fuera de alcance de este cierre: backportear a `main` la resiliencia de CLI (`resolveAgentCliRetries`/`isTransientCliError`) construida en `validacion-real-forex`, para cubrir fallos transitorios reales (stderr vacío, JSON no parseable) que sí merecen un reintento. No se ha hecho todavía.

## Feature nueva: botón "Detener análisis"

Pedido explícito de Pedro: poder detener un análisis en curso en vez de esperar a que un agente lento/atascado agote su timeout. No existía ningún mecanismo de cancelación (`AbortController`) en toda la cadena `orchestrator → executor → llmRouter → claudeCli/codexCli/omniClient → spawnCli/fetch`.

### Cambios de backend

- **`src/engine/runAbortRegistry.ts`** (nuevo): un `AbortController` en memoria por `run.id` en curso.
- **`cliClients/shared.ts`** `spawnCli`: acepta `signal?: AbortSignal`; al dispararse mata el proceso igual que un timeout pero marca `aborted: true` (campo nuevo en `CliRunResult`), distinto de `timedOut`.
- **`claudeCli.ts` / `codexCli.ts`**: pasan el signal a `spawnCli`; si `aborted`, lanzan `"detenido por el usuario"` — un mensaje que deliberadamente NO coincide con ningún patrón de `isTransientCliError`, así que un abort nunca se reintenta.
- **`omniClient.ts`**: `OmniClientOptions` gana `signal`; `fetchWithTimeout` combina el signal externo con su propio `AbortController` de timeout; el bucle de reintento de OmniRoute corta inmediatamente si el signal ya está abortado en vez de reintentar.
- **`executor.ts` / `realExecutor.ts`**: el signal se enhebra hasta las 4 llamadas a `chatCompletion` (analysis/strategy/verdict/texto plano).
- **`orchestrator.ts`**: `executeRun` crea y limpia el controlador del run mediante un wrapper fino (`executeRunBody` hace el trabajo real, así el registro siempre se limpia pase lo que pase); `executeAgentInPass` no arranca un agente si el signal ya está abortado; el issue queda clasificado con un código nuevo `USER_ABORTED` (no `MODEL_ERROR`, para no confundirlo con un fallo real del modelo).
- **`routes/runs.ts`**: `POST /runs/:id/stop` — aborta el controlador del run y marca `status=error` de inmediato; el propio catch del agente en vuelo persiste momentos después el mensaje final "Detenido por el usuario" en ese agente concreto.

### Cambios de frontend

- `api.ts`: `stopRun(id)`.
- `store.ts`: `stopWorkflow()`, mismo patrón de refresco que `resumeWorkflow`.
- `Dashboard.tsx`: botón "Detener análisis" (rojo, icono ⏹) visible solo mientras `isAnalysing` es verdadero, junto al botón de ejecutar/reintentar.

### Verificación

- `test/runAbortRegistry.test.ts` (5 casos): crear/abortar/limpiar el controlador de un run, idempotencia, reemplazo.
- `test/spawnCliAbort.test.ts` (4 casos, **integración real** — spawnea y mata un proceso `node` de verdad): finalización normal, abort a mitad de ejecución (termina en <4 s en vez de esperar los 5 s del sleep o los 10 s del timeout), signal ya abortado antes de lanzar, y que un timeout real se sigue distinguiendo correctamente de un abort de usuario.
- `npm run typecheck` (server) y `tsc -b` (frontend): PASS.
- `npm run build` (frontend): PASS (warning conocido de chunk >500kB, no bloqueante).

### Nota sobre el despliegue del frontend

`Dashboard.tsx` ya tenía cambios locales sin commitear de Pedro (trabajo en curso sobre el propio selector de modelo) antes de añadir el botón. Como un archivo no se puede commitear "a medias" por autor, el commit de esta feature (`a0dcc0f`) incluye limpio `api.ts`/`store.ts` (sin cambios previos) pero deja `Dashboard.tsx` sin commitear. Al construir el frontend para desplegar el botón, se preguntó explícitamente a Pedro si construir ya (lo que incluiría también sus cambios locales en curso de otros componentes) o esperar; eligió construir ya. El build y el despliegue posterior incluyen por tanto tanto el botón nuevo como su trabajo en curso del selector de modelo, tal como estaba en disco en ese momento.

## Limitaciones / pendiente

- No se ha probado el botón "Detener análisis" en vivo con una llamada real a Claude/OmniRoute en curso (verificado mediante tests de integración con un proceso real, pero no desde la UI con la suscripción real).
- Backport de la resiliencia de CLI (`AGENT_CLI_RETRIES`/`isTransientCliError`) de `validacion-real-forex` a `main`: pendiente, no crítico para el síntoma reportado (ver diagnóstico arriba).
- `retryStrategyForBacktestFailure` (el bucle de reconsideración de estrategia tras un backtest real fallido) no recibe el `AbortSignal` — queda fuera de alcance de este botón por ahora; no se invoca desde la ruta de "Ejecutar análisis"/"Reintentar" que el botón cubre.

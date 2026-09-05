# Fix: "Reintentar" ignoraba el cambio de modelo — seguía llamando a Claude

**Fecha:** 2026-09-05. **Estado: ✅ DESPLEGADO** (`main` `3139b6c`, `pm2 restart trading-dashboard`, arranque limpio verificado en logs).

## Síntoma reportado

Pedro cambió el modelo de varios agentes (p. ej. "Crítico Adversarial" de FOREX) de `claude:sonnet` a `openai:gpt-5.6-sol:medium` y, en otro caso, a `omniroute:auto/best-reasoning`, para dejar de consumir la suscripción de Claude ya agotada. La tarjeta del agente mostraba correctamente el nuevo modelo seleccionado, pero al pulsar **Reintentar** el error seguía siendo:

```
[claudeCli] timeout (180s) esperando a claude
```

Es decir: la UI reflejaba el cambio, pero la ejecución real seguía invocando `claudeCli`. Esto agotó cuota de Claude repetidamente sin que el usuario lo notara — confirmado en `pm2 logs`: intentos con timeout de 180s a las 10:48, 11:12, 11:16, 11:31, 19:45, 20:05, 20:08, 20:13 y 20:16 del mismo día, todos previos al fix.

## Diagnóstico

`POST /runs/:id/resume` (`server/src/routes/runs.ts`) reconstruía la lista de agentes a ejecutar desde `run.configuration.agents` — la foto **congelada** del run capturada en `POST /runs` al crearlo, para que el hash de integridad (`configurationHash`) garantice reproducibilidad. Nunca releía el preset vivo (`agentConfigsStore`). Así que:

1. Se crea un run con el preset activo (agentes en `claude:sonnet`).
2. Un agente falla (timeout, límite de sesión, lo que sea).
3. El usuario edita el modelo de ESE agente en el preset vivo (p. ej. a `openai:...` u `omniroute:...`).
4. El usuario pulsa "Reintentar" en la tarjeta del agente.
5. El backend reejecuta usando `run.configuration.agents[agentId].model`, que sigue siendo `claude:sonnet` — el cambio del paso 3 nunca llega a la ejecución real.

El router de LLM (`llmRouter.ts`) y el parser de modelo (`modelString.ts`) eran y son correctos — verificado leyendo el código: `"openai:gpt-5.6-sol:medium"` parsea a `{source:'openai', model:'gpt-5.6-sol', effort:'medium'}` y se despacha a `codexCliChatCompletion` sin ambigüedad. El bug estaba exclusivamente en que el reintento nunca llegaba a usar ese modelo.

## Fix

`syncLiveModelsForRetry()` (nueva función exportada en `runs.ts`): antes de reejecutar, para cada agente que va a reintentarse (los que tengan `status=error`, más el `agentId` específico si se pidió un reintento puntual), busca su modelo vivo en el preset actual (`getPreset(run.configuration.id)`) y, si difiere del congelado, lo sobrescribe **en sitio** — solo el campo `model` (el motor/fuente que responde), nunca prompts, DAG, dependencias ni el resto de la configuración congelada, que sigue intacta para trazabilidad. Cada cambio queda registrado como un nuevo tipo de aviso `RunIssue`, `MODEL_OVERRIDE_ON_RESUME`, y se recalcula `configurationHash` para que el chequeo de integridad de reintentos posteriores siga siendo consistente.

Deliberadamente **no** se cambió el comportamiento de "empezar un run nuevo" (`POST /runs`), que ya lee el preset vivo correctamente desde el principio — el bug era específico de reanudar/reintentar un run ya existente.

## Verificación

- **Test focal:** `test/runsResumeModelSync.test.ts`, 6 casos (sincroniza solo agentes en reintento, no toca los que no se reintentan, no reporta cambio si el modelo vivo es igual, no falla si el preset vivo ya no existe, no hace nada sin objetivos de reintento, ignora agentes renombrados/eliminados en el preset vivo). `npm run typecheck` PASS.
- **Smoke real del CLI `codex`** (subscripción ChatGPT, cuota independiente de Claude — no consumió la cuota agotada): llamada directa a `codexCliChatCompletion('gpt-5.6-sol', 'medium', ...)` respondió en 9,4 s con código 0. Confirma que la ruta OpenAI/Codex en sí funciona; el bug nunca estuvo ahí.
- **Arranque tras despliegue:** `pm2 restart trading-dashboard` → log limpio, `frontend servido desde .../dist`, `listening on http://localhost:5175`, sin errores de arranque.

## Despliegue

Ramas: `fix/resume-model-sync-openai` (creada desde `main`, no desde las ramas de validación FOREX/ACCIONES — es un bug general de producción, no específico de esa validación) → merge a `main` (`3139b6c`) → push a `origin/main` → `pm2 restart trading-dashboard`.

**Detalle operativo importante:** el proceso `trading-dashboard` de pm2 carga el backend directamente desde `server/src/*.ts` vía `tsx` (sin paso de build) en el mismo árbol de trabajo (`Z:\...\trading-agents-dashboard\server`) donde se hacen los `git checkout` de las ramas de validación. Los cambios en disco **no** afectan al proceso ya arrancado (Node cachea los módulos ES importados al iniciar), pero si el proceso se reinicia mientras hay otra rama distinta de `main` en el árbol de trabajo, arrancaría con ese código en vez del de producción. Antes de cualquier `pm2 restart` de este proceso, confirmar `git branch --show-current` = `main`. El frontend, en cambio, se sirve como build estático desde `trading-agents-dashboard/dist/` — los cambios locales sin commitear en los componentes `.tsx` (trabajo en curso de Pedro sobre el propio selector de modelo) no afectan a lo que ve el navegador hasta que se regenere ese build.

## Limitaciones / pendiente

- No se ha probado en vivo con Claude real tras el fix (cuota agotada en el momento de escribir esto) — la reproducción del bug y su corrección están verificadas por código + tests + smoke de `codex`, no por una repetición completa del escenario original con `claude:sonnet`.
- El `RunIssue` `MODEL_OVERRIDE_ON_RESUME` no tiene todavía una representación visual dedicada en la UI (se guarda en `run.issues`, visible si el frontend ya renderiza esa lista); no se ha tocado el frontend para esto.

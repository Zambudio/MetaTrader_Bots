# Migración de todos los agentes a OmniRoute (fuera de las suscripciones Claude/ChatGPT)

**Fecha:** 2026-09-06. **Estado: ✅ HECHO Y VERIFICADO EN VIVO** (`main` `1c97964` + `7dda5c6`, agentes migrados en el `agentConfigs.json` en vivo).

## Petición

Pedro, tras seguir viendo fallos y quema de cuota: quitar `claude:sonnet` de todos los agentes de todas las configuraciones (FOREX, ACCIONES, CRIPTO) y usar modelos OmniRoute (`auto/*`) apropiados para cada rol, para dejar de depender de sus suscripciones Claude/ChatGPT. Pidió que yo mismo probara el funcionamiento después, sin gastar su cuota.

## Qué se cambió

- **`baselinePresets.ts`** (fuente): los constructores `specialist()`/`strategyAgent()`/`reviewAgent()`/`judgeAgent()` ya no usan `claude:sonnet`. Especialistas obligatorios + estrategia + riesgo + crítico + juez → `omniroute:auto/best-coding`; especialistas opcionales (macro/corporativo/régimen-mercado/derivados/on-chain/regulatorio, que casi siempre se abstienen por `DATA_NOT_AVAILABLE`) → `omniroute:auto/best-fast`.
- **`agentConfigs.json` en vivo**: como `loadAgentConfigsState()` solo añade baselines que faltan y nunca sobrescribe una ya persistida, cambiar solo el código fuente no habría afectado a los presets que el dashboard ya tenía guardados. Se migraron con un script puntual (no commiteado, dato en runtime gitignorado) los 33 agentes de `forex_v1`, `forex_v1.1`, `stocks_v1` y `crypto_v1` que seguían en `claude:sonnet`, con copia de seguridad previa del fichero.

## Por qué `best-coding` y no `best-reasoning`

Probé primero `auto/best-reasoning` (el candidato obvio para tareas analíticas) con una llamada real de verdad (prompt de agente + `tool_choice` con el esquema JSON exacto que usan los ocho agentes, no solo texto plano):

- Con una llamada trivial de texto, `best-reasoning` responde en ~4s — el router no está roto.
- Con la llamada real (prompt + tool schema), tardó **100-300s+ por agente** y agotaba su propio timeout de 180s, cayendo silenciosamente al fallback ya configurado (`OMNIROUTE_FALLBACK_MODELS=auto/pro-coding,auto/smart`) — es decir, pagaba el timeout completo de un modelo que no funciona bien con tool-calling para acabar respondiendo con otro.
- Un run real de FOREX completo con `best-reasoning` tardó **más de 2 horas** (lo detuve yo mismo con el botón "Detener análisis" nuevo, que funcionó correctamente: los tres agentes en curso quedaron marcados `[omniClient] detenido por el usuario` / `Detenido por el usuario`).
- Cambié el modelo a `auto/best-coding` (confirmado con una llamada de prueba: responde con `tool_calls` bien formado, contenido real y válido) y repetí el run completo: los tres especialistas obligatorios tardaron 43s / 44s / 134s (mucho más razonable), la estrategia se rechazó correctamente por el gate determinista (`SL = 1.00 ATR`, fuera de [1.25, 2.5]) — el mismo tipo de fallo de contenido ya visto con `claude:sonnet` en las validaciones anteriores, confirmando que es un patrón del modelo/prompt, no un bug de motor.

## Verificación

- `npm run typecheck`: PASS.
- `npx vitest run`: 19 archivos / 81 tests PASS (ningún test fija un hash de preset concreto, así que cambiar el modelo por defecto no rompe nada).
- Run real end-to-end contra el servidor en vivo (`baseline-forex-forex-v1-1`, EUR/USD, snapshot en vivo): especialistas completos con contrato válido, `fx-macro` omitido correctamente, estrategia rechazada por el gate determinista — cadena completa ejercitada sin usar Claude ni Codex.
- Botón "Detener análisis" verificado por API directa en el run anterior (con `best-reasoning`): corta el proceso en curso y dos agentes en cola quedan marcados como detenidos, no como error genérico.

## Pendiente / limitaciones

- **No resuelto:** durante la investigación aparecieron en el log del servidor llamadas reales a `claudeCli`/`claude:sonnet` (2026-09-06 ~09:26-09:33) que no vienen de ninguno de mis runs de prueba (los míos usaban explícitamente OmniRoute). Posible explicación: una prueba manual de Pedro desde el navegador sobre un run creado antes de la migración (que habría quedado con el modelo `claude:sonnet` congelado en su propio snapshot), o un preset/agente que no cubre esta migración. No se ha podido confirmar con certeza — si vuelve a pasar, conviene capturar el `run.id` exacto para diagnosticarlo.
- El botón "Detener análisis" seguía sin verse en el navegador según el último reporte de Pedro; el bundle sí lo incluye (confirmado por grep) y el JSX es correcto — la explicación más probable es una pestaña abierta desde antes del build/restart. Pendiente de confirmación tras recargar.
- No se ha probado el resto de la matriz (ACCIONES/TSLA, CRIPTO/BTC) con `best-coding` en vivo — solo FOREX, que era el ejemplo pedido explícitamente.
- Backport de la resiliencia de CLI (`AGENT_CLI_RETRIES`/`isTransientCliError`) de `validacion-real-forex` a `main`: sigue pendiente, ahora menos crítico porque el motor por defecto ya no es `claude`/`codex`.

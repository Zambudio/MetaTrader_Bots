---
tags: [proyecto-dashboard, mql5, backtest, resiliencia, despliegue, auditoria]
updated: 2026-08-30
---

# Generación MQL5 resiliente a reinicios/cortes del túnel + backtest que aborta si MT5 ya está abierto (2026-08-30)

> Sesión de diagnóstico + fix pedida por Pedro tras ver, sobre la web ya publicada en
> `trading.buenchollotech.com`, dos síntomas reales: **(a)** al generar el código MQL5 de una
> estrategia GO, el pipeline fallaba con `Request failed: 502` y solo quedaba "Reintentar" con
> el mismo modelo; **(b)** al probar con TSLA (siempre se había trabajado con EUR/USD), el
> backtest automático no parecía usar el símbolo nuevo. Cada hallazgo se reprodujo contra
> evidencia real (logs de `pm2`, log principal del terminal de MetaTrader, logs de los agentes
> del Strategy Tester, JSON de runs persistidos) antes de tocar código. Continúa
> [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](2026-08-20-prueba-e2e-agentes-mql5-backtest.md)
> (hallazgos 5 y 6: reconciliación de runs huérfanos y fallos deterministas del backtest).

## Resumen

Dos diagnósticos independientes, ambos con causa raíz confirmada en logs y ambos desplegados a
producción (`main`, commits `8916be0` y `d5ad933`, `pm2 restart` + `pm2 save` el 2026-08-30
~11:00, `https://trading.buenchollotech.com/api/health` verificado local y por el edge):

1. **La generación MQL5 no sobrevivía a un reinicio del servidor ni a un parpadeo del túnel.**
   El pipeline dura entre 3 y 25 min y se sondea sobre el túnel de Cloudflare. Los jobs vivían
   **solo en memoria**; un `pm2 restart` (redeploy, `scripts/update.ps1`, reinicio de PC) o un
   `502`/`504` transitorio del túnel en cualquiera de los cientos de sondeos abortaba la
   generación entera desde el frontend, aunque el job del backend siguiera vivo o ya hubiera
   terminado.

2. **El backtest headless no se ejecutaba si MetaTrader 5 ya estaba abierto.** El par y el
   timeframe SÍ se pasan bien al tester; el `.ini` de la prueba de TSLA en disco lo confirma
   (`Symbol=TSLA`, `Period=H4`). Pero `terminal64.exe /config:<ini>` solo lanza el tester en un
   **arranque limpio**: contra una instancia ya abierta, Windows le reenvía la config y el
   proceso nuevo sale al instante, y la instancia en marcha **ignora la sección `[Tester]`
   reenviada**. El sondeo agotaba los 180s y devolvía "no se pudo confirmar la finalización".

## Metodología

- Producción real: `pm2` (`trading-dashboard` = Express+tsx sirviendo `dist/`, `trading-tunnel`
  = `cloudflared`), MetaTrader 5 instalado (cuenta MetaQuotes-Demo), sin mocks.
- Evidencia primero: `~/.pm2/logs/trading-dashboard-out.log`, event log del Programador de
  tareas de Windows, `AppData/Roaming/MetaQuotes/Terminal/<perfil>/logs/AAAAMMDD.log` (log
  principal) y `.../Tester/<perfil>/Agent-127.0.0.1-N/logs/AAAAMMDD.log` (agentes del tester),
  leídos como UTF-16LE, y los `.json` de `server/src/data/runs/`.
- Fixes verificados con `tsc --noEmit` + `vitest` (14 tests nuevos/tocados en verde) y con el
  despliegue real health-checkeado.

## Hallazgo 1 — La generación MQL5 no sobrevivía a un reinicio ni a un 502 del túnel

### Evidencia

`trading-dashboard-out.log`, 2026-08-30:

```
00:16:17  [codexCli] spawn ... (JSON tool=deliver_ea)
00:19:17  [codexCli] codex terminó en 180.0s (código null)   ← SIGKILL al agotar el timeout
00:19:41  [trading-agents-server] listening on http://localhost:5175   ← reinicio
00:20:32  [codexCli] spawn ... (JSON tool=deliver_ea)
00:23:32  [trading-agents-server] listening on http://localhost:5175   ← reinicio
00:24:07  [codexCli] spawn ... (JSON tool=deliver_ea)
00:26:13  [codexCli] codex terminó en 125.9s (código 0)   ← EA generado OK
00:26:33  [trading-agents-server] listening on http://localhost:5175   ← reinicio 20s después
```

Los reinicios de esa noche los provocó el trabajo de despliegue en curso de otra sesión
(paso de `tsx` CLI a `server/start.mjs`, re-ejecución de `install-autostart.ps1` — confirmado
en el event log de Task Scheduler: la tarea `TradingDashboard-Autostart` NO se auto-repite, se
lanzó a mano varias veces entre las 00:23 y 00:26). No era un bucle de reinicio permanente. Pero
la fragilidad de fondo es real y la reproduce cualquier `scripts/update.ps1`:

- **`server/src/engine/mql5Jobs.ts`**: los jobs eran un `Map` en memoria. Un reinicio a mitad
  → el frontend sondea un `jobId` que ya no existe → `404`, o `502` del túnel durante la ventana
  de caída.
- **`src/lib/api.ts` (`pollJob`)**: el bucle de sondeo solo toleraba `TypeError` (fallo de red
  de `fetch`). Un `502`/`503`/`504` del túnel llega como respuesta HTTP con `response.ok === false`
  → se lanzaba como `Error` fatal **inmediato**, matando la generación desde la UI aunque el job
  del backend siguiera corriendo. Con cientos de sondeos (cada 2 s) en una generación de 20 min,
  la probabilidad de pillar al menos un `502` transitorio del túnel es alta.

Y por diseño de UI: `StrategyResultCard.tsx` solo mostraba el `<ModelSelector>` en estado
`idle`; en estado `error` quedaba únicamente "Reintentar generación", que reintenta con el mismo
modelo. Para cambiar de motor había que recargar la página.

Contexto de latencia: el modelo configurado (`openai:gpt-5.6-sol:medium`) clava el timeout de
180 s escribiendo el `.mq5` completo (`código null` en los logs), forzando reintentos que
alargan todo. El pipeline encadena generación + hasta 3 correcciones de compilación + backtest
(hasta 180 s) + hasta 3 ciclos de optimización del Quality Gate + el bucle exterior
`generateWithStrategyFeedbackLoop` (hasta `MAX_BACKTEST_STRATEGY_RETRIES = 2` re-estrategias):
peor caso real, 20–40 min, sin techo ni indicador de "ciclo X de Y".

### Fix (commit `8916be0`)

**Backend**
- **Jobs persistidos en disco** (`server/src/data/mql5-jobs/<id>.json`, ignorado por git),
  reflejando el `Map` en memoria (ruta rápida) con throttle de 2 s en las actualizaciones de
  progreso; escritura siempre en los estados terminales.
- **`reconcileOrphanedMql5Jobs()`** al arrancar (en `index.ts`, junto a `reconcileOrphanedRuns`,
  antes de `app.listen`): todo job persistido en `running` es huérfano → se reconcilia a `done`
  si su run ya tiene `mql5Result` (el backend terminó y guardó justo antes de morir — exactamente
  el caso de las 00:26:13), o a `error` accionable en otro caso. Barre además ficheros caducados
  (TTL 30 min) y resiste ficheros corruptos/a medio escribir sin tumbar el arranque.
- **`GET /api/mql5/generate/:jobId`** cae a disco (`getMql5JobPersisted`) si el job no está en
  memoria: tras un reinicio el frontend recibe un `error` claro en vez de un `404`.
- **`MQL5_GEN_TIMEOUT_MS`** (nuevo env, def. 300000, antes 180000 fijo): la llamada al LLM que
  escribe el `.mq5` es la petición más pesada; con 180 s se mataba a los modelos por CLI a mitad.

**Frontend (`src/lib/api.ts`, `src/components/StrategyResultCard.tsx`)**
- `pollJob` tolera `408/425/429/500/502/503/504` y fallos de red durante ~90 s seguidos (30
  sondeos) antes de rendirse, con backoff lineal. Tope absoluto de 90 min por si el job se
  quedara colgado en `running`. `class ApiError extends Error` lleva `.status` para distinguir
  gateway transitorio de error real.
- El selector **Fuente → Modelo → Esfuerzo** se muestra también en el estado de error (mismo
  `<details>` que en `idle`), con un aviso ⚡ cuando el motor es un modelo por CLI (lento)
  ofreciendo `auto/best-coding` de OmniRoute con un click.
- **Recuperación automática**: si el sondeo falla, se consulta el run (`GET /api/runs/:id`) por
  si el backend ya guardó `mql5Result`; botón "↻ Comprobar si ya se generó" en el estado de error.

## Hallazgo 2 — El backtest headless no corre si MetaTrader 5 ya está abierto

### El par y el timeframe SÍ se pasan bien

Fichero de config que generó el dashboard para la prueba de TSLA, encontrado en disco sin
borrar (`AppData/Roaming/MetaQuotes/Terminal/<perfil>/autotester_pJNSrenx.ini`):

```ini
[Tester]
Expert=EA_TSLA_H4_pJNSrenx.ex5
Symbol=TSLA
Period=H4
FromDate=2025.08.01
ToDate=2026.08.18
```

`mql5Backtester.ts` coge `strategy.pair`/`strategy.timeframe` del análisis y los mete ahí
(`normalizeSymbol("TSLA") = "TSLA"`). Y el tester los respeta cuando el símbolo existe: hay una
prueba de **AAPL** el 29-ago que corrió correctamente en `AAPL,H1`
(`Symbols AAPL: symbol synchronized` → `Tester AAPL,H1: testing of ...`). El EA usa
`_Symbol`/`_Period` (nunca hardcodea el símbolo) y los SL/TP del EA de Tesla están en escala de
acción (`11.69`/`18.71` unidades de precio), no de forex — la propuesta se adaptó bien.

### Evidencia de por qué falló

`mql5Result.backtestSession` quedó en `null` con *"No se pudo confirmar la finalización dentro
del tiempo límite (180s)"*. Timeline del log **principal** del terminal, 2026-08-29:

```
10:06–12:35  pruebas EUR/USD: cada una = Startup from start config autotester_XXX.ini
             → Tester automatic testing started → last test passed → Terminal shutdown with 0
14:42        Terminal shutdown with 0   (una instancia abierta a mano se cierra)
16:06        autotester_pJNSrenx.ini creado ... y CERO rastro: sin Startup, sin Terminal
             launched, sin Tester. En ningún log de agente del tester aparece "TSLA" jamás.
21:47        terminal stopped due to system shutdown
```

Es decir: entre las 14:42 y las 21:47 MT5 quedó abierto (probablemente Pedro mirando gráficos de
Tesla). A las 16:06 el dashboard lanzó `terminal64.exe /config:autotester_pJNSrenx.ini` **contra
esa instancia ya en marcha** → config reenviada por línea de comandos → la instancia abierta no
ejecutó el tester. El `.ini` sobrevivió sin borrarse porque MT5 lo tenía abierto cuando el
backtester intentó su `fs.unlink().catch()` — pista extra de que había una instancia corriendo.

Las pruebas de EUR/USD "siempre funcionaban" porque `ShutdownTerminal=1` cierra MT5 tras cada
test, así que cada una era un arranque limpio. El comentario del código asumía que *"si ya había
una instancia abierta... el test sigue corriendo en segundo plano"* — **esa asunción es falsa**.

### Fix (commit `d5ad933`)

`isTerminalRunning(terminalExe)` en `mql5Backtester.ts` comprueba con `tasklist` antes de lanzar.
Si `terminal64.exe` ya está en ejecución, `runHeadlessBacktest` corta al instante con
`qualityNotes` accionable (*"MetaTrader 5 ya está abierto... cierra MetaTrader 5 y vuelve a
generar, o pulsa Optimizar para reintentar solo el backtest"*) en vez de esperar 180 s a un
timeout mudo. Si `tasklist` falla, no bloquea (deja que el test lo intente). El EA compilado se
entrega igualmente — solo se salta el backtest. `retriableCodeIssue` queda `undefined` (no es un
problema de código), así que el bucle de auto-optimización no se dispara para este caso.

**Workaround inmediato mientras no se despliegue una instancia dedicada**: cerrar `terminal64.exe`
antes de generar. (Ver §"Limitación de entorno conocida" abajo.)

## Estado final verificado

- `main` en `d5ad933`; rama de trabajo `fix/mql5-generacion-resiliente` fusionada (fast-forward)
  y borrada. `dist/` reconstruido y servido (`index-54S89YBW.js` = build de esta sesión, servido
  por el edge). `pm2 save` hecho.
- `tsc --noEmit` limpio (server + front); `vitest` con `test/mql5Jobs.test.ts` (6) y
  `test/mql5Backtester.test.ts` (2) nuevos en verde. `oxlint` limpio.
- `reconcileOrphanedMql5Jobs` corrió al arrancar sin jobs huérfanos que reconciliar (la carpeta
  `mql5-jobs/` aún no existía) — se creará en la primera generación.

## Limitación de entorno conocida (no es un bug de código)

El backtest headless comparte el terminal `terminal64.exe` con la instancia que Pedro abre a
mano. El fix de esta sesión **detecta y avisa**, no aísla. Aislarlo de verdad (opción evaluada y
no elegida por coste) requiere una segunda instalación de MT5 o `--portable` con su propio
data-dir. Hasta entonces: **cerrar MetaTrader 5 antes de generar**. Emparejable con la limitación
ya documentada en el informe del 2026-08-20 (símbolo `BTCUSD` inexistente en la cuenta demo) y
con la nota operativa de MetaEditor abierto en
[`docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md`](../../../trading-agents-dashboard/docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md) §5.

## Pendiente / no abordado en esta sesión

- **`codex` devuelve JSON vacío en `deliver_ea`/`propose_strategy`** de forma intermitente
  (`El modelo no devolvió código MQL5 válido` / `El agente de estrategia devolvió campos
  esenciales vacíos` en el error log del 2026-08-30). No fatal (corta el ciclo de optimización o
  el run, pero el EA/estrategia previos se entregan). Ya avisado en el informe del selector
  fuente/modelo como riesgo conocido de `codex` con salida estructurada — la recomendación sigue
  siendo Claude/OmniRoute para tool-calling estricto.
- **Instancia MT5 dedicada** para el backtest headless (ver "Limitación de entorno").
- **Incoherencia de documentación**: el `CLAUDE.md` raíz dice "este repositorio no usa `docs/`",
  pero `trading-agents-dashboard/docs/` tiene 5 ficheros activos y referenciados desde los
  README (`MQL5_ERRORES_CONOCIDOS.md` es autogenerado por código; `DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md`
  lo añadió la sesión de despliegue). Esta sesión ha seguido el patrón vigente (informe en la
  wiki + correcciones en los README y `docs/` operativos existentes) y deja la reconciliación
  de esa regla como decisión pendiente para Pedro.

## Ver también

- [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](2026-08-20-prueba-e2e-agentes-mql5-backtest.md)
  — informe que esta sesión continúa: hallazgo 5 (`reconcileOrphanedRuns` — mismo patrón que el
  nuevo `reconcileOrphanedMql5Jobs`) y hallazgo 6 (fallos deterministas del backtest reportados
  con precisión — el guard "MT5 abierto" es uno más de esa familia).
- [`2026-08-29-selector-fuente-modelo-cli.md`](2026-08-29-selector-fuente-modelo-cli.md) — el
  `<ModelSelector>` que esta sesión reutiliza ahora también en el estado de error; y el riesgo
  conocido de `codex` con salida JSON estructurada.
- [`server/README.md`](../../../trading-agents-dashboard/server/README.md) §"Generación de código
  MQL5" y §"Backtest headless automático" — actualizados con el comportamiento corregido (jobs
  persistidos + reconciliación; guard de MT5 abierto; `MQL5_GEN_TIMEOUT_MS`).
- [`docs/DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md`](../../../trading-agents-dashboard/docs/DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md)
  §7 Troubleshooting y §10 Bitácora — un `scripts/update.ps1` o `pm2 restart` ya no pierde una
  generación MQL5 en curso.

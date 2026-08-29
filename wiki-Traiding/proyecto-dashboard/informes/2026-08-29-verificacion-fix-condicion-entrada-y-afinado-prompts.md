---
tags: [proyecto-dashboard, agentes, mql5, backtest, verificacion]
updated: 2026-08-29
---

# Verificación en vivo del fix "condición de entrada mecánica" y afinado de prompts del panel (2026-08-29)

> Continuación directa de [`2026-08-20-diagnostico-veredicto-vs-backtest-real.md`](2026-08-20-diagnostico-veredicto-vs-backtest-real.md), cuyo pendiente era relanzar el pipeline real tras los 3 fixes del commit `0813992` (condición de entrada mecánica obligatoria, `retryStrategyForBacktestFailure`, UI honesta sobre "GO"). Esta sesión ejecutó ~9 análisis reales de EUR/USD H1/H4 contra OmniRoute + MetaTrader + Twelve Data, sin mocks, dirigidos vía la misma API que usa el frontend.

## Resumen

- **`condicionEntrada` mecánica (fix 1): FUNCIONA.** `agente-riesgo` produce reglas mecánicas en relaciones indicador/precio, no precios anecdóticos; `agente-validador-tecnico` la audita explícitamente (su punto 5) y la cita como "objetiva y codificable".
- **Bucle de reintento por veredicto "ajustar": FUNCIONA.** Verificado enganchándose y reejecutando el subgrafo `agente-riesgo → validador → refutador → razonador` hasta `maxRetries`.
- **`retryStrategyForBacktestFailure` (fase "restrategizing", fix 2): SIGUE SIN VERIFICARSE EN VIVO.** El pipeline nunca llegó a generar código MQL5 porque el panel no emitió "GO" en ningún análisis — pero ahora rechaza por motivos correctos (defectos reales de la regla), no por ruido del instante.
- **Tres hallazgos nuevos corregidos vía prompts** (ver §3-5), sobre evidencia de análisis reales. Los tres sitios del roster (`agents.json`, `DEFAULT_AGENTS` en `agentsStore.ts`, preset activo en `agentConfigs.json`) quedaron **sincronizados**.

## Metodología

Backend en local **sin `tsx watch`** (ver §"Problemas de entorno"), frontend no arrancado — los análisis se dispararon con `POST /api/runs` y `POST /api/runs/:id/resume`, exactamente lo que hace el frontend. `OMNIROUTE_API_KEY`/`OMNIROUTE_BASE_URL` configurados (modo real), MetaTrader 5 instalado. Cada análisis se inspeccionó volcando el JSON persistido del run: estrategia de `agente-riesgo`, auditoría del Validador, crítica del Refutador y veredicto del Razonador.

## Hallazgos

### 1. [VERIFICADO] La condición de entrada mecánica y su auditoría funcionan

En todos los análisis con snapshot disponible, `agente-riesgo` produjo un `condicionEntrada` mecánico — p. ej. `"El precio cierra por encima de la EMA20 Y RSI(14) > 30"` o `"RSI(14) < 30 Y Cierre(0) > Apertura(0) Y Abs(EMA20 - EMA50) < 0.0030"` — nunca un nivel de precio suelto tipo "cuando toque 1.0950". `agente-validador-tecnico` lo evalúa explícitamente en su punto 5 y responde con cosas como *"Es una regla 100% mecánica y repetible. No depende de interpretaciones visuales subjetivas, lo que permite su integración en un EA y su validación en backtesting histórico"*. El fix 1 del commit `0813992` está operativo.

### 2. [VERIFICADO] El bucle de reintento por "ajustar" se dispara y reejecuta el subgrafo correcto

Cuando el Razonador emite `ajustar`, `executeRun` reejecuta `agente-riesgo → validador → refutador → razonador` con las objeciones inyectadas como contexto, hasta `maxRetries` (contador `retryCount`). Verificado en varios runs llegando a `retryCount: 2` con `attempt` incrementándose en cada agente del subgrafo. `no_operar` es terminal desde el primer intento (verificado: un run terminó en `rc=1` con `no_operar`, sin llegar a `rc=2`).

### 3. [NUEVO, CORREGIDO Y VERIFICADO] El panel rechazaba por circunstancias del instante, no por defectos de la regla

**Síntoma**: el Razonador emitía `no_operar`/`ajustar` apoyándose en argumentos como *"esperar un retroceso de 3 ATR para entrar antes del cierre de mercado es improbable"*, *"mantener la orden abierta el fin de semana tras Jackson Hole expone la cuenta a Gap Risk"*, *"la entrada cae en el cierre de NY del viernes"*. Todos son válidos para **una operación concreta abierta en este instante**, pero irrelevantes para un EA que codifica la `condicionEntrada` y la prueba contra ~12 meses de histórico. Es la misma limitación estructural que el diagnóstico de 2026-08-20 identificó — el panel juzga "¿operar AHORA?" y no "¿es sólida esta regla repetida?" — que el campo `condicionEntrada` mitiga pero no elimina, porque el marco evaluativo de los prompts seguía anclado al "ahora mismo" (el prompt original del Razonador dice literalmente "...tenga sentido **ahora mismo con estos datos**").

**Fix**: cláusula añadida a `agente-refutador` y `agente-razonador` que obliga a separar:
- **(a) defectos de la REGLA repetible** — filtros que no pueden cumplirse a la vez, dirección contra la tendencia dominante del timeframe, R:R insuficiente, SL/TP mal dimensionados respecto al ATR o situados donde la regla se barrería sistemáticamente, condición no mecánica → **motivo de AJUSTAR/NO_OPERAR**.
- **(b) circunstancias del momento del snapshot** — día/hora, cierre de sesión o de mes, distancia actual del precio a la entrada, gap de fin de semana de la operación hipotética, evento de calendario puntual inminente → **salvedad de ejecución manual en vivo, NO motivo de rechazo**.

Es el mismo patrón que el fix 2 del informe E2E de 2026-08-20 (datos de order book: "no es motivo de rechazo, anótalo como supuesto a verificar").

**Verificación**: tras el cambio, el Refutador estructura su salida en `"(a) DEFECTOS DE LA REGLA — MOTIVO DE RECHAZO"` y `"(b) CIRCUNSTANCIAS DEL MOMENTO DEL SNAPSHOT (salvedad de ejecución en vivo – NO rechazo)"`, colocando el cierre de viernes, el gap de fin de semana, la correlación DXY y la ausencia de order book/OBV todos en (b) con la nota explícita "no rechazo la regla por esto". El Razonador mueve el gap de viernes a "salvedad de ejecución manual" dentro de la razón.

### 4. [NUEVO, CORREGIDO Y VERIFICADO] `agente-riesgo` sobre-restringía la condición de entrada

**Síntoma**: `agente-riesgo` combinaba un toque de precio exacto ("el precio toca la EMA20 en la vela actual o anterior") con dos o tres filtros de oscilador simultáneos estrictos ("RSI sube de 25 a >40" + "MACD histograma < 0") en una ventana de 1-2 velas. El Refutador lo identificaba correctamente como regla con "una probabilidad cercana a 0" de dispararse en 12 meses — un EA que produciría 0 operaciones en backtest, el modo de fallo con el que terminó el informe E2E de 2026-08-20. El bucle de reintento no lo corregía: `agente-riesgo` producía otra regla igual de inviable.

**Fix**: guía de viabilidad de backtest en el prompt de `agente-riesgo`: el EA necesita >= 15 operaciones en ~12 meses; una regla que exija una secuencia en la misma vela o en 2 velas, o que apile 3+ filtros simultáneos estrictos, dispara demasiado pocas veces — es un fallo de diseño, no precisión. Usar 1-2 filtros robustos con ventanas amplias. SL a 1x-2.5x ATR desde la entrada (ni pegado a una media, ni a 5x-7x ATR).

**Verificación**: tras el cambio, `agente-riesgo` produjo condiciones limpias de 2-3 filtros amplios (`"RSI(14) < 30 Y Cierre > Apertura Y Abs(EMA20-EMA50) < 0.0030"`). El Validador confirma que son mecánicas y comprueba que se cumplen contra el snapshot.

### 5. [NUEVO, CORREGIDO] `agente-riesgo` proponía entradas contra-tendencia

**Síntoma**: con el RSI en sobreventa extrema (24-25), `agente-riesgo` proponía COMPRA de reversión a la media, pese a que el H1 estaba en tendencia bajista clara (precio por debajo de la SMA200, EMA20 < EMA50). El Refutador y el Razonador lo rechazaron **correctamente y por motivos de regla** (categoría a): *"opera sistemáticamente en contra de la tendencia dominante del timeframe... el filtro de distancia entre medias no captura el sesgo, solo su separación"* y *"el SL queda a solo 7 pips del mínimo local... en fases bajistas sostenidas con RSI en sobreventa, la regla compraría repetidamente y sería barrida por el stop"*.

**Fix**: línea en el prompt de `agente-riesgo` exigiendo que la dirección se alinee con la tendencia dominante del timeframe (precio < SMA200 y EMAs bajistas → VENTA); para una entrada contra-tendencia hace falta un filtro de reversión robusto y explícito que el Validador pueda comprobar, no un simple RSI en sobreventa.

**Verificación**: tras la edición, `agente-riesgo` sí produjo (en un reintento) una regla **alineada con la tendencia bajista dominante**: `direction: sell`, `condicionEntrada: "Close < EMA20 AND MAX(High, 5) > EMA20 AND RSI(14) < 60"` (venta al reincorporarse el precio por debajo de la EMA20 tras haberla tocado). Es una regla limpia, trend-aligned y de 2-3 filtros amplios — justamente lo que buscan los tres fixes juntos. No se llegó a cerrar el veredicto de ese análisis dentro del presupuesto de la sesión (OmniRoute muy lento), así que "GO → generar MQL5" sigue sin alcanzarse, pero el cuello de botella ya no es la calidad direccional de `agente-riesgo`.

## Cambios aplicados

- `trading-agents-dashboard/server/src/data/agents.json` (y sincronizados a `server/src/store/agentsStore.ts` `DEFAULT_AGENTS` + preset activo `"La primera completa"` en `server/src/data/agentConfigs.json`):
  - `agente-riesgo`: +alineación direccional con la tendencia dominante; +guía de viabilidad de backtest (>= 15 ops, 1-2 filtros amplios, no apilar); +SL 1x-2.5x ATR.
  - `agente-refutador`: +cláusula (a) defecto de regla vs (b) circunstancia del instante.
  - `agente-razonador`: +cláusula (a)/(b) y "emite GO si la regla es sólida".
- `trading-agents-dashboard/server/src/engine/omniClient.ts`: `DEFAULT_TIMEOUT_MS` 120000 → 180000, `DEFAULT_MAX_RETRIES` 1 → 2 (mitigación de la inestabilidad de OmniRoute, ver abajo). Ambos siguen teniendo override por env (`OMNIROUTE_TIMEOUT_MS`) y por `options` en cada llamada.

## Problemas de entorno (no son bugs del dashboard)

- **`tsx watch` sobre disco de red**: el proyecto vive en `\\Zambu-nas\nas-drive-pedro\...`; el file-watcher de `tsx watch` dispara reinicios fantasma del backend sobre esa unidad de red, y cada reinicio marca como `error` (huérfano) el análisis en curso vía `reconcileOrphanedRuns`. Workaround para la sesión: arrancar el backend sin `watch` (`./node_modules/.bin/tsx --env-file-if-exists=.env src/index.ts` desde `server/`). Los prompts viven en `agents.json`, que `listAgents()` relee de disco en cada petición, así que editarlos no necesita reinicio.
- **`npx tsx` cayó una vez con exit 127** a mitad de una llamada al LLM (glitch puntual sobre la unidad de red). Usar el binario local `./node_modules/.bin/tsx` en vez de `npx tsx` lo evitó el resto de la sesión.
- **Twelve Data (free tier) agota el timeout** al pedir las 5000 velas de EUR/USD H1 de forma intermitente. Cuando ocurre, `buildMarketSnapshot` devuelve `null` y los agentes trabajan a ciegas — inventan precios de referencia y el panel los rechaza correctamente por "sin datos", pero se desperdicia un análisis completo. Mitigación: calentar la caché (`GET /api/candles`) inmediatamente antes de lanzar el run.
- **OmniRoute inestable**: timeouts de 120s y errores `503` de endpoints gratuitos (`deepseek-v4-flash-free`) en el router `auto/best-chat` que usa `agente-riesgo`. Varios análisis fallaron y hubo que reanudarlos. Mitigado subiendo el timeout por defecto a 180s y los reintentos a 2 en `omniClient.ts`.

## Pendiente / no verificado

- **`retryStrategyForBacktestFailure` (fase "restrategizing") sigue sin verificarse en vivo** — requiere que el panel emita "GO", se genere el MQL5, compile, corra el backtest real y falle el Quality Gate. Ningún análisis de esta sesión llegó a "GO": el panel (correctamente, tras los fixes) rechaza las propuestas de `agente-riesgo` por defectos reales de la regla. El cuello de botella se ha desplazado del panel (que ahora funciona bien) a la **calidad de las propuestas de `agente-riesgo`** en un setup de mercado adverso (EUR/USD H1 en tendencia bajista fuerte con RSI en sobreventa: la jugada sólida es continuación bajista, pero `agente-riesgo` tiende a sobre-restringirla o a proponer reversión a la media contra-tendencia).
- Sigue sin completarse, en ningún punto del proyecto, un ciclo con Quality Gate en verde y operaciones reales — el mismo pendiente que arrastran los dos informes de 2026-08-20.
- Las ediciones de prompt de esta sesión se hicieron sobre evidencia de varios análisis reales, pero contra un único snapshot de mercado (viernes 2026-08-28, EUR/USD en sobreventa). Conviene reejecutar en otros pares/timeframes/momentos antes de darlas por buenas, y probablemente en un momento con mejor disponibilidad de Twelve Data y OmniRoute.

## Ver también

- [`2026-08-29-loop-quality-gate-verde-eurusd.md`](2026-08-29-loop-quality-gate-verde-eurusd.md) y su [plan](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md) — el bucle autónomo que retoma el pendiente de esta sesión (llegar a "GO" y de ahí a un Quality Gate en verde), iterando prompts + generador MQL5 hasta lograrlo.
- [`2026-08-20-diagnostico-veredicto-vs-backtest-real.md`](2026-08-20-diagnostico-veredicto-vs-backtest-real.md) — el diagnóstico y los 3 fixes que esta sesión verifica en vivo por primera vez.
- [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](2026-08-20-prueba-e2e-agentes-mql5-backtest.md) — la prueba E2E previa; su fix 2 (Refutador/Razonador y los datos imposibles de aportar) es el patrón que esta sesión reutiliza para las circunstancias del instante.
- [`../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md`](../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md) — el pipeline de Quality Gate/iteración que todo esto implementa.
- [`server/README.md`](../../../trading-agents-dashboard/server/README.md) — arquitectura técnica del orquestador y el pipeline de backtest.

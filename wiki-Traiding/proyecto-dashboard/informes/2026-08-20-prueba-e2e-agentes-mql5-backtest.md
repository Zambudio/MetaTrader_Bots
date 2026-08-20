---
tags: [proyecto-dashboard, agentes, mql5, backtest, auditoria]
updated: 2026-08-20
---

# Prueba end-to-end del ciclo completo: agentes → estrategia → MQL5 → backtest (2026-08-20)

> Prueba real y sin mocks de todo el flujo de `trading-agents-dashboard/`, pedida explícitamente por Pedro: lanzar el análisis desde la pestaña principal tal y como estaba configurado, comprobar que los 6 agentes funcionan, generar código MQL5 desde una estrategia validada, compilarlo y probarlo con backtest real, iterando hasta conseguir un resultado. Cada hallazgo de este documento se reprodujo contra infraestructura real (OmniRoute, MetaEditor64, MetaTrader 5 terminal) y cada fix se verificó en vivo, no solo por lectura de código. Ver también [`docs/ESQUEMA_AGENTES_ANALISIS.md`](../../../trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md) para el diseño original de los 6 agentes, y la auditoría previa [`promp-auditoria1908.md`](../../../promp-auditoria1908.md) (raíz del repo, no indexada en la wiki) de la que procede parte del trabajo ya implementado que aquí se verifica.

## Resumen

Se ejecutaron más de 10 análisis completos reales (EUR/USD en H1/H4, BTC/USD en H4) y 4 generaciones/optimizaciones de código MQL5 con compilación real contra MetaEditor64 y backtest headless real contra MetaTrader 5. Se encontraron y corrigieron **9 problemas reales**, tres de ellos críticos porque impedían que el sistema completara su propósito (el pipeline nunca llegaba a un veredicto "go", y el backtest automático nunca detectaba correctamente ni sus propios éxitos). Al final de la sesión el ciclo completo funciona: los agentes convergen a un veredicto "go" de forma fiable, el EA generado compila limpio contra MetaEditor real, y el backtest headless detecta correctamente tanto éxitos como fallos reales (crashes de runtime, símbolos inexistentes, cero operaciones).

## Metodología

- Backend y frontend corriendo en local (`npm run dev`), con `OMNIROUTE_API_KEY`/`OMNIROUTE_BASE_URL` configurados (modo real, sin mocks) y MetaTrader 5 instalado (`metaeditor64.exe` + `terminal64.exe`, cuenta demo MetaQuotes-Demo).
- Cada hallazgo se reprodujo primero contra el sistema tal cual estaba, con evidencia concreta (logs reales de MetaTrader, JSON de runs persistidos) antes de tocar código.
- Cada fix se verificó relanzando el flujo real (nueva ejecución de agentes, nueva generación MQL5, o un script aislado que invoca la función corregida directamente contra artefactos ya generados) — nunca se dio un fix por bueno solo porque compilara.

## Hallazgos y correcciones

### 1. [CRÍTICO] La detección de backtests nunca funcionó — ni con éxito ni con operaciones reales

**Archivo**: `server/src/engine/mql5Backtester.ts` (`readLogFileAnyEncoding`).

Los logs de MetaTrader (tanto el del terminal principal como los de `Agent-N/logs/`) se escriben **siempre en UTF-16LE con BOM**, nunca en UTF-8. La función que leía el log del agente de tester para buscar la marca `final balance` intentaba primero `fs.readFile(path, 'utf-8')` y solo caía a `'utf16le'` si esa lectura lanzaba una excepción — pero **leer un archivo UTF-16LE como UTF-8 en Node no lanza excepción**, solo decodifica cada carácter de 2 bytes como basura silenciosa. El resultado: `/final balance/i.test(content)` nunca coincidía, sin importar si el backtest había terminado con éxito, con operaciones reales, o no.

**Impacto real**: cada backtest automático de la sesión (crashes, símbolo inexistente, y **backtests que sí terminaron bien en MetaTrader**) se reportaba igual — "no se pudo confirmar la finalización dentro del tiempo límite (180s)... puede seguir en curso" — un mensaje ambiguo que ocultaba que el backtest ya había terminado, con o sin operaciones. Esto significa que el Quality Gate cuantitativo y el bucle de auto-optimización (ambos ya implementados desde una auditoría previa) **nunca se habían ejecutado de verdad en la práctica**, porque `session` nunca se poblaba.

**Verificación**: comparado directamente el mismo archivo de log leído como `'utf-8'` (no contiene "final balance") vs `'utf16le'` (sí la contiene) — confirmado con Node en vivo. Tras el fix, un backtest ya conocido como exitoso (EA compilado que corre limpio pero no abre operaciones) se detectó correctamente: `hasSession: true, finalBalance: 10000, dealsCount: 0`, con el mensaje correcto "El EA no ejecutó ninguna operación durante la simulación histórica" en vez del timeout genérico.

**Fix**: `readLogFileAnyEncoding` ahora lee siempre como `utf16le` (quitando el BOM manualmente comparando `charCodeAt(0) === 0xfeff`), sin intento previo de UTF-8.

### 2. [CRÍTICO] El Refutador y el Razonador exigían datos que el sistema nunca puede proporcionar

**Archivos**: `agents.json` (prompts de `agente-refutador` y `agente-razonador`, editados vía `PUT /api/agents/:id` — el mismo endpoint que usa el modal "Configurar" de la UI).

El snapshot de mercado (`marketSnapshot.ts`) solo incluye OHLCV de la última vela + SMA/EMA/RSI/MACD/Bollinger/ATR/rango reciente — **nunca** profundidad de libro de órdenes, osciladores de volumen (OBV/CMF/MFI) ni flujos de ETF. El prompt del Refutador ("exige evidencia concreta del contexto antes de darla por buena") no aclaraba ese límite, así que el modelo — reforzado por el contexto de la wiki sobre análisis de volumen — exigía repetidamente esos datos como condición para aprobar cualquier propuesta.

**Impacto real**: en **3 de 3 análisis completos** (EUR/USD H1, EUR/USD H4, BTC/USD H4), el veredicto nunca fue "go" — el Refutador exigía "datos de volumen (OBV/CMF)", "profundidad de libro (depth)" o "flujos ETF spot" que el sistema estructuralmente no puede aportar nunca, garantizando rechazo indefinido sin importar cuántos reintentos automáticos se dieran.

**Verificación**: tras corregir los prompts, el siguiente análisis (BTC/USD H4) convergió a "go" **en el primer intento, sin ningún reintento automático** (`retryCount: 0`), con el Razonador explícitamente anotando "Limitaciones conocidas no bloqueantes: falta profundidad de libro, osciladores de volumen OBV/CMF/MFI y flujos ETF" en vez de usarlas para bloquear.

**Fix**: se añadió a ambos prompts una instrucción explícita: el sistema no tiene acceso a esos datos, nunca forman parte del snapshot, y una objeción que los exige no es "corregible" — debe anotarse como limitación conocida, no como motivo de rechazo.

### 3. [ALTO] Un solo fallo aritmético del LLM tumbaba todo el análisis

**Archivo**: `server/src/engine/orchestrator.ts` (`runPass`).

La validación numérica determinista de la estrategia (`strategyValidator.ts`: geometría de la orden, R:R mínimo 1:1.49) ya existía, pero si fallaba, el `agente-riesgo` se marcaba en `error` de inmediato y **todo el run se detenía**, sin ningún reintento — a diferencia del bucle de reintento por veredicto "ajustar" (que sí existe pero solo se dispara tras el Razonador, mucho más tarde en la cadena).

**Impacto real**: en 2 de 2 ejecuciones observadas antes del fix, el Gestor de Riesgos falló la validación en su primer intento con R:R real de 1:1.42 y 1:1.33 (mínimo exigido 1:1.49) — un desliz de aritmética, no un problema de fondo con la estrategia.

**Fix**: cuando `validateStrategyProposal` falla, el mismo agente se reintenta **in-situ** hasta 2 veces más (mismo patrón que ya usa `mql5Generator.ts` con los errores de compilación), reenviándole el error numérico exacto en el contexto, antes de detener el run definitivamente.

### 4. [ALTO] El botón "Optimizar" ignoraba por completo el código y el backtest previos

**Archivo**: `server/src/engine/mql5Generator.ts` (`optimizeMql5`).

```ts
export async function optimizeMql5(strategy, previousCode, previousBacktest, iteration, model, onProgress) {
  return generateMql5(strategy, model, onProgress); // previousCode y previousBacktest nunca se usaban
}
```

El botón "🧠 Iterar con IA (Optimizar)" de la UI llamaba a esta función esperando que continuara desde el código/backtest ya generados, pero regeneraba el EA **desde cero**, tirando toda la información de la iteración anterior.

**Fix**: se extrajo un pipeline compartido (`runMql5Pipeline`) usado tanto por `generateMql5` como por `optimizeMql5`; esta última ahora recalcula los motivos de fallo del Quality Gate sobre `previousBacktest` real (o, si no hay sesión con estadísticas —crash, símbolo inexistente—, usa las `qualityNotes` ya mostradas al usuario en el intento anterior, ver hallazgo 6) y se los pasa al modelo pidiendo que corrija específicamente eso.

**Verificación**: confirmado que el campo `iteration` del resultado avanza correctamente entre llamadas (2→3→4) reflejando la continuidad real, no un reinicio.

### 5. [ALTO] Un run se quedaba en "running" para siempre si el servidor se reiniciaba a mitad

**Archivos**: `server/src/store/runsStore.ts` (`reconcileOrphanedRuns`, nueva), `server/src/index.ts`.

Si el proceso del backend muere o se reinicia (edición de código bajo `tsx watch`, caída, redeploy) mientras un run está en curso, la ejecución en memoria que lo llevaba desaparece con el proceso, pero el run queda persistido con `status: 'running'` para siempre — sin ningún proceso trabajándolo y sin ningún botón de "reintentar" visible en la UI (ese solo aparece para `status: 'error'`), así que el frontend muestra un spinner infinito indefinidamente.

**Reproducido en vivo**: al editar `mql5Generator.ts` mientras un análisis estaba en curso (necesario para aplicar el hallazgo 4), el agente `agente-refutador` que estaba ejecutándose quedó exactamente en ese estado — 13+ minutos en `"running"` sin avanzar, muy por encima del timeout máximo del cliente HTTP (~4 min en el peor caso).

**Fix**: `reconcileOrphanedRuns()` se ejecuta una vez al arrancar el servidor, antes de aceptar peticiones: cualquier run con `status: 'running'` es necesariamente huérfano en un proceso recién arrancado, así que se marca como `error` (junto con sus agentes en `running`/`waiting`) con un mensaje explícito, dejando el camino de recuperación normal ("Reintentar agente fallido") disponible de inmediato.

**Verificación**: confirmado que, tras el reinicio, el run huérfano pasó a `status: 'error'` con el mensaje correcto, y que "Reintentar agente fallido" lo reanudó y completó con normalidad.

### 6. [MEDIO] Fallos deterministas del backtest se reportaban como "puede seguir corriendo"

**Archivo**: `server/src/engine/mql5Backtester.ts` (`findTesterStartupError`, `findRuntimeCrashError`, nuevas).

Dos fallos que ocurren en 2-3 segundos y **nunca se van a resolver esperando más** se confundían con el mensaje genérico de timeout (180s):

- **Símbolo inexistente en la cuenta conectada**: reproducido con BTC/USD — el log principal del terminal mostraba `symbol BTCUSD not exist` / `tester didn't start` en ~2.3s, pero el sistema esperaba los 180s completos y decía "puede seguir en curso, sube el log cuando termine" para algo que nunca iba a terminar con ese símbolo. Es una limitación del bróker/cuenta demo conectada, no corregible regenerando código.
- **Crash en tiempo de ejecución del EA generado**: reproducido con EUR/USD H4 — el EA compiló limpio pero crasheó con `critical runtime error 502 (array out of range)` en `GenerateSellSignal()`: copiaba solo 2 elementos con `CopyBuffer(..., 2, ...)` pero accedía al índice `[2]` (un tercer elemento nunca copiado). MetaEditor no detecta esto en compilación (es un error de límites en runtime, no de sintaxis/tipos), y el heurístico `codeReviewer.ts` (22 reglas basadas en regex) tampoco lo cubre — solo el backtest real lo expone, que es exactamente para lo que existe.

**Fix**: el sondeo ahora también revisa el log principal del terminal (antes solo se miraba el del agente de tester) y distingue ambos casos con mensajes concretos y accionables, cortando el sondeo en segundos en vez de esperar 180s.

### 7. [MEDIO] Los crashes de runtime y el "0 operaciones" no disparaban el bucle de auto-optimización

**Archivos**: `mql5Backtester.ts` (campo `retriableCodeIssue`), `mql5Generator.ts` (`runMql5Pipeline`).

El bucle de auto-optimización ya existente solo se disparaba ante fallos del Quality Gate con una sesión de backtest real (`qualityGateVerdict?.failedReasons`). Un crash en runtime o un EA que corre limpio pero nunca opera **no** generan esa sesión, así que el bucle nunca se activaba para ellos — el pipeline simplemente se detenía sin intentar corregir un problema que, a diferencia de un símbolo inexistente, sí es responsabilidad del código generado.

**Fix**: ambos casos ahora rellenan `retriableCodeIssue` con un diagnóstico concreto y corregible, y la condición del bucle de auto-optimización se amplió para dispararse también con ese campo, reutilizando el mismo mecanismo ya probado para fallos de Quality Gate.

**Verificación en vivo (reproduciendo el crash real de EUR/USD)**: la propia cadena de reintentos automáticos del pipeline, sin intervención manual, generó 3 intentos sucesivos — crash línea 147, crash línea 163 (bug movido pero no resuelto del todo), y finalmente un EA que compiló y corrió limpio (0 operaciones, ninguna condición de entrada llegó a cumplirse en el histórico probado).

### 8. [MEDIO] La UI permitía generar MQL5 desde una estrategia con objeciones sin resolver

**Archivo**: `src/components/StrategyResultCard.tsx`.

`canGenerate` solo bloqueaba el botón "Generar código MQL5" cuando el veredicto era `no_operar` — pero un veredicto `ajustar` con los reintentos automáticos agotados (objeciones reales y sin resolver, p. ej. "el Stop Loss es vulnerable a un barrido de liquidez") dejaba el botón activo igual que un `go` limpio, codificando en el EA exactamente los niveles que el propio Refutador acababa de demostrar que eran débiles.

**Fix**: mismo patrón ya usado para código con errores de compilación (`Mql5CodeBlock.tsx`) — un veredicto `ajustar` bloquea el botón por defecto y muestra las objeciones pendientes, con un checkbox explícito de "entiendo las objeciones pendientes y quiero generar el código de todas formas bajo mi responsabilidad" para desbloquearlo si el usuario decide asumir el riesgo conscientemente.

### 9. [BAJO] El botón manual "Optimizar" no recibía el diagnóstico preciso del intento anterior

**Archivos**: `src/components/StrategyResultCard.tsx`, `src/lib/api.ts`, `server/src/routes/mql5.ts`, `server/src/engine/mql5Generator.ts`.

Consecuencia directa del hallazgo 4: incluso tras arreglar `optimizeMql5` para usar `previousBacktest`, cuando el intento anterior no tenía sesión con estadísticas (crash, símbolo inexistente) la función caía al mensaje genérico de "sin operaciones" en vez del diagnóstico específico ya mostrado al usuario.

**Fix**: se añadió un parámetro `previousNotes` (las `optimizationNotes` del resultado anterior) que se propaga de extremo a extremo desde el frontend hasta `optimizeMql5`, usado como motivo cuando no hay estadísticas de backtest disponibles.

## Estado final verificado

- **Cadena de 6 agentes**: converge de forma fiable a un veredicto "go" (confirmado en el primer intento tras el fix del hallazgo 2, sin reintentos). El Validador de Coherencia Técnica, el Refutador y el Razonador producen críticas sustanciales y bien fundamentadas contra los datos del snapshot — el sistema rechaza correctamente estrategias con fallos reales (SL mal ubicado, entradas matemáticamente contradictorias, exposición a eventos macro sin plan de salida).
- **Generación MQL5**: el EA compila limpio contra MetaEditor64 real (0 errores, 0 warnings) de forma consistente.
- **Backtest headless**: detecta correctamente éxito, crash de runtime, símbolo inexistente y "0 operaciones" — los cuatro casos verificados en vivo tras los fixes.
- **Bucle de auto-optimización**: se dispara y regenera código ante Quality Gate fallido, crash de runtime, o cero operaciones.

## Limitación de entorno conocida (no es un bug de código)

**BTC/USD no tiene backtest automático en esta máquina**: la cuenta MetaQuotes-Demo conectada al terminal local no tiene un símbolo llamado exactamente `BTCUSD` (confirmado: `symbol BTCUSD not exist` en el log del terminal). El sistema ahora lo detecta y lo reporta con precisión en segundos (hallazgo 6) en vez de fallar en silencio, pero no hay forma de arreglarlo desde el código — hace falta averiguar el nombre real del símbolo cripto en esa cuenta (posible sufijo/prefijo de bróker, p. ej. `BTCUSD.a`) y usarlo, o cambiar a una cuenta/bróker que sí ofrezca cripto. **EUR/USD sí tiene histórico cacheado y funciona correctamente de extremo a extremo.**

## Pendiente / no verificado en esta sesión

No se llegó a completar, dentro del presupuesto de esta sesión, un ciclo íntegro con una estrategia que además de compilar y correr limpio **pase el Quality Gate cuantitativo** (≥15 operaciones, PF≥1.20, etc.) con datos reales — los intentos reales alcanzaron "compila limpio + backtest detectado correctamente" pero terminaron en "0 operaciones" (condiciones de entrada de la estrategia LLM demasiado restrictivas para el histórico de 12 meses probado, no un bug de la plataforma). El hallazgo 7 ya conecta ese caso al bucle de auto-optimización automáticamente; queda como trabajo natural de continuación relanzar el ciclo (ahora que la detección funciona de verdad) y dejar correr más iteraciones hasta ver un Quality Gate en verde con operaciones reales.

## Ver también

- [`docs/ESQUEMA_AGENTES_ANALISIS.md`](../../../trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md) — diseño original del roster de 6 agentes que esta sesión pone a prueba.
- [`server/README.md`](../../../trading-agents-dashboard/server/README.md) — arquitectura técnica actualizada con el comportamiento corregido (orquestador, pipeline de backtest headless).
- [`promp-auditoria1908.md`](../../../promp-auditoria1908.md) (raíz del repo) — auditoría previa (2026-08-19) de la que procede la implementación base (Quality Gate, CodeReviewerAgent, validación numérica) que aquí se verifica en producción por primera vez.

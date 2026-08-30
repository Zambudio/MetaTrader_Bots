# HANDOFF → codex: completar la VALIDACIÓN REAL de FOREX `forex_v1`

Contexto completo: `wiki-Traiding/proyecto-dashboard/informes/VALIDACION_REAL_FOREX.md` (léelo entero primero) y el prompt original de la tarea. Trabaja en `Z:\IA\02_Proyectos\MetaTrader_Bots` (NO uses rutas `\\Zambu-nas\...` para node/npm: cmd.exe las rechaza; el drive `Z:` mapea a la misma carpeta).

**Rama de trabajo: `validacion-real-forex`** (creada desde `main`@`d60c6ed`). Quédate en ella y commitea ahí; NO en `main`. `main` avanza por su cuenta (Pedro commiteó `d60c6ed` a mano y arrastró parte del trabajo de infra — C1, soporte de ventana histórica, los scripts — a un commit titulado "docs(readme)"; en `validacion-real-forex` está además el checkpoint C2). Si `main` diverge, haz `git rebase main` o `git merge main` con cuidado antes de tu commit final; no hagas `git reset` destructivo.

## Reglas duras (no negociables)
- **NO** órdenes live, **NO** capital, **NO** cuenta live, **NO** cerrar MetaTrader ni procesos del usuario.
- **NO** debilitar gates, prompts, agentes o el juez para conseguir un GO. **NO** fabricar datos. **NO** optimizar rentabilidad. **NO** confundir "compila" con "es rentable".
- Si modificas la baseline (`baselinePresets.ts`: prompts/agentes/relaciones/gates) necesitas evidencia de una ejecución fallida y publicas `forex_v1.1` (preset nuevo), no sobrescribes `forex_v1`. Las correcciones de **infra** (timeouts, reintentos, parsing, scripts) no son la baseline.
- **NO** toques `README.md` (reescritura ajena en curso). **NO** `git reset` destructivo. **NO** push, **NO** deploy.
- `agents.json` / `pairs.json` están trackeados; el resto de `server/src/data/` está gitignored. NO incluyas `agents.json` en tu commit si el servidor lo reescribió.
- **NO avances a ACCIONES ni CRIPTO.** Al terminar FOREX, para y pregunta.

## Entorno
- Preset activo actual = `baseline-acciones-stocks-v1`. El runner NO lo cambia (usa `getPreset` directo). Déjalo así.
- MT5 `terminal64.exe` está CERRADO (el backtest headless PUEDE correr). `metaeditor64.exe` puede estar abierto — no bloquea `/compile`. Si al llegar a FASE 5 `terminal64.exe` está abierto: registra `BLOCKED_EXTERNAL_MT5_RUNNING`, sigue con compilación + validación estática, NO lo cierres.
- `.env` (server) tiene `TWELVEDATA_API_KEY`, `OMNIROUTE_*`. `claude` CLI en `C:\Users\fadwe\.local\bin\claude.exe`. Cada llamada de agente ~100–240 s.
- Ejecuta con estas env para no sufrir los timeouts: `AGENT_CLI_TIMEOUT_MS=600000`, `AGENT_MAX_CONCURRENCY=2`, `AGENT_CLI_RETRIES=2` (el runner ya las pone por defecto).
- `npm run lint` está roto por WDAC en la máquina (binding nativo de oxlint bloqueado) — NO es tu culpa; anótalo como limitación y sigue con typecheck+test+build.

## Estado ya hecho (NO repetir)
- FASE 0 ✅ (hash `504e6f2ac86fd05a321e99049b489654f48524f776b7bcf54e679fb70429bb8c`).
- C1 (`AGENT_CLI_TIMEOUT_MS`) ✅ + test. C2 (reintento transitorio `AGENT_CLI_RETRIES` + `isTransientCliError`) ✅ + test. Soporte ventana histórica ✅ + test (`test/marketDataHistorical.test.ts`).
- typecheck ✅, `vitest run` 70/70 ✅, build ✅ (medido en este checkpoint).
- R1 (`real-forex-20260830150301-r1-current`) ejecutado pero terminó `error` por el fallo transitorio de `fx-judge` (ya cubierto por C2). Análisis de los 3 especialistas: contrato válido, 0 alucinaciones, `fx-macro` omitido `DATA_NOT_AVAILABLE` ✅.

## TAREAS

### 1. FASE 1 — matriz de runs reales
Desde `Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server`, uno a uno (cada uno 15–30 min; NO en paralelo, saturaría la suscripción):
```
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r1-current
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r2-trend
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r3-range
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r4-highvol
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r5a-absent
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r5b-stale
```
Cada run se persiste en `server/src/data/runs/real-forex-<ts>-<id>.json` y se acumula en `server/src/data/validation-real-forex-latest.json`. Un run es éxito funcional si termina `done` (o `done + insufficient_data` para `r5a-absent`, `done + warning` para `r5b-stale`), sin agentes en `error`/`waiting`, con el roster fijado y `fx-macro` omitido `DATA_NOT_AVAILABLE`. Si un run vuelve a caer por `fx-judge`/otro agente con fallo transitorio pese a C2, sube `AGENT_CLI_RETRIES=3` y re-ejecuta ESE id; si es un timeout real, diagnostícalo (no lo reintentes a ciegas).

### 2. FASE 2–4 — auditoría
```
npx tsx --env-file-if-exists=.env scripts/auditRealForex.ts
```
Escribe `validation-real-forex-audit.json` + resumen. Además, a mano por cada run:
- agentes previstos = ejecutados + omitidos; razones de activación/omisión correctas; `fx-macro` siempre `DATA_NOT_AVAILABLE`; **cero** agentes `stock-*`/`crypto-*`.
- Cada `AgentAnalysis`: `status`/`bias`/`confidence`(0–1)/`dataQuality` válidos; cada `fact` con `source`; `conclusion` no vacía; separa DATO/INFERENCIA/HIPÓTESIS/CONCLUSIÓN.
- Alucinaciones: todo número afirmado como DATO debe estar en el snapshot recibido; marca cualquier precio/indicador/noticia/evento macro/spread/liquidez/correlación/URL inventados. Una abstención por falta de datos es válida; una afirmación inventada NO.
- Transferencia de contexto: `fx-risk`/`fx-critic`/`fx-judge` citan la geometría/evidencia de la propuesta y de los ancestros.
- Riesgo y crítico revisan de verdad (no aprueban en vacío, no contradicen por sistema, no inventan requisitos que el sistema no puede dar). El gate determinista manda sobre la opinión LLM.
- Juez: resuelve o conserva blockers explícitamente; **GO ⇒ 0 `unresolvedBlockers`**; GO = "elegible para backtest", no "rentable".

### 3. FASE 4 — gate determinista de cada estrategia GO
`scripts/auditRealForex.ts` ya recalcula con `validateStrategyProposal` (geometría BUY/SELL, R:R ≥ 1.6, riskPercent ≤ 1%, SL ∈ [1.25, 2.5] ATR). Verifica también: `condicionEntrada` = ≤1 evento + ≤1 filtro, solo indicadores disponibles y codificables, no depende de un precio anecdótico, sin look-ahead conceptual, evaluable sobre velas cerradas. No aceptes aritmética del LLM sin recomputarla.

### 4. FASE 5 — MQL5 (solo si hay un run `validated` + `go` + 0 blockers)
Genera vía el pipeline real. Opción A (recomendada, sin tocar el server que corre): un script corto que llame `generateMql5(strategy, model, onProgress)` de `src/engine/mql5Generator.js` con `model` = el `preset.mql5Model` si existe, o `undefined` (→ OmniRoute `auto/best-coding`, alcanzable). Antes, valida la elegibilidad con `validateMql5SourceRun(run, strategy)` de `src/engine/mql5Eligibility.js`. `generateMql5` ya compila (MetaEditor) y corre el backtest headless.
Verifica del `.mq5`: codifica **literalmente** `condicionEntrada`; no inventa filtros; dirección/SL/TP/risk coinciden; sizing determinista por riesgo y normalizado (tick size/value, volume step/min/max); símbolo correcto; guard de nueva barra + velas cerradas; sin look-ahead; handles de indicador + `CopyBuffer` correctos; validación de retcodes; Magic Number; sin decisiones LLM en runtime; cero rutas de trading live. Compila con **0 errores** (justifica cualquier warning). Smoke backtest: arranca y termina, símbolo/timeframe correctos, sin excepciones, informe legible, operaciones o su ausencia explicable, logs coherentes con código y estrategia. **No exijas rentabilidad. No optimices el EA.**

### 5. FASE 6 — loop de corrección
Por cada defecto: clasifícalo (`ORCHESTRATION_ERROR`, `PROMPT_ERROR`, `CONTRACT_ERROR`, `DATA_ERROR`, `TOOL_ERROR`, `MODEL_ERROR`, `TIMEOUT`, `HALLUCINATION`, `STRATEGY_ERROR`, `MQL5_FIDELITY_ERROR`, `MQL5_COMPILE_ERROR`, `BACKTEST_EXECUTION_ERROR`, `CROSS_CONFIGURATION_CONTAMINATION`, …), corrige la causa raíz en el repo, añade test de regresión, corre `npm run typecheck` + `npx vitest run` + `npm run build` (todo verde), repite el escenario que falló + 2 corridas consecutivas sin regresión. Nada de catches vacíos ni fallbacks falsos.

### 6. Docs + commit
- Completa `wiki-Traiding/proyecto-dashboard/informes/VALIDACION_REAL_FOREX.md` con TODO (matriz de runs, informes por agente, afirmaciones contrastadas, gates, artefactos MQL5, compilaciones, backtests, defectos y correcciones, tests añadidos, métricas acumuladas, limitaciones, estado final). Actualiza `wiki-Traiding/proyecto-dashboard/00_INDEX.md` (nueva línea en `## Informes`). No borres informes previos.
- Borra estos scripts scratch si sobran: NINGUNO es scratch — `validateRealForex.ts` y `auditRealForex.ts` son entregables; este `HANDOFF_CODEX.md` puedes borrarlo al final o dejarlo.
- Commit convencional (sin push): `git add` explícito de tus ficheros (server/src, server/test, server/scripts, .env.example, wiki-Traiding). **NUNCA** `git add -A` (arrastraría `README.md`). Mensaje: `fix(forex): validate real agent analysis and MQL5 pipeline`. Termina el mensaje con las líneas Co-Authored-By / Claude-Session que exige el repo si aplica, o las de codex.

## Respuesta final (para Pedro)
Entrega: estado de FOREX (`VALIDATED_REAL` | `VALIDATED_ANALYSIS_AND_COMPILE` | `UNSTABLE` | `BLOCKED`), nº de runs y tasa de éxito, agentes ejecutados/omitidos, estrategias aceptadas/rechazadas, MQL5 generados + resultado de compilación, resultado del smoke backtest, defectos encontrados/corregidos, limitaciones, tests y comandos ejecutados, commit creado, enlace al informe. Y pregunta si continuar con ACCIONES / TSLA. **Declara `VALIDATED_REAL` solo si análisis + estrategia + compilación + smoke backtest están realmente validados y varias corridas son reproducibles.**

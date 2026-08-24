---
tags: [proyecto-dashboard, agentes, mql5, backtest, diagnostico]
updated: 2026-08-20
---

# Diagnóstico: el veredicto "GO" del panel y el resultado del backtest real evaluaban cosas distintas (2026-08-20)

> ⚠️ **Pendiente de verificación en vivo.** A diferencia de [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](2026-08-20-prueba-e2e-agentes-mql5-backtest.md) (verificado contra infraestructura real), este documento recoge un diagnóstico por lectura de código + evidencia ya registrada (casos reales previos en `docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md`) y su implementación, comprobada solo con `tsc --noEmit` en servidor y cliente — **no se relanzó el pipeline completo contra OmniRoute/MetaTrader tras el cambio**. Ver "Pendiente" al final.

## Motivo

Pedro reportó que los agentes daban una estrategia por buena ("GO") pero que, al generar el código MQL5 y correr el backtest real, los resultados salían malos — y no tenía claro si el problema era que el backtest simula poco tiempo, que los prompts de los agentes necesitan más ajuste, o algo estructural.

## Diagnóstico

**No es la duración del backtest.** `mql5Backtester.ts` ya corre ~12.5 meses en modo "every tick" (`2025.08.01`→`2026.08.18`), dentro del rango recomendado por [doc 20 §3](../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md).

**El problema real: el veredicto "GO" y el backtest evaluaban preguntas distintas, sin conectarse.**

1. Los agentes que dan el visto bueno (`agente-validador-tecnico`, `agente-refutador`, `agente-razonador`) juzgan una única operación hipotética sobre el snapshot de mercado del momento — coherencia geométrica (TP>Entrada>SL), R:R aritmético ≥1.5, crítica narrativa. Ninguno ve un dato histórico ni sabe si esa idea, aplicada repetidamente, gana dinero.
2. La propuesta de estrategia (`StrategyProposalLite`) no exigía una condición de entrada explícita y repetible — solo texto libre (`puntoEntrada`, `resumen`) atado al momento actual. El LLM que genera el `.mq5` tenía que inventar su propia lógica de señal repetible para poder backtestear un año de histórico, y esa invención nunca volvía a pasar por los agentes que dieron el "GO".
3. Cuando el backtest real fallaba el Quality Gate, el bucle de optimización (`buildOptimizationPrompt` en `mql5Generator.ts`) reinyectaba el motivo de fallo **solo al LLM de código** — nunca a `agente-riesgo`/`agente-razonador`. Solo podía retocar multiplicadores de ATR/filtros dentro de la misma tesis, nunca cuestionarla. Esto contradice lo que el propio [doc 20 §5.1](../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md) ya decía que debería pasar ("Inyección de Contexto al Agente Razonador") — estaba documentado como diseño pero no implementado así.

**Evidencia concreta ya registrada** (no generada en esta sesión): [`docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md`](../../../trading-agents-dashboard/docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md) §3 — `PruebaBots2` (EURUSD H1) compiló y operó (145 operaciones), con R:R de diseño 1:2 considerado "coherente" por el panel, pero win rate real 30.3% — por debajo del ~33% de breakeven que ese R:R exige — resultando en -9.2% neto. El "GO" nunca pudo detectar esto porque nunca vio ese dato.

## Fixes implementados

Tres cambios, decididos con Pedro tras presentarle el diagnóstico (tres opciones + una de solo-UI; eligió las tres primeras):

### 1. Condición de entrada explícita y repetible

Campo nuevo obligatorio `condicionEntrada` en `StrategyProposalLite` (`server/src/types.ts`, espejo en `src/types/strategy.ts`): una regla mecánica en relaciones entre indicadores/precio (p. ej. "EMA20 cruza por encima de EMA50 Y RSI(14) > 50"), nunca un nivel de precio anecdótico atado al snapshot de hoy.

- `agente-riesgo` debe proponerla (prompt actualizado en `agents.json`, `agentConfigs.json` y el fallback `DEFAULT_AGENTS` de `agentsStore.ts`, para no dejar los tres desincronizados).
- `agente-validador-tecnico` la audita explícitamente y rechaza si es anecdótica/no repetible.
- `realExecutor.ts` la exige en el tool-calling (`STRATEGY_TOOL.required`) y `strategyValidator.ts`/`routes/mql5.ts` la validan como campo no vacío.
- `mql5Generator.ts` la pasa literalmente al LLM de código con instrucción explícita de implementarla EXACTAMENTE (nueva regla 17 del `MQL5_STANDARD_SYSTEM_PROMPT`), en vez de dejar que invente su propia lógica de señal a partir de `puntoEntrada`.

### 2. Cierre del bucle con el panel de agentes cuando el backtest real falla

Nueva función `retryStrategyForBacktestFailure` en `server/src/engine/orchestrator.ts`: cuando `generateWithStrategyFeedbackLoop` (`routes/mql5.ts`, la nueva orquestación de `POST /mql5/generate`) ve que el resultado no pasa el Quality Gate tras los 3 intentos de ajuste de código, construye un diagnóstico en términos de trading (win rate, R:R real, esperanza, PF, drawdown — no detalles de código) y reejecuta `agente-riesgo → validador → refutador → razonador` con ese diagnóstico como contexto de entrada, reutilizando el mismo mecanismo de reintento por "ajustar" que ya usaba `executeRun` para las objeciones del propio Razonador.

- Si el Razonador, ya informado del fallo real, emite NO_OPERAR, la estrategia se marca `discarded` (con `discardReason`) y se detiene el bucle en vez de seguir generando código — coincide con el "Criterio de Descarte" de doc 20 §5.3.
- Si emite GO/ajustar con propuesta nueva, se llama a `generateMql5` otra vez sobre ella.
- Acotado a `MAX_BACKTEST_STRATEGY_RETRIES = 2` (contador `run.backtestFeedbackCount`, independiente de `retryCount`) porque cada ciclo implica generación + compilación + backtest real completos (varios minutos), aun cuando doc 20 §5.3 habla de "3 a 5 ciclos" en términos generales.
- El frontend (`Mql5CodeBlock.tsx`) muestra un banner cuando la estrategia final fue replanteada (`strategyFeedbackCycles`) o descartada (`discarded`).

### 3. UI honesta sobre qué significa "GO"

`VerdictResultCard.tsx` y `StrategyResultCard.tsx`: aviso junto al badge "GO" y al botón de generar código dejando claro que es una hipótesis de coherencia técnica, no una confirmación de rentabilidad — eso lo da el Quality Gate cuantitativo tras el backtest real.

## Archivos tocados

`server/src/types.ts`, `server/src/engine/orchestrator.ts`, `server/src/engine/mql5Generator.ts`, `server/src/engine/realExecutor.ts`, `server/src/engine/mockExecutor.ts`, `server/src/engine/strategyValidator.ts`, `server/src/engine/mql5Jobs.ts`, `server/src/routes/mql5.ts`, `server/src/store/agentsStore.ts`, `server/src/data/agents.json`, `server/src/data/agentConfigs.json` (no versionado en git, pero es la config activa en disco), `src/types/strategy.ts`, `src/components/StrategyResultCard.tsx`, `src/components/VerdictResultCard.tsx`, `src/components/Mql5CodeBlock.tsx`. Detalle técnico de arquitectura en [`server/README.md` §"Cierre del bucle con el panel de agentes cuando el backtest real falla"](../../../trading-agents-dashboard/server/README.md#cierre-del-bucle-con-el-panel-de-agentes-cuando-el-backtest-real-falla-srcroutesmql5ts-srcengineorchestratorts).

## Pendiente / no verificado en esta sesión

- **No se relanzó el pipeline completo contra infraestructura real** (OmniRoute + MetaEditor64 + MetaTrader terminal) tras estos cambios — solo se verificó que `tsc --noEmit` pasa limpio en servidor y cliente. Falta confirmar en vivo que: (a) `agente-riesgo` efectivamente produce condiciones de entrada mecánicas y bien formadas con el prompt nuevo; (b) `agente-validador-tecnico` rechaza correctamente condiciones anecdóticas; (c) `retryStrategyForBacktestFailure` se dispara cuando corresponde y produce una propuesta distinta de la original; (d) el caso NO_OPERAR tras backtest real ocurre alguna vez o si el Razonador tiende a seguir dando GO a variantes igual de flojas.
- El límite de 2 ciclos de retroalimentación estrategia↔backtest (`MAX_BACKTEST_STRATEGY_RETRIES`) es una estimación de coste/tiempo, no un valor validado — puede necesitar ajuste una vez se vea cuántos ciclos hacen falta en la práctica para llegar a un Quality Gate en verde.
- Sigue sin completarse, en ningún punto de este proyecto, un ciclo con Quality Gate en verde y operaciones reales (el mismo pendiente que ya cerraba [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](2026-08-20-prueba-e2e-agentes-mql5-backtest.md)) — este diagnóstico ataca una causa estructural que lo dificultaba, pero no es en sí mismo la prueba de que ahora sí se alcance.

## Ver también

- [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](2026-08-20-prueba-e2e-agentes-mql5-backtest.md) — la prueba E2E previa (verificada en vivo) cuyo pendiente final ("0 operaciones", Quality Gate nunca visto en verde) es el contexto inmediato de este diagnóstico.
- [`docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md`](../../../trading-agents-dashboard/docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md) — caso real (`PruebaBots2`) usado como evidencia del problema.
- [`../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md`](../../proyecto-mt5-bots/20_Pipeline_Validacion_Backtest_Automatizado_e_Iteracion_Agentica.md) — pipeline de Quality Gate/optimización que este diagnóstico complementa (§5.1 ahora sí implementado).
- [`server/README.md`](../../../trading-agents-dashboard/server/README.md) — arquitectura técnica del fix.

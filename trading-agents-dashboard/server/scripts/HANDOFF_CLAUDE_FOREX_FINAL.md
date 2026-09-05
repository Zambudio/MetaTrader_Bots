# Handoff a Claude — cierre de validación real FOREX

Fecha: 2026-09-05. Rama obligatoria: `validacion-real-forex`. Base mínima comprobada: `4a6609c`.

## Prompt listo para entregar a Claude

Continúa y cierra exclusivamente la validación real FOREX del repositorio
`Z:\IA\02_Proyectos\MetaTrader_Bots`, rama `validacion-real-forex`. No avances a ACCIONES/TSLA ni
CRIPTOMONEDAS. Trabaja desde la ruta `Z:` para node/npm, nunca desde una ruta UNC.

Antes de actuar, lee completos y respeta:

1. `trading-agents-dashboard/server/scripts/HANDOFF_CLAUDE_FOREX_FINAL.md`
2. `trading-agents-dashboard/server/scripts/HANDOFF_CODEX.md`
3. `trading-agents-dashboard/server/scripts/HANDOFF_CONTINUACION.md`
4. `wiki-Traiding/proyecto-dashboard/informes/VALIDACION_REAL_FOREX.md`
5. `wiki-Traiding/proyecto-dashboard/00_INDEX.md`

### Estado exacto que debes conservar

- Rama `validacion-real-forex`; no cambies a `main`, no hagas push ni deploy.
- La validación estructural ya está cerrada. No repitas `forex_v1.2` ni `forex_v1.2.1`:
  - `forex_v1.2`, hash `feddf9d404020de68e6884a519cb6b558292e98e846e1e77bd5bf35145434cdc`.
  - `forex_v1.2.1`, hash `e84b3d40062a9dc84f86f45b550f165bbb68341f4695b8d2c0c83a2bc50ad9a2`.
  - R5a probó abstención; R4 `real-forex-20260902211238-r4-highvol` recorrió especialistas,
    estrategia, riesgo, crítico y juez con `validated + go + 0 blockers`, gate/audit OK. Es solo
    evidencia estructural OmniRoute y no habilita MQL5.
- Objetivo analítico final: `baseline-forex-forex-v1-1`, versión `forex_v1.1`, hash exacto
  `64c35dc7e78d558c4329d58c1ba62f733c0dc28bef248db358527d2cabe9d135`. Sus ocho agentes siguen
  en `claude:sonnet`. No alteres `forex_v1`, `forex_v1.1`, sus prompts, DAG, gates o hashes para
  obtener GO. Si se decide probar Codex/híbrido, requiere un preset nuevo y autorización del
  usuario; queda fuera de este handoff.
- Acumulado documentado: 15 runs evaluables, 5 funcionales, más 2 interrumpidos excluidos. En
  `forex_v1.1` hay 3/7 funcionales históricos y una estrategia aceptada sobre un hash anterior,
  pero todavía 0 runs completos sobre el hash final `64c35dc7…be9d135`.
- FASE 5 final: 0 MQL5 definitivo, 0 compilaciones definitivas y 0 smoke backtests definitivos.
- Última suite completa anterior al carril OmniRoute: 19 archivos / 99 tests PASS, typecheck y
  build PASS. Después se añadieron controles de coste con pruebas focales verdes y typecheck PASS;
  suite completa/build quedan pendientes una sola vez al cierre.
- Hay cambios locales ajenos en varios componentes del dashboard y `server/src/data/agents.json`.
  Presérvalos, no los edites ni stages. No toques `README.md`. Usa siempre `git add` explícito,
  nunca `git add -A` ni `git add .`.

### Presupuesto y reglas de consumo obligatorias

- El usuario necesita reservar suscripciones para otros proyectos. Una corrida por vez.
- Como máximo un `claude -p "ping"` justo antes de la primera corrida. Nada de sondeos periódicos.
- Antes del primer run analítico, añade un control de entorno
  `FOREX_VALIDATION_MAX_REVISION_ROUNDS` al runner, acotado a `0..2`, sin modificar el preset.
  Para esta validación úsalo en `0`. Añade solo una regresión focal y typecheck; no lances la suite
  completa todavía.
- En todas las corridas establece:

```powershell
Set-Location 'Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\server'
$env:FOREX_VALIDATION_PRESET_ID = 'baseline-forex-forex-v1-1'
$env:AGENT_CLI_RETRIES = '0'
$env:STRATEGY_VALIDATION_RETRIES = '0'
$env:FOREX_VALIDATION_MAX_REVISION_ROUNDS = '0'
$env:AGENT_MAX_CONCURRENCY = '1'
```

- Así se permite una sola consulta por agente, sin retry CLI, sin regeneración numérica y sin
  rondas `AJUSTAR`. Esto no debilita el gate: cualquier fallo debe cerrar fail-closed.
- No reejecutes un escenario para perseguir GO. Si falla por contenido del modelo, documenta el
  rechazo. Corrige y repite solo si hay un defecto reproducible de infraestructura/prompt que
  vulnere contratos o seguridad, nunca para mejorar rentabilidad.
- Después de cada run: auditoría local, revisión manual, actualización del informe y commit
  explícito antes del siguiente. No ejecutes typecheck/suite/build después de cada run.
- Ante un límite de sesión: detén, documenta `BLOCKED_QUOTA` y termina. No esperes haciendo pings.

### Orden de trabajo pendiente

1. Implementa el cap `FOREX_VALIDATION_MAX_REVISION_ROUNDS=0` descrito arriba. No cambia el hash
   del preset. Prueba focal + typecheck y commit.
2. Ejecuta R2 una sola vez:

```powershell
npx tsx --env-file-if-exists=.env scripts/validateRealForex.ts r2-trend
npx tsx --env-file-if-exists=.env scripts/auditRealForex.ts
```

3. Revisa manualmente R2. Debe estar libre de `TEMPORAL_CONTEXT_ERROR`, liquidez/costes inventados,
   errores de pips/calendario, look-ahead, condición sobrecargada y blockers inventados. Recalcula
   entry/SL/TP, pips, ATR, R:R y riesgo sin confiar en el texto. Documenta y commit.
4. Solo si R2 es limpia, ejecuta R3 y R4, una a una, con audit/manual/docs/commit tras cada una.
   El gate para MQL exige R2 limpia, al menos tres audits OK del mismo id/hash y que los dos últimos
   sean consecutivamente limpios.
5. Para completar la matriz original, después del quórum ejecuta una sola vez R1, R5a y R5b. R5a
   debe terminar `insufficient_data`; las pruebas negativas no deben fabricar estrategia. Si la
   cuota no permite completar estos tres escenarios, documenta con precisión qué falta y declara
   `BLOCKED`, sin consumir otra ventana de suscripción.
6. En cada escenario verifica: roster solo `fx-*`; macro omitido únicamente por
   `DATA_NOT_AVAILABLE`; contratos estructurados; activación/omisión; transferencia de contexto;
   separación DATO/INFERENCIA/HIPÓTESIS/CONCLUSIÓN; sources; confidence; alucinaciones; y gate
   determinista. Un GO LLM no se acepta automáticamente.

### Blocker conocido antes de MQL5

`scripts/generateValidatedForexMql5.ts` contiene un pin obsoleto:

- actual incorrecto: `EXPECTED_CONFIGURATION_HASH = c3d6b2b0…09a77`
- requerido: `64c35dc7e78d558c4329d58c1ba62f733c0dc28bef248db358527d2cabe9d135`

No ejecutes MQL5 hasta que exista el quórum limpio. Entonces corrige el pin a la baseline final,
añade una regresión que impida divergencia entre el hash autorizado y `baselinePresets.ts`, ejecuta
el test focal y vuelve a generar el audit. No elimines ni relajes el control de hash.

### FASE 5 — solo con run elegible y quórum limpio

```powershell
$env:MQL5_DISABLE_OPTIMIZATION = '1'
npx tsx --env-file-if-exists=.env scripts/generateValidatedForexMql5.ts [run-id-elegible]
```

- Mantén el generador en OmniRoute salvo autorización expresa para gastar Claude/Codex.
- Comprueba fidelidad literal de `condicionEntrada`, sizing determinista y normalizado, nueva barra,
  velas cerradas, ausencia de look-ahead, handles/CopyBuffer, retcodes/fill real, Magic Number,
  stops/freeze/tick/volumen y guard `MQL_TESTER` fail-closed. Cero rutas live.
- MetaEditor debe compilar con 0 errores. “Compila” no significa “rentable”. No optimices
  rentabilidad ni número de operaciones.
- Si `terminal64.exe` está abierto, registra `BLOCKED_EXTERNAL_MT5_RUNNING`, continúa la revisión
  estática/compilación si es segura y NO cierres MetaTrader. Si está cerrado, ejecuta un único smoke
  headless. Nunca uses capital, cuenta live ni órdenes live.

### Cierre

- Solo al final ejecuta una vez: `npm run typecheck`, `npx vitest run` y `npm run build`.
  `npm run lint` sigue bloqueado por WDAC; documéntalo, no gastes tiempo repitiéndolo.
- Completa `VALIDACION_REAL_FOREX.md` y `00_INDEX.md`: matriz por preset/hash, agentes
  ejecutados/omitidos, estrategias aceptadas/rechazadas, auditoría, MQL5, compilación, smoke,
  defectos/correcciones, tests, métricas, limitaciones y estado final.
- Estados: `VALIDATED_REAL` solo con análisis final + estrategia aprobada + 0 blockers + compilación
  0 errores + smoke limpio y ≥3 runs reproducibles del preset/hash final;
  `VALIDATED_ANALYSIS_AND_COMPILE` si únicamente el smoke queda bloqueado porque MT5 estaba abierto;
  `BLOCKED` por cuota/entorno; `UNSTABLE` por defectos no resueltos.
- Commit convencional, `git add` explícito, sin push/deploy. Para al terminar y pregunta al usuario
  si quiere continuar con ACCIONES / TSLA.

Respuesta final requerida: estado FOREX y preset/hash; runs y tasa; agentes ejecutados/omitidos;
estrategias aceptadas/rechazadas; MQL5/compilación/smoke; defectos corregidos/pendientes;
limitaciones; tests/comandos; commits; ruta del informe. No maquilles un bloqueo como validación.

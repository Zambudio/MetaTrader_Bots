# Esquema de agentes de análisis (diseño)

> Estado: diseño aprobado, pendiente de implementar. Los agentes que hay hoy en
> `server/src/data/agents.json` son de prueba (validan el mecanismo de cadena/dependencias,
> no el análisis en sí). Este documento fija el esquema con el que sustituirlos.

## Motivación

Auditando el motor de ejecución (`server/src/engine/orchestrator.ts`, `realExecutor.ts`) se
encontraron dos huecos que cualquier esquema de agentes debe resolver antes de que el análisis
sea fiable, no solo plausible:

1. **Ningún agente ve datos reales de mercado.** `runRealAgent` construye el prompt de usuario
   solo con `pair`, `timeframe` y el texto de los agentes padres (`buildUserPrompt` en
   `realExecutor.ts`) — el "Analista Técnico" nunca recibe una vela ni un valor de indicador,
   pese a que su prompt le pide leer RSI/MACD/medias. Los indicadores solo existen en el cliente
   (`src/lib/indicators.ts`), para pintar el gráfico.
2. **No existe bucle de validación.** `executeRun` ejecuta cada nivel del grafo una vez y
   termina; no hay forma de que un agente validador rechace una propuesta y fuerce una nueva
   pasada.

Este esquema resuelve ambos huecos como parte del diseño, no como añadido posterior.

## Roster (6 agentes)

Cuatro niveles de ejecución — los dos primeros ya existen como patrón (`dependsOn` vacío o con
padres), los dos últimos (validadores en paralelo + veredicto) son el mecanismo nuevo.

| # | id sugerido | Nombre | Nivel | `dependsOn` | `outputType` | Modelo sugerido |
|---|---|---|---|---|---|---|
| 1 | `agente-tecnico` | Analista Técnico | 0 | `[]` | `text` | `auto/pro-fast` |
| 2 | `agente-fundamental` | Analista Fundamental | 0 | `[]` | `text` | `auto/pro-chat` |
| 3 | `agente-riesgo` | Gestor de Riesgos | 1 | `[agente-tecnico, agente-fundamental]` | `strategy` | `auto/chat` |
| 4 | `agente-validador-tecnico` | Validador de Coherencia Técnica | 2 | `[agente-riesgo]` | `text` | `auto/pro-fast` |
| 5 | `agente-refutador` | Refutador | 2 | `[agente-riesgo]` | `text` | `auto/pro-fast` |
| 6 | `agente-razonador` | Razonador | 3 | `[agente-validador-tecnico, agente-refutador]` | `verdict` (nuevo, ver abajo) | `auto/pro-reasoning` |

Niveles 0 y 2 se ejecutan en paralelo dentro de cada nivel (ya es como funciona `buildLevels` +
`executeRun` hoy). El nivel 2 son dos agentes que atacan la propuesta desde ángulos distintos a
propósito — coherencia con los datos vs. "qué puede salir mal" son dos formas de pensar
distintas y mezclarlas en un único validador pierde cobertura.

**Por qué 6 y no más/menos:** un solo validador (esquema "lean" de 4 agentes) mezcla demasiadas
responsabilidades. Añadir un tercer especialista primario (Sentimiento/Flujo) o un tercer
validador (Money Management) es la extensión natural una vez el mecanismo base (snapshot +
bucle de reintento) esté validado en producción — no antes, para no disparar coste/latencia de
entrada (7-8 llamadas a OmniRoute por análisis con este esquema; cada llamada real puede tardar
decenas de segundos, ver `server/README.md`).

**Peso del Fundamental según timeframe:** no requiere ningún mecanismo nuevo — `timeframe` ya
llega en el user prompt (`buildUserPrompt`). Su `systemPrompt` simplemente le indica que en
timeframes intradía (M15-H1) priorice riesgo de eventos de calendario sobre sesgo direccional, y
en timeframes de posición (H4+) pondere el sesgo macro de fondo.

### Prompts propuestos (borrador, ajustables al configurar)

- **Analista Técnico:** "Recibes un snapshot de mercado real (precio, medias móviles, RSI,
  MACD, Bollinger, ATR, máximos/mínimos recientes) para el par y timeframe indicados. Interpreta
  la tendencia, el momentum y la volatilidad actuales basándote EXCLUSIVAMENTE en esos datos —
  no inventes valores ni comentes indicadores que no aparecen en el snapshot. Señala soportes y
  resistencias relevantes."
- **Analista Fundamental:** "Evalúa el contexto macroeconómico y de noticias relevante para el
  par y timeframe indicados. Si el timeframe es intradía (M15-H1), céntrate en riesgo de eventos
  programados (calendario económico) más que en sesgo direccional; si es de posición (H4+),
  pondera el sesgo macro de fondo (tipos de interés, política monetaria, flujos). Complementa el
  análisis técnico, no lo dupliques."
- **Gestor de Riesgos:** "A partir del análisis técnico y fundamental recibidos, propone una
  estrategia concreta: punto de entrada, stop loss, take profit y, si procede, un plan de
  entradas escalonadas. Si el contexto incluye objeciones de un intento anterior (marcadas
  'Objeciones del Razonador'), corrígelas explícitamente en la nueva propuesta en vez de repetir
  la anterior."
- **Validador de Coherencia Técnica:** "Comprueba si la propuesta de Gestor de Riesgos es
  coherente con el análisis técnico y el snapshot de mercado del contexto: ¿el stop loss queda
  fuera de estructura relevante? ¿el punto de entrada encaja con la tendencia/momentum
  descritos? ¿el ratio riesgo/beneficio es razonable dado el ATR/volatilidad actual? Cita los
  números del snapshot al señalar inconsistencias; si no encuentras ninguna, dilo
  explícitamente."
- **Refutador:** "Tu trabajo es intentar tumbar la propuesta de Gestor de Riesgos: busca
  activamente motivos por los que la operación podría fallar — escenario técnico contrario,
  eventos de calendario próximos que la invalidarían, correlaciones con otros
  pares/activos, niveles de invalidación cercanos, falta de liquidez. No suavices la crítica por
  quedar bien; si la propuesta es sólida dilo, pero exige evidencia concreta del contexto antes
  de darla por buena."
- **Razonador:** "Sintetiza el análisis técnico, fundamental, la propuesta de riesgo y las
  críticas del Validador de Coherencia Técnica y el Refutador. Emite un veredicto: GO si la
  propuesta es sólida y las críticas no la invalidan; AJUSTAR si hay objeciones concretas y
  corregibles (indícalas con precisión); NO_OPERAR si las condiciones o las objeciones son
  suficientemente serias como para que ninguna propuesta de entrada tenga sentido ahora mismo
  con estos datos."

## Snapshot de mercado real

Nuevo módulo `server/src/engine/marketSnapshot.ts`: reutiliza `getCandles(pair, timeframe)`
(`server/src/marketData/index.ts`, ya existe) y porta el cálculo puro de indicadores de
`src/lib/indicators.ts` (cliente) al backend — misma lógica, sin las partes de renderizado.

Calcula una vez por ejecución: precio actual (cierre de la vela más reciente), SMA20/50/200,
RSI14, MACD(12,26,9), Bollinger(20,2), ATR14 y máximo/mínimo de las últimas N velas. Se formatea
como bloque de texto compacto y se antepone al prompt de **todos** los agentes de la cadena
(no solo el Técnico) — Gestor de Riesgos y los validadores también necesitan saber dónde está el
precio real, no solo el resumen narrativo de agentes anteriores.

Si falla la descarga de velas (proveedor caído, símbolo no soportado), el snapshot queda vacío y
la ejecución continúa sin él — mismo patrón defensivo que ya usa `getWikiContextBlock` (nunca
rompe la ejecución del agente por esto), con un warning en el log del servidor para que quede
visible en desarrollo.

## Bucle de validación y reintento

El Razonador usa un nuevo `outputType: 'verdict'`, con tool-call forzado análogo a
`STRATEGY_TOOL` (`realExecutor.ts`): `{ veredicto: 'go' | 'ajustar' | 'no_operar', razon: string,
objeciones?: string[] }`.

Mecánica en `orchestrator.ts` tras completar una pasada de `executeRun`:

- **`go`** → terminal. Se muestra el resultado.
- **`no_operar`** → terminal desde el primer intento. Las condiciones son lo bastante malas
  (o las objeciones lo bastante serias) que reintentar con los mismos datos no tiene sentido —
  no hay retry.
- **`ajustar`** → si `retryCount < maxRetries`, se reejecutan `agente-riesgo` y todos sus
  descendientes (`agente-validador-tecnico`, `agente-refutador`, `agente-razonador`) con las
  objeciones del Razonador antepuestas al contexto de Gestor de Riesgos ("Objeciones del
  Razonador (intento N): …"). Si se agota `maxRetries` y el veredicto sigue sin ser `go`, el run
  termina mostrando el último veredicto con las objeciones visibles, marcado como **revisión
  manual recomendada** — nunca se presenta como validado si no lo fue.

`maxRetries` configurable, con techo duro de 3 reintentos (4 intentos totales de Gestor de
Riesgos) para no disparar el coste/latencia sin control.

Los fallos técnicos (red, LLM, parseo de la respuesta) **no** activan el bucle de reintento —
siguen el comportamiento actual sin cambios: el agente pasa a `error`, el run pasa a `error`, sin
fallback silencioso.

## Cambios de modelo de datos necesarios

- `types.ts`: añadir `'verdict'` a `OutputType`; añadir `attempt: number` (default 1) a
  `AgentRunResult` para poder mostrar en qué intento se generó cada resultado; añadir
  `retryCount`/`maxRetries` a `Run`.
- `orchestrator.ts`: nueva función `descendantChain(agents, agentId)` (inversa de
  `ancestorChain`, ya existe el mapa `childrenOf` dentro de `buildLevels` para apoyarse) para
  saber qué reejecutar en cada reintento; `executeRun` pasa de "ejecutar niveles una vez" a
  "ejecutar niveles, comprobar veredicto, reejecutar subgrafo si aplica, hasta terminal o
  `maxRetries`".
- `realExecutor.ts`: nuevo `VERDICT_TOOL` (tool-call forzado cuando `outputType === 'verdict'`),
  igual que ya existe `STRATEGY_TOOL` para `outputType === 'strategy'`.
- `mockExecutor.ts`: salida simulada para `outputType: 'verdict'` (para poder probar el bucle de
  reintento en modo simulado, sin gastar en OmniRoute).
- Frontend: `AgentCard`/`StrategyResultCard` necesitan renderizar el veredicto (badge
  GO/AJUSTAR/NO_OPERAR + objeciones) y, cuando `attempt > 1`, indicar que ese resultado es de un
  reintento. Detalle de componentes se define en el plan de implementación, no aquí.

## Fuera de alcance (por ahora)

- **Analista de Sentimiento/Flujo** y **Validador de Money Management** (esquema "exhaustivo",
  8-9 agentes): extensión natural una vez el mecanismo base esté probado en producción. Añadir
  un agente a un nivel ya existente es trivial; el trabajo real es el mecanismo, no el conteo de
  agentes.
- **Tests automatizados:** el servidor no tiene framework de tests hoy. Verificación prevista:
  una ejecución completa en modo simulado (gratis) para validar que el bucle de reintento
  dispara/termina correctamente, y una ejecución real contra OmniRoute para un par, antes de dar
  el esquema por operativo.

## Próximo paso

Con este esquema aprobado, el siguiente paso es un plan de implementación (orden de cambios:
`marketSnapshot.ts` → `types.ts` → `realExecutor.ts`/`mockExecutor.ts` → `orchestrator.ts` →
`agents.json` → frontend) antes de tocar código.

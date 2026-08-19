# Backend local — trading-agents-dashboard

Servidor Express que persiste en disco (JSON) la configuración de agentes y el historial de runs, y orquesta la ejecución de la cadena de agentes.

## Motor de ejecución (mock vs real)

`src/engine/executor.ts` decide en cada ejecución: si `OMNIROUTE_BASE_URL` y `OMNIROUTE_API_KEY` están configurados (ver `.env.example`), usa `realExecutor.ts` para llamar a OmniRoute (gateway de IA self-hosted en el NAS, API compatible con OpenAI) con el modelo del agente (o `OMNIROUTE_DEFAULT_MODEL` si no se ha elegido uno). Si no están configurados, usa `mockExecutor.ts` (salidas de relleno etiquetadas `[SIMULADO]`) sin llamar a ningún LLM. No hay fallback silencioso de real a mock en caliente: si OmniRoute falla a mitad de una ejecución con la clave configurada, ese agente termina en estado `error` con el mensaje real, en vez de disfrazarse de resultado simulado.

## Conocimiento de apoyo de la wiki (`src/store/wikiStore.ts`)

Tanto la cadena de agentes de análisis como el generador de MQL5 reciben automáticamente contexto de la wiki de trading del repo (`wiki-Traiding/`, ver `wiki-Traiding/CLAUDE.md`) como apoyo adicional — nunca como única fuente, y sin ningún campo nuevo en `agents.json` ni en el tipo `Agent`.

`wikiStore.ts` parsea el catálogo de `wiki-Traiding/index.md` (excluyendo `glosario.md`: es enorme y su descripción haría match genérico con casi cualquier agente, desplazando páginas más específicas) y puntúa cada página por solapamiento de palabras clave contra el texto de consulta, ponderado por especificidad (IDF suavizado): una palabra rara en el catálogo (p. ej. "rsi", presente en 1-2 páginas) pesa mucho más que una genérica (p. ej. "mercado" o "indicadores", presente en decenas) — sin este peso, cualquier agente que mencione "indicadores técnicos" empataría con casi toda la categoría por igual. Un acierto en el nombre de archivo (p. ej. "macd" en el prompt del agente y `macd.md`) pesa el doble que un acierto suelto en la descripción. No hay embeddings ni tooling externo — es el mismo criterio de simplicidad que usa la wiki (`wiki-Traiding/METHODOLOGY.md`: un catálogo tipo `index.md` funciona bien sin embeddings hasta ~100 fuentes).

`getWikiContextBlock(queryText, opts)` encadena selección → lectura de las páginas elegidas (quita frontmatter y las secciones `## Ver también`/`## Fuentes`, trunca a un máximo de caracteres) → formateo, y se llama desde dos sitios, cada uno con su propio texto de consulta y presupuesto de páginas:

- `realExecutor.ts` (`runRealAgent`): consulta = rol + `systemPrompt` del agente; hasta 3 páginas.
- `mql5Generator.ts` (`generateMql5`): consulta = resumen + indicadores clave de la estrategia ya decidida; hasta 2 páginas (el prompt ya es denso con el estándar de generación de EAs y las lecciones de compilación).

En ambos casos el bloque de wiki se concatena al `systemPrompt` existente (mismo patrón que las lecciones de compilación de `mql5KnowledgeStore.ts` — ver sección siguiente). Todo el acceso a disco está envuelto en `try/catch`: si la wiki no existe, una página falta, o el parseo falla, la ejecución del agente sigue igual que antes (bloque vacío), nunca se rompe por esto.

Es un heurístico de primera pasada — si en uso real resulta demasiado ruidoso o demasiado escaso, ajustar `minScore`/`maxPages` en las dos llamadas a `getWikiContextBlock(...)` antes de plantearse algo más sofisticado.

## Endpoints

- `GET/POST /api/agents`, `PUT/DELETE /api/agents/:id`
- `GET /api/pairs` (favoritos primero), `PATCH /api/pairs/:symbol/favorite` (marca/desmarca favorito; crea el par si no existía), `DELETE /api/pairs/:symbol`
- `GET /api/symbols/search?q=` (proxy a Twelve Data `/symbol_search`, hasta 20 resultados)
- `GET /api/candles?pair=&timeframe=` (velas OHLCV; ver "Datos de mercado" abajo)
- `GET /api/models` (proxy a `GET {OMNIROUTE_BASE_URL}/v1/models`; si OmniRoute no está configurado, devuelve una lista estática de respaldo)
- `POST /api/runs` (inicia una ejecución para un par/timeframe), `GET /api/runs/:id` (estado — el frontend hace polling)
- `POST /api/mql5/generate` (arranca la generación de un EA a partir de una `StrategyProposalLite`; devuelve `{ jobId }` de inmediato, no bloquea), `GET /api/mql5/generate/:jobId` (estado del job — el frontend hace polling; ver sección siguiente)
- `POST /api/backtest/analyze` (`{ logText }` → `{ sessions }`; parsea un log del Strategy Tester de MetaTrader y calcula win rate/R:R/resultado neto — ver sección "Validación de backtest" abajo)

## Generación de código MQL5 (`src/engine/mql5*.ts`)

Convierte la `StrategyProposalLite` de un agente en un Expert Advisor `.mq5`, lo compila de verdad contra MetaEditor y itera automáticamente sobre los errores reales que reporte el compilador — así se cierra el bucle "generar → compilar → corregir" en vez de entregar código sin verificar.

**Flujo (`mql5Generator.ts` → `generateMql5`)**:
1. Llama a OmniRoute (`chatCompletion`, tool-calling forzado a `deliver_ea`) con el estándar del proyecto (`docs/MetaTrader/17_Estandar_Desarrollo_EAs_con_IA.md`) como system prompt, más las lecciones ya confirmadas de generaciones anteriores (`loadTopIssues` + `renderIssuesForPrompt`, ver knowledge store abajo).
2. Compila el `.mq5` recibido contra MetaEditor real (`mql5Compiler.ts` → `metaeditor64.exe /compile`, parseando el `.log`; ruta configurable con `METAEDITOR_PATH`, ver `.env.example`). Si MetaEditor no está instalado en la máquina, `compileStatus` queda en `'unverified'` en vez de fallar.
3. Si hay errores reales de compilación, se los pasa tal cual al modelo (`buildFixPrompt`) pidiendo que corrija únicamente eso — hasta 3 intentos en total.
4. Cada intento (errores, warnings, si se resolvió algo del intento anterior) se registra en `server/src/data/mql5-attempts-log.jsonl`. Cuando un intento corrige errores del anterior Y el modelo declara `fixSummary`, esa corrección queda confirmada por compilación real y se guarda en `server/src/data/mql5-known-issues.json` (`mql5KnowledgeStore.ts` → `recordConfirmedFix`), que a su vez regenera `docs/MQL5_ERRORES_CONOCIDOS.md` — documento **autogenerado, no editar a mano** — y esas lecciones se inyectan automáticamente en el prompt de la *siguiente* generación (paso 1), para que un análisis nuevo no repita errores ya resueltos en análisis anteriores.

**Por qué `/generate` es un job asíncrono y no una respuesta directa:** una generación real tarda 1–3 minutos (hasta 3 llamadas a OmniRoute de hasta 180s cada una, más compilación). Devolver eso como una única respuesta HTTP bloqueante resultó frágil: **cualquier interrupción durante esos minutos — el `tsx watch` del propio backend reiniciándose por una edición de código, o un corte de red — tumba la conexión en curso, y el navegador lo reporta como un `TypeError: Failed to fetch` opaco**, aunque el trabajo en el servidor normalmente sí llegase a completarse. Confirmado reproduciendo el fallo: una petición directa a MetaEditor+OmniRoute completa en ~2–3 min sin problema, pero editar cualquier archivo de `server/src` a mitad de esa ventana (reinicio de `tsx watch`) corta la conexión al instante (`curl: (56) Recv failure: Connection was reset`) — exactamente lo que el navegador ve como "Failed to fetch". Por eso `POST /generate` solo crea el job (`mql5Jobs.ts`, en memoria) y responde al momento con `{ jobId }`; el cliente hace polling a `GET /generate/:jobId` cada 2s. Si el servidor se reinicia a mitad de un job, ese job en concreto se pierde igualmente (el estado es en memoria, no sobrevive al reinicio), pero ahora el coste de esa pérdida es un único tick de sondeo con un error explícito ("Job no encontrado — probablemente el servidor se reinició…"), no los minutos completos de espera con un fallo de red sin explicación.

**Requisitos para compilación real** (si faltan, sigue funcionando pero sin verificar código): MetaTrader 5 instalado (ruta por defecto `C:\Program Files\MetaTrader 5\metaeditor64.exe`, o `METAEDITOR_PATH`) y `OMNIROUTE_API_KEY`/`OMNIROUTE_BASE_URL` configurados — sin esto último, `/generate` devuelve un esqueleto `[SIMULADO]` (mismo mecanismo que `mockExecutor.ts`).

**Warnings de MetaEditor filtrados por origen:** el log de compilación también reporta errores/warnings de los headers estándar que el EA incluye (p. ej. `Trade.mqh`: "declaration of 'request'/'result' hides global variable" en prácticamente cualquier EA que use `CTrade`) — no son accionables porque no forman parte del código generado. `mql5Compiler.ts` → `parseLog` solo conserva las líneas cuyo path coincide con el `.mq5` que se acaba de compilar, así que `compileWarnings` deja de mostrar ruido ajeno al archivo. También se añadió una regla al prompt de generación para el warning 68 más frecuente que sí era del propio archivo (`#property version "1.0.1"` en formato de 3 números en vez de `"x.yy"`).

## Validación de backtest (`src/engine/mt5LogParser.ts`)

Motivado por `docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md`: que un EA compile y opere no implica que la estrategia sea rentable — solo un backtest lo dice, y leer el log de MetaTrader a mano (miles de líneas) no escala. `POST /api/backtest/analyze` recibe el texto del log (`{ logText }`) y `parseMt5Log` lo convierte en una o más `Mt5LogSession` (un mismo `AAAAMMDD.log` acumula **todas** las pruebas lanzadas ese día, delimitadas por líneas `expert file added: ...`; el cliente por defecto muestra la más reciente).

Por sesión, a partir de las líneas `deal #N ... done` y `stop loss triggered #N ... [#M ...]` / `take profit triggered #N ...`:

- Balance inicial/final y resultado neto — directos del log, cifra exacta.
- Win rate (Take Profit vs Stop Loss), R:R medio (de la distancia entrada↔SL y entrada↔TP reales de cada operación) y esperanza matemática en R.
- Profit factor y bruto ganado/perdido — **aproximados**: `(precioCierre − precioEntrada) × lotes × 100 000`, asume contrato estándar y símbolo cotizado directo contra USD, sin comisión ni swap. Para cifras exactas hay que mirar el informe `.htm` completo del Strategy Tester.
- Avisos automáticos (0 operaciones, esperanza negativa, muestra <20 operaciones, fills sin cierre por SL/TP emparejado).

**Cuidado con la codificación:** el log de MetaTrader se guarda en **UTF-16LE con BOM**, no UTF-8. El cliente (`src/components/BacktestLogAnalyzer.tsx`) detecta el BOM y decodifica con `TextDecoder` antes de mandar el texto ya en UTF-8 al backend — si se lee el archivo como UTF-8 a secas sale ilegible. Detalle completo en `docs/BACKTEST_LOG_ANALYZER.md`.

## Datos de mercado (`src/marketData/`)

`getCandles(pair, timeframe)` (`marketData/index.ts`) elige proveedor según el par y cachea la respuesta 60s en memoria:

- **Kraken** (`krakenAdapter.ts`, sin API key) para `BTC/USD` y `ETH/USD`. Su endpoint público `OHLC` está limitado a **720 velas más recientes por petición** (no soporta paginar hacia atrás con `since`, solo hacia delante) — es el máximo real de la API, no un límite nuestro.
- **Twelve Data** (`twelveDataAdapter.ts`, requiere `TWELVEDATA_API_KEY`) para todo lo demás. Pide `outputsize=5000` (el máximo que acepta su API — valores mayores se rechazan) y `timezone=UTC` explícito.

**Cuidado con el parseo de fechas de Twelve Data**: sus timestamps vienen como `"YYYY-MM-DD HH:mm:ss"` sin marcador de zona horaria. Parsearlos con `new Date(...)` a secas los interpreta como hora local del proceso, lo que puede colapsar dos horas distintas en el mismo instante UTC durante un cambio de horario (DST) — y `lightweight-charts` exige velas estrictamente ordenadas, así que un choque así rompe el gráfico entero en el cliente. Por eso `twelveDataAdapter.ts` fuerza UTC explícito al parsear (`parseTwelveDataTime`), y `marketData/index.ts` añade además un `sort`+`dedupe` defensivo antes de cachear, como salvaguarda ante cualquier otro dato defectuoso del proveedor.

## Arranque

Normalmente se arranca junto al cliente con `npm run dev` desde la raíz del proyecto. Para arrancarlo solo:

```bash
npm install
npm run dev
```

Puerto configurable con `PORT` (ver `.env.example`), por defecto `5175`.

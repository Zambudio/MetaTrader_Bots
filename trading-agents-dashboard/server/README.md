# Backend local — trading-agents-dashboard

Servidor Express que persiste en disco (JSON) la configuración de agentes y el historial de runs, y orquesta la ejecución de la cadena de agentes.

## Motor de ejecución (mock vs real)

`src/engine/executor.ts` decide en cada ejecución: si `OMNIROUTE_BASE_URL` y `OMNIROUTE_API_KEY` están configurados (ver `.env.example`), usa `realExecutor.ts` para llamar a OmniRoute (gateway de IA self-hosted en el NAS, API compatible con OpenAI) con el modelo del agente (o `OMNIROUTE_DEFAULT_MODEL` si no se ha elegido uno). Si no están configurados, usa `mockExecutor.ts` (salidas de relleno etiquetadas `[SIMULADO]`) sin llamar a ningún LLM. No hay fallback silencioso de real a mock en caliente: si OmniRoute falla a mitad de una ejecución con la clave configurada, ese agente termina en estado `error` con el mensaje real, en vez de disfrazarse de resultado simulado.

## Endpoints

- `GET/POST /api/agents`, `PUT/DELETE /api/agents/:id`
- `GET /api/pairs` (favoritos primero), `PATCH /api/pairs/:symbol/favorite` (marca/desmarca favorito; crea el par si no existía), `DELETE /api/pairs/:symbol`
- `GET /api/symbols/search?q=` (proxy a Twelve Data `/symbol_search`, hasta 20 resultados)
- `GET /api/candles?pair=&timeframe=` (velas OHLCV; ver "Datos de mercado" abajo)
- `GET /api/models` (proxy a `GET {OMNIROUTE_BASE_URL}/v1/models`; si OmniRoute no está configurado, devuelve una lista estática de respaldo)
- `POST /api/runs` (inicia una ejecución para un par/timeframe), `GET /api/runs/:id` (estado — el frontend hace polling)

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

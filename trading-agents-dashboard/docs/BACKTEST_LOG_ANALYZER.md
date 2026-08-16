# Analizador de logs del Strategy Tester

Motivado por `docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md` §4: compilar sin errores no
demuestra que una estrategia sea rentable, solo que el código es válido. Para responder
"¿opera, y si opera, es rentable?" hacía falta leer a mano el log de MetaTrader
(`Tester\<terminal-id>\Agent-127.0.0.1-<puerto>\logs\AAAAMMDD.log`), que puede tener
miles de líneas por sesión. Este apartado del dashboard automatiza esa lectura.

## Cómo se usa

1. En la tarjeta de una estrategia, tras generar y probar el `.mq5` en MetaEditor, baja
   hasta "Validar con backtest" (debajo del bloque de código).
2. Arrastra el `.log` del Strategy Tester a la zona de drop, o pulsa "Elegir archivo…"
   para abrirlo desde el explorador de Windows.
3. El archivo se lee en el navegador (`File.arrayBuffer()` + `TextDecoder`) y se envía
   como texto a `POST /api/backtest/analyze`, que lo parsea y devuelve las métricas.

Un mismo archivo `AAAAMMDD.log` acumula **todas** las pruebas lanzadas ese día (cada una
delimitada por una línea `expert file added: ...`), no solo la última — el parser separa
cada prueba en una "sesión" independiente y, si hay más de una, el desplegable deja elegir
cuál mirar (por defecto, la más reciente).

## Qué calcula

A partir de las líneas `deal #N ... done (based on order #N)` y
`stop loss triggered #N ... [#M ...]` / `take profit triggered #N ... [#M ...]` de la
categoría `Trade`/`Trades` del log:

- Balance inicial/final y resultado neto — directos del log (`initial deposit`,
  `final balance`), cifra exacta.
- Operaciones cerradas, cuántas por Take Profit y cuántas por Stop Loss → win rate.
- R:R medio, calculado de la distancia precio de entrada↔SL y precio de entrada↔TP de
  cada operación (tal como los fijó el propio EA, no un valor de configuración).
- Esperanza matemática en R (`winRate × R:R − (1 − winRate)`): si es negativa, el win
  rate no compensa el ratio riesgo/beneficio real, con independencia del resultado neto
  de esta muestra concreta.
- Profit factor, bruto ganado/perdido: **aproximados**, reconstruidos como
  `(precioCierre − precioEntrada) × lotes × 100 000`. Esto asume contrato estándar de
  100 000 unidades y símbolo cotizado directo contra USD (EURUSD, GBPUSD…) y no incluye
  comisión ni swap — para pares donde la divisa de cotización no es USD (USDJPY,
  USDCAD…) o para cifras exactas, hay que mirar el informe `.htm` completo del Strategy
  Tester.
- Avisos automáticos (p.ej. 0 operaciones, esperanza negativa, muestra <20 operaciones,
  fills sin cierre por SL/TP emparejado) para señalar de un vistazo por qué una
  estrategia no debería darse por validada todavía.

## Piezas

- `server/src/engine/mt5LogParser.ts` — parser puro (texto → `Mt5LogSession[]`) y cálculo
  de métricas.
- `server/src/routes/backtest.ts` — `POST /api/backtest/analyze`, `{ logText }` →
  `{ sessions }`.
- `src/components/BacktestLogAnalyzer.tsx` — drop zone + selector de picker nativo +
  tarjeta de resultados. Incluye la decodificación UTF-16LE (el log de MetaTrader no es
  UTF-8) antes de mandar el texto al backend.
- `src/types/backtest.ts` — espejo en el cliente de los tipos del parser.

## Limitación conocida

El parser reconoce cierres por Stop Loss o Take Profit (que es como cierra la mayoría de
EAs generados por este pipeline, con `CTrade` fijando `sl`/`tp` en el `OrderSend`). Un
cierre por señal contraria sin SL/TP explícito, o un cierre manual, no queda etiquetado
como "trigger" — esos fills se cuentan en el total de operaciones pero no entran en el
cálculo de win rate; el aviso "N fill(s) no se emparejaron..." avisa cuando esto ocurre.

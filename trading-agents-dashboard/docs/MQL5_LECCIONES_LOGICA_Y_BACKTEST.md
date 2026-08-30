# Lecciones de lógica y backtest (más allá de errores de compilación)

> A diferencia de `MQL5_ERRORES_CONOCIDOS.md` (autogenerado, solo errores que el
> **compilador** detecta), este documento se edita a mano. Recoge fallos **semánticos**:
> el código compila con 0 errores/warnings pero el EA no opera como se pretendía, o
> opera pero con una lógica cuyo resultado en backtest no compensa el riesgo. Estos
> fallos solo se detectan ejecutando el EA en el Strategy Tester contra datos históricos,
> nunca en la fase de compilación.

## 1. Contexto: pipeline hasta llegar aquí

1. El agente genera el `.mq5` con el LLM (OmniRoute) y lo compila vía MetaEditor CLI en un
   bucle de hasta 3 intentos, corrigiendo errores reales de compilador. Los fallos de esta
   fase (identificadores no declarados, conversiones de enum, `TRADE_RETCODE_*`
   inexistentes, etc.) se documentan solos en `docs/MQL5_ERRORES_CONOCIDOS.md` — ya van
   12 firmas distintas confirmadas y se inyectan automáticamente en el prompt de
   generación de la siguiente vez.
2. Se resolvieron dos bugs de infraestructura del propio dashboard (documentados en
   `server/README.md` y `README.md`): el endpoint `/mql5/generate` bloqueaba la petición
   HTTP 1-3 minutos y cualquier reinicio del dev server la tumbaba ("Failed to fetch") →
   se rediseñó como job asíncrono + polling; y las escrituras de `mql5-known-issues.json`
   fallaban con `EPERM` de forma intermitente por estar `N:\` montado como unidad de red →
   se añadió `renameWithRetry()`.
3. Con eso arreglado, se generó `PruebaBots1.mq5` (EURUSD H1, ruptura + pullback a EMA,
   confirmación por RSI/Bollinger/volumen), compiló sin errores, y se probó en el
   Strategy Tester contra ~7.5 meses de histórico H1 → **0 operaciones ejecutadas** en las
   5 pasadas. Eso es lo que motiva este documento: el compilador da el visto bueno, pero
   la estrategia no operaba.

## 2. Bug: `tickVolume[0]` en vez de `tickVolume[1]` → 0 operaciones

**Síntoma:** balance final = balance inicial (10000.00 USD) en las 5 pasadas del backtest
de `PruebaBots1.mq5`. Ninguna operación.

**Causa raíz:** `AnalyzeAndExecute()` se ejecuta una sola vez por vela, en el primer tick
de la vela nueva (hay un guard `if(currentBarTime == lastProcessedBarTime) return;` en
`OnTick()`). En ese instante, el volumen de la vela en curso (`tickVolume[0]`) es casi
cero — apenas ha llegado el primer tick. El código calculaba la confirmación de volumen
así:

```cpp
long avgVolume = 0;
for(int i = 1; i <= Inp_Volume_Period; i++) avgVolume += tickVolume[i];
avgVolume /= Inp_Volume_Period;
bool highVolumeConfirmation = tickVolume[0] > (long)(avgVolume * 1.2);  // siempre falso
```

`highVolumeConfirmation` es una condición `&&` obligatoria en las 4 ramas de entrada
(long-trend, long-breakout, short-trend, short-breakout), así que al ser
estructuralmente falsa bloqueaba el 100% de las señales. La confusión `[0]` vs `[1]` es
un error clásico de convención de índices de MQL5 (`[0]` = vela en curso/formándose,
`[1]` = última vela cerrada) — el compilador no puede detectarlo porque `tickVolume[0]`
es perfectamente válido sintáctica y semánticamente, solo que no es la vela que hay que
mirar para un cálculo "una vez por vela cerrada".

**Fix:** cambiar `tickVolume[0]` por `tickVolume[1]` en la comparación de volumen (línea
~200). Una sola línea.

**Nota operativa (no de código):** el primer intento de aplicar el fix se perdió dos
veces porque `PruebaBots1.mq5` estaba abierto en MetaEditor con un buffer desactualizado;
al pulsar "Guardar" en el diálogo de cierre, MetaEditor sobrescribía el fix en disco con
el contenido antiguo del buffer. Se resolvió escribiendo el fix en un archivo nuevo
(`PruebaBots2.mq5`) que MetaEditor nunca había abierto, evitando el conflicto de buffer.
Si esto se repite: cerrar MetaEditor por completo (no solo la pestaña) antes de recompilar
tras un edit externo, o usar siempre un nombre de archivo nuevo por iteración.

## 3. Resultado tras el fix: opera, pero pierde dinero

Backtest de `PruebaBots2.ex5`, EURUSD H1, 2026-01-02 → 2026-08-14 (~7.5 meses),
depósito inicial 10 000 USD, apalancamiento 1:100 (log:
`Tester/.../Agent-127.0.0.1-3001/logs/20260816.log`):

| Métrica | Valor |
|---|---|
| Balance inicial | 10 000.00 USD |
| Balance final | 9 079.34 USD |
| Resultado neto | **-920.66 USD (-9.2 %)** |
| Operaciones cerradas | 145 (290 fills) |
| Cerradas por Take Profit | 44 (30.3 %) |
| Cerradas por Stop Loss | 101 (69.7 %) |
| R:R de diseño (SL/TP por ATR) | ≈ 1:2, consistente en toda la muestra |

**Lectura:** con un win rate del 30.3 % y un R:R medio de 1:2, la esperanza matemática
por operación es `0.303 × 2 − 0.697 × 1 ≈ -0.09 R` — negativa. Es coherente con la
pérdida neta observada: el filtro de entradas de esta estrategia no es lo bastante
selectivo para el ratio riesgo/beneficio con el que está calculado el SL/TP. Que el EA
ya opere (bug del §2 resuelto) no significa que la estrategia esté validada — son dos
preguntas distintas:

1. ¿El código hace lo que el prompt describe? → ahora sí (0 errores de compilación +
   opera en backtest).
2. ¿Lo que describe el prompt es una estrategia rentable? → esto solo lo responde el
   backtest, y en esta primera iteración la respuesta es no.

## 4. Consecuencia: nueva categoría de verificación

Hasta ahora el bucle de generación solo verificaba "¿compila?". Este hallazgo añade una
segunda pregunta que el compilador nunca puede responder: "¿opera, y si opera, es
rentable?". Motiva la función descrita en `docs/BACKTEST_LOG_ANALYZER.md`: un apartado en
el dashboard donde se sube el log del Strategy Tester (arrastrando el archivo o abriendo
el explorador de Windows) y el sistema calcula automáticamente win rate, R:R real
observado y resultado neto, en vez de tener que leerlo a mano en el log de MetaTrader.

## 5. Nota operativa (no de código): MetaTrader 5 debe estar CERRADO al generar

Hermana de la nota del §2 sobre MetaEditor: el backtest headless automático lanza
`terminal64.exe /config:<autotester_*.ini>`, que **solo ejecuta el tester en un arranque
limpio**. Si ya tienes MetaTrader 5 abierto a mano (mirando gráficos), Windows le reenvía
la config a esa instancia por línea de comandos y el proceso nuevo sale al instante — pero
la instancia ya en marcha **ignora la sección `[Tester]` reenviada** y el backtest nunca
corre. El sondeo agota los 180 s y devuelve "no se pudo confirmar la finalización".

Confirmado 2026-08-30: una prueba de TSLA con MT5 abierto no dejó ni una línea de
`Startup`/`Tester` en el log del terminal (el `.ini` generado era correcto — `Symbol=TSLA`,
`Period=H4`; el problema no era el símbolo). Las pruebas de EUR/USD "siempre funcionaban"
porque `ShutdownTerminal=1` cierra MT5 tras cada test, así que cada una era un arranque
limpio.

El dashboard ahora lo detecta (`isTerminalRunning` en `mql5Backtester.ts`, vía `tasklist`)
y corta con un aviso accionable en vez de esperar los 180 s. Aun así, **cierra MetaTrader 5
antes de darle a "Generar código MQL5"**. Detalle completo:
`wiki-Traiding/proyecto-dashboard/informes/2026-08-30-resiliencia-generacion-mql5-y-backtest-mt5-abierto.md`.

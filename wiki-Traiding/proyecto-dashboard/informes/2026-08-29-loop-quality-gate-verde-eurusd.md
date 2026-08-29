---
tags: [proyecto-dashboard, agentes, mql5, backtest, loop, autonomo, en-curso]
updated: 2026-08-29
---

# Registro vivo: bucle autónomo hasta Quality Gate verde en EUR/USD H1

> Registro de la ejecución del plan [`../planes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md). `## Estado actual` se reescribe entero en cada iteración; `## Log de iteraciones` es append-only. **En curso** — este informe no está cerrado hasta que el Quality Gate pase 6/6 o el bucle se detenga por otra condición de parada.

## Estado actual

- **Iteración:** 1 — **SALTADA por infraestructura** (OmniRoute 503). No cuenta como iteración de progreso (plan §Paso 1).
- **Fase:** Paso 1 (análisis) bloqueado. Paso 0 (salud del entorno) OK.
- **Hipótesis viva:** ninguna confirmada. Dato parcial del run 1 (llegó a 5/6 agentes antes del 503): `agente-riesgo` propuso una tesis **SELL** de pullback a EMA20 con condición mecánica de aspecto razonable (`Cierre de vela H1 por debajo de EMA(20) Y al menos una de las 3 velas previas cerró por encima de EMA(20) Y RSI(14) < 65`, R:R 1:1.53); el Refutador la marcó "NO APROBADA como regla mecánica", pero el veredicto final nunca se emitió (503 en `agente-razonador`). Sin conclusión.
- **Cambios ya probados y su efecto:** ninguno.
- **Progreso hacia verde:** 0/6 criterios del Quality Gate confirmados en un ciclo completo (nunca se ha llegado a ejecutar el backtest tras un "GO" real).
- **Notas de cuota:** Claude bajo (solo orquestación + polling). Codex **no invocado** (no hubo diagnóstico que delegar). **OmniRoute inestable** (proveedor LLM externo, cuota aparte): `503 "Endpoint is unavailable"` en endpoints free del pool (`oc/deepseek-v4-flash-free`), `poolSize` cayendo 22 → 18 entre los dos runs.
- **Siguiente acción concreta:** Iteración 2 — reintentar Paso 0 + Paso 1 (`POST /api/runs` EUR/USD H1). Si OmniRoute sigue devolviendo 503 en 2 intentos, otro wake-up largo. Si a las ~2h continuas sigue caído (primer 503 ≈ 08:14) → parar y avisar a Pedro (plan §Condiciones de parada).

## Log de iteraciones

### Iteración 1 (2026-08-29 08:35) — SALTADA (infraestructura)

- **Contexto:** n/a — no se llegó a veredicto ni a generación de código.
- **Paso 0 (salud del entorno):** OK. Backend ya activo en `:5175` (`/api/agents` → 200). Caché EUR/USD H1 caliente: 5000 velas, `2026-02-01` → `2026-08-29` (fresca a hoy). `metaeditor64.exe` y `terminal64.exe` presentes en `C:\Program Files\MetaTrader 5\`.
- **Paso 1 (análisis):** 2 runs, ambos muertos por `OmniRoute respondió 503` (upstream provider `oc/deepseek-v4-flash-free` no disponible):
  - `QaJNFW28SK`: completó 5/6 agentes + 2 reintentos internos del orquestador (veredicto "ajustar" ×2, `retryCount` llegó a 2). `agente-razonador` (el veredicto) → 503. Estrategia de `agente-riesgo`: SELL pullback a EMA20/SMA20 (~1.1598), `condicionEntrada = "Cierre de vela H1 por debajo de EMA(20) Y al menos una de las 3 velas previas cerró por encima de EMA(20) Y RSI(14) < 65"`, entry 1.1595 / SL 1.1610 / TP 1.1572, R:R 1:1.53, riesgo 1%.
  - `EuwWXli9dU` (reintento único, plan §Paso 1): `agente-riesgo` → 503 tras ~3 agentes. Falló antes que el primero.
- **Métricas backtest:** n/a (nunca se generó `.mq5`).
- **Clasificación Codex:** n/a (no invocado — no hay fallo del pipeline que diagnosticar, solo indisponibilidad del proveedor LLM).
- **Cambio aplicado:** ninguno de código ni de prompt. Solo este registro.
- **Commit:** este mismo commit (`loop(iter 1): saltada por OmniRoute 503`).
- **Cuota:** Claude bajo. Codex sin usar. OmniRoute degradado (`poolSize` 22→18, 503 en free endpoints).
- **Observación (candidata — NO aplicar aún):** si OmniRoute free tumba runs de forma recurrente en próximas iteraciones, evaluar (a) fijar modelos no-free en el roster de agentes, o (b) subir reintentos/backoff ante 503 en `omniClient.ts`. Solo si se confirma patrón en 2+ iteraciones; este episodio por sí solo no lo justifica.

## Ver también

- [`../planes/2026-08-29-loop-quality-gate-verde-eurusd.md`](../planes/2026-08-29-loop-quality-gate-verde-eurusd.md) — el plan / carta operativa que este informe registra.
- [`2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md`](2026-08-29-verificacion-fix-condicion-entrada-y-afinado-prompts.md) — estado del sistema justo antes de este bucle.

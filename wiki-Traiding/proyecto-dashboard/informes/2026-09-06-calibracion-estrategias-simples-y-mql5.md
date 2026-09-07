# Calibración de estrategias "Simple" (Forex, Acciones, Cripto) y generación robusta MQL5

**Fecha:** 2026-09-06 / 2026-09-07. **Estado: ✅ IMPLEMENTADO, CALIBRADO, VALIDADO EN VIVO Y EN PRODUCCIÓN (PM2)** en la rama `main` del repositorio `Z:\IA\02_Proyectos\MetaTrader_Bots`.

## 1. Resumen ejecutivo

Tras la incorporación de las tres plantillas base oficiales "Simple" (`FOREX (Simple)`, `ACCIONES (Simple)` y `CRIPTOMONEDAS (Simple)`), se ejecutó una ronda intensiva de calibración empírica con el modelo `omniroute:auto/best-coding` sobre el orquestador real y MetaEditor64.

Los objetivos conseguidos fueron:
1. **Eliminación del 100% de rechazos aritméticos en el Gate Determinista**: Se formuló un cálculo algorítmico paso a paso en el prompt de la estrategia para garantizar $SL \in [1.25, 2.50] \text{ ATR}$ y $R:R \ge 1.60$.
2. **Cumplimiento estricto de contratos en los 3 agentes seriales**: Analistas reconociendo `DATA_NOT_AVAILABLE` en ausencia de datos, hipótesis con `condicionEntrada` mecánica auditable y Jueces emitiendo veredicto `GO` con `unresolvedBlockers: []`.
3. **Resiliencia y generación MQL5 en MetaEditor64 real**: Corrección de truncamientos upstream en OmniRoute forzando `max_tokens: 8192`, validación anti-stubs en `mql5Generator.ts` y comprobación de auto-reparación y compilación con 0 errores y 0 warnings en MetaEditor64 real (`.ex5` generado).
4. **Verificación integral y puesta en producción**: 96/96 tests pasando (incluyendo integración con MetaEditor), typecheck limpio, build de frontend completado y proceso PM2 `trading-dashboard` reiniciado en `http://localhost:5175`.

---

## 2. Diagnóstico y Problemas Resueltos

### 2.1. Rechazos por Stop Loss fuera de rango ATR en el Gate Determinista
- **Síntoma:** En ejecuciones en vivo, el agente de estrategia proponía niveles de Stop Loss basados en referencias visuales cercanas del gráfico (como la media móvil EMA20 o el mínimo de la vela previa), lo que resultaba en distancias inferiores al mínimo permitido ($SL / \text{ATR} \approx 0.89 < 1.25$). Esto activaba el rechazo del gate determinista (`strategyValidator.ts`).
- **Causa raíz:** Ambigüedad en las instrucciones del prompt sobre cómo combinar la estructura del mercado con el multiplicador de ATR.
- **Solución implementada:** Se reescribió la sección de cálculo de riesgo de `simpleStrategyAgent` en `server/src/config/baselinePresets.ts` con un algoritmo aritmético obligatorio:
  1. $\text{distancia\_SL} = 1.50 \times \text{ATR}$ (garantiza estar holgadamente dentro de $[1.25, 2.50]$).
  2. $\text{distancia\_TP} = 1.70 \times \text{distancia\_SL}$ (garantiza $R:R = 1.70 \ge 1.60$).
  3. Precios calculados:
     - Compras: $\text{SL} = \text{precio\_entrada} - \text{distancia\_SL}$, $\text{TP} = \text{precio\_entrada} + \text{distancia\_TP}$.
     - Ventas: $\text{SL} = \text{precio\_entrada} + \text{distancia\_SL}$, $\text{TP} = \text{precio\_entrada} - \text{distancia\_TP}$.
  4. Redondeo a los decimales específicos del activo (5 para Forex, 2 para Acciones/Cripto).

### 2.2. Veredictos del Juez y Bloqueadores no Resueltos
- **Síntoma:** En ocasiones el agente Juez emitía un veredicto `go`, pero dejaba un texto informativo en el array `unresolvedBlockers`, lo que invalidaba el contrato JSON del orquestador (`verdictResult.veredicto === 'go'` exige `unresolvedBlockers` estrictamente vacío).
- **Solución implementada:** Se endureció la directriz en el prompt de `simpleJudgeAgent`: si el veredicto es `go`, `unresolvedBlockers` debe ser exactamente `[]`.

### 2.3. Truncamiento de código MQL5 y stubs
- **Síntoma:** Al solicitar la generación de un EA a través de `omniroute:auto/best-coding`, algunos modelos devolvían respuestas incompletas o volcaban el razonamiento en `fixSummary` dejando el campo `code` cortado tras `#property copyright`.
- **Solución implementada:**
  - En `server/src/engine/omniClient.ts`: Se añadió soporte para `maxTokens?: number` en `OmniClientOptions` y se forzó `max_tokens: 8192` por defecto tanto en `chatCompletionOnce` como en `chatCompletionJsonFallback`.
  - En `server/src/engine/mql5Generator.ts`: Se implementó una guarda defensiva en `requestEa` que verifica que el código devuelto tenga una longitud mínima de 200 caracteres y contenga la función obligatoria `OnTick`. En caso de respuesta stub o truncada, se activa automáticamente el bucle de reintento con mensaje de corrección.

### 2.4. Aislamiento de Vitest en el Backend
- **Síntoma:** Al ejecutar pruebas con `vitest run` desde `server/`, Vitest intentaba cargar `trading-agents-dashboard/vite.config.ts`, fallando en entornos de red/UNC por dependencias específicas de React no instaladas en el servidor.
- **Solución implementada:** Se creó `server/vitest.config.ts` estableciendo `environment: 'node'` y delimitando los archivos de test a `src/**/*.test.ts` y `test/**/*.test.ts`.

---

## 3. Verificación en Vivo de las 3 Estrategias

Se desarrolló y ejecutó el script de calibración integral `server/scripts/calibrateSimpleStrategies.ts`, evaluando cada estrategia en serie contra el motor real:

### 3.1. FOREX (Simple) — EUR/USD H1
- **Analista (`fx-simple-analyst`):** Status `valid`, sesgo `bullish`, confianza `0.78`. Estructura de hechos verificables y descarte de noticias ausentes como `DATA_NOT_AVAILABLE`.
- **Estrategia (`fx-simple-strategy`):** Dirección `buy`, condición de entrada mecánica: `"Cruce del cierre por encima de EMA20 Y RSI(14) > 50"`. Stop Loss calculado a $1.50 \times \text{ATR}$, $R:R = 1.70$.
- **Gate Determinista:** **PASS** (100% de reglas cumplidas).
- **Juez (`fx-simple-judge`):** Veredicto **GO**, razón técnica fundamentada, `unresolvedBlockers: []`. Estado final: `validated`.
- **Elegibilidad MQL5:** **ELEGIBLE**.

### 3.2. ACCIONES (Simple) — TSLA H1
- **Analista (`stock-simple-analyst`):** Status `valid`, sesgo `bullish`, confianza `0.75`. Reconocimiento explícito de `DATA_NOT_AVAILABLE` en métricas corporativas ausentes.
- **Estrategia (`stock-simple-strategy`):** Dirección `buy`, condición de entrada: `"Cierre de vela H1 > Máximo_Sesión_Regular_Intradía Y Volumen > Media_Volumen_20(1.0x)"`. SL a $1.50 \times \text{ATR}$, $R:R = 1.70$.
- **Gate Determinista:** **PASS**.
- **Juez (`stock-simple-judge`):** Veredicto **GO**, `unresolvedBlockers: []`. Estado final: `validated`.
- **Elegibilidad MQL5:** **ELEGIBLE**.

### 3.3. CRIPTOMONEDAS (Simple) — BTC/USD H1 + Compilación MQL5
- **Analista (`crypto-simple-analyst`):** Status `valid`, sesgo `bullish`, confianza `0.78`.
- **Estrategia (`crypto-simple-strategy`):** Dirección `buy`, condición: `"Cierre > EMA(20) Y RSI(14) < 70"`. SL a $1.50 \times \text{ATR}$, $R:R = 1.60$.
- **Gate Determinista:** **PASS**.
- **Juez (`crypto-simple-judge`):** Veredicto **GO**. Estado final: `validated`.
- **Elegibilidad MQL5:** **ELEGIBLE**.
- **Generación y Compilación MQL5 en MetaEditor64:**
  - Ciclo 1: Código inicial generado. MetaEditor64 reportó advertencias/errores de sintaxis MQL5.
  - Ciclo 2 (Auto-reparación): El bucle iterativo de `mql5Generator.ts` envió los errores al modelo y generó la corrección.
  - Compilación MetaEditor64:
    - **`compileStatus: 'ok'`**
    - **`compileErrors: 0`**
    - **`compileWarnings: 0`**
    - Archivo binario `.ex5` compilado con éxito.
    - Supuestos a verificar y checklist de backtest generados correctamente.

---

## 4. Métricas y Verificación del Repositorio

| Verificación | Ámbito | Resultado |
| :--- | :--- | :--- |
| `npx vitest run` | Backend (`server/`) | **22 test files, 96/96 tests PASSED (100%)**. Incluye test en vivo contra `metaeditor64.exe`. |
| `npm run typecheck` | Backend (`server/`) | **0 errores** (`tsc --noEmit && tsc -p tsconfig.scripts.json`). |
| `npm run build` | Frontend (`trading-agents-dashboard/`) | **PASS**. Bundle generado en `dist/` (`index.html`, CSS y JS). |
| `GET /api/agent-configs` | Servidor en vivo (5175) | Devuelve las 3 estrategias simples (`FOREX (Simple)`, `ACCIONES (Simple)`, `CRIPTOMONEDAS (Simple)`) operativas. |
| Servicio PM2 | Proceso `trading-dashboard` | Reiniciado y en estado `online` (PID 3284, consumo estable). |

---

## 5. Archivos Modificados

- `trading-agents-dashboard/server/src/config/baselinePresets.ts`: Prompts de `simpleSpecialist`, `simpleStrategyAgent` y `simpleJudgeAgent` con algoritmo determinista de ATR y contratos reforzados.
- `trading-agents-dashboard/server/src/engine/omniClient.ts`: Soporte para `maxTokens` y valor por defecto de 8192 tokens.
- `trading-agents-dashboard/server/src/engine/mql5Generator.ts`: Validación anti-stubs y reintentos robustos.
- `trading-agents-dashboard/server/vitest.config.ts`: Configuración aislada de pruebas Node para el backend.
- `trading-agents-dashboard/server/scripts/calibrateSimpleStrategies.ts`: Script de prueba y calibración automatizada de las 3 estrategias.
- `trading-agents-dashboard/docs/MQL5_ERRORES_CONOCIDOS.md`: Base de conocimiento de errores MQL5 actualizada tras el ciclo de compilación.

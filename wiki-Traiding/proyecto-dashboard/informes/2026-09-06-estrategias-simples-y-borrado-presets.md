# Implementación de borrado de estrategias guardadas y estrategias "Simple" (Fase 2)

**Fecha:** 2026-09-06. **Estado: ✅ IMPLEMENTADO, TESTEADO Y EN PRODUCCIÓN (PM2)** en la rama `main` del repositorio `Z:\IA\02_Proyectos\MetaTrader_Bots`.

## 1. Resumen ejecutivo

Se han implementado y verificado dos componentes clave del roadmap del dashboard:
1. **Borrado y gestión de configuraciones de estrategias guardadas:**
   - Anteriormente, el botón de papelera (`🗑️`) en `AgentConfigBar.tsx` se deshabilitaba si el preset activo coincidía con el prefijo `baseline-` y no había presets con prefijo `preset-`. Configuraciones previas (`forex_v1.1`, `forex_v1.2`, `forex_v1.2.1`) tenían prefijo `baseline-` y no podían ser borradas ni gestionadas por el usuario.
   - Se refactorizó la lógica en backend (`agentConfigsStore.ts`, `routes/agentConfigs.ts`) y frontend (`AgentConfigBar.tsx`, `store.ts`) incorporando la propiedad `isProtected: boolean`. Ahora solo las plantillas base oficiales del sistema están protegidas contra borrado y sobreescritura accidental. Cualquier configuración personalizada o variante guardada puede eliminarse directamente o a través del modal de gestión.
2. **Estrategias "Simple" para los 3 activos (FOREX, ACCIONES, CRIPTOMONEDAS):**
   - Siguiendo la especificación `wiki-Traiding/proyecto-dashboard/specs/2026-09-06-estrategias-simples-y-noticias-design.md`, se definieron 3 nuevas configuraciones oficiales en `server/src/config/baselinePresets.ts`: `FOREX (Simple)`, `ACCIONES (Simple)` y `CRIPTOMONEDAS (Simple)`.
   - Cada configuración tiene exactamente 3 agentes encadenados **estrictamente en serie** (cero paralelismo: nivel 0 $\rightarrow$ nivel 1 $\rightarrow$ nivel 2, 1 agente por nivel).
   - Todos los agentes usan el modelo `omniroute:auto/best-coding`.
   - Se conectó el sistema de noticias (Fase 1B) en `realExecutor.ts` para suministrar titulares recientes a los analistas simples cuando disponen de la capacidad `verified_news`.

---

## 2. Detalle de cambios implementados

### 2.1. Borrado y gestión de configuraciones guardadas
- **`server/src/types.ts` & `trading-agents-dashboard/src/types/agent.ts`**:
  - Añadido campo opcional `isProtected?: boolean` a la interfaz `AgentConfigPreset`.
- **`server/src/store/agentConfigsStore.ts`**:
  - Función `isProtectedPreset(id: string)`: verifica si un ID pertenece a `BASELINE_PRESETS` oficiales.
  - En `loadAgentConfigsState()`: asigna dinámicamente `preset.isProtected = isProtectedPreset(preset.id)` a cada configuración cargada. Se eliminó la forzada descontinuación de presets guardados no presentes en `BASELINE_PRESETS`.
  - En `overwritePreset(id, agents)`: impide sobreescribir únicamente si `isProtectedPreset(id)` es verdadero.
  - En `deletePreset(id)`: si `isProtectedPreset(id)` es verdadero, rechaza el borrado (`return false`). Si es un preset guardado no protegido, lo elimina de `state.presets` y reasigna `state.activePresetId` a la primera plantilla base disponible si el preset borrado estaba activo.
- **`server/src/routes/agentConfigs.ts`**:
  - En `DELETE /api/agent-configs/:id`: devuelve error HTTP 400 descriptivo (`"No se puede eliminar una plantilla base oficial o la configuración no existe."`) si se intenta borrar un preset protegido.
- **`trading-agents-dashboard/src/lib/store.ts`**:
  - Acción `deletePreset(id)`: tras llamar a la API, consulta `listAgentConfigs()`, actualiza el estado global de `presets` y `activePresetId`, y recarga los agentes del nuevo preset activo vía `loadPreset()`.
- **`trading-agents-dashboard/src/components/AgentConfigBar.tsx`**:
  - El botón de papelera (`🗑️`) ya no se deshabilita por el tipo de preset; únicamente se deshabilita durante el análisis en curso (`isDeleteDisabled = isAnalysing`).
  - Si el preset activo es una configuración guardada no protegida: pulsar `🗑️` solicita confirmación con nombre y detalles del activo y elimina el preset.
  - Si el preset activo es una plantilla base protegida o no hay ninguno activo: pulsar `🗑️` abre el modal *"GESTIONAR / BORRAR CONFIGURACIONES"*, donde se listan todas las configuraciones guardadas con su fecha, número de agentes y botón de borrado individual.
  - El botón *"💾 Guardar"* se muestra para cualquier preset con `!isProtected` (permitiendo sobrescribir configuraciones personalizadas).

### 2.2. Configuraciones "Simple" (Fase 2)
Se añadieron en `server/src/config/baselinePresets.ts`:

1. **`FOREX (Simple)`** (`baseline-forex-forex-simple-v1` · EUR/USD H1):
   - Nivel 0: `fx-simple-analyst` (*Analista FX Simple*, `outputType: 'analysis'`, `dependsOn: []`). Analiza estructura técnica, soportes/resistencias, medias móviles, ATR y sesión temporal.
   - Nivel 1: `fx-simple-strategy` (*Estrategia FX Simple*, `outputType: 'strategy'`, `dependsOn: ['fx-simple-analyst']`). Diseña hipótesis mecánica con R:R $\ge$ 1.60 y riesgo $\le$ 1.0%.
   - Nivel 2: `fx-simple-judge` (*Juez y Validador FX Simple*, `outputType: 'verdict'`, `dependsOn: ['fx-simple-strategy']`). Audita el cumplimiento de ATR, SL y emite veredicto GO/AJUSTAR/NO_OPERAR.
2. **`ACCIONES (Simple)`** (`baseline-acciones-stocks-simple-v1` · TSLA H1):
   - Nivel 0: `stock-simple-analyst` (*Analista Acciones Simple*, `outputType: 'analysis'`, `dependsOn: []`). Analiza precio, medias, volumen relativo y riesgo de gap.
   - Nivel 1: `stock-simple-strategy` (*Estrategia Acciones Simple*, `outputType: 'strategy'`, `dependsOn: ['stock-simple-analyst']`). Considera gaps de apertura y horario bursátil.
   - Nivel 2: `stock-simple-judge` (*Juez y Validador Acciones Simple*, `outputType: 'verdict'`, `dependsOn: ['stock-simple-strategy']`). Audita riesgo y emite veredicto para backtest.
3. **`CRIPTOMONEDAS (Simple)`** (`baseline-criptomonedas-crypto-simple-v1` · BTC/USD H1):
   - Nivel 0: `crypto-simple-analyst` (*Analista Cripto Simple*, `outputType: 'analysis'`, `dependsOn: []`). Analiza estructura 24/7, volumen y momentum sin supuestos de cierre de bolsa.
   - Nivel 1: `crypto-simple-strategy` (*Estrategia Cripto Simple*, `outputType: 'strategy'`, `dependsOn: ['crypto-simple-analyst']`). Hipótesis adaptada a volatilidad cripto.
   - Nivel 2: `crypto-simple-judge` (*Juez y Validador Cripto Simple*, `outputType: 'verdict'`, `dependsOn: ['crypto-simple-strategy']`). Audita SL vs ATR y emite veredicto.

- **Conexión de noticias**:
  - `server/src/store/newsStore.ts`: función `listAllRecentNews(limit?: number)` que recopila y ordena artículos de todas las fuentes activas.
  - `server/src/engine/realExecutor.ts`: si un agente tiene `verified_news` en sus inputs, consulta hasta 5 titulares recientes y los añade a `buildUserPrompt` como contexto verificado.

---

## 3. Verificación y Resultados

| Prueba | Entorno | Resultado |
| :--- | :--- | :--- |
| `npx vitest run` | Backend (`server/`) | **22 suites, 96 tests PASSED (100%)**. Incluye verificación de topología serial estricta (`buildLevels`), validación de contratos, y protección/borrado de presets. |
| `npm run typecheck` | Backend (`server/`) | **0 errores** (`tsc --noEmit && tsc -p tsconfig.scripts.json`). |
| `npx tsc -b --noEmit` | Frontend (`trading-agents-dashboard/`) | **0 errores**. |
| `npm run build` | Frontend (`trading-agents-dashboard/`) | **PASS**. Bundle de producción generado en `dist/`. |
| Smoke test HTTP en vivo | Servidor en `http://localhost:5175` | - `GET /api/agent-configs` devuelve los 9 presets correctamente etiquetados (`isProtected` true para baselines oficiales, false para custom/legacy).<br>- `DELETE` en baseline protegida rechaza con HTTP 400.<br>- `DELETE` en preset custom devuelve HTTP 200 `{ ok: true }`.<br>- `POST /load` carga los 3 agentes seriales esperados en los 3 mercados. |
| Servicio PM2 | Proceso `trading-dashboard` (ID 1) | Reiniciado y en estado `online` (PID 27032) en `http://localhost:5175`. |

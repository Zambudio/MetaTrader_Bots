# Log colapsable + configuraciones nombradas de la cadena de agentes — diseño

**Fecha:** 2026-08-19
**Proyecto:** `trading-agents-dashboard` (dentro de `MetaTrader_Bots`)
**Estado:** aprobado, pendiente de plan de implementación

## Contexto

Dos peticiones independientes de Pedro sobre el dashboard de agentes:

1. El panel de registro de agentes (`AgentLogsPanel.tsx`) no tiene ningún
   collapse hoy — cada bloque de agente se renderiza siempre expandido. Con
   6 agentes y salidas largas, el panel se vuelve muy largo.
2. Hoy solo existe **una** lista global de agentes
   (`server/src/data/agents.json`), sin campo de activo/inactivo y sin
   concepto de "preset" en ningún sitio del código (confirmado por grep).
   Pedro quiere poder guardar distintas configuraciones de la cadena con
   nombre, elegirlas desde un desplegable, y poder desactivar agentes
   concretos dentro de una configuración para que no se ejecuten.

Se tratan como dos features separadas: la primera es un cambio acotado a un
único componente; la segunda toca modelo de datos, API y varios componentes
de frontend, así que sigue el flujo completo de spec → plan.

## Decisiones de producto (confirmadas con el usuario)

1. **Dependientes de un agente desactivado**: se saltan también en la
   ejecución, aunque estén marcados como activos (evita ejecutar agentes con
   input incompleto).
2. **Alcance de cada configuración guardada**: copia completa del roster de
   agentes (prompts, modelo, `dependsOn`, `enabled`...), no solo qué IDs
   están activos sobre una lista compartida. Configuraciones distintas
   pueden tener agentes completamente distintos.
3. **Flujo de guardado**: "Guardar" sobrescribe la configuración cargada sin
   pedir nombre (si hay una activa); "Guardar como…" siempre pide nombre y
   crea una configuración nueva sin tocar la original (patrón tipo
   editor de texto).
4. **Nivel de collapse del log**: colapsable por agente (clic en la
   cabecera del bloque) + botón global "Colapsar todos / Expandir todos".

## Feature 1 — Log colapsable

Cambio contenido en `src/components/AgentLogsPanel.tsx`:

- Estado local nuevo `collapsedIds: Set<string>` (vacío por defecto = todo
  expandido, igual que el comportamiento actual).
- La cabecera de cada bloque de agente (el `div` que hoy va de la línea 218
  a 251) se vuelve clicable: alterna la pertenencia de `agent.id` a
  `collapsedIds`. Se añade un icono de flecha (▾/▸) que refleja el estado.
- El "Agent Log Body" (líneas 284-405) solo se renderiza si
  `!collapsedIds.has(agent.id)`.
- Botón nuevo "Colapsar todos" / "Expandir todos" (el texto cambia según si
  todos los agentes del run están colapsados) junto al botón existente
  "📋 Copiar todo". Opera sobre `resultsWithAgents` completo (no solo
  `filteredItems`), para que el estado sea consistente al cambiar de pestaña
  de filtro.
- Sin cambios de store, API, tipos ni backend — estado puramente local de
  UI, igual que `filter`/`copied`, que ya son locales a este componente. No
  se persiste entre recargas de página ni entre runs.

## Feature 2 — Configuraciones nombradas de la cadena de agentes

### Modelo de datos

`Agent` gana un campo opcional:

```ts
enabled?: boolean; // undefined se trata como true (agentes existentes no migran el fichero)
```

en `trading-agents-dashboard/src/types/agent.ts` y
`trading-agents-dashboard/server/src/types.ts`. No hace falta migración de
`agents.json`: cualquier lectura que compruebe si un agente está activo usa
`agent.enabled !== false`, así que los registros existentes sin el campo
siguen funcionando sin cambios.

Nueva entidad, solo backend (no necesita tipo de dominio propio en
frontend más allá de un `interface` liviano en `types/agent.ts`):

```ts
interface AgentConfigPreset {
  id: string;
  name: string;
  agents: Agent[]; // copia completa, no referencia
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

### Persistencia (backend)

- `server/src/data/agentConfigs.json` — `{ presets: AgentConfigPreset[], activePresetId: string | null }`,
  un único objeto (no un array suelto, para poder guardar `activePresetId`
  junto a los presets sin un segundo fichero). Leído/escrito por nuevo
  `server/src/store/agentConfigsStore.ts`, usando `readJson`/`writeJson` de
  `jsonStore.ts` (mismo patrón atómico que ya usan `agentsStore.ts` y
  `runsStore.ts`; fallback `{ presets: [], activePresetId: null }` si el
  fichero no existe todavía).
- `server/src/paths.ts` gana `AGENT_CONFIGS_FILE = path.join(DATA_DIR, 'agentConfigs.json')`.
- `agents.json` (`AGENTS_FILE`) sigue siendo el **roster en vivo** sin
  ningún cambio de formato ni de las funciones `listAgents`/`saveAgents`
  existentes — todo lo que ya lee `listAgents()` (rutas de runs, el propio
  orquestador) sigue funcionando exactamente igual. `activePresetId` es
  solo un puntero de conveniencia para que la UI sepa qué entrada del
  desplegable mostrar como seleccionada; no es la fuente de verdad de qué
  agentes se ejecutan.

### Ejecución con agentes desactivados

Nueva función pura en `server/src/engine/orchestrator.ts`:

```ts
export function filterEnabledAgents(agents: Agent[]): Agent[]
```

Algoritmo: quita los agentes con `enabled === false`; luego, con el mismo
estilo BFS que ya usa `buildLevels`/`ancestorChain` para recorrer
`dependsOn`, quita también cualquier agente que dependa transitivamente
(directa o indirectamente) de un agente ya quitado. Se aplica **antes** de
construir `run.results` en `server/src/routes/runs.ts` (rutas `POST /` y
`POST /:id/resume`, sustituyendo el uso directo de `listAgents()` por
`filterEnabledAgents(await listAgents())` en ambos sitios) — así
`executeRun`/`resumeRun` en `orchestrator.ts` no cambian nada: solo ven el
roster ya filtrado, tal como ya ocurre hoy.

Efecto: los agentes desactivados (y sus dependientes huérfanos) nunca
aparecen en `run.results`, así que `AgentLogsPanel` y el resto de la UI de
ejecución no los muestra — pero sí siguen apareciendo en la cadena visual
(`Dashboard.tsx` lee `agents` completo del store), para que Pedro pueda ver
que existen y están desactivados, o reactivarlos.

Se añade el mismo `filterEnabledAgents` (duplicado, siguiendo el patrón ya
existente de `buildLevels`/`wouldCreateCycle` duplicados entre
`orchestrator.ts` y `src/lib/agentGraph.ts`) al frontend, para poder marcar
en la tarjeta los agentes "activos pero huérfanos" sin llamar al servidor.

### API nueva

`server/src/routes/agentConfigs.ts`, montada en `/api/agent-configs`
(registrada en `server/src/index.ts` junto al resto de routers):

- `GET /` → `{ presets: AgentConfigPreset[], activePresetId: string | null }`.
- `POST /` (`{ name: string }`) → toma el roster en vivo actual
  (`listAgents()`), crea un preset nuevo con ese `name`, lo añade a
  `presets`, marca `activePresetId` al nuevo id. 400 si `name` está vacío
  (tras `trim()`) o si ya existe un preset con ese nombre exacto.
- `PUT /:id` → sustituye `agents` del preset `:id` por el roster en vivo
  actual y actualiza `updatedAt`; no toca `name`. 404 si el id no existe.
  No cambia `activePresetId` (se asume que ya era el preset activo — la UI
  solo ofrece este botón cuando lo es).
- `POST /:id/load` → copia `preset.agents` al roster en vivo
  (`saveAgents(preset.agents)`) y marca `activePresetId = :id`. 404 si no
  existe. Devuelve `{ agents: Agent[], activePresetId: string }`.
- `DELETE /:id` → quita el preset de `presets`; si `activePresetId === :id`,
  lo pone a `null` (el roster en vivo no se toca). 404 si no existe.

Validaciones reutilizan el patrón ya usado en `routes/agents.ts` (checks
manuales + `res.status(400/404).json({ error })`, sin librería de schema
nueva).

### Frontend — store

`src/lib/store.ts` (Zustand) gana:

- Estado: `presets: AgentConfigPreset[]`, `activePresetId: string | null`.
- `loadInitialData` añade `api.listAgentConfigs()` al `Promise.all` ya
  existente y guarda `presets`/`activePresetId`.
- Acciones nuevas: `savePresetAs(name: string)`, `overwriteActivePreset()`,
  `loadPreset(id: string)`, `deletePreset(id: string)` — mismo patrón
  try/catch + `errorDomain` que ya usan `addAgent`/`updateAgent`/`removeAgent`.
  Se añade `'preset'` a la unión `ErrorDomain`.
- No se implementa detección de "cambios sin guardar" (diff entre roster en
  vivo y preset activo) — fuera de alcance (YAGNI). "Guardar" y "Guardar
  como…" conviven siempre; "Guardar" solo se deshabilita/oculta cuando
  `activePresetId` es `null`.
- `loadPreset`/`deletePreset` no se exponen como acción posible mientras
  `isAnalysing` es `true` (se comprueba en el componente antes de llamarlas,
  igual que ya se hace con `runWorkflow`).

`src/lib/api.ts` gana: `listAgentConfigs`, `createAgentConfig(name)`,
`updateAgentConfig(id)`, `loadAgentConfig(id)`, `deleteAgentConfig(id)` —
mismo `request<T>` helper ya existente.

### Frontend — UI

- Nuevo componente `src/components/AgentConfigBar.tsx`, insertado en
  `Dashboard.tsx` en la fila de cabecera "Cadena de agentes" (línea
  190-193 actual), a la derecha del título: `<select>` de presets (opción
  placeholder "— sin guardar —" cuando `activePresetId` es `null`), botón
  "💾 Guardar" (visible solo si hay preset activo), botón "Guardar como…"
  (abre un modal ligero de un solo campo de texto, mismo overlay
  `fixed inset-0 bg-void/90 backdrop-blur-sm` que ya usa
  `AgentConfigModal`), y botón de borrar (🗑️, solo si hay preset
  seleccionado en el desplegable, con `window.confirm` como ya hace
  `handleDelete` en `Dashboard.tsx`).
- `AgentCard.tsx` gana un control activar/desactivar junto al botón
  "Configurar" (pill button, mismo lenguaje visual que el resto de la
  tarjeta) que llama a `updateAgent(agent.id, { enabled: !agent.enabled })`.
  Cuando `agent.enabled === false`, la tarjeta entera baja opacidad
  (`opacity-50`) y muestra una etiqueta "Inactivo". Cuando está activa pero
  es huérfana por `filterEnabledAgents` (depende de un agente inactivo),
  muestra una etiqueta distinta "Omitido: depende de un agente inactivo" —
  informativa, no bloquea el toggle propio.
- El desplegable y el botón de borrar de `AgentConfigBar` se deshabilitan
  mientras `isAnalysing` es `true`.

## Fuera de alcance (YAGNI)

- Detección de "cambios sin guardar" (diff) entre el roster en vivo y el
  preset cargado.
- Renombrar un preset ya creado (para renombrar: guardar como uno nuevo y
  borrar el viejo).
- Exportar/importar presets como fichero.
- Cualquier validación de que una configuración guardada sea "ejecutable"
  (p. ej. que tenga como mínimo un agente `outputType: 'verdict'`) — ya se
  puede guardar hoy una lista de agentes sin veredicto y simplemente el run
  termina sin veredicto; mismo comportamiento se hereda para presets.

## Testing

- Tests unitarios (vitest) para `filterEnabledAgents` en
  `server/test/orchestratorGraph.test.ts`, siguiendo el estilo ya existente
  ahí (casos: agente desactivado se quita, dependiente directo se quita,
  dependiente transitivo se quita, agente independiente no se ve afectado).
- El resto (rutas nuevas de `agentConfigs.ts`, `AgentConfigBar.tsx`,
  toggle en `AgentCard.tsx`, collapse en `AgentLogsPanel.tsx`) se valida
  manualmente arrancando el dev server — no hay tests de rutas para
  `agents.ts` tampoco, así que se mantiene la misma profundidad de
  cobertura ya existente en el repo para este tipo de código.
- Verificación manual mínima antes de dar la feature por terminada: crear
  dos presets distintos con distinta combinación de agentes
  activos/inactivos, alternar entre ellos por el desplegable, confirmar que
  "Guardar" sobrescribe el activo sin pedir nombre y "Guardar como…" crea
  uno nuevo, lanzar un análisis con al menos un agente desactivado y
  confirmar que ni él ni sus dependientes aparecen en `run.results` ni en
  el log.

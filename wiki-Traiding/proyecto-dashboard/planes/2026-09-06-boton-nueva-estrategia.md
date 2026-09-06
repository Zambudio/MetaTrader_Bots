# Botón "Crear nueva estrategia" — Plan de implementación

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`) para seguimiento.

**Objetivo:** Añadir un botón que desconecte las relaciones (`dependsOn`/`optionalDependsOn`) de los agentes cargados en el lienzo de edición, sin persistir nada, para poder rediseñar una cadena desde cero reutilizando agentes existentes.

**Arquitectura:** Cambio puramente de frontend. Una acción nueva en el store de Zustand (`trading-agents-dashboard/src/lib/store.ts`) que muta el estado local `agents` en memoria (sin llamar al backend), y un botón nuevo en la barra de configuración (`AgentConfigBar.tsx`) que la invoca tras confirmación del usuario.

**Tech Stack:** React 19, TypeScript, Zustand (store en `src/lib/store.ts`), Tailwind (clases utilitarias inline, sin CSS-in-JS).

**Spec:** `wiki-Traiding/proyecto-dashboard/specs/2026-09-06-estrategias-simples-y-noticias-design.md` (sección "Fase 1A")

## Restricciones globales

- No se llama a ningún endpoint del backend desde esta acción — es edición de estado local únicamente.
- No existe framework de test para el frontend en este repo (`trading-agents-dashboard/package.json` no tiene Vitest/Testing Library, no hay ningún `.test.tsx`). La verificación de cada tarea es manual, con el servidor de desarrollo (`npm run dev` desde `Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard`, **nunca** desde la ruta UNC `\\Zambu-nas\...` — cmd.exe/npm la rechazan). No añadas un framework de test como efecto colateral de esta tarea; es una iniciativa aparte si se decide alguna vez.
- Sigue el estilo de los botones vecinos ya existentes en `AgentConfigBar.tsx` (mismas clases Tailwind, mismo patrón `disabled={isAnalysing}`).
- Los tipos exactos: `Agent.dependsOn: string[]` (nunca `undefined`), `Agent.optionalDependsOn?: string[]` (opcional) — ver `trading-agents-dashboard/src/types/agent.ts:15`.

---

### Task 1: Acción `detachAgentRelations` en el store

**Files:**
- Modify: `trading-agents-dashboard/src/lib/store.ts:62` (bloque de interfaz `AgentStore`)
- Modify: `trading-agents-dashboard/src/lib/store.ts:158` (bloque de implementación, justo después de `updateAgent`)

**Interfaces:**
- Consumes: `state.agents: Agent[]` (ya existe en el store).
- Produces: `detachAgentRelations: () => void` — nueva acción síncrona (no `Promise`, no llama a `api`).

- [ ] **Step 1: Añadir la firma a la interfaz `AgentStore`**

En `trading-agents-dashboard/src/lib/store.ts`, localiza este bloque (línea ~60-64):

```ts
  loadInitialData: () => Promise<void>;
  addAgent: (agent: Partial<Agent>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  savePresetAs: (name: string) => Promise<void>;
```

Sustitúyelo por:

```ts
  loadInitialData: () => Promise<void>;
  addAgent: (agent: Partial<Agent>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  /** Limpia dependsOn/optionalDependsOn de TODOS los agentes cargados, solo en memoria (no llama
   * al backend, no persiste). Para empezar a rediseñar una cadena desde cero reutilizando agentes
   * existentes. Ver wiki-Traiding/proyecto-dashboard/specs/2026-09-06-estrategias-simples-y-noticias-design.md */
  detachAgentRelations: () => void;
  savePresetAs: (name: string) => Promise<void>;
```

- [ ] **Step 2: Añadir la implementación**

En el mismo fichero, localiza el final de la acción `updateAgent` (línea ~143-158):

```ts
  updateAgent: async (id, updates) => {
    try {
      const updated = await api.updateAgent(id, updates);
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? updated : a)),
        error: null,
        errorDomain: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al actualizar agente',
        errorDomain: 'agent',
      });
      throw err;
    }
  },

  removeAgent: async (id) => {
```

Inserta la nueva acción entre `updateAgent` y `removeAgent`:

```ts
  updateAgent: async (id, updates) => {
    try {
      const updated = await api.updateAgent(id, updates);
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? updated : a)),
        error: null,
        errorDomain: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al actualizar agente',
        errorDomain: 'agent',
      });
      throw err;
    }
  },

  detachAgentRelations: () => {
    set((state) => ({
      agents: state.agents.map((a) => ({ ...a, dependsOn: [], optionalDependsOn: [] })),
    }));
  },

  removeAgent: async (id) => {
```

- [ ] **Step 3: Verificar que compila**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard && npx tsc -b --noEmit`
Expected: exit code 0, sin errores. Si hay un error de tipo en `detachAgentRelations`, revisa que `Agent` esté importado en `store.ts` (ya lo está, se usa en `addAgent`/`updateAgent`).

- [ ] **Step 4: Commit**

```bash
git add trading-agents-dashboard/src/lib/store.ts
git commit -m "feat(store): add detachAgentRelations action for canvas rewiring"
```

---

### Task 2: Botón en `AgentConfigBar.tsx`

**Files:**
- Modify: `trading-agents-dashboard/src/components/AgentConfigBar.tsx:1-11` (imports y hooks del store)
- Modify: `trading-agents-dashboard/src/components/AgentConfigBar.tsx:116-122` (justo antes del botón "Guardar como…")

**Interfaces:**
- Consumes: `detachAgentRelations` de Task 1 (`useAgentStore((state) => state.detachAgentRelations)`), `isAnalysing` (ya se lee en el componente).
- Produces: ninguna interfaz nueva — es la capa de UI final.

- [ ] **Step 1: Leer la acción del store en el componente**

En `trading-agents-dashboard/src/components/AgentConfigBar.tsx`, localiza las líneas 4-11:

```tsx
export const AgentConfigBar = () => {
  const presets = useAgentStore((state) => state.presets);
  const activePresetId = useAgentStore((state) => state.activePresetId);
  const isAnalysing = useAgentStore((state) => state.isAnalysing);
  const savePresetAs = useAgentStore((state) => state.savePresetAs);
  const overwriteActivePreset = useAgentStore((state) => state.overwriteActivePreset);
  const loadPreset = useAgentStore((state) => state.loadPreset);
  const deletePreset = useAgentStore((state) => state.deletePreset);
```

Añade la lectura de la nueva acción justo después de `loadPreset`:

```tsx
export const AgentConfigBar = () => {
  const presets = useAgentStore((state) => state.presets);
  const activePresetId = useAgentStore((state) => state.activePresetId);
  const isAnalysing = useAgentStore((state) => state.isAnalysing);
  const savePresetAs = useAgentStore((state) => state.savePresetAs);
  const overwriteActivePreset = useAgentStore((state) => state.overwriteActivePreset);
  const loadPreset = useAgentStore((state) => state.loadPreset);
  const detachAgentRelations = useAgentStore((state) => state.detachAgentRelations);
  const deletePreset = useAgentStore((state) => state.deletePreset);
```

- [ ] **Step 2: Añadir el handler**

En el mismo fichero, localiza el handler `handleLoad` (línea ~24-27):

```tsx
  const handleLoad = (id: string) => {
    if (!id || id === activePresetId) return;
    loadPreset(id);
  };
```

Añade justo debajo:

```tsx
  const handleLoad = (id: string) => {
    if (!id || id === activePresetId) return;
    loadPreset(id);
  };

  const handleDetach = () => {
    if (
      window.confirm(
        'Esto desconecta las relaciones entre los agentes que ves ahora mismo (solo en esta edición, nada se guarda todavía). Puedes desactivar agentes, añadir nuevos y reconectar a tu gusto. Si no guardas, "Restaurar" recupera la configuración original tal cual. ¿Continuar?'
      )
    ) {
      detachAgentRelations();
    }
  };
```

- [ ] **Step 3: Añadir el botón**

En el mismo fichero, localiza el botón "Guardar como…" (línea ~116-122):

```tsx
      <button
        onClick={() => setShowSaveAs(true)}
        disabled={isAnalysing}
        className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
      >
        Guardar como…
      </button>
```

Inserta el botón nuevo justo antes:

```tsx
      <button
        onClick={handleDetach}
        disabled={isAnalysing || agents.length === 0}
        title="Desconecta las relaciones de los agentes actuales para rediseñar la cadena desde cero, sin guardar nada todavía"
        className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
      >
        🧩 Crear nueva estrategia
      </button>

      <button
        onClick={() => setShowSaveAs(true)}
        disabled={isAnalysing}
        className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
      >
        Guardar como…
      </button>
```

**Nota:** este botón usa `agents.length` para deshabilitarse si no hay agentes cargados, pero `agents` no está leído del store en este componente todavía. Añádelo junto a los demás `useAgentStore` del Step 1: `const agents = useAgentStore((state) => state.agents);`.

- [ ] **Step 4: Verificar que compila**

Run: `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard && npx tsc -b --noEmit`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add trading-agents-dashboard/src/components/AgentConfigBar.tsx
git commit -m "feat(ui): add 'Crear nueva estrategia' button to detach agent relations"
```

---

### Task 3: Verificación manual end-to-end

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Arrancar el dashboard en desarrollo**

```bash
cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard
npm run dev
```

Espera a que confirme que Vite y el servidor backend están escuchando (dos procesos, `client` y `server`, ver salida de `concurrently`).

- [ ] **Step 2: Verificar el comportamiento**

1. Abre el dashboard en el navegador (URL que muestre la salida de `npm run dev`, normalmente `http://localhost:5173` para Vite en desarrollo).
2. Carga la configuración `FOREX · forex_v1 · EUR/USD` desde el selector.
3. Confirma visualmente que hay líneas de conexión entre los agentes en `AgentConnections`.
4. Pulsa "🧩 Crear nueva estrategia". Debe aparecer el diálogo de confirmación del navegador con el texto definido en el Step 2 de la Task 2.
5. Acepta. Verifica que **desaparecen todas las líneas de conexión** pero **los 8 agentes de FOREX siguen presentes** (mismos nombres/tarjetas).
6. Pulsa "↺ Restaurar". Verifica que las líneas de conexión **vuelven a aparecer exactamente como antes** (la cadena original de `forex_v1` intacta).
7. Repite los pasos 4-5, y esta vez, en vez de restaurar, desactiva uno de los agentes (botón "Desactivar" de su tarjeta) y pulsa "Guardar como…" con un nombre de prueba (p. ej. "Test desconexión"). Verifica que se guarda sin error.
8. Recarga la página, selecciona la configuración recién guardada desde el desplegable, y confirma que el agente que desactivaste sigue desactivado y que no hay relaciones entre los agentes (el guardado capturó el estado desconectado correctamente).
9. Borra la configuración de prueba "Test desconexión" (botón 🗑️) para no dejar basura en el store persistido.

- [ ] **Step 3: Parar el servidor de desarrollo**

`Ctrl+C` en la terminal donde corre `npm run dev`. **No** toques el proceso de producción gestionado por pm2 (`trading-dashboard`) — es un proceso completamente distinto, en otro puerto.

---

## Self-review de este plan

- Cobertura del spec: Task 1 cubre "Cambios necesarios → store.ts" de la spec; Task 2 cubre "Cambios necesarios → AgentConfigBar.tsx"; Task 3 cubre la sección "Testing" de la spec (prueba manual descrita explícitamente allí). No queda ningún punto de la sección "Fase 1A" del spec sin tarea.
- Sin placeholders: cada step tiene código literal o instrucciones ejecutables completas.
- Consistencia de tipos: `detachAgentRelations: () => void` en la interfaz (Task 1 Step 1) coincide exactamente con la firma usada en la implementación (Task 1 Step 2) y con la lectura del store en el componente (Task 2 Step 1).

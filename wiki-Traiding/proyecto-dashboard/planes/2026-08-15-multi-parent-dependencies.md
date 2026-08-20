# Dependencias de varios padres por agente — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un agente espere respuesta de varios agentes a la vez (`dependsOn: string | null` → `dependsOn: string[]`), reflejado en el motor de orquestación, la API, el modal de configuración, las flechas de relación y el arrastrar-y-soltar.

**Architecture:** `dependsOn` pasa de un único id a un array de ids en los tipos compartidos (frontend y backend). El motor de niveles pasa de un BFS de un solo padre a un ordenamiento topológico de Kahn (nivel = 1 + máximo nivel de los padres); la detección de ciclos pasa de recorrer una cadena lineal a un BFS sobre todas las ramas de padres. El frontend extrae esa lógica compartida (`buildLevels`, `wouldCreateCycle`) a un módulo nuevo (`src/lib/agentGraph.ts`) para que tanto `Dashboard.tsx` como el nuevo selector de casillas de `AgentConfigModal.tsx` la reutilicen sin duplicar código.

**Tech Stack:** TypeScript, Express (backend), React 19 + Zustand (frontend), `tsx` como runner de TypeScript del backend en desarrollo.

**Spec:** [`../specs/2026-08-15-multi-parent-dependencies-design.md`](../specs/2026-08-15-multi-parent-dependencies-design.md)

## Global Constraints

- `dependsOn` es siempre `string[]` (nunca `null`); `[]` significa "agente raíz".
- Arrastrar tarjeta A sobre B **añade** B a `A.dependsOn` sin tocar lo que ya tenía; si B ya estaba, no se hace ninguna llamada de red.
- Soltar una tarjeta en espacio vacío **vacía toda** la lista (`dependsOn: []`).
- El `PUT /agents/:id` sigue siendo reemplazo total de la lista quien la envía (cliente calcula la lista completa deseada).
- No se introduce ningún framework de test nuevo (el proyecto no tiene uno hoy); la verificación de la lógica pura de backend se hace con scripts desechables ejecutados vía `npx tsx`, y la verificación end-to-end con llamadas directas a la API desde el navegador (no con el simulador de arrastre, que no dispara eventos nativos de Drag & Drop).

---

### Task 1: Modelo de datos y migración (backend)

**Files:**
- Modify: `trading-agents-dashboard/server/src/types.ts`
- Modify: `trading-agents-dashboard/server/src/store/agentsStore.ts`

**Interfaces:**
- Produces: `Agent.dependsOn: string[]` (tipo compartido); `normalizeDependsOn(raw: string | string[] | null | undefined): string[]` (exportada desde `agentsStore.ts`, usada solo internamente por ahora pero exportada para poder verificarla).

- [ ] **Step 1: Escribir el script de verificación (fallará contra el código actual)**

Crear `trading-agents-dashboard/server/verify-normalize.ts` (fichero temporal, se borra al final de la tarea):

```ts
import { normalizeDependsOn } from './src/store/agentsStore.js';

const cases: [unknown, string[]][] = [
  ['agente-a', ['agente-a']],
  [null, []],
  [undefined, []],
  [['agente-a', 'agente-b'], ['agente-a', 'agente-b']],
  [[], []],
];

let failed = false;
for (const [input, expected] of cases) {
  const actual = normalizeDependsOn(input as never);
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(input), '->', JSON.stringify(actual));
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run (desde `trading-agents-dashboard/server`): `npx tsx verify-normalize.ts`
Expected: error de import — `normalizeDependsOn` no existe todavía en `agentsStore.ts`.

- [ ] **Step 3: Cambiar el tipo compartido**

En `server/src/types.ts`, sustituir:

```ts
  dependsOn: string | null;
```

por:

```ts
  dependsOn: string[];
```

- [ ] **Step 4: Añadir la normalización y actualizar los datos por defecto**

Reescribir `server/src/store/agentsStore.ts` completo:

```ts
import { readJson, writeJson } from './jsonStore.js';
import { AGENTS_FILE } from '../paths.js';
import type { Agent } from '../types.js';

interface RawAgent extends Omit<Agent, 'dependsOn'> {
  dependsOn?: string | string[] | null;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agente-tecnico',
    name: 'Analista Técnico',
    role: 'Analista Técnico',
    systemPrompt:
      'Analiza el par indicado usando indicadores técnicos (medias móviles, RSI, MACD, estructura de mercado, soportes y resistencias) y resume la tendencia y el momentum actuales.',
    dependsOn: [],
    outputType: 'text',
  },
  {
    id: 'agente-fundamental',
    name: 'Analista Fundamental',
    role: 'Analista Fundamental',
    systemPrompt:
      'Evalúa el contexto macroeconómico y de noticias relevante para el par indicado, complementando (sin sustituir) el análisis técnico recibido.',
    dependsOn: ['agente-tecnico'],
    outputType: 'text',
  },
  {
    id: 'agente-riesgo',
    name: 'Gestor de Riesgos',
    role: 'Gestor de Riesgos',
    systemPrompt:
      'A partir del análisis técnico y fundamental recibido, propone una estrategia concreta: indicadores clave, punto de entrada, stop loss, take profit y, si procede, un plan de entradas escalonadas.',
    dependsOn: ['agente-fundamental'],
    outputType: 'strategy',
  },
];

export function normalizeDependsOn(raw: RawAgent['dependsOn']): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return [raw];
  return [];
}

export async function listAgents(): Promise<Agent[]> {
  const raw = await readJson<RawAgent[]>(AGENTS_FILE, DEFAULT_AGENTS);
  const agents = raw.map((agent) => ({ ...agent, dependsOn: normalizeDependsOn(agent.dependsOn) }));
  const needsMigration = raw.some((agent) => !Array.isArray(agent.dependsOn));
  if (needsMigration) await saveAgents(agents);
  return agents;
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  await writeJson(AGENTS_FILE, agents);
}
```

- [ ] **Step 5: Ejecutar el script de verificación y comprobar que pasa**

Run: `npx tsx verify-normalize.ts`
Expected: 5 líneas `PASS`, exit code 0.

- [ ] **Step 6: Borrar el script temporal**

Run: `rm trading-agents-dashboard/server/verify-normalize.ts` (o `Remove-Item` en PowerShell).

- [ ] **Step 7: Commit**

```bash
git add trading-agents-dashboard/server/src/types.ts trading-agents-dashboard/server/src/store/agentsStore.ts
git commit -m "feat(server): model dependsOn as string[] with migration from old shape"
```

---

### Task 2: Motor de orquestación — niveles, ciclos, antecesores (backend)

**Files:**
- Modify: `trading-agents-dashboard/server/src/engine/orchestrator.ts`

**Interfaces:**
- Consumes: `Agent` (con `dependsOn: string[]`, de Task 1).
- Produces: `detectCycle(agents: Agent[], agentId: string, candidateParentId: string): boolean`; `buildLevels(agents: Agent[]): Agent[][]`; `ancestorChain(agents: Agent[], agentId: string): Agent[]` (mismo nombre y firma que hoy, pero devuelve el conjunto de antecesores en orden topológico en vez de una única cadena). `executeRun` sin cambios de firma.

- [ ] **Step 1: Escribir el script de verificación (fallará contra el código actual)**

Crear `trading-agents-dashboard/server/verify-orchestrator.ts`:

```ts
import type { Agent } from './src/types.js';
import { detectCycle, buildLevels, ancestorChain } from './src/engine/orchestrator.js';

function agent(id: string, dependsOn: string[]): Agent {
  return { id, name: id, role: id, systemPrompt: '', dependsOn, outputType: 'text' };
}

// R -> T -> {F, G}; G también depende de F (fan-in de dos padres a distinto nivel)
const R = agent('R', []);
const T = agent('T', ['R']);
const F = agent('F', ['T']);
const G = agent('G', ['T', 'F']);
const agents = [R, T, F, G];

let failed = false;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? 'PASS' : 'FAIL', label, '->', JSON.stringify(actual));
  if (!ok) failed = true;
}

// Niveles: G depende de T (nivel 1) y F (nivel 2) -> G debe quedar en el nivel 3
const levels = buildLevels(agents).map((level) => level.map((a) => a.id));
check('levels', levels, [['R'], ['T'], ['F'], ['G']]);

// R ya es antecesor de G (via T y via F) -> R dependiendo de G crearía ciclo
check('cycle R<-G (ancestor via two paths)', detectCycle(agents, 'R', 'G'), true);
// F depende de T; T depender de F crearía ciclo
check('cycle T<-F', detectCycle(agents, 'T', 'F'), true);
// F depende de T (no al revés); T depender de R no crea ciclo (R no depende de T)
check('no cycle T<-R', detectCycle(agents, 'T', 'R'), false);
// Diamante sin ciclo real: G depende de T y F, ninguno de los dos depende de G
check('no cycle diamond G<-T (already a parent, revisit must not false-positive)', detectCycle(agents, 'G', 'T'), false);

// Conjunto de antecesores de G: R, T, F (sin duplicar R aunque se alcance por dos caminos), orden topológico
const ancestors = ancestorChain(agents, 'G').map((a) => a.id);
check('ancestorChain(G)', ancestors, ['R', 'T', 'F']);

process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run (desde `trading-agents-dashboard/server`): `npx tsx verify-orchestrator.ts`
Expected: falla en `levels` (el `buildLevels` actual no soporta más de un padre) y probablemente lanza o falla en las comprobaciones de ciclo con más de un padre.

- [ ] **Step 3: Reescribir `orchestrator.ts`**

Sustituir el contenido completo de `server/src/engine/orchestrator.ts`:

```ts
import type { Agent, Run } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';

export function detectCycle(agents: Agent[], agentId: string, candidateParentId: string): boolean {
  if (candidateParentId === agentId) return true;
  const byId = new Map(agents.map((a) => [a.id, a]));
  const visited = new Set<string>();
  const queue: string[] = [candidateParentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === agentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const agent = byId.get(current);
    if (agent) queue.push(...agent.dependsOn);
  }
  return false;
}

export function buildLevels(agents: Agent[]): Agent[][] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const childrenOf = new Map<string, Agent[]>();
  const inDegree = new Map<string, number>();

  for (const agent of agents) {
    const validParents = agent.dependsOn.filter((id) => byId.has(id));
    inDegree.set(agent.id, validParents.length);
    for (const parentId of validParents) {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(agent);
    }
  }

  const levels: Agent[][] = [];
  const seen = new Set<string>();
  let currentLevel = agents.filter((agent) => inDegree.get(agent.id) === 0);

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    for (const agent of currentLevel) seen.add(agent.id);
    const nextLevel: Agent[] = [];
    for (const agent of currentLevel) {
      for (const child of childrenOf.get(agent.id) ?? []) {
        const remaining = (inDegree.get(child.id) ?? 0) - 1;
        inDegree.set(child.id, remaining);
        if (remaining === 0) nextLevel.push(child);
      }
    }
    currentLevel = nextLevel;
  }

  const orphaned = agents.filter((a) => !seen.has(a.id));
  if (orphaned.length > 0) levels.push(orphaned);

  return levels;
}

/** Conjunto de todos los antecesores (unión de todas las ramas de padres, sin duplicados), en orden topológico. */
export function ancestorChain(agents: Agent[], agentId: string): Agent[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const order = buildLevels(agents).flat();
  const orderIndex = new Map(order.map((a, i) => [a.id, i]));

  const visited = new Set<string>();
  const queue = [...(byId.get(agentId)?.dependsOn ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const agent = byId.get(current);
    if (agent) queue.push(...agent.dependsOn);
  }

  return [...visited]
    .map((id) => byId.get(id))
    .filter((a): a is Agent => a !== undefined)
    .sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
}

export async function executeRun(run: Run, agents: Agent[]): Promise<void> {
  const levels = buildLevels(agents);
  const resultsById = new Map(run.results.map((r) => [r.agentId, r]));

  for (const level of levels) {
    await Promise.all(
      level.map(async (agent) => {
        const result = resultsById.get(agent.id);
        if (!result) return;

        result.status = 'running';
        result.startedAt = new Date().toISOString();
        await saveRun(run);

        try {
          const context = ancestorChain(agents, agent.id)
            .map((ancestor) => {
              const ancestorResult = resultsById.get(ancestor.id);
              const text =
                ancestorResult?.output ?? (ancestorResult?.strategy ? JSON.stringify(ancestorResult.strategy) : '');
              return `${ancestor.name}: ${text}`;
            })
            .join('\n\n');

          const { output, strategy } = await runAgent(agent, context, run.pair, run.timeframe);
          result.output = output;
          result.strategy = strategy;
          result.status = 'done';
        } catch (err) {
          result.status = 'error';
          result.error = err instanceof Error ? err.message : 'error desconocido';
        } finally {
          result.finishedAt = new Date().toISOString();
          await saveRun(run);
        }
      })
    );
  }

  run.status = run.results.some((r) => r.status === 'error') ? 'error' : 'done';
  await saveRun(run);
}
```

- [ ] **Step 4: Ejecutar el script de verificación y comprobar que pasa**

Run: `npx tsx verify-orchestrator.ts`
Expected: 6 líneas `PASS`, exit code 0. Si `levels` falla, revisar que `buildLevels` decremente `inDegree` correctamente por cada hijo válido antes de comparar con el array esperado.

- [ ] **Step 5: Borrar el script temporal**

Run: `rm trading-agents-dashboard/server/verify-orchestrator.ts`

- [ ] **Step 6: Commit**

```bash
git add trading-agents-dashboard/server/src/engine/orchestrator.ts
git commit -m "feat(server): support multi-parent DAG in levels, cycle detection and ancestor context"
```

---

### Task 3: Rutas de la API (backend)

**Files:**
- Modify: `trading-agents-dashboard/server/src/routes/agents.ts`

**Interfaces:**
- Consumes: `detectCycle` de Task 2.
- Produces: `POST /agents` y `PUT /agents/:id` aceptan/devuelven `dependsOn: string[]`; `DELETE /agents/:id` elimina el id borrado de cualquier lista de dependencias en vez de anularla entera.

- [ ] **Step 1: Reescribir el handler `POST /`**

En `server/src/routes/agents.ts`, sustituir el bloque `agentsRouter.post('/', ...)`:

```ts
agentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const { name, role, systemPrompt, dependsOn, outputType, photo, model } = req.body ?? {};

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const dependsOnList: string[] = Array.isArray(dependsOn) ? dependsOn : [];
    for (const parentId of dependsOnList) {
      if (!agents.some((a) => a.id === parentId)) {
        res.status(400).json({ error: 'dependsOn does not reference an existing agent' });
        return;
      }
    }

    const newAgent: Agent = {
      id: nanoid(8),
      name,
      role: typeof role === 'string' && role ? role : 'Agente',
      systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : '',
      dependsOn: dependsOnList,
      outputType: outputType === 'strategy' ? 'strategy' : 'text',
      photo: typeof photo === 'string' && photo ? photo : undefined,
      model: typeof model === 'string' && model ? model : undefined,
    };

    await saveAgents([...agents, newAgent]);
    res.status(201).json(newAgent);
  })
);
```

- [ ] **Step 2: Reescribir el handler `PUT /:id`**

Sustituir el bloque `agentsRouter.put('/:id', ...)`:

```ts
agentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const index = agents.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'agent not found' });
      return;
    }

    const updates = req.body ?? {};
    if ('dependsOn' in updates) {
      const newDependsOn = updates.dependsOn;
      if (!Array.isArray(newDependsOn) || !newDependsOn.every((id) => typeof id === 'string')) {
        res.status(400).json({ error: 'dependsOn must be an array of agent ids' });
        return;
      }
      for (const parentId of newDependsOn) {
        if (parentId === req.params.id) {
          res.status(400).json({ error: 'an agent cannot depend on itself' });
          return;
        }
        if (!agents.some((a) => a.id === parentId)) {
          res.status(400).json({ error: 'dependsOn does not reference an existing agent' });
          return;
        }
        if (detectCycle(agents, req.params.id, parentId)) {
          res.status(400).json({ error: 'this dependency would create a cycle' });
          return;
        }
      }
    }

    const updated: Agent = { ...agents[index], ...updates, id: agents[index].id };
    agents[index] = updated;
    await saveAgents(agents);
    res.json(updated);
  })
);
```

- [ ] **Step 3: Reescribir el handler `DELETE /:id`**

Sustituir el bloque `agentsRouter.delete('/:id', ...)`:

```ts
agentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    const exists = agents.some((a) => a.id === req.params.id);
    if (!exists) {
      res.status(404).json({ error: 'agent not found' });
      return;
    }

    const remaining = agents
      .filter((a) => a.id !== req.params.id)
      .map((a) => ({ ...a, dependsOn: a.dependsOn.filter((id) => id !== req.params.id) }));

    await saveAgents(remaining);
    res.json({ ok: true });
  })
);
```

- [ ] **Step 4: Verificar con el servidor de desarrollo en marcha**

El servidor (`npm run dev --prefix server`, ya corriendo vía `npm run dev` en la raíz del proyecto) recarga solo al guardar (usa `tsx watch`). Confirmar que arrancó sin errores:

Run: `curl -s http://localhost:3001/api/agents` (o el puerto configurado; revisar `vite.config.ts`/`server/src/index.ts` si `3001` no responde)
Expected: JSON con los agentes actuales, cada uno con `dependsOn` como array.

- [ ] **Step 5: Commit**

```bash
git add trading-agents-dashboard/server/src/routes/agents.ts
git commit -m "feat(server): accept dependsOn as string[] in POST/PUT, prune on DELETE"
```

---

### Task 4: Tipos de frontend y módulo compartido de grafo

**Files:**
- Modify: `trading-agents-dashboard/src/types/agent.ts`
- Create: `trading-agents-dashboard/src/lib/agentGraph.ts`

**Interfaces:**
- Produces: `Agent.dependsOn: string[]`; `buildLevels(agents: Agent[]): Agent[][]`; `wouldCreateCycle(agents: Agent[], agentId: string, candidateParentId: string): boolean` — mismos algoritmos que el backend (Task 2), consumidos por Task 5 (`Dashboard.tsx`) y Task 8 (`AgentConfigModal.tsx`).

- [ ] **Step 1: Cambiar el tipo `Agent`**

En `src/types/agent.ts`, sustituir:

```ts
  dependsOn: string | null;
```

por:

```ts
  dependsOn: string[];
```

- [ ] **Step 2: Crear el módulo compartido**

Crear `trading-agents-dashboard/src/lib/agentGraph.ts`:

```ts
import type { Agent } from '../types/agent';

export function buildLevels(agents: Agent[]): Agent[][] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const childrenOf = new Map<string, Agent[]>();
  const inDegree = new Map<string, number>();

  for (const agent of agents) {
    const validParents = agent.dependsOn.filter((id) => byId.has(id));
    inDegree.set(agent.id, validParents.length);
    for (const parentId of validParents) {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(agent);
    }
  }

  const levels: Agent[][] = [];
  const seen = new Set<string>();
  let currentLevel = agents.filter((agent) => inDegree.get(agent.id) === 0);

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    for (const agent of currentLevel) seen.add(agent.id);
    const nextLevel: Agent[] = [];
    for (const agent of currentLevel) {
      for (const child of childrenOf.get(agent.id) ?? []) {
        const remaining = (inDegree.get(child.id) ?? 0) - 1;
        inDegree.set(child.id, remaining);
        if (remaining === 0) nextLevel.push(child);
      }
    }
    currentLevel = nextLevel;
  }

  const orphaned = agents.filter((agent) => !seen.has(agent.id));
  if (orphaned.length > 0) levels.push(orphaned);
  return levels;
}

/** ¿Añadir candidateParentId como padre de agentId crearía un ciclo (incluye autoreferencia)? */
export function wouldCreateCycle(agents: Agent[], agentId: string, candidateParentId: string): boolean {
  if (candidateParentId === agentId) return true;
  const byId = new Map(agents.map((a) => [a.id, a]));
  const visited = new Set<string>();
  const queue: string[] = [candidateParentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === agentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const agent = byId.get(current);
    if (agent) queue.push(...agent.dependsOn);
  }
  return false;
}
```

- [ ] **Step 3: Verificar con `tsc`**

Run (desde `trading-agents-dashboard`): `npx tsc -b --force`
Expected: errores en `Dashboard.tsx`, `AgentCard.tsx`, `AgentConfigModal.tsx`, `AgentConnections.tsx` (siguen usando `dependsOn` como string) — esperado, se resuelven en las tareas siguientes. Confirmar que el error NO aparece en `src/types/agent.ts` ni en `src/lib/agentGraph.ts` (esos dos deben compilar limpios ya).

- [ ] **Step 4: Commit**

```bash
git add trading-agents-dashboard/src/types/agent.ts trading-agents-dashboard/src/lib/agentGraph.ts
git commit -m "feat(client): model dependsOn as string[] and extract shared graph helpers"
```

---

### Task 5: `Dashboard.tsx` — niveles, ciclos y arrastrar/soltar

**Files:**
- Modify: `trading-agents-dashboard/src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `buildLevels`, `wouldCreateCycle` de `src/lib/agentGraph.ts` (Task 4).
- Produces: comportamiento de arrastre "añadir" y "vaciar todo" descrito en las Global Constraints.

- [ ] **Step 1: Importar los helpers compartidos y borrar las definiciones locales**

En `Dashboard.tsx`, añadir el import:

```ts
import { buildLevels, wouldCreateCycle } from '../lib/agentGraph';
```

Y **borrar por completo** las funciones locales `buildLevels` y `wouldCreateCycle` (las que hoy están definidas arriba de `export const Dashboard`), ya que ahora vienen del módulo compartido.

- [ ] **Step 2: Actualizar `handleCardDrop` (arrastrar añade)**

Sustituir:

```ts
  const handleCardDrop = (agentId: string) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId || sourceId === agentId) return;
    if (wouldCreateCycle(agents, sourceId, agentId)) return;
    const source = agents.find((a) => a.id === sourceId);
    if (source?.dependsOn === agentId) return;
    try {
      await updateAgent(sourceId, { dependsOn: agentId });
    } catch (err) {
      reportDependencyError(err);
    }
  };
```

por:

```ts
  const handleCardDrop = (agentId: string) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId || sourceId === agentId) return;
    const source = agents.find((a) => a.id === sourceId);
    if (!source || source.dependsOn.includes(agentId)) return;
    if (wouldCreateCycle(agents, sourceId, agentId)) return;
    try {
      await updateAgent(sourceId, { dependsOn: [...source.dependsOn, agentId] });
    } catch (err) {
      reportDependencyError(err);
    }
  };
```

- [ ] **Step 3: Actualizar `handleContainerDrop` (soltar en vacío limpia todo)**

Sustituir:

```ts
  const handleContainerDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId) return;
    const source = agents.find((a) => a.id === sourceId);
    if (!source || source.dependsOn === null) return;
    try {
      await updateAgent(sourceId, { dependsOn: null });
    } catch (err) {
      reportDependencyError(err);
    }
  };
```

por:

```ts
  const handleContainerDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId) return;
    const source = agents.find((a) => a.id === sourceId);
    if (!source || source.dependsOn.length === 0) return;
    try {
      await updateAgent(sourceId, { dependsOn: [] });
    } catch (err) {
      reportDependencyError(err);
    }
  };
```

`handleCardDragOver` y el cálculo de `dropState` en el JSX no cambian — siguen llamando a `wouldCreateCycle(agents, draggingId, agentId)` con la misma firma.

- [ ] **Step 4: Verificar con `tsc`**

Run (desde `trading-agents-dashboard`): `npx tsc -b --force`
Expected: sin errores en `Dashboard.tsx`. Pueden quedar errores en `AgentCard.tsx`, `AgentConfigModal.tsx`, `AgentConnections.tsx` (tareas siguientes).

- [ ] **Step 5: Commit**

```bash
git add trading-agents-dashboard/src/components/Dashboard.tsx
git commit -m "feat(client): Dashboard uses shared multi-parent graph helpers; drag adds, empty-drop clears all"
```

---

### Task 6: `AgentConnections.tsx` — flechas con varios padres (fan-in)

**Files:**
- Modify: `trading-agents-dashboard/src/components/AgentConnections.tsx`

**Interfaces:**
- Consumes: `Agent.dependsOn: string[]` (Task 4).
- Produces: sin cambio de firma pública del componente; ahora dibuja una flecha independiente por cada padre de un agente, no solo por cada hijo de un padre.

- [ ] **Step 1: Actualizar la construcción de `childrenByParent`**

Sustituir:

```ts
    const childrenByParent = new Map<string, Agent[]>();
    for (const agent of agents) {
      if (!agent.dependsOn) continue;
      if (!agents.some((candidate) => candidate.id === agent.dependsOn)) continue;
      if (!childrenByParent.has(agent.dependsOn)) childrenByParent.set(agent.dependsOn, []);
      childrenByParent.get(agent.dependsOn)!.push(agent);
    }
```

por:

```ts
    const childrenByParent = new Map<string, Agent[]>();
    for (const agent of agents) {
      for (const parentId of agent.dependsOn) {
        if (!agents.some((candidate) => candidate.id === parentId)) continue;
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId)!.push(agent);
      }
    }
```

El resto del componente (agrupación por padre, tronco compartido, un `<path>` con su propia flecha por relación) no cambia.

- [ ] **Step 2: Verificar con `tsc`**

Run: `npx tsc -b --force`
Expected: sin errores en `AgentConnections.tsx`.

- [ ] **Step 3: Commit**

```bash
git add trading-agents-dashboard/src/components/AgentConnections.tsx
git commit -m "feat(client): AgentConnections draws one arrow per parent, supporting fan-in"
```

---

### Task 7: `AgentCard.tsx` — etiqueta "Encadenado"

**Files:**
- Modify: `trading-agents-dashboard/src/components/AgentCard.tsx`

**Interfaces:**
- Consumes: `Agent.dependsOn: string[]` (Task 4).

- [ ] **Step 1: Cambiar la comprobación truthy por longitud**

Sustituir:

```tsx
        {(agent.dependsOn || agent.model) && (
          <div className="flex flex-col items-center gap-0.5 mt-2 text-sm text-muted">
            {agent.dependsOn && <span>Encadenado</span>}
            {agent.model && <span className="truncate max-w-full text-cyan-soft">{agent.model}</span>}
          </div>
        )}
```

por:

```tsx
        {(agent.dependsOn.length > 0 || agent.model) && (
          <div className="flex flex-col items-center gap-0.5 mt-2 text-sm text-muted">
            {agent.dependsOn.length > 0 && <span>Encadenado</span>}
            {agent.model && <span className="truncate max-w-full text-cyan-soft">{agent.model}</span>}
          </div>
        )}
```

- [ ] **Step 2: Verificar con `tsc`**

Run: `npx tsc -b --force`
Expected: sin errores en `AgentCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add trading-agents-dashboard/src/components/AgentCard.tsx
git commit -m "feat(client): AgentCard checks dependsOn length instead of truthiness"
```

---

### Task 8: `AgentConfigModal.tsx` — lista de casillas

**Files:**
- Modify: `trading-agents-dashboard/src/components/AgentConfigModal.tsx`

**Interfaces:**
- Consumes: `wouldCreateCycle` de `src/lib/agentGraph.ts` (Task 4); `useAgentStore((state) => state.agents)` para el grafo completo (necesario para comprobar ciclos, ya que `otherAgents` viene filtrado sin el propio agente).
- Produces: `onSave` recibe `dependsOn: string[]` en vez de `string | null`.

- [ ] **Step 1: Actualizar imports y estado**

Sustituir el bloque de imports y el inicio del componente:

```tsx
import { useState } from 'react';
import type { Agent, OutputType } from '../types/agent';
import { useAgentStore } from '../lib/store';
```

por:

```tsx
import { useState } from 'react';
import type { Agent, OutputType } from '../types/agent';
import { useAgentStore } from '../lib/store';
import { wouldCreateCycle } from '../lib/agentGraph';
```

Y sustituir:

```tsx
  const models = useAgentStore((state) => state.models);
  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '');
  const [dependsOn, setDependsOn] = useState<string>(agent?.dependsOn ?? '');
```

por:

```tsx
  const models = useAgentStore((state) => state.models);
  const allAgents = useAgentStore((state) => state.agents);
  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(agent?.dependsOn ?? []);

  const toggleDependsOn = (id: string) => {
    setDependsOn((current) => (current.includes(id) ? current.filter((depId) => depId !== id) : [...current, id]));
  };
```

- [ ] **Step 2: Actualizar `handleSave`**

Sustituir:

```tsx
      await onSave({
        name: name.trim(),
        role: role.trim() || 'Agente',
        systemPrompt,
        dependsOn: dependsOn || null,
        outputType,
        photo: photo || undefined,
        model: model || undefined,
      });
```

por:

```tsx
      await onSave({
        name: name.trim(),
        role: role.trim() || 'Agente',
        systemPrompt,
        dependsOn,
        outputType,
        photo: photo || undefined,
        model: model || undefined,
      });
```

- [ ] **Step 3: Sustituir el `<select>` por la lista de casillas**

Sustituir:

```tsx
          <div>
            <label className={fieldLabel}>Espera respuesta de</label>
            <select value={dependsOn} onChange={(e) => setDependsOn(e.target.value)} className={fieldInput}>
              <option value="" className="bg-panel">
                Ninguno
              </option>
              {otherAgents.map((a) => (
                <option key={a.id} value={a.id} className="bg-panel">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
```

por:

```tsx
          <div>
            <label className={fieldLabel}>Espera respuesta de</label>
            <div className="border border-line/70 rounded-xl divide-y divide-line/50 max-h-40 overflow-y-auto">
              {otherAgents.length === 0 ? (
                <p className="px-3.5 py-2.5 text-sm text-muted">No hay otros agentes todavía.</p>
              ) : (
                otherAgents.map((a) => {
                  const disabled = agent ? wouldCreateCycle(allAgents, agent.id, a.id) : false;
                  return (
                    <label
                      key={a.id}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-base ${
                        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={dependsOn.includes(a.id)}
                        disabled={disabled}
                        onChange={() => toggleDependsOn(a.id)}
                        className="accent-cyan"
                      />
                      <span className="text-paper">{a.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
```

- [ ] **Step 4: Verificar con `tsc`**

Run: `npx tsc -b --force`
Expected: **cero errores** en todo el proyecto cliente (esta es la última pieza que usaba el `dependsOn` antiguo).

- [ ] **Step 5: Commit**

```bash
git add trading-agents-dashboard/src/components/AgentConfigModal.tsx
git commit -m "feat(client): replace single-select with checkbox list for multi-parent dependsOn"
```

---

### Task 9: Verificación end-to-end y restauración de datos

**Files:** ninguno (solo verificación en el navegador y llamadas a la API).

- [ ] **Step 1: Compilar todo el monorepo sin errores**

Run (desde `trading-agents-dashboard`): `npx tsc -b --force`
Expected: exit code 0, sin salida de errores.

- [ ] **Step 2: Capturar el estado actual de `agents.json` para poder restaurarlo**

Con el servidor de desarrollo en marcha, desde el navegador (`evaluate_script` o similar):

```js
const res = await fetch('/api/agents');
console.log(JSON.stringify(await res.json()));
```

Guardar esa salida como referencia de "estado antes de la prueba".

- [ ] **Step 3: Crear un caso real de dos padres via API directa**

```js
await fetch('/api/agents').then((r) => r.json()).then(async (agents) => {
  const byName = Object.fromEntries(agents.map((a) => [a.name, a]));
  const res = await fetch(`/api/agents/${byName['Gestor de Riesgos'].id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dependsOn: [byName['Analista Técnico'].id, byName['Analista Fundamental'].id] }),
  });
  console.log(res.status, await res.json());
});
```

Expected: `200` y el agente devuelto con `dependsOn` conteniendo ambos ids.

- [ ] **Step 4: Verificar visualmente**

Recargar la página, tomar una captura de la sección "Cadena de agentes". Expected: "Gestor de Riesgos" aparece un nivel por debajo del más profundo de sus dos padres, y le llegan dos flechas independientes (una desde cada padre).

- [ ] **Step 5: Verificar el modal**

Abrir "Configurar" sobre "Gestor de Riesgos". Expected: las casillas de "Analista Técnico" y "Analista Fundamental" aparecen marcadas; la casilla de cualquier agente que sea descendiente de "Gestor de Riesgos" (si lo hay) aparece deshabilitada.

- [ ] **Step 6: Verificar arrastrar (añade) y soltar en vacío (limpia todo) con eventos reales**

Usando `evaluate_script` para disparar `DragEvent` reales (no el simulador de arrastre del navegador headless, según lo aprendido en la sesión anterior):

```js
async () => {
  function findCard(name) {
    const heading = Array.from(document.querySelectorAll('h3')).find((h) => h.textContent.trim() === name);
    return heading ? heading.closest('div.w-72') : null;
  }
  const dispatch = (el, type, dt) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));

  // Arrastrar "Razonador" (si existe) sobre "Gestor de Riesgos" -> debe AÑADIRSE a los dos padres que ya tiene
  const source = findCard('Razonador');
  const target = findCard('Gestor de Riesgos');
  if (source && target) {
    const dt = new DataTransfer();
    dispatch(source, 'dragstart', dt);
    await new Promise((r) => setTimeout(r, 50));
    dispatch(target, 'dragover', dt);
    await new Promise((r) => setTimeout(r, 50));
    dispatch(target, 'drop', dt);
    await new Promise((r) => setTimeout(r, 800));
    dispatch(source, 'dragend', dt);
  }
  const res = await fetch('/api/agents');
  return (await res.json()).map((a) => ({ name: a.name, dependsOn: a.dependsOn }));
}
```

Expected: "Gestor de Riesgos" ahora tiene **tres** ids en `dependsOn` (los dos anteriores más "Razonador"), no reemplazados.

Repetir soltando "Gestor de Riesgos" en un espacio vacío del contenedor (mismo patrón que en la sesión anterior, dispatch de `dragover`/`drop` sobre `document.querySelector('div.gap-16')`) y confirmar que su `dependsOn` queda en `[]`.

- [ ] **Step 7: Restaurar los datos al estado capturado en el Step 2**

Para cada agente cuyo `dependsOn` haya cambiado durante la prueba, hacer `PUT /api/agents/:id` con su `dependsOn` original (capturado en el Step 2). Confirmar con un último `GET /api/agents` que coincide exactamente con la captura inicial.

- [ ] **Step 8: Commit final (si quedara algún cambio suelto, p. ej. formateo)**

```bash
git status --short
```

Si no hay cambios pendientes de commit, no hacer nada — las tareas 1-8 ya quedaron commiteadas individualmente.

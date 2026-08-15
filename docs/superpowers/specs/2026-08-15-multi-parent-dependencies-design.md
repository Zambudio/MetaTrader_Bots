# Dependencias de varios padres por agente — diseño

**Fecha:** 2026-08-15
**Proyecto:** `trading-agents-dashboard` (dentro de `MetaTrader_Bots`)
**Estado:** aprobado, pendiente de plan de implementación

## Contexto

El dashboard de agentes ("Cadena de agentes") modela las dependencias entre
agentes con `Agent.dependsOn: string | null` — cada agente solo puede esperar
respuesta de **un** agente. Esto ya se refleja en:

- El motor de orquestación (`server/src/engine/orchestrator.ts`):
  `detectCycle`, `buildLevels`, `ancestorChain` (construye el contexto de
  prompt a partir de la cadena de antecesores).
- La ruta `PUT /agents/:id` (`server/src/routes/agents.ts`), que valida
  autoreferencia, existencia del padre y ciclos.
- El store de frontend (`src/lib/store.ts`), el modal de configuración
  (`AgentConfigModal.tsx`, selector "Espera respuesta de"), la tarjeta
  (`AgentCard.tsx`, etiqueta "Encadenado"), el layout por niveles y las
  flechas de relación (`Dashboard.tsx`: `buildLevels`/`wouldCreateCycle`,
  `AgentConnections.tsx`), y el arrastrar-y-soltar recién construido en
  `Dashboard.tsx`/`AgentCard.tsx` (arrastrar A sobre B fija `A.dependsOn = B`;
  soltar en vacío lo pone a `null`).

El usuario quiere que un agente pueda esperar respuesta de **varios**
agentes a la vez (fan-in), configurable tanto desde el modal como
arrastrando tarjetas.

## Decisiones de producto (confirmadas con el usuario)

1. **Arrastrar A sobre B** siempre **añade** B a las dependencias de A sin
   tocar las que ya tenía. Si B ya estaba en la lista, la operación es un
   no-op (sin llamada de red).
2. **Soltar en espacio vacío** vacía **todas** las dependencias de A (vuelve
   a ser un agente raíz). Para quitar solo una dependencia concreta de varias,
   se usa el modal.
3. El selector "Espera respuesta de" del modal se sustituye por una **lista
   de casillas de verificación**, una por agente disponible. Los agentes que
   crearían un ciclo si se marcaran aparecen deshabilitados.

## Modelo de datos y migración

`dependsOn` pasa de `string | null` a `string[]` (`[]` = raíz), en:

- `trading-agents-dashboard/src/types/agent.ts`
- `trading-agents-dashboard/server/src/types.ts`

**Migración:** no hay script aparte. Al leer `agents.json` en
`server/src/store/agentsStore.ts`, se normaliza cualquier registro con el
formato antiguo (`dependsOn` como `string` → `[string]`; `null`/`undefined`
→ `[]`) y se regraba en el nuevo formato en esa misma lectura, de forma
idempotente. El fichero se autoactualiza la primera vez que se lee tras el
despliegue; no hace falta downtime ni migración manual.

## Motor de orquestación (backend)

Todas las funciones afectadas viven en
`trading-agents-dashboard/server/src/engine/orchestrator.ts`. Cada una tiene
un equivalente casi idéntico en el frontend (`Dashboard.tsx`) que debe
cambiar en paralelo (ver más abajo).

### `buildLevels` — de BFS de un padre a ordenamiento topológico por niveles

Hoy agrupa por `dependsOn` como clave única y hace BFS simple asumiendo que
cada nodo tiene como mucho un padre. Con varios padres, un nodo solo puede
colocarse en un nivel cuando **todos** sus padres ya tienen nivel asignado,
y su nivel es `1 + max(nivel de sus padres)`.

Algoritmo (Kahn / ordenamiento topológico por capas):

1. Calcular `inDegree[agentId]` = número de padres **válidos** (que existen
   en la lista de agentes; los `dependsOn` que apuntan a un id inexistente
   se ignoran para el cálculo, igual que hoy se ignoran para las flechas).
2. Nivel 0 = agentes con `inDegree == 0`.
3. Mientras haya nivel actual: por cada agente del nivel, decrementar
   `inDegree` de cada uno de sus hijos (agentes cuyo `dependsOn` lo incluye);
   los hijos que lleguen a `inDegree == 0` forman el siguiente nivel.
4. Agentes nunca alcanzados (ciclo) van al cubo "orphaned" final, igual que
   hoy.

### `detectCycle` (backend) / `wouldCreateCycle` (frontend, en `Dashboard.tsx`)

Firma sin cambios: `(agents, agentId, candidateParentId) => boolean`. Antes
recorría una única cadena hacia arriba (`while (current)`); ahora hace una
búsqueda (BFS/DFS) desde `candidateParentId` siguiendo **todas** las ramas
de `dependsOn` de cada nodo visitado, comprobando si `agentId` aparece en
algún punto. Se usa igual en tres sitios: validación del backend al hacer
`PUT`, cálculo del anillo válido/inválido durante el arrastre, y para
deshabilitar casillas en el modal.

### `ancestorChain` → conjunto de antecesores

Pasa de devolver una cadena lineal a devolver el **conjunto** de todos los
antecesores (unión de todas las ramas de padres, sin duplicados), en orden
topológico (mismo orden que producen los niveles, para que el contexto del
prompt liste primero a los agentes de etapas más tempranas). El resto de
`executeRun` no cambia: sigue concatenando `"{nombre}: {salida}"` por cada
antecesor para construir el contexto que se pasa al prompt del agente.

## API (`PUT /agents/:id`)

`server/src/routes/agents.ts` acepta `dependsOn: string[]` en el body
(reemplazo total de la lista, igual que ya hace con el resto de campos).
Validación por cada id de la lista entrante:

- No puede ser el propio `id` del agente.
- Debe existir en la lista de agentes.
- No puede crear un ciclo (`detectCycle`).

Si cualquier id de la lista falla una validación, se rechaza toda la
petición con `400` y un mensaje descriptivo (mismo patrón que hoy). Cada id
se valida de forma independiente contra el grafo **actual** (antes de
aplicar esta petición) — los nuevos padres de un agente no interactúan entre
sí para crear un ciclo, porque un ciclo solo puede formarse si uno de los
padres propuestos es alcanzable desde el propio agente que se está editando,
lo cual no depende de qué otros padres se le añadan a la vez.

## Frontend

### Store y tipos

`src/lib/store.ts` no necesita cambios estructurales: `updateAgent(id,
updates: Partial<Agent>)` ya acepta cualquier campo, incluido el nuevo
`dependsOn: string[]`.

### `Dashboard.tsx`

- `buildLevels`: mismo algoritmo de Kahn descrito arriba (duplicado del
  backend, como ya ocurre hoy).
- `wouldCreateCycle`: mismo cambio a BFS/DFS multi-padre.
- `handleCardDrop` (arrastrar A sobre B): en vez de
  `updateAgent(sourceId, { dependsOn: agentId })`, calcula
  `[...source.dependsOn, agentId]` (evitando duplicados) y hace `updateAgent`
  con la lista completa. Si `agentId` ya está en la lista, no llama a la API.
- `handleContainerDrop` (soltar en vacío): `updateAgent(sourceId, {
  dependsOn: [] })`; se salta la llamada si la lista ya estaba vacía.
- Cálculo de `dropState` por tarjeta: sigue siendo `'valid' | 'invalid' |
  null` según `wouldCreateCycle`; no se añade un estado visual nuevo para
  "ya conectado" (arrastrar sobre un padre ya existente se ve como
  "válido" y simplemente no hace nada al soltar).

### `AgentConnections.tsx`

`childrenByParent` pasa de leer `agent.dependsOn` como un único id a iterar
el array, empujando el agente hijo al cubo de **cada** padre que tenga. El
resto del componente (agrupación por padre, tronco compartido para
varios hijos de un mismo padre, una flecha con su propia punta de flecha
por relación) no cambia — el mismo mecanismo que ya dibuja el "fan-out" sirve
sin modificaciones para el "fan-in", porque cada arista sigue siendo un par
`(padre, hijo)` independiente.

### `AgentCard.tsx`

La etiqueta "Encadenado" pasa de comprobar `agent.dependsOn` (truthy sobre
un string) a `agent.dependsOn.length > 0`. No se listan los nombres de los
padres en la propia tarjeta (las flechas ya comunican esa relación
visualmente); esto se mantiene fuera de alcance.

### `AgentConfigModal.tsx`

El `<select>` "Espera respuesta de" se sustituye por una lista de agentes
(`otherAgents`, igual que hoy) con una casilla de verificación cada uno,
respaldada por un estado local `dependsOn: string[]`. Un agente aparece
deshabilitado (casilla gris, no clicable) si marcarlo crearía un ciclo —
mismo `wouldCreateCycle` que usa el arrastre, evaluado por cada opción al
renderizar la lista.

## Fuera de alcance (YAGNI)

- Distinguir visualmente "ya conectado" de "conexión nueva válida" durante
  el arrastre.
- Listar los nombres de los padres directamente en la tarjeta.
- Cualquier endpoint nuevo de "añadir/quitar una dependencia" — todo pasa
  por el mismo `PUT` de reemplazo total que ya existe.

## Verificación

1. `npx tsc -b` en `trading-agents-dashboard` (cliente + server) sin errores.
2. En el navegador, usando llamadas directas a la API (`fetch` vía
   `evaluate_script`) para preparar y restaurar datos de prueba — no el
   simulador de arrastre del navegador headless, que no dispara eventos
   nativos de Drag & Drop (limitación descubierta al probar el arrastre
   simple):
   - Crear un caso real de dos padres para un mismo agente (ej. Gestor de
     Riesgos dependiendo de Analista Técnico **y** Analista Fundamental) y
     comprobar que aparece en el nivel correcto (uno más que el nivel máximo
     de sus padres) y que le llegan dos flechas independientes.
   - Comprobar que el modal muestra ambas casillas marcadas para ese agente,
     y que las opciones que crearían ciclo aparecen deshabilitadas.
   - Simular el arrastre con eventos `DragEvent` reales (como en la
     verificación anterior) para confirmar que "arrastrar añade" y "soltar en
     vacío limpia todo".
   - Restaurar el estado de `agents.json` a la configuración que tenía el
     usuario antes de la prueba.

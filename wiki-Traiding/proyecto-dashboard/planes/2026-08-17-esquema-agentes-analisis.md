# Esquema de Agentes de Análisis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir la cadena de agentes de prueba del dashboard por el esquema de 6 agentes diseñado (2 especialistas → Gestor de Riesgos → 2 validadores en paralelo → Razonador con veredicto), con datos de mercado reales inyectados en el contexto y un bucle de reintento cuando el Razonador pide ajustes — de forma que al cargar la web ya se vea y ejecute este esquema, sin configuración manual.

**Architecture:** Nuevo módulo de snapshot de mercado en el backend (indicadores reales calculados a partir de las velas ya disponibles) que se antepone al prompt de todos los agentes; nuevo `outputType: 'verdict'` con tool-call forzado análogo al ya existente para `'strategy'`; `orchestrator.ts` pasa de "ejecutar cada nivel una vez" a "ejecutar, comprobar veredicto, reejecutar el subgrafo de Riesgo+validadores con las objeciones si el veredicto es `ajustar`, hasta un máximo de reintentos". El roster de 6 agentes se escribe directamente como semilla (`agentsStore.ts` + `server/src/data/agents.json`) para que cargue automáticamente.

**Tech Stack:** TypeScript (backend Express + `tsx`, frontend React 19 + Zustand + Tailwind v4), paquete `technicalindicators` (ya usado en el cliente, se añade al backend).

**Spec:** [`trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md`](../../../trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md)

## Global Constraints

- Techo duro de reintentos: 3, aunque se pida un `maxRetries` mayor (`MAX_RETRIES_CAP = 3` en `orchestrator.ts`).
- El snapshot de mercado nunca rompe la ejecución de un agente: si falla la descarga de velas, el bloque queda vacío (mismo patrón que `getWikiContextBlock`).
- Los fallos técnicos (red, LLM, parseo) siguen marcando el agente/run como `error`, sin fallback silencioso; el bucle de reintento solo se dispara por veredicto `ajustar`, nunca por errores.
- `no_operar` es terminal desde el primer intento — nunca dispara un reintento.
- No se introduce ningún framework de tests nuevo (el servidor no tiene ninguno hoy). La verificación de cada tarea es: `tsc --noEmit`, y en las tareas de motor/orquestación, una comprobación manual ejecutando el servidor.

---

### Task 1: Snapshot de mercado real (indicadores en el backend)

**Files:**
- Modify: `trading-agents-dashboard/server/package.json`
- Create: `trading-agents-dashboard/server/src/engine/indicators.ts`
- Create: `trading-agents-dashboard/server/src/engine/marketSnapshot.ts`

**Interfaces:**
- Consumes: `getCandles(pair: string, timeframe: string): Promise<Candle[]>` de `trading-agents-dashboard/server/src/marketData/index.ts` (ya existe, sin cambios).
- Produces: `buildMarketSnapshotBlock(pair: string, timeframe: string): Promise<string>` desde `marketSnapshot.ts` — lo consume la Task 4 (orquestador).

- [ ] **Step 1: Añadir la dependencia `technicalindicators` al backend**

En `trading-agents-dashboard/server/package.json`, añade la misma versión que ya usa el cliente (`trading-agents-dashboard/package.json` tiene `"technicalindicators": "^3.1.0"`) al bloque `"dependencies"`:

```json
{
  "name": "trading-agents-dashboard-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file-if-exists=.env src/index.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "technicalindicators": "^3.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^24.13.3",
    "tsx": "^4.19.1",
    "typescript": "~5.6.3"
  }
}
```

- [ ] **Step 2: Instalar la dependencia**

Run: `npm install --prefix trading-agents-dashboard/server`
Expected: instala `technicalindicators` sin errores; `trading-agents-dashboard/server/node_modules/technicalindicators` existe.

- [ ] **Step 3: Portar el cálculo puro de indicadores al backend**

Crea `trading-agents-dashboard/server/src/engine/indicators.ts`. Es un puerto de `trading-agents-dashboard/src/lib/indicators.ts` (cliente) — misma lógica, import del tipo `Candle` desde la ubicación del backend, y solo las funciones que necesita el snapshot (sin EMA ni Stochastic, que el cliente usa para el gráfico pero el snapshot no necesita):

```typescript
import { SMA, RSI, MACD, BollingerBands, ATR } from 'technicalindicators';
import type { Candle } from '../marketData/types.js';

export interface LinePoint {
  time: number;
  value: number;
}

function alignToTail(candles: Candle[], values: number[]): LinePoint[] {
  const offset = candles.length - values.length;
  return values.map((value, i) => ({ time: candles[i + offset].time, value }));
}

export function computeSMA(candles: Candle[], period: number): LinePoint[] {
  const values = SMA.calculate({ period, values: candles.map((c) => c.close) });
  return alignToTail(candles, values);
}

export function computeRSI(candles: Candle[], period = 14): LinePoint[] {
  const values = RSI.calculate({ period, values: candles.map((c) => c.close) });
  return alignToTail(candles, values);
}

export function computeATR(candles: Candle[], period = 14): LinePoint[] {
  const values = ATR.calculate({
    period,
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
  });
  return alignToTail(candles, values);
}

export function computeBollingerBands(candles: Candle[], period = 20, stdDev = 2) {
  const raw = BollingerBands.calculate({ period, stdDev, values: candles.map((c) => c.close) });
  const offset = candles.length - raw.length;
  return {
    upper: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.upper })),
    middle: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.middle })),
    lower: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.lower })),
  };
}

export function computeMACD(candles: Candle[]) {
  const raw = MACD.calculate({
    values: candles.map((c) => c.close),
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const offset = candles.length - raw.length;
  return {
    macd: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.MACD ?? 0 })),
    signal: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.signal ?? 0 })),
    histogram: raw.map((v, i) => ({ time: candles[i + offset].time, value: v.histogram ?? 0 })),
  };
}
```

- [ ] **Step 4: Crear el módulo de snapshot**

Crea `trading-agents-dashboard/server/src/engine/marketSnapshot.ts`. `Candle.time` está en segundos Unix (confirmado en `krakenAdapter.ts`/`twelveDataAdapter.ts`), de ahí el `* 1000` al formatear la fecha:

```typescript
import { getCandles } from '../marketData/index.js';
import type { Candle } from '../marketData/types.js';
import { computeSMA, computeRSI, computeMACD, computeBollingerBands, computeATR } from './indicators.js';

const RECENT_CANDLES_FOR_RANGE = 50;

function lastValue(points: { value: number }[]): number | undefined {
  return points.length > 0 ? points[points.length - 1].value : undefined;
}

function fmt(n: number | undefined, decimals = 5): string {
  return n === undefined ? 'n/d' : n.toFixed(decimals);
}

function formatSnapshot(pair: string, timeframe: string, candles: Candle[]): string {
  const last = candles[candles.length - 1];
  const sma20 = lastValue(computeSMA(candles, 20));
  const sma50 = lastValue(computeSMA(candles, 50));
  const sma200 = lastValue(computeSMA(candles, 200));
  const rsi14 = lastValue(computeRSI(candles, 14));
  const macd = computeMACD(candles);
  const bb = computeBollingerBands(candles, 20, 2);
  const atr14 = lastValue(computeATR(candles, 14));
  const recent = candles.slice(-RECENT_CANDLES_FOR_RANGE);
  const high = Math.max(...recent.map((c) => c.high));
  const low = Math.min(...recent.map((c) => c.low));

  return [
    `Snapshot de mercado — ${pair}, ${timeframe} (vela más reciente: ${new Date(last.time * 1000).toISOString()})`,
    `Precio actual (cierre): ${fmt(last.close)}`,
    `SMA20: ${fmt(sma20)} | SMA50: ${fmt(sma50)} | SMA200: ${fmt(sma200)}`,
    `RSI14: ${fmt(rsi14, 1)}`,
    `MACD: ${fmt(lastValue(macd.macd))} (señal ${fmt(lastValue(macd.signal))}, histograma ${fmt(lastValue(macd.histogram))})`,
    `Bollinger(20,2): superior ${fmt(lastValue(bb.upper))} | media ${fmt(lastValue(bb.middle))} | inferior ${fmt(lastValue(bb.lower))}`,
    `ATR14: ${fmt(atr14)}`,
    `Máximo/mínimo de las últimas ${recent.length} velas: ${fmt(high)} / ${fmt(low)}`,
  ].join('\n');
}

export async function buildMarketSnapshotBlock(pair: string, timeframe: string): Promise<string> {
  try {
    const candles = await getCandles(pair, timeframe);
    if (candles.length === 0) return '';
    return formatSnapshot(pair, timeframe, candles);
  } catch (err) {
    console.warn(
      `[marketSnapshot] no se pudo calcular el snapshot de ${pair} ${timeframe}:`,
      err instanceof Error ? err.message : err
    );
    return '';
  }
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p trading-agents-dashboard/server/tsconfig.json`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add trading-agents-dashboard/server/package.json trading-agents-dashboard/server/package-lock.json trading-agents-dashboard/server/src/engine/indicators.ts trading-agents-dashboard/server/src/engine/marketSnapshot.ts
git commit -m "feat(server): snapshot de mercado real con indicadores portados al backend"
```

---

### Task 2: Tipos — `verdict`, `VerdictResult`, `attempt`, reintentos

**Files:**
- Modify: `trading-agents-dashboard/server/src/types.ts`
- Modify: `trading-agents-dashboard/src/types/agent.ts`
- Create: `trading-agents-dashboard/src/types/verdict.ts`
- Modify: `trading-agents-dashboard/src/types/run.ts`

**Interfaces:**
- Produces (backend): `OutputType = 'text' | 'strategy' | 'verdict'`, `Veredicto`, `VerdictResult { veredicto, razon, objeciones? }`, `AgentRunResult.verdict?`, `AgentRunResult.attempt?`, `Run.retryCount?`, `Run.maxRetries?` — los consume la Task 3 (executors) y la Task 4 (orquestador).
- Produces (cliente): mismos tipos espejo — los consume la Task 6 (frontend).

- [ ] **Step 1: Actualizar `trading-agents-dashboard/server/src/types.ts`**

```typescript
export type OutputType = 'text' | 'strategy' | 'verdict';
export type AgentRunStatus = 'idle' | 'waiting' | 'running' | 'done' | 'error';
export type Veredicto = 'go' | 'ajustar' | 'no_operar';

export interface Agent {
  id: string;
  name: string;
  role: string;
  photo?: string;
  systemPrompt: string;
  dependsOn: string[];
  outputType: OutputType;
  model?: string;
}

export interface StrategyProposalLite {
  pair: string;
  timeframe: string;
  resumen: string;
  indicadoresClave: string[];
  puntoEntrada: string;
  stopLoss: string;
  takeProfit: string;
  entradasEscalonadas?: string;
  confianza?: string;
}

export interface VerdictResult {
  veredicto: Veredicto;
  razon: string;
  objeciones?: string[];
}

export interface Mql5GenerationResult {
  code: string;
  filename: string;
  assumptionsToVerify: string[];
  compileStatus: 'ok' | 'errors' | 'unverified';
  compileErrors: string[];
  compileWarnings: string[];
  attempts: number;
}

export interface AgentRunResult {
  agentId: string;
  status: AgentRunStatus;
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
  attempt?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface Run {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  results: AgentRunResult[];
  retryCount?: number;
  maxRetries?: number;
}

export interface RunSummary {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  hasStrategy: boolean;
}

export interface SavedPair {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  favorite: boolean;
}
```

- [ ] **Step 2: Typecheck del backend**

Run: `npx tsc --noEmit -p trading-agents-dashboard/server/tsconfig.json`
Expected: sin errores (los usos existentes de `OutputType`/`AgentRunResult`/`Run` siguen siendo válidos porque solo se añaden campos opcionales y un valor de unión).

- [ ] **Step 3: Actualizar `trading-agents-dashboard/src/types/agent.ts`**

```typescript
export type OutputType = 'text' | 'strategy' | 'verdict';

export interface Agent {
  id: string;
  name: string;
  role: string;
  photo?: string;
  systemPrompt: string;
  dependsOn: string[];
  outputType: OutputType;
  model?: string;
}
```

- [ ] **Step 4: Crear `trading-agents-dashboard/src/types/verdict.ts`**

```typescript
export type Veredicto = 'go' | 'ajustar' | 'no_operar';

export interface VerdictResult {
  veredicto: Veredicto;
  razon: string;
  objeciones?: string[];
}
```

- [ ] **Step 5: Actualizar `trading-agents-dashboard/src/types/run.ts`**

```typescript
import type { StrategyProposalLite } from './strategy';
import type { VerdictResult } from './verdict';

export type AgentRunStatus = 'idle' | 'waiting' | 'running' | 'done' | 'error';

export interface AgentRunResult {
  agentId: string;
  status: AgentRunStatus;
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
  attempt?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface Run {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  results: AgentRunResult[];
  retryCount?: number;
  maxRetries?: number;
}

export interface RunSummary {
  id: string;
  pair: string;
  timeframe: string;
  status: 'running' | 'done' | 'error';
  createdAt: string;
  hasStrategy: boolean;
}
```

- [ ] **Step 6: Commit**

```bash
git add trading-agents-dashboard/server/src/types.ts trading-agents-dashboard/src/types/agent.ts trading-agents-dashboard/src/types/verdict.ts trading-agents-dashboard/src/types/run.ts
git commit -m "feat(types): añadir outputType verdict, VerdictResult y campos de reintento"
```

---

### Task 3: Executors — snapshot en el prompt + tool-call de veredicto

**Files:**
- Modify: `trading-agents-dashboard/server/src/engine/executor.ts`
- Modify: `trading-agents-dashboard/server/src/engine/realExecutor.ts`
- Modify: `trading-agents-dashboard/server/src/engine/mockExecutor.ts`

**Interfaces:**
- Consumes: `buildMarketSnapshotBlock` (Task 1), `VerdictResult`/`OutputType` (Task 2).
- Produces: `runAgent(agent, context, pair, timeframe, marketSnapshot): Promise<ExecutionResult>` con `ExecutionResult { output?, strategy?, verdict? }` — lo consume la Task 4 (orquestador).

- [ ] **Step 1: Reescribir `trading-agents-dashboard/server/src/engine/executor.ts`**

```typescript
import type { Agent, StrategyProposalLite, VerdictResult } from '../types.js';
import { runMockAgent } from './mockExecutor.js';
import { runRealAgent } from './realExecutor.js';

export interface ExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}

export async function runAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  marketSnapshot: string
): Promise<ExecutionResult> {
  const useReal = Boolean(process.env.OMNIROUTE_API_KEY && process.env.OMNIROUTE_BASE_URL);
  if (useReal) {
    return runRealAgent(agent, context, pair, timeframe, marketSnapshot);
  }
  return runMockAgent(agent, context, pair, timeframe, marketSnapshot);
}
```

- [ ] **Step 2: Reescribir `trading-agents-dashboard/server/src/engine/realExecutor.ts`**

Añade `VERDICT_TOOL` (mismo patrón que `STRATEGY_TOOL`), generaliza `chatCompletion` para aceptar cualquiera de los dos tools (o ninguno), extrae `parseToolArgs` para no duplicar el parseo de la respuesta, y antepone el snapshot al prompt de usuario:

```typescript
import type { Agent, StrategyProposalLite, VerdictResult } from '../types.js';
import { getWikiContextBlock } from '../store/wikiStore.js';

const REQUEST_TIMEOUT_MS = 60_000;

export interface RealExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}

const STRATEGY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'propose_strategy',
    description: 'Propone una estrategia de trading concreta y accionable para el par y timeframe indicados.',
    parameters: {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Resumen ejecutivo de la propuesta.' },
        indicadoresClave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Indicadores/factores clave usados para la propuesta.',
        },
        puntoEntrada: { type: 'string', description: 'Zona o nivel de entrada sugerido.' },
        stopLoss: { type: 'string', description: 'Nivel de stop loss sugerido.' },
        takeProfit: { type: 'string', description: 'Nivel de take profit sugerido.' },
        entradasEscalonadas: { type: 'string', description: 'Plan de entradas escalonadas, si procede.' },
        confianza: { type: 'string', description: 'Nivel de confianza de la propuesta.' },
      },
      required: ['resumen', 'indicadoresClave', 'puntoEntrada', 'stopLoss', 'takeProfit'],
    },
  },
};

const VERDICT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'emitir_veredicto',
    description: 'Emite el veredicto final sobre la propuesta de estrategia tras revisar las críticas de los validadores.',
    parameters: {
      type: 'object',
      properties: {
        veredicto: {
          type: 'string',
          enum: ['go', 'ajustar', 'no_operar'],
          description:
            "'go' si la propuesta es sólida y las críticas no la invalidan, 'ajustar' si hay objeciones concretas y corregibles, 'no_operar' si las condiciones u objeciones son serias y ninguna propuesta de entrada tiene sentido ahora mismo.",
        },
        razon: { type: 'string', description: 'Explicación breve del veredicto.' },
        objeciones: {
          type: 'array',
          items: { type: 'string' },
          description: "Objeciones concretas y corregibles. Rellenar siempre que veredicto sea 'ajustar'.",
        },
      },
      required: ['veredicto', 'razon'],
    },
  },
};

type Tool = typeof STRATEGY_TOOL | typeof VERDICT_TOOL;

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

async function chatCompletion(model: string, messages: ChatMessage[], tool: Tool | null): Promise<any> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('OMNIROUTE_BASE_URL/OMNIROUTE_API_KEY no están configurados');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(tool ? { tools: [tool], tool_choice: { type: 'function', function: { name: tool.function.name } } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OmniRoute respondió ${response.status}: ${body.slice(0, 300)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildUserPrompt(pair: string, timeframe: string, marketSnapshot: string, context: string): string {
  return [
    `Par: ${pair}`,
    `Timeframe: ${timeframe}`,
    marketSnapshot || null,
    context ? `Contexto de agentes anteriores:\n${context}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n');
}

function parseToolArgs(data: any): any {
  const message = data?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  if (typeof message?.content === 'string' && message.content.trim()) return JSON.parse(message.content);
  throw new Error('El modelo no devolvió la respuesta estructurada esperada');
}

export async function runRealAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  marketSnapshot: string
): Promise<RealExecutionResult> {
  const model = agent.model || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-reasoning';
  const baseSystemPrompt = agent.systemPrompt || `Eres ${agent.name}, ${agent.role}.`;
  const wikiBlock = await getWikiContextBlock(`${agent.role}\n${agent.systemPrompt}`, { maxPages: 3 });
  const messages: ChatMessage[] = [
    { role: 'system', content: wikiBlock ? `${baseSystemPrompt}\n\n${wikiBlock}` : baseSystemPrompt },
    { role: 'user', content: buildUserPrompt(pair, timeframe, marketSnapshot, context) },
  ];

  if (agent.outputType === 'strategy') {
    const data = await chatCompletion(model, messages, STRATEGY_TOOL);
    const args = parseToolArgs(data);
    const strategy: StrategyProposalLite = {
      pair,
      timeframe,
      resumen: typeof args.resumen === 'string' ? args.resumen : '',
      indicadoresClave: Array.isArray(args.indicadoresClave) ? args.indicadoresClave : [],
      puntoEntrada: typeof args.puntoEntrada === 'string' ? args.puntoEntrada : '',
      stopLoss: typeof args.stopLoss === 'string' ? args.stopLoss : '',
      takeProfit: typeof args.takeProfit === 'string' ? args.takeProfit : '',
      entradasEscalonadas: typeof args.entradasEscalonadas === 'string' ? args.entradasEscalonadas : undefined,
      confianza: typeof args.confianza === 'string' ? args.confianza : undefined,
    };
    return { strategy };
  }

  if (agent.outputType === 'verdict') {
    const data = await chatCompletion(model, messages, VERDICT_TOOL);
    const args = parseToolArgs(data);
    if (args.veredicto !== 'go' && args.veredicto !== 'ajustar' && args.veredicto !== 'no_operar') {
      throw new Error(`Veredicto inválido devuelto por el modelo: ${String(args.veredicto)}`);
    }
    const verdict: VerdictResult = {
      veredicto: args.veredicto,
      razon: typeof args.razon === 'string' ? args.razon : '',
      objeciones: Array.isArray(args.objeciones) ? args.objeciones : undefined,
    };
    return { verdict };
  }

  const data = await chatCompletion(model, messages, null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('El modelo no devolvió contenido');
  }
  return { output: content };
}
```

- [ ] **Step 3: Reescribir `trading-agents-dashboard/server/src/engine/mockExecutor.ts`**

El veredicto simulado es determinista para poder probar el bucle de reintento sin gastar en OmniRoute: si el contexto recibido ya incluye las objeciones (es decir, esta es la pasada de reintento), responde `go`; si no, responde `ajustar` con un par de objeciones de ejemplo.

```typescript
import type { Agent, StrategyProposalLite, VerdictResult } from '../types.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MockExecutionResult {
  output?: string;
  strategy?: StrategyProposalLite;
  verdict?: VerdictResult;
}

export async function runMockAgent(
  agent: Agent,
  context: string,
  pair: string,
  timeframe: string,
  marketSnapshot: string
): Promise<MockExecutionResult> {
  await delay(600 + Math.floor(Math.random() * 600));

  if (agent.outputType === 'strategy') {
    return { strategy: buildMockStrategy(agent, pair, timeframe) };
  }
  if (agent.outputType === 'verdict') {
    return { verdict: buildMockVerdict(context) };
  }
  return { output: buildMockText(agent, context, pair, timeframe, marketSnapshot) };
}

function buildMockText(agent: Agent, context: string, pair: string, timeframe: string, marketSnapshot: string): string {
  const contextNote = context ? `\n\nContexto recibido de agentes anteriores:\n${context}` : '';
  const snapshotNote = marketSnapshot
    ? '\n\nSnapshot de mercado recibido: sí.'
    : '\n\nSnapshot de mercado recibido: no (sin velas disponibles).';
  return `[SIMULADO] ${agent.name} (${agent.role}) analizando ${pair} en ${timeframe}.\n\nPrompt configurado: "${
    agent.systemPrompt || '(sin prompt configurado)'
  }"${snapshotNote}${contextNote}\n\nEsta es una salida de relleno para probar el flujo — conecta un LLM real para obtener un análisis de verdad.`;
}

function buildMockStrategy(agent: Agent, pair: string, timeframe: string): StrategyProposalLite {
  return {
    pair,
    timeframe,
    resumen: `[SIMULADO] Propuesta de ${agent.name} para ${pair} en ${timeframe}, combinando el análisis de los agentes anteriores de la cadena.`,
    indicadoresClave: ['Media móvil (mock)', 'RSI (mock)', 'Estructura de mercado (mock)'],
    puntoEntrada: 'Zona de entrada simulada — pendiente de LLM real',
    stopLoss: 'Nivel de stop loss simulado',
    takeProfit: 'Nivel de take profit simulado',
    entradasEscalonadas: 'Ejemplo: 3 entradas parciales al 33% cada una (simulado)',
    confianza: 'media (simulado)',
  };
}

function buildMockVerdict(context: string): VerdictResult {
  const isRetry = context.includes('Objeciones del Razonador');
  if (isRetry) {
    return { veredicto: 'go', razon: '[SIMULADO] La propuesta corregida resuelve las objeciones planteadas.' };
  }
  return {
    veredicto: 'ajustar',
    razon: '[SIMULADO] La propuesta necesita ajustes antes de darse por buena.',
    objeciones: [
      '[SIMULADO] Objeción de ejemplo del Validador de Coherencia Técnica.',
      '[SIMULADO] Objeción de ejemplo del Refutador.',
    ],
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p trading-agents-dashboard/server/tsconfig.json`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add trading-agents-dashboard/server/src/engine/executor.ts trading-agents-dashboard/server/src/engine/realExecutor.ts trading-agents-dashboard/server/src/engine/mockExecutor.ts
git commit -m "feat(server): tool-call de veredicto y snapshot de mercado en el prompt de los agentes"
```

---

### Task 4: Orquestador — subgrafo de reintento y bucle de veredicto

**Files:**
- Modify: `trading-agents-dashboard/server/src/engine/orchestrator.ts`
- Modify: `trading-agents-dashboard/server/src/routes/runs.ts`

**Interfaces:**
- Consumes: `runAgent` (Task 3), `buildMarketSnapshotBlock` (Task 1), `VerdictResult`/`Run`/`AgentRunResult` (Task 2).
- Produces: `computeRetrySubgraph(agents, verdictAgentId): Set<string>`, `retryEntryPoints(agents, subgraph): string[]`, `DEFAULT_MAX_RETRIES`, `MAX_RETRIES_CAP` — exportados por si el frontend necesita mostrarlos en el futuro; `executeRun(run, agents): Promise<void>` mantiene la misma firma pública.

- [ ] **Step 1: Reescribir `trading-agents-dashboard/server/src/engine/orchestrator.ts`**

`detectCycle`, `buildLevels` y `ancestorChain` no cambian. Se añaden `computeRetrySubgraph`/`retryEntryPoints` (reutilizan `ancestorChain`, no hace falta una función "inversa" aparte: el subgrafo de reintento es simplemente "los ancestros del agente de veredicto que sí dependen de algo, más el propio agente de veredicto" — los especialistas de nivel 0 quedan fuera porque su `dependsOn` está vacío). `executeRun` pasa a ser un bucle sobre una función interna `runPass` reutilizable:

```typescript
import type { Agent, AgentRunResult, Run, VerdictResult } from '../types.js';
import { runAgent } from './executor.js';
import { saveRun } from '../store/runsStore.js';
import { buildMarketSnapshotBlock } from './marketSnapshot.js';

export const DEFAULT_MAX_RETRIES = 2;
export const MAX_RETRIES_CAP = 3;

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

/**
 * Subgrafo a reejecutar cuando el agente de veredicto pide ajustar: el propio agente de
 * veredicto más los ancestros que sí dependen de otro agente. Los especialistas de nivel 0
 * (dependsOn vacío) quedan fuera porque su análisis no cambia entre reintentos.
 */
export function computeRetrySubgraph(agents: Agent[], verdictAgentId: string): Set<string> {
  const ancestors = ancestorChain(agents, verdictAgentId);
  const ids = new Set(ancestors.filter((a) => a.dependsOn.length > 0).map((a) => a.id));
  ids.add(verdictAgentId);
  return ids;
}

/** ids del subgrafo cuya entrada depende de un agente FUERA del subgrafo — reciben las objeciones. */
export function retryEntryPoints(agents: Agent[], subgraph: Set<string>): string[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  return [...subgraph].filter((id) => {
    const agent = byId.get(id);
    return agent ? agent.dependsOn.some((depId) => !subgraph.has(depId)) : false;
  });
}

function resultText(result: AgentRunResult | undefined): string {
  if (!result) return '';
  if (result.output) return result.output;
  if (result.strategy) return JSON.stringify(result.strategy);
  if (result.verdict) return JSON.stringify(result.verdict);
  return '';
}

function formatObjections(verdict: VerdictResult, attemptNumber: number): string {
  const items = verdict.objeciones && verdict.objeciones.length > 0 ? verdict.objeciones : [verdict.razon];
  return `Objeciones del Razonador (intento ${attemptNumber}):\n${items.map((o) => `- ${o}`).join('\n')}`;
}

interface RunPassOptions {
  onlyAgentIds?: Set<string>;
  extraContextByAgentId?: Map<string, string>;
}

async function runPass(run: Run, agents: Agent[], marketSnapshot: string, options: RunPassOptions = {}): Promise<void> {
  const levels = buildLevels(agents);
  const resultsById = new Map(run.results.map((r) => [r.agentId, r]));

  for (const level of levels) {
    const toRun = options.onlyAgentIds ? level.filter((a) => options.onlyAgentIds!.has(a.id)) : level;
    if (toRun.length === 0) continue;

    await Promise.all(
      toRun.map(async (agent) => {
        const result = resultsById.get(agent.id);
        if (!result) return;

        result.status = 'running';
        result.startedAt = new Date().toISOString();
        await saveRun(run);

        try {
          let context = ancestorChain(agents, agent.id)
            .map((ancestor) => `${ancestor.name}: ${resultText(resultsById.get(ancestor.id))}`)
            .join('\n\n');

          const extra = options.extraContextByAgentId?.get(agent.id);
          if (extra) context = context ? `${extra}\n\n${context}` : extra;

          const { output, strategy, verdict } = await runAgent(agent, context, run.pair, run.timeframe, marketSnapshot);
          result.output = output;
          result.strategy = strategy;
          result.verdict = verdict;
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
}

function resetForRetry(run: Run, subgraph: Set<string>): void {
  run.results = run.results.map((r) => (subgraph.has(r.agentId) ? { agentId: r.agentId, status: 'waiting', attempt: (r.attempt ?? 1) + 1 } : r));
}

export async function executeRun(run: Run, agents: Agent[]): Promise<void> {
  run.maxRetries = Math.min(MAX_RETRIES_CAP, Math.max(0, run.maxRetries ?? DEFAULT_MAX_RETRIES));
  run.retryCount = run.retryCount ?? 0;

  const marketSnapshot = await buildMarketSnapshotBlock(run.pair, run.timeframe);

  await runPass(run, agents, marketSnapshot);

  const verdictAgent = agents.find((a) => a.outputType === 'verdict');
  while (verdictAgent) {
    const verdictResult = run.results.find((r) => r.agentId === verdictAgent.id);
    const verdict = verdictResult?.verdict;
    if (!verdict || verdict.veredicto !== 'ajustar') break;
    if (run.retryCount >= run.maxRetries) break;

    run.retryCount += 1;
    const subgraph = computeRetrySubgraph(agents, verdictAgent.id);
    const entryIds = retryEntryPoints(agents, subgraph);
    const objectionsText = formatObjections(verdict, run.retryCount);
    const extraContextByAgentId = new Map(entryIds.map((id) => [id, objectionsText]));

    resetForRetry(run, subgraph);
    await saveRun(run);

    await runPass(run, agents, marketSnapshot, { onlyAgentIds: subgraph, extraContextByAgentId });
  }

  run.status = run.results.some((r) => r.status === 'error') ? 'error' : 'done';
  await saveRun(run);
}
```

- [ ] **Step 2: Pasar `maxRetries` opcional desde la petición y sembrar `retryCount`**

En `trading-agents-dashboard/server/src/routes/runs.ts`, importa `DEFAULT_MAX_RETRIES` y añade los campos al `Run` creado:

```typescript
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { listAgents } from '../store/agentsStore.js';
import { saveRun, loadRun, listRuns, deleteRun } from '../store/runsStore.js';
import { executeRun, DEFAULT_MAX_RETRIES } from '../engine/orchestrator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Run } from '../types.js';

export const runsRouter = Router();

runsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const runs = await listRuns();
    res.json(runs);
  })
);

runsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { pair, timeframe, maxRetries } = req.body ?? {};
    if (!pair || typeof pair !== 'string') {
      res.status(400).json({ error: 'pair is required' });
      return;
    }

    const agents = await listAgents();
    if (agents.length === 0) {
      res.status(400).json({ error: 'no hay agentes configurados' });
      return;
    }

    const run: Run = {
      id: nanoid(10),
      pair,
      timeframe: typeof timeframe === 'string' && timeframe ? timeframe : 'H1',
      status: 'running',
      createdAt: new Date().toISOString(),
      results: agents.map((a) => ({ agentId: a.id, status: 'waiting' })),
      retryCount: 0,
      maxRetries: typeof maxRetries === 'number' && Number.isFinite(maxRetries) ? maxRetries : DEFAULT_MAX_RETRIES,
    };
    await saveRun(run);

    executeRun(run, agents).catch((err) => {
      console.error('[runs] execution failed', err);
    });

    res.status(202).json(run);
  })
);

runsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const run = await loadRun(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'run not found' });
      return;
    }
    res.json(run);
  })
);

runsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteRun(req.params.id);
    res.json({ ok: true });
  })
);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p trading-agents-dashboard/server/tsconfig.json`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add trading-agents-dashboard/server/src/engine/orchestrator.ts trading-agents-dashboard/server/src/routes/runs.ts
git commit -m "feat(server): bucle de reintento del orquestador cuando el veredicto es ajustar"
```

---

### Task 5: Roster de 6 agentes como semilla

**Files:**
- Modify: `trading-agents-dashboard/server/src/store/agentsStore.ts`
- Modify: `trading-agents-dashboard/server/src/data/agents.json`

**Interfaces:**
- Consumes: `outputType: 'verdict'` válido (Task 2).
- Produces: nada nuevo — es contenido de datos, no código.

- [ ] **Step 1: Actualizar `DEFAULT_AGENTS` en `trading-agents-dashboard/server/src/store/agentsStore.ts`**

Solo cambia el array `DEFAULT_AGENTS` (usado cuando `server/src/data/agents.json` no existe todavía); el resto del archivo no cambia:

```typescript
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
      'Recibes un snapshot de mercado real (precio, medias móviles, RSI, MACD, Bollinger, ATR, máximos/mínimos recientes) para el par y timeframe indicados. Interpreta la tendencia, el momentum y la volatilidad actuales basándote EXCLUSIVAMENTE en esos datos — no inventes valores ni comentes indicadores que no aparecen en el snapshot. Señala soportes y resistencias relevantes.',
    dependsOn: [],
    outputType: 'text',
    model: 'auto/pro-fast',
  },
  {
    id: 'agente-fundamental',
    name: 'Analista Fundamental',
    role: 'Analista Fundamental',
    systemPrompt:
      'Evalúa el contexto macroeconómico y de noticias relevante para el par y timeframe indicados. Si el timeframe es intradía (M15-H1), céntrate en riesgo de eventos programados (calendario económico) más que en sesgo direccional; si es de posición (H4+), pondera el sesgo macro de fondo (tipos de interés, política monetaria, flujos). Complementa el análisis técnico, no lo dupliques.',
    dependsOn: [],
    outputType: 'text',
    model: 'auto/pro-chat',
  },
  {
    id: 'agente-riesgo',
    name: 'Gestor de Riesgos',
    role: 'Gestor de Riesgos',
    systemPrompt:
      "A partir del análisis técnico y fundamental recibidos, propone una estrategia concreta: punto de entrada, stop loss, take profit y, si procede, un plan de entradas escalonadas. Si el contexto incluye objeciones de un intento anterior (marcadas 'Objeciones del Razonador'), corrígelas explícitamente en la nueva propuesta en vez de repetir la anterior.",
    dependsOn: ['agente-tecnico', 'agente-fundamental'],
    outputType: 'strategy',
    model: 'auto/chat',
  },
  {
    id: 'agente-validador-tecnico',
    name: 'Validador de Coherencia Técnica',
    role: 'Validador de Coherencia Técnica',
    systemPrompt:
      '¿El stop loss queda fuera de estructura relevante? ¿el punto de entrada encaja con la tendencia/momentum descritos? ¿el ratio riesgo/beneficio es razonable dado el ATR/volatilidad actual? Comprueba si la propuesta de Gestor de Riesgos es coherente con el análisis técnico y el snapshot de mercado del contexto. Cita los números del snapshot al señalar inconsistencias; si no encuentras ninguna, dilo explícitamente.',
    dependsOn: ['agente-riesgo'],
    outputType: 'text',
    model: 'auto/pro-fast',
  },
  {
    id: 'agente-refutador',
    name: 'Refutador',
    role: 'Refutador',
    systemPrompt:
      'Tu trabajo es intentar tumbar la propuesta de Gestor de Riesgos: busca activamente motivos por los que la operación podría fallar — escenario técnico contrario, eventos de calendario próximos que la invalidarían, correlaciones con otros pares/activos, niveles de invalidación cercanos, falta de liquidez. No suavices la crítica por quedar bien; si la propuesta es sólida dilo, pero exige evidencia concreta del contexto antes de darla por buena.',
    dependsOn: ['agente-riesgo'],
    outputType: 'text',
    model: 'auto/pro-fast',
  },
  {
    id: 'agente-razonador',
    name: 'Razonador',
    role: 'Razonador',
    systemPrompt:
      'Sintetiza el análisis técnico, fundamental, la propuesta de riesgo y las críticas del Validador de Coherencia Técnica y el Refutador. Emite un veredicto: GO si la propuesta es sólida y las críticas no la invalidan; AJUSTAR si hay objeciones concretas y corregibles (indícalas con precisión); NO_OPERAR si las condiciones o las objeciones son suficientemente serias como para que ninguna propuesta de entrada tenga sentido ahora mismo con estos datos.',
    dependsOn: ['agente-validador-tecnico', 'agente-refutador'],
    outputType: 'verdict',
    model: 'auto/pro-reasoning',
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

- [ ] **Step 2: Sobrescribir el archivo de datos real `trading-agents-dashboard/server/src/data/agents.json`**

Este archivo ya existe en disco (no versionado) y es lo que el servidor lee de verdad al arrancar — sin este paso, `DEFAULT_AGENTS` del Step 1 nunca se usaría porque `readJson` solo cae al fallback si el archivo no existe. Mismo contenido que `DEFAULT_AGENTS`, en JSON, conservando las fotos ya existentes para los 4 agentes que ya estaban configurados (los 2 validadores nuevos se quedan sin foto — `AgentCard` ya renderiza iniciales cuando no hay `photo`):

```json
[
  {
    "id": "agente-tecnico",
    "name": "Analista Técnico",
    "role": "Analista Técnico",
    "systemPrompt": "Recibes un snapshot de mercado real (precio, medias móviles, RSI, MACD, Bollinger, ATR, máximos/mínimos recientes) para el par y timeframe indicados. Interpreta la tendencia, el momentum y la volatilidad actuales basándote EXCLUSIVAMENTE en esos datos — no inventes valores ni comentes indicadores que no aparecen en el snapshot. Señala soportes y resistencias relevantes.",
    "dependsOn": [],
    "outputType": "text",
    "photo": "https://cdn-icons-png.flaticon.com/512/8637/8637114.png",
    "model": "auto/pro-fast"
  },
  {
    "id": "agente-fundamental",
    "name": "Analista Fundamental",
    "role": "Analista Fundamental",
    "systemPrompt": "Evalúa el contexto macroeconómico y de noticias relevante para el par y timeframe indicados. Si el timeframe es intradía (M15-H1), céntrate en riesgo de eventos programados (calendario económico) más que en sesgo direccional; si es de posición (H4+), pondera el sesgo macro de fondo (tipos de interés, política monetaria, flujos). Complementa el análisis técnico, no lo dupliques.",
    "dependsOn": [],
    "outputType": "text",
    "photo": "https://cdn-icons-png.flaticon.com/512/4736/4736348.png",
    "model": "auto/pro-chat"
  },
  {
    "id": "agente-riesgo",
    "name": "Gestor de Riesgos",
    "role": "Gestor de Riesgos",
    "systemPrompt": "A partir del análisis técnico y fundamental recibidos, propone una estrategia concreta: punto de entrada, stop loss, take profit y, si procede, un plan de entradas escalonadas. Si el contexto incluye objeciones de un intento anterior (marcadas 'Objeciones del Razonador'), corrígelas explícitamente en la nueva propuesta en vez de repetir la anterior.",
    "dependsOn": ["agente-tecnico", "agente-fundamental"],
    "outputType": "strategy",
    "photo": "https://cdn-icons-png.flaticon.com/512/11126/11126203.png",
    "model": "auto/chat"
  },
  {
    "id": "agente-validador-tecnico",
    "name": "Validador de Coherencia Técnica",
    "role": "Validador de Coherencia Técnica",
    "systemPrompt": "¿El stop loss queda fuera de estructura relevante? ¿el punto de entrada encaja con la tendencia/momentum descritos? ¿el ratio riesgo/beneficio es razonable dado el ATR/volatilidad actual? Comprueba si la propuesta de Gestor de Riesgos es coherente con el análisis técnico y el snapshot de mercado del contexto. Cita los números del snapshot al señalar inconsistencias; si no encuentras ninguna, dilo explícitamente.",
    "dependsOn": ["agente-riesgo"],
    "outputType": "text",
    "model": "auto/pro-fast"
  },
  {
    "id": "agente-refutador",
    "name": "Refutador",
    "role": "Refutador",
    "systemPrompt": "Tu trabajo es intentar tumbar la propuesta de Gestor de Riesgos: busca activamente motivos por los que la operación podría fallar — escenario técnico contrario, eventos de calendario próximos que la invalidarían, correlaciones con otros pares/activos, niveles de invalidación cercanos, falta de liquidez. No suavices la crítica por quedar bien; si la propuesta es sólida dilo, pero exige evidencia concreta del contexto antes de darla por buena.",
    "dependsOn": ["agente-riesgo"],
    "outputType": "text",
    "model": "auto/pro-fast"
  },
  {
    "id": "agente-razonador",
    "name": "Razonador",
    "role": "Razonador",
    "systemPrompt": "Sintetiza el análisis técnico, fundamental, la propuesta de riesgo y las críticas del Validador de Coherencia Técnica y el Refutador. Emite un veredicto: GO si la propuesta es sólida y las críticas no la invalidan; AJUSTAR si hay objeciones concretas y corregibles (indícalas con precisión); NO_OPERAR si las condiciones o las objeciones son suficientemente serias como para que ninguna propuesta de entrada tenga sentido ahora mismo con estos datos.",
    "dependsOn": ["agente-validador-tecnico", "agente-refutador"],
    "outputType": "verdict",
    "photo": "https://static.vecteezy.com/system/resources/previews/012/777/951/non_2x/artificial-intelligence-brain-colorful-icon-ai-sign-vector.jpg",
    "model": "auto/pro-reasoning"
  }
]
```

- [ ] **Step 3: Verificación manual — el endpoint ya sirve el roster nuevo**

Con el backend arrancado (`npm run dev --prefix trading-agents-dashboard/server`), en otra terminal:

Run (PowerShell): `(Invoke-RestMethod http://localhost:5175/api/agents).name`
Expected: 6 líneas — `Analista Técnico`, `Analista Fundamental`, `Gestor de Riesgos`, `Validador de Coherencia Técnica`, `Refutador`, `Razonador`.

- [ ] **Step 4: Commit**

No hagas commit de `server/src/data/agents.json` si `.gitignore` ya excluye `server/src/data/` (confirma con `git status` — el README dice que esa carpeta "no está versionada"); si `git status` no lo lista como cambio, es correcto y no hay nada que añadir de ese archivo:

```bash
git status trading-agents-dashboard/server/src/data/agents.json
git add trading-agents-dashboard/server/src/store/agentsStore.ts
git commit -m "feat(server): roster por defecto de 6 agentes (especialistas, riesgo, validadores, razonador)"
```

---

### Task 6: Frontend — veredicto, intentos, opción de tipo de salida

**Files:**
- Modify: `trading-agents-dashboard/src/components/AgentConfigModal.tsx`
- Modify: `trading-agents-dashboard/src/components/AgentCard.tsx`
- Create: `trading-agents-dashboard/src/components/VerdictResultCard.tsx`
- Modify: `trading-agents-dashboard/src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `VerdictResult` (Task 2), `AgentRunResult.verdict`/`.attempt`, `Run.retryCount`/`.maxRetries` (Task 2, poblados por el backend en Task 4).
- Produces: `VerdictResultCard` — componente de presentación, sin estado propio más allá de props.

- [ ] **Step 1: Añadir la opción "verdict" al selector de tipo de salida**

En `trading-agents-dashboard/src/components/AgentConfigModal.tsx`, dentro del `<select>` de "Tipo de salida" (busca `Estrategia final`), añade una tercera opción justo después:

```tsx
            <select
              value={outputType}
              onChange={(e) => setOutputType(e.target.value as OutputType)}
              className={fieldInput}
            >
              <option value="text" className="bg-panel">
                Análisis de texto
              </option>
              <option value="strategy" className="bg-panel">
                Estrategia final
              </option>
              <option value="verdict" className="bg-panel">
                Veredicto (validación final)
              </option>
            </select>
```

- [ ] **Step 2: Mostrar el número de intento en `AgentCard`**

En `trading-agents-dashboard/src/components/AgentCard.tsx`, en el bloque que ya muestra "Encadenado"/modelo (busca `{(agent.dependsOn.length > 0 || agent.model)`), añade la condición y línea del intento:

```tsx
          {(agent.dependsOn.length > 0 || agent.model || (runResult?.attempt ?? 1) > 1) && (
            <div className="flex flex-col items-center gap-0.5 mt-2 text-sm text-muted">
              {agent.dependsOn.length > 0 && <span>Encadenado</span>}
              {agent.model && <span className="truncate max-w-full text-cyan-soft">{agent.model}</span>}
              {(runResult?.attempt ?? 1) > 1 && <span className="text-violet">Intento {runResult?.attempt}</span>}
            </div>
          )}
```

- [ ] **Step 3: Crear `trading-agents-dashboard/src/components/VerdictResultCard.tsx`**

```tsx
import type { VerdictResult, Veredicto } from '../types/verdict';

interface Props {
  agentName: string;
  verdict: VerdictResult;
  attempt?: number;
  retryCount?: number;
  maxRetries?: number;
}

const VEREDICTO_LABEL: Record<Veredicto, string> = {
  go: 'GO',
  ajustar: 'AJUSTAR',
  no_operar: 'NO OPERAR',
};

const VEREDICTO_STYLE: Record<Veredicto, string> = {
  go: 'text-bull border-bull/30 bg-bull/10',
  ajustar: 'text-violet border-violet/30 bg-violet/10',
  no_operar: 'text-bear border-bear/30 bg-bear/10',
};

export const VerdictResultCard = ({ agentName, verdict, attempt, retryCount, maxRetries }: Props) => {
  const needsManualReview = verdict.veredicto === 'ajustar' && (retryCount ?? 0) >= (maxRetries ?? 0);

  return (
    <div className="bg-panel border border-line/70 rounded-2xl overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-5 mb-5 border-b border-line/60">
          <div>
            <p className="text-sm font-medium text-muted mb-1.5 tracking-wide uppercase">Veredicto final</p>
            <h3 className="font-display font-bold text-3xl text-paper tracking-wide">{agentName}</h3>
          </div>
          <span className={`text-base font-semibold px-4 py-2 rounded-xl border ${VEREDICTO_STYLE[verdict.veredicto]}`}>
            {VEREDICTO_LABEL[verdict.veredicto]}
          </span>
        </div>

        <p className="text-base text-paper/90 leading-relaxed">{verdict.razon}</p>

        {verdict.objeciones && verdict.objeciones.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-muted mb-2">Objeciones</p>
            <ul className="list-disc list-inside space-y-1 text-base text-paper/80">
              {verdict.objeciones.map((objecion, i) => (
                <li key={i}>{objecion}</li>
              ))}
            </ul>
          </div>
        )}

        {attempt && attempt > 1 && (
          <p className="text-sm text-muted mt-5">
            Intento {attempt}
            {typeof maxRetries === 'number' ? ` de ${maxRetries + 1}` : ''}
          </p>
        )}

        {needsManualReview && (
          <p className="text-sm text-violet mt-3 pt-4 border-t border-line/60">
            Reintentos agotados sin llegar a GO — revisión manual recomendada antes de operar.
          </p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Renderizar el veredicto en `Dashboard.tsx`**

En `trading-agents-dashboard/src/components/Dashboard.tsx`, añade el import y el filtro junto a `strategyResults`, y una sección nueva justo debajo de la de "Propuesta de estrategia" (después del bloque `{strategyResults.length > 0 && (...)}`, dentro del mismo `<>`):

```tsx
import { VerdictResultCard } from './VerdictResultCard';
```

```tsx
  const resultsByAgentId = new Map((currentRun?.results ?? []).map((r) => [r.agentId, r]));
  const strategyResults = (currentRun?.results ?? []).filter((r) => r.strategy);
  const verdictResults = (currentRun?.results ?? []).filter((r) => r.verdict);
  const levels = buildLevels(agents);
```

```tsx
            {verdictResults.length > 0 && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-base font-medium text-cyan whitespace-nowrap">Veredicto</span>
                  <span className="h-px flex-1 bg-line/60" aria-hidden="true" />
                </div>
                <div className="space-y-6">
                  {verdictResults.map((r) => {
                    const agent = agents.find((a) => a.id === r.agentId);
                    return r.verdict && agent ? (
                      <VerdictResultCard
                        key={r.agentId}
                        agentName={agent.name}
                        verdict={r.verdict}
                        attempt={r.attempt}
                        retryCount={currentRun?.retryCount}
                        maxRetries={currentRun?.maxRetries}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}
```

Colócalo inmediatamente después del bloque `{strategyResults.length > 0 && ( ... )}` existente, todavía dentro del `<>` que envuelve la cadena de agentes.

- [ ] **Step 5: Typecheck del cliente**

Run: `npx tsc -b trading-agents-dashboard/tsconfig.json --noEmit` (si tu versión de `tsc -b` no acepta `--noEmit` junto a `-b`, usa en su lugar `npx tsc --noEmit -p trading-agents-dashboard/tsconfig.app.json` si existe ese archivo de proyecto; confirma el nombre exacto del tsconfig del cliente con `ls trading-agents-dashboard/*.json` antes de ejecutar)
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add trading-agents-dashboard/src/components/AgentConfigModal.tsx trading-agents-dashboard/src/components/AgentCard.tsx trading-agents-dashboard/src/components/VerdictResultCard.tsx trading-agents-dashboard/src/components/Dashboard.tsx
git commit -m "feat(client): renderizar veredicto final, intentos de reintento y tipo de salida verdict"
```

---

### Task 7: Verificación end-to-end (simulado + real, y visual en navegador)

**Files:** ninguno — solo verificación, no hay cambios de código.

**Interfaces:** ninguna nueva.

- [ ] **Step 1: Dry run en modo simulado — confirma que el bucle de reintento dispara y termina**

En PowerShell, arranca el backend con las variables de OmniRoute vacías para forzar modo simulado (no sobrescribe `.env` en disco, solo el proceso):

```powershell
$env:OMNIROUTE_API_KEY = ""
$env:OMNIROUTE_BASE_URL = ""
npm run dev --prefix trading-agents-dashboard/server
```

En otra terminal, lanza un run y consulta su estado hasta que termine:

```powershell
$run = Invoke-RestMethod -Method Post -Uri http://localhost:5175/api/runs -Body (@{ pair = 'EUR/USD'; timeframe = 'H1' } | ConvertTo-Json) -ContentType 'application/json'
do {
  Start-Sleep -Seconds 1
  $run = Invoke-RestMethod http://localhost:5175/api/runs/$($run.id)
} while ($run.status -eq 'running')
$run.results | Select-Object agentId, status, attempt | Format-Table
$run.retryCount
```

Expected: `agente-riesgo`, `agente-validador-tecnico`, `agente-refutador` y `agente-razonador` aparecen con `attempt = 2` (el mock de veredicto pide `ajustar` en el primer intento y `go` en el reintento, ver Task 3 Step 3); `agente-tecnico`/`agente-fundamental` se quedan en `attempt` vacío/1 (no se reejecutan); `$run.retryCount` es `1`; `status` de todos es `done`.

Detén el servidor (Ctrl+C) para liberar el puerto antes del siguiente paso.

- [ ] **Step 2: Un run real contra OmniRoute**

Arranca el backend normal (con `.env` tal cual, ya tiene `OMNIROUTE_API_KEY` configurada):

```powershell
npm run dev --prefix trading-agents-dashboard/server
```

Lanza un run real y espera a que termine (puede tardar varios minutos — 6-8 llamadas reales, alguna con reintento si el veredicto real pide ajustar):

```powershell
$run = Invoke-RestMethod -Method Post -Uri http://localhost:5175/api/runs -Body (@{ pair = 'EUR/USD'; timeframe = 'H1' } | ConvertTo-Json) -ContentType 'application/json'
do {
  Start-Sleep -Seconds 5
  $run = Invoke-RestMethod http://localhost:5175/api/runs/$($run.id)
} while ($run.status -eq 'running')
$run.results | Select-Object agentId, status, error | Format-Table
($run.results | Where-Object { $_.agentId -eq 'agente-razonador' }).verdict
```

Expected: `status` de todos los agentes es `done` (ninguno en `error`); el veredicto del Razonador es uno de `go`/`ajustar`/`no_operar` con `razon` no vacía.

- [ ] **Step 3: Comprobación visual en el navegador**

Con el backend real todavía arrancado, levanta también el cliente (`npm run dev:client --prefix trading-agents-dashboard` en otra terminal, o `npm run dev --prefix trading-agents-dashboard` para los dos a la vez) y usa las herramientas de navegador disponibles para:

1. Navegar a `http://localhost:5173`.
2. Confirmar que la "Cadena de agentes" muestra 4 niveles: Analista Técnico + Analista Fundamental (mismo nivel) → Gestor de Riesgos → Validador de Coherencia Técnica + Refutador (mismo nivel) → Razonador.
3. Pulsar "Análisis anteriores" y cargar el run del Step 2; confirmar que aparece la tarjeta "Propuesta de estrategia" (Gestor de Riesgos) y, debajo, la nueva tarjeta "Veredicto" con el badge GO/AJUSTAR/NO OPERAR coloreado.
4. Capturar una captura de pantalla para dejar constancia visual del resultado.

Expected: sin errores en consola del navegador relacionados con `verdict`/`attempt`/campos nuevos; las 6 tarjetas de agente y la tarjeta de veredicto se ven correctamente.

- [ ] **Step 4: Confirmar que el plan y el spec siguen alineados**

Relee `trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md` y confirma que ningún paso de este plan lo contradice (roster, dependencias, mecánica de reintento, techo de 3). Si detectas una divergencia intencional (p. ej. la simplificación de `descendantChain` en la Task 4 Step 1, que se resolvió reutilizando `ancestorChain` en vez de escribir una función inversa aparte), añade una nota breve al spec explicando el cambio.

No hay commit en esta tarea — es solo verificación.

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const modelsRouter = Router();

/**
 * `GET /api/models` devuelve las fuentes de LLM disponibles y sus modelos, para el selector en
 * cascada del modal de configuración de agente (fuente -> modelo -> esfuerzo).
 *
 * El string que se guarda en `Agent.model` es `"<fuente>:<modelo>[:<esfuerzo>]"` (ver
 * `utils/modelString.ts`). `omniroute` no lleva prefijo (compatibilidad hacia atrás).
 */

interface LlmSourceInfo {
  id: 'omniroute' | 'claude' | 'openai';
  label: string;
  supportsEffort: boolean;
  efforts?: string[];
  /** Aviso corto para la UI (latencia, límites de suscripción, etc.). */
  note?: string;
}

interface ModelsResponse {
  sources: LlmSourceInfo[];
  modelsBySource: Record<string, string[]>;
}

const SOURCES: LlmSourceInfo[] = [
  { id: 'omniroute', label: 'OmniRoute (router local)', supportsEffort: false },
  {
    id: 'claude',
    label: 'Claude (mi suscripción)',
    supportsEffort: false,
    note: 'Usa tu suscripción vía CLI `claude`. Más lento que OmniRoute (~3-20 s por llamada).',
  },
  {
    id: 'openai',
    label: 'OpenAI / codex (mi ChatGPT)',
    supportsEffort: true,
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    note: 'Usa tu ChatGPT vía CLI `codex`. Más lento que OmniRoute (~5-30 s por llamada).',
  },
];

// Listas estáticas. De dónde salen:
//   claude: aliases que acepta `claude --model` (`claude --help`).
//   openai: los modelos que ofrece `codex` (comando `/model` en modo interactivo) para esta
//           cuenta ChatGPT. Verificado 2026-08-29 con `codex exec -m <m>`. OJO: los nombres
//           genéricos (`gpt-5`, `gpt-5-codex`, `gpt-5.1-codex-mini`) SÍ dan 400 "not supported
//           when using Codex with a ChatGPT account" — hay que usar estos nombres de plan.
//           Esfuerzos válidos para estos modelos: none|low|medium|high|xhigh|max (NO `minimal`).
//           Si el plan cambia, refrescar la lista con `codex` -> `/model`.
const CLAUDE_MODELS = ['sonnet', 'opus', 'haiku'];
const OPENAI_MODELS = ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'];

const OMNIROUTE_FALLBACK_MODELS = [
  'auto/best-reasoning',
  'auto/best-coding',
  'auto/best-fast',
  'auto/best-chat',
  'auto/best-vision',
];

async function fetchOmniRouteModels(): Promise<string[]> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) return OMNIROUTE_FALLBACK_MODELS;

  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return OMNIROUTE_FALLBACK_MODELS;
    const data = await response.json();
    const models: Array<{ id: string; type?: string }> = Array.isArray(data?.data) ? data.data : [];
    // OmniRoute's /v1/models also lists embedding/image/audio/rerank/moderation models
    // (marked with a `type`); chat-completion models are the ones without one.
    const ids = models.filter((m) => !m.type).map((m) => m.id);
    return ids.length > 0 ? ids : OMNIROUTE_FALLBACK_MODELS;
  } catch {
    return OMNIROUTE_FALLBACK_MODELS;
  }
}

modelsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const omniroute = await fetchOmniRouteModels();
    const body: ModelsResponse = {
      sources: SOURCES,
      modelsBySource: {
        omniroute,
        claude: CLAUDE_MODELS,
        openai: OPENAI_MODELS,
      },
    };
    res.json(body);
  })
);

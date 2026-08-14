import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const modelsRouter = Router();

const FALLBACK_MODELS = ['auto/best-reasoning', 'auto/best-coding', 'auto/best-fast', 'auto/best-chat', 'auto/best-vision'];

modelsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const baseUrl = process.env.OMNIROUTE_BASE_URL;
    const apiKey = process.env.OMNIROUTE_API_KEY;

    if (!baseUrl || !apiKey) {
      res.json(FALLBACK_MODELS);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        res.json(FALLBACK_MODELS);
        return;
      }
      const data = await response.json();
      const models: Array<{ id: string; type?: string }> = Array.isArray(data?.data) ? data.data : [];
      // OmniRoute's /v1/models also lists embedding/image/audio/rerank/moderation models
      // (marked with a `type`); chat-completion models are the ones without one.
      const ids = models.filter((m) => !m.type).map((m) => m.id);
      res.json(ids.length > 0 ? ids : FALLBACK_MODELS);
    } catch {
      res.json(FALLBACK_MODELS);
    }
  })
);

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const symbolSearchRouter = Router();

symbolSearchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      res.json([]);
      return;
    }
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      res.json([]);
      return;
    }
    const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const data = (await response.json()) as {
      data?: Array<{ symbol: string; instrument_name?: string; instrument_type?: string; exchange?: string }>;
    };
    const results = (data.data ?? []).slice(0, 20).map((r) => ({
      symbol: r.symbol,
      name: r.instrument_name,
      type: r.instrument_type,
      exchange: r.exchange,
    }));
    res.json(results);
  })
);

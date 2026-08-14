import { Router } from 'express';
import { getCandles } from '../marketData/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const candlesRouter = Router();

candlesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const pair = typeof req.query.pair === 'string' ? req.query.pair : '';
    const timeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : 'H1';
    if (!pair) {
      res.status(400).json({ error: 'pair is required' });
      return;
    }
    try {
      const candles = await getCandles(pair, timeframe);
      res.json(candles);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'no se pudieron obtener velas' });
    }
  })
);

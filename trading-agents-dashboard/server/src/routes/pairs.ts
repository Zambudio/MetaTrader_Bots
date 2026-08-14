import { Router } from 'express';
import { listPairs, savePairs } from '../store/pairsStore.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { SavedPair } from '../types.js';

export const pairsRouter = Router();

function sortFavoritesFirst(pairs: SavedPair[]): SavedPair[] {
  return [...pairs].sort((a, b) => Number(b.favorite) - Number(a.favorite));
}

pairsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(sortFavoritesFirst(await listPairs()));
  })
);

pairsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { symbol, name, type, exchange } = req.body ?? {};
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ error: 'symbol is required' });
      return;
    }
    const pairs = await listPairs();
    const existingIndex = pairs.findIndex((p) => p.symbol === symbol);
    if (existingIndex >= 0) {
      pairs[existingIndex] = { ...pairs[existingIndex], name, type, exchange };
    } else {
      pairs.push({ symbol, name, type, exchange, favorite: false });
    }
    await savePairs(pairs);
    res.status(201).json(sortFavoritesFirst(pairs));
  })
);

pairsRouter.patch(
  '/:symbol/favorite',
  asyncHandler(async (req, res) => {
    const symbol = decodeURIComponent(req.params.symbol);
    const favorite = Boolean(req.body?.favorite);
    const pairs = await listPairs();
    const existingIndex = pairs.findIndex((p) => p.symbol === symbol);
    if (existingIndex >= 0) {
      pairs[existingIndex] = { ...pairs[existingIndex], favorite };
    } else {
      pairs.push({ symbol, favorite });
    }
    await savePairs(pairs);
    res.json(sortFavoritesFirst(pairs));
  })
);

pairsRouter.delete(
  '/:symbol',
  asyncHandler(async (req, res) => {
    const symbol = decodeURIComponent(req.params.symbol);
    const pairs = await listPairs();
    const remaining = pairs.filter((p) => p.symbol !== symbol);
    await savePairs(remaining);
    res.json(sortFavoritesFirst(remaining));
  })
);

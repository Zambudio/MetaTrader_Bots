import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listSources, addSource, updateSource, deleteSource, listItems, markDigested,
} from '../store/newsStore.js';
import { fetchOneSource, fetchAllNewsSources } from '../engine/newsScheduler.js';
import { generateNewsDigest } from '../engine/newsDigest.js';
import { WIKI_DIR, WIKI_INDEX_FILE } from '../paths.js';
import type { NewsSource } from '../types.js';

export const newsRouter = Router();

newsRouter.get('/sources', asyncHandler(async (_req, res) => {
  res.json(await listSources());
}));

newsRouter.post('/sources', asyncHandler(async (req, res) => {
  const { name, kind, url } = req.body ?? {};
  if (!name || typeof name !== 'string') { res.status(400).json({ error: 'name is required' }); return; }
  if (kind !== 'rss' && kind !== 'generic_url') { res.status(400).json({ error: 'kind must be "rss" or "generic_url"' }); return; }
  if (!url || typeof url !== 'string') { res.status(400).json({ error: 'url is required' }); return; }
  res.status(201).json(await addSource({ name, kind, url }));
}));

newsRouter.put('/sources/:id', asyncHandler(async (req, res) => {
  const updated = await updateSource(req.params.id, req.body ?? {});
  if (!updated) { res.status(404).json({ error: 'source not found' }); return; }
  res.json(updated);
}));

newsRouter.delete('/sources/:id', asyncHandler(async (req, res) => {
  await deleteSource(req.params.id);
  res.json({ ok: true });
}));

newsRouter.post('/sources/:id/fetch', asyncHandler(async (req, res) => {
  const sources = await listSources();
  const source = sources.find((s) => s.id === req.params.id);
  if (!source) { res.status(404).json({ error: 'source not found' }); return; }
  res.json(await fetchOneSource(source));
}));

newsRouter.post('/fetch-all', asyncHandler(async (_req, res) => {
  const outcome = await fetchAllNewsSources(false);
  res.json(outcome.results);
}));

newsRouter.get('/items', asyncHandler(async (req, res) => {
  const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
  if (sourceId) { res.json(await listItems(sourceId)); return; }
  const sources = await listSources();
  const all = (await Promise.all(sources.map((s) => listItems(s.id)))).flat();
  all.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  res.json(all);
}));

newsRouter.post('/digest', asyncHandler(async (_req, res) => {
  const sources = await listSources();
  const allItems = (await Promise.all(sources.map((s) => listItems(s.id)))).flat();
  const result = await generateNewsDigest(allItems, { wikiDir: WIKI_DIR, indexFile: WIKI_INDEX_FILE });
  if (result.pageRelPath) {
    const bySource = new Map<string, string[]>();
    for (const item of allItems) {
      if (!result.digestedIds.includes(item.id)) continue;
      bySource.set(item.sourceId, [...(bySource.get(item.sourceId) ?? []), item.id]);
    }
    for (const [sourceId, ids] of bySource) await markDigested(sourceId, ids);
  }
  res.json(result);
}));

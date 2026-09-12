import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

export const symbolSearchRouter = Router();

// Simple in-memory cache with TTL to reduce TwelveData API calls (F5)
const searchCache = new Map<string, { results: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const MAX_CACHE_SIZE = 100;

// Rate limit to prevent quota exhaustion
const requestTimes: number[] = [];
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 8; // TwelveData free tier limit

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove old requests outside the window
  while (requestTimes.length > 0 && requestTimes[0]! < now - RATE_LIMIT_WINDOW_MS) {
    requestTimes.shift();
  }
  
  if (requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }
  
  requestTimes.push(now);
  return false;
}

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
    
    // Check cache first (F5)
    const cacheKey = query.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.results);
      return;
    }
    
    // Rate limit to prevent quota exhaustion (F5)
    if (isRateLimited()) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
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
    
    // Cache the result (F5)
    if (searchCache.size >= MAX_CACHE_SIZE) {
      // Simple eviction: remove first (oldest) entry
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, { results, timestamp: Date.now() });
    
    res.json(results);
  })
);

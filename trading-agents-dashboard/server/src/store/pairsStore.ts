import { readJson, writeJson } from './jsonStore.js';
import { PAIRS_FILE } from '../paths.js';
import type { SavedPair } from '../types.js';

const DEFAULT_PAIRS: SavedPair[] = [
  { symbol: 'EUR/USD', favorite: false },
  { symbol: 'GBP/USD', favorite: false },
  { symbol: 'USD/JPY', favorite: false },
  { symbol: 'USD/CHF', favorite: false },
  { symbol: 'AUD/USD', favorite: false },
  { symbol: 'USD/CAD', favorite: false },
  { symbol: 'NZD/USD', favorite: false },
  { symbol: 'BTC/USD', favorite: false },
  { symbol: 'ETH/USD', favorite: false },
  { symbol: 'XAU/USD', favorite: false },
];

export async function listPairs(): Promise<SavedPair[]> {
  return readJson<SavedPair[]>(PAIRS_FILE, DEFAULT_PAIRS);
}

export async function savePairs(pairs: SavedPair[]): Promise<void> {
  await writeJson(PAIRS_FILE, pairs);
}

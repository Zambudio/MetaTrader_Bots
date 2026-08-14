import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(currentDir, 'data');
export const RUNS_DIR = path.join(DATA_DIR, 'runs');
export const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
export const PAIRS_FILE = path.join(DATA_DIR, 'pairs.json');

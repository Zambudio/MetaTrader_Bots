import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(currentDir, 'data');
export const RUNS_DIR = path.join(DATA_DIR, 'runs');
export const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
export const AGENT_CONFIGS_FILE = path.join(DATA_DIR, 'agentConfigs.json');
export const PAIRS_FILE = path.join(DATA_DIR, 'pairs.json');
export const MQL5_COMPILE_DIR = path.join(DATA_DIR, 'mql5-tmp');
export const MQL5_DELIVERABLES_DIR = path.join(DATA_DIR, 'deliverables');
export const MQL5_ATTEMPTS_LOG = path.join(DATA_DIR, 'mql5-attempts-log.jsonl');
export const MQL5_KNOWN_ISSUES_FILE = path.join(DATA_DIR, 'mql5-known-issues.json');
export const MQL5_KNOWN_ISSUES_DOC = path.join(currentDir, '..', '..', 'docs', 'MQL5_ERRORES_CONOCIDOS.md');
export const WIKI_DIR = path.join(currentDir, '..', '..', '..', 'wiki-Traiding');
export const WIKI_INDEX_FILE = path.join(WIKI_DIR, 'index.md');

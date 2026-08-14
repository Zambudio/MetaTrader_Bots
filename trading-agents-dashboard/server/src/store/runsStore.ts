import path from 'node:path';
import { readJson, writeJson } from './jsonStore.js';
import { RUNS_DIR } from '../paths.js';
import type { Run } from '../types.js';

function runFile(id: string): string {
  return path.join(RUNS_DIR, `${id}.json`);
}

export async function saveRun(run: Run): Promise<void> {
  await writeJson(runFile(run.id), run);
}

export async function loadRun(id: string): Promise<Run | null> {
  return readJson<Run | null>(runFile(id), null);
}

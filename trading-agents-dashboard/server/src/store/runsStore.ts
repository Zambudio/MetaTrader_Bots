import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from './jsonStore.js';
import { RUNS_DIR } from '../paths.js';
import type { Run, RunSummary } from '../types.js';

const MAX_HISTORY = 50;

function runFile(id: string): string {
  return path.join(RUNS_DIR, `${id}.json`);
}

export async function saveRun(run: Run): Promise<void> {
  await writeJson(runFile(run.id), run);
}

export async function loadRun(id: string): Promise<Run | null> {
  return readJson<Run | null>(runFile(id), null);
}

export async function listRuns(): Promise<RunSummary[]> {
  let files: string[];
  try {
    files = await fs.readdir(RUNS_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const summaries = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        const run = await readJson<Run | null>(path.join(RUNS_DIR, f), null);
        if (!run) return null;
        const summary: RunSummary = {
          id: run.id,
          pair: run.pair,
          timeframe: run.timeframe,
          status: run.status,
          createdAt: run.createdAt,
          hasStrategy: run.results.some((r) => Boolean(r.strategy)),
        };
        return summary;
      })
  );

  return summaries
    .filter((s): s is RunSummary => s !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_HISTORY);
}

export async function deleteRun(id: string): Promise<void> {
  try {
    await fs.unlink(runFile(id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

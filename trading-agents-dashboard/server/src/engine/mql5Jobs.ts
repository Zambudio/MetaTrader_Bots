import { nanoid } from 'nanoid';
import type { Mql5GenerationResult } from '../types.js';
import type { Mql5GenerationProgress } from './mql5Generator.js';

export type Mql5Job =
  | { id: string; status: 'running'; progress: Mql5GenerationProgress }
  | { id: string; status: 'done'; result: Mql5GenerationResult }
  | { id: string; status: 'error'; message: string };

// Jobs are in-memory only — a dev-server restart (tsx watch) wipes them, which is fine:
// the frontend's poll then gets a clear "job not found" 404 instead of the request itself
// dying mid-flight (see docs/MQL5_ERRORES_CONOCIDOS.md for why /generate was a single
// multi-minute POST before this and why that broke).
const JOB_TTL_MS = 15 * 60 * 1000;

const jobs = new Map<string, Mql5Job>();
const cleanupTimers = new Map<string, NodeJS.Timeout>();

function scheduleCleanup(id: string): void {
  clearTimeout(cleanupTimers.get(id));
  const timer = setTimeout(() => {
    jobs.delete(id);
    cleanupTimers.delete(id);
  }, JOB_TTL_MS);
  timer.unref();
  cleanupTimers.set(id, timer);
}

export function createMql5Job(): string {
  const id = nanoid(12);
  jobs.set(id, {
    id,
    status: 'running',
    progress: { attempt: 1, maxAttempts: 1, phase: 'generating' },
  });
  return id;
}

export function updateMql5JobProgress(id: string, progress: Mql5GenerationProgress): void {
  const job = jobs.get(id);
  if (job?.status === 'running') {
    jobs.set(id, { id, status: 'running', progress });
  }
}

export function completeMql5Job(id: string, result: Mql5GenerationResult): void {
  jobs.set(id, { id, status: 'done', result });
  scheduleCleanup(id);
}

export function failMql5Job(id: string, message: string): void {
  jobs.set(id, { id, status: 'error', message });
  scheduleCleanup(id);
}

export function getMql5Job(id: string): Mql5Job | undefined {
  return jobs.get(id);
}

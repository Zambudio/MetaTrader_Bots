import { promises as fs } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { readJson, writeJson } from '../store/jsonStore.js';
import { loadRun } from '../store/runsStore.js';
import { MQL5_JOBS_DIR } from '../paths.js';
import type { Mql5GenerationResult } from '../types.js';

export interface Mql5GenerationProgress {
  attempt: number;
  maxAttempts: number;
  phase: 'generating' | 'compiling' | 'backtesting' | 'evaluating' | 'optimizing' | 'restrategizing';
  details?: string;
}

export type Mql5Job =
  | { id: string; status: 'running'; progress: Mql5GenerationProgress }
  | { id: string; status: 'done'; result: Mql5GenerationResult }
  | { id: string; status: 'error'; message: string };

/** Forma persistida en disco: el job + metadatos para reconciliación y TTL. */
interface PersistedMql5Job {
  job: Mql5Job;
  /** Run al que pertenece esta generación, si lo hay — permite recuperar el resultado
   *  ya guardado en el run si el proceso murió justo después de terminar. */
  runId?: string;
  updatedAt: string;
}

// El job vive en memoria (ruta rápida para el sondeo y las actualizaciones de progreso) y
// ADEMÁS se refleja en disco (`data/mql5-jobs/<id>.json`). El pipeline de generación MQL5 dura
// entre 3 y 25 min; un reinicio del servidor a mitad (redeploy, `update.ps1`, reinicio de PC,
// crash) antes perdía el job entero y el frontend recibía un 404 "job no encontrado" o —peor—
// un 502 del túnel durante la ventana de caída. Ahora, al arrancar, `reconcileOrphanedMql5Jobs`
// convierte esos jobs colgados en un estado `error` claro (o `done` si el backend alcanzó a
// guardar el resultado en el run), y `getMql5Job` los sirve desde disco.
const JOB_TTL_MS = 30 * 60 * 1000;
const PROGRESS_PERSIST_THROTTLE_MS = 2000;

const jobs = new Map<string, Mql5Job>();
const jobRunIds = new Map<string, string>();
const cleanupTimers = new Map<string, NodeJS.Timeout>();
const lastPersistAt = new Map<string, number>();

function jobFile(id: string): string {
  return path.join(MQL5_JOBS_DIR, `${id}.json`);
}

function persist(id: string): void {
  const job = jobs.get(id);
  if (!job) return;
  lastPersistAt.set(id, Date.now());
  const record: PersistedMql5Job = {
    job,
    runId: jobRunIds.get(id),
    updatedAt: new Date().toISOString(),
  };
  void writeJson(jobFile(id), record).catch((err) => {
    console.warn(`[mql5Jobs] no se pudo persistir el job ${id}:`, err instanceof Error ? err.message : err);
  });
}

async function removeJobFile(id: string): Promise<void> {
  await fs.unlink(jobFile(id)).catch(() => {});
}

function scheduleCleanup(id: string): void {
  clearTimeout(cleanupTimers.get(id));
  const timer = setTimeout(() => {
    jobs.delete(id);
    jobRunIds.delete(id);
    lastPersistAt.delete(id);
    cleanupTimers.delete(id);
    void removeJobFile(id);
  }, JOB_TTL_MS);
  timer.unref();
  cleanupTimers.set(id, timer);
}

export function createMql5Job(runId?: string): string {
  const id = nanoid(12);
  jobs.set(id, {
    id,
    status: 'running',
    progress: { attempt: 1, maxAttempts: 1, phase: 'generating' },
  });
  if (runId) jobRunIds.set(id, runId);
  persist(id);
  return id;
}

export function updateMql5JobProgress(id: string, progress: Mql5GenerationProgress): void {
  const job = jobs.get(id);
  if (job?.status === 'running') {
    jobs.set(id, { id, status: 'running', progress });
    // Reflejar el progreso en disco, pero sin una tormenta de escrituras: como mucho una cada
    // PROGRESS_PERSIST_THROTTLE_MS. El estado que de verdad importa preservar (done/error) se
    // escribe siempre desde complete/failMql5Job.
    const last = lastPersistAt.get(id) ?? 0;
    if (Date.now() - last >= PROGRESS_PERSIST_THROTTLE_MS) persist(id);
  }
}

export function completeMql5Job(id: string, result: Mql5GenerationResult): void {
  jobs.set(id, { id, status: 'done', result });
  persist(id);
  scheduleCleanup(id);
}

export function failMql5Job(id: string, message: string): void {
  jobs.set(id, { id, status: 'error', message });
  persist(id);
  scheduleCleanup(id);
}

export function getMql5Job(id: string): Mql5Job | undefined {
  return jobs.get(id);
}

/**
 * Igual que `getMql5Job` pero cae a disco si el job no está en memoria — el caso tras un
 * reinicio del servidor: el frontend sigue sondeando un jobId que ya no vive en el `Map`.
 * Devolver el estado persistido (típicamente `error` tras la reconciliación de arranque, o
 * `done` si se recuperó del run) evita el 404 y deja que la UI muestre "reintentar".
 */
export async function getMql5JobPersisted(id: string): Promise<Mql5Job | undefined> {
  const inMemory = jobs.get(id);
  if (inMemory) return inMemory;
  try {
    const record = await readJson<PersistedMql5Job | null>(jobFile(id), null);
    return record?.job;
  } catch {
    return undefined;
  }
}

/**
 * Al arrancar el proceso, todo job persistido con estado `running` es huérfano: la ejecución
 * en memoria que lo llevaba murió con el proceso anterior. Se reconcilia a un estado terminal:
 *   - `done` si su run ya tiene `mql5Result` (el backend terminó y guardó justo antes de morir),
 *   - `error` en cualquier otro caso, con un mensaje accionable.
 * Además barre ficheros de job caducados. Se corre una vez en el arranque, antes de aceptar
 * peticiones (igual que `reconcileOrphanedRuns`).
 *
 * `dir` es parametrizable solo para los tests; en producción siempre es `MQL5_JOBS_DIR`.
 */
export async function reconcileOrphanedMql5Jobs(dir: string = MQL5_JOBS_DIR): Promise<number> {
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw err;
  }

  const now = Date.now();
  let reconciled = 0;

  for (const f of files.filter((name) => name.endsWith('.json'))) {
    const full = path.join(dir, f);
    let record: PersistedMql5Job | null;
    try {
      record = await readJson<PersistedMql5Job | null>(full, null);
    } catch {
      // Fichero corrupto / a medio escribir de un crash anterior — no debe tumbar el arranque.
      await fs.unlink(full).catch(() => {});
      continue;
    }
    if (!record) {
      await fs.unlink(full).catch(() => {});
      continue;
    }

    const age = now - Date.parse(record.updatedAt || '');
    if (Number.isFinite(age) && age > JOB_TTL_MS) {
      await fs.unlink(full).catch(() => {});
      continue;
    }

    if (record.job.status !== 'running') continue;

    let reconciledJob: Mql5Job;
    const recoveredResult = record.runId ? (await loadRun(record.runId).catch(() => null))?.mql5Result : undefined;
    if (recoveredResult) {
      reconciledJob = { id: record.job.id, status: 'done', result: recoveredResult };
    } else {
      reconciledJob = {
        id: record.job.id,
        status: 'error',
        message:
          'El servidor se reinició mientras se generaba el código MQL5. La generación no continuó sola — pulsa "Reintentar generación" (puedes cambiar de modelo antes).',
      };
    }

    await writeJson(full, {
      job: reconciledJob,
      runId: record.runId,
      updatedAt: new Date().toISOString(),
    } satisfies PersistedMql5Job).catch(() => {});
    reconciled += 1;
  }

  return reconciled;
}

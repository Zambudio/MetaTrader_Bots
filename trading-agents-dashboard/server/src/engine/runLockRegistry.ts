/**
 * Lock de idempotencia en memoria por `run.id`, para `POST /runs/:id/resume` (H2 de la auditoría
 * 2026-09-26). Sin esto, un doble clic en "Reintentar" (o dos pestañas del dashboard) dispara dos
 * `resumeRun` concurrentes sobre copias en memoria independientes del mismo run: ambas leen
 * `status='error'` porque ninguna ha persistido todavía `status='running'`, ambas relanzan a los
 * mismos agentes en paralelo (llamadas CLI duplicadas, gasto de tokens/cuota duplicado) y la
 * última en persistir a disco pisa el progreso de la otra.
 *
 * `tryAcquireRunLock`/`releaseRunLock` se llaman síncronamente (sin ningún `await` entre el check
 * y el `add`) dentro del handler de la ruta, así que dos peticiones que lleguen "a la vez" al
 * mismo proceso Node quedan serializadas por el propio event loop: la primera que se ejecuta
 * síncronamente adquiere el lock, la segunda lo ve ocupado y se rechaza con 409 antes de tocar
 * disco. Vive en memoria del proceso (no en disco), igual que `runAbortRegistry` — si el servidor
 * se reinicia a mitad de un resume, `reconcileOrphanedRuns` (arranque) ya se encarga de marcar ese
 * run como error, así que no hace falta persistir este lock.
 */
const locked = new Set<string>();

/** `true` si se adquirió el lock (nadie lo tenía); `false` si ya había un resume en curso. */
export function tryAcquireRunLock(runId: string): boolean {
  if (locked.has(runId)) return false;
  locked.add(runId);
  return true;
}

export function releaseRunLock(runId: string): void {
  locked.delete(runId);
}

export function isRunLocked(runId: string): boolean {
  return locked.has(runId);
}

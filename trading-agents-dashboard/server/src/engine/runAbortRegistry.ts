/**
 * Registro en memoria de un `AbortController` por run en curso. Permite que
 * `POST /runs/:id/stop` detenga de verdad la llamada CLI/HTTP en vuelo (mata el proceso `claude`/
 * `codex`, aborta el `fetch` de OmniRoute) en vez de solo marcar el run como error en la base de
 * datos mientras el proceso hijo sigue vivo hasta su propio timeout.
 *
 * Vive en memoria del proceso del servidor (no en disco): si el servidor se reinicia, los runs en
 * curso ya se pierden de todas formas (no hay forma de "readjuntar" un `child_process` de un
 * proceso anterior), así que no hace falta persistir esto.
 */
const controllers = new Map<string, AbortController>();

/** Crea (o reemplaza) el controlador de un run. Cualquier controlador previo se aborta primero. */
export function createAbortControllerForRun(runId: string): AbortController {
  controllers.get(runId)?.abort();
  const controller = new AbortController();
  controllers.set(runId, controller);
  return controller;
}

export function getAbortSignal(runId: string): AbortSignal | undefined {
  return controllers.get(runId)?.signal;
}

/** Devuelve `true` si había un controlador activo y se ha disparado el abort. */
export function abortRun(runId: string): boolean {
  const controller = controllers.get(runId);
  if (!controller || controller.signal.aborted) return false;
  controller.abort();
  return true;
}

export function clearAbortController(runId: string): void {
  controllers.delete(runId);
}

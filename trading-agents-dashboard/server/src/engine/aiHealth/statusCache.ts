/**
 * Caché en memoria con TTL para el estado L1 de los proveedores. Lanzar `claude auth status` /
 * `codex login status` en cada petición HTTP sería lento; con la caché el panel responde al
 * instante y refresca en segundo plano cuando el snapshot caduca.
 */

export const STATUS_CACHE_TTL_MS = 5 * 60_000;

export interface StatusSnapshot<T> {
  providers: T[];
  checkedAt: string | null;
  refreshing: boolean;
}

export function isSnapshotExpired(checkedAt: string | null, now = Date.now(), ttlMs = STATUS_CACHE_TTL_MS): boolean {
  if (!checkedAt) return true;
  const parsed = Date.parse(checkedAt);
  return Number.isNaN(parsed) || now - parsed > ttlMs;
}

export function createStatusCache<T>(refreshFn: () => Promise<T[]>, ttlMs = STATUS_CACHE_TTL_MS) {
  let providers: T[] = [];
  let checkedAt: string | null = null;
  let refreshPromise: Promise<StatusSnapshot<T>> | null = null;

  const refresh = (): Promise<StatusSnapshot<T>> => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshFn()
      .then((result) => {
        providers = result;
        checkedAt = new Date().toISOString();
        return { providers, checkedAt, refreshing: false };
      })
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  return {
    /**
     * - `forceRefresh`, o sin snapshot todavía → espera a una comprobación en vivo.
     * - Snapshot caducado → devuelve el anterior y refresca en segundo plano.
     * - Snapshot vigente → lo devuelve tal cual.
     */
    async get(forceRefresh = false): Promise<StatusSnapshot<T>> {
      if (forceRefresh || checkedAt === null) return refresh();
      if (isSnapshotExpired(checkedAt, Date.now(), ttlMs)) {
        void refresh().catch(() => {});
      }
      return { providers, checkedAt, refreshing: refreshPromise !== null };
    },
    /** Marca el snapshot como caducado (p. ej. tras un login correcto). */
    invalidate(): void {
      checkedAt = null;
    },
  };
}

import type { AiModelCheck, AiProviderStatus } from '../types/ai';

export type BadgeTone = 'ok' | 'warn' | 'bad' | 'off';

export interface StatusBadge {
  tone: BadgeTone;
  label: string;
}

export const BADGE_CLASS: Record<BadgeTone, string> = {
  ok: 'text-bull border-bull/40 bg-bull/10',
  warn: 'text-amber border-amber/40 bg-amber/10',
  bad: 'text-bear border-bear/40 bg-bear/10',
  off: 'text-muted border-line-bright bg-void/60',
};

/** Insignia de un modelo según su última prueba L2. */
export function modelBadge(check: AiModelCheck | undefined, testing: boolean): StatusBadge {
  if (testing) return { tone: 'warn', label: 'Probando…' };
  if (!check) return { tone: 'warn', label: 'Sin probar' };
  if (check.state === 'operational') return { tone: 'ok', label: 'Operativo' };
  if (check.state === 'expired') return { tone: 'warn', label: 'Prueba caducada' };
  return { tone: 'bad', label: 'Fallo' };
}

/**
 * Insignia de un proveedor: L1 (binario + sesión) combinado con las pruebas L2 de sus modelos.
 * Verde solo si hay sesión y al menos un modelo operativo (L2 < 24 h); amarillo si hay sesión pero
 * ninguna prueba válida; rojo si falta sesión o todas las pruebas fallan; gris si no está instalado.
 */
export function providerBadge(status: AiProviderStatus, checks: AiModelCheck[]): StatusBadge {
  if (!status.available && status.errorCode === 'ENGINE_UNAVAILABLE') return { tone: 'off', label: 'No instalado' };
  if (!status.available) return { tone: 'bad', label: 'No conectado' };
  if (!status.authenticated) return { tone: 'bad', label: status.loginSupported ? 'Sin sesión' : 'Sin clave' };
  if (checks.some((c) => c.state === 'operational')) return { tone: 'ok', label: 'Operativo' };
  if (checks.length > 0 && checks.every((c) => c.state === 'failed')) return { tone: 'bad', label: 'Modelos con fallo' };
  return { tone: 'warn', label: 'Sin probar' };
}

export function formatCheckedAt(iso: string): string {
  const diffMin = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (Number.isNaN(diffMin)) return '—';
  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffMin < 24 * 60) return `hace ${Math.round(diffMin / 60)} h`;
  return `hace ${Math.round(diffMin / (24 * 60))} d`;
}

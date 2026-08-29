import type { LlmSourceId } from '../types/model';

/**
 * Parseo/serialización del string `Agent.model` — formato `"<fuente>:<modelo>[:<esfuerzo>]"`.
 *
 * ⚠️ DUPLICADO DELIBERADO de `server/src/utils/modelString.ts`. Vite no cruza a `server/` y son
 * ~40 líneas — si tocas una, toca la otra. La lógica DEBE coincidir con la del backend (el
 * router del servidor vuelve a parsear el string al ejecutar el agente).
 *
 * Compatible hacia atrás: cualquier valor sin prefijo de fuente conocido (`"auto/best-reasoning"`,
 * `""`, ...) se trata como `omniroute`.
 */

export const LLM_SOURCES: readonly LlmSourceId[] = ['omniroute', 'claude', 'openai', 'opencode'];

export interface ParsedModel {
  source: LlmSourceId;
  /** Cadena vacía = "modelo por defecto del servidor" (solo válido para omniroute). */
  model: string;
  effort?: string;
}

function isKnownSource(value: string): value is LlmSourceId {
  return (LLM_SOURCES as readonly string[]).includes(value);
}

export function parseModelString(raw: string | undefined | null): ParsedModel {
  const s = (raw ?? '').trim();
  if (!s) return { source: 'omniroute', model: '' };

  const firstColon = s.indexOf(':');
  if (firstColon === -1) return { source: 'omniroute', model: s };

  const maybeSource = s.slice(0, firstColon);
  if (!isKnownSource(maybeSource)) return { source: 'omniroute', model: s };

  const rest = s.slice(firstColon + 1);
  const parts = rest.split(':');
  return {
    source: maybeSource,
    model: (parts[0] ?? '').trim(),
    effort: parts[1]?.trim() || undefined,
  };
}

export function buildModelString(source: LlmSourceId, model: string, effort?: string): string {
  const cleanModel = (model ?? '').trim();
  if (source === 'omniroute') return cleanModel;

  const base = `${source}:${cleanModel}`;
  const cleanEffort = (effort ?? '').trim();
  return cleanEffort ? `${base}:${cleanEffort}` : base;
}

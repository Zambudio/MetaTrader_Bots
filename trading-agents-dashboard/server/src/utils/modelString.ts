/**
 * El campo `Agent.model` es un string con formato `"<fuente>:<modelo>[:<esfuerzo>]"`.
 * Compatible hacia atrás: cualquier valor SIN un prefijo de fuente conocido (p. ej.
 * `"auto/best-reasoning"`, `"cerebras/gpt-oss-120b"`, `""`) se trata como fuente `omniroute`.
 *
 * Ejemplos:
 *   ""                          -> { source: 'omniroute', model: '' }   (modelo por defecto del servidor)
 *   "auto/best-reasoning"       -> { source: 'omniroute', model: 'auto/best-reasoning' }
 *   "omniroute:cerebras/gpt-oss-120b" -> { source: 'omniroute', model: 'cerebras/gpt-oss-120b' }
 *   "claude:sonnet"             -> { source: 'claude',   model: 'sonnet' }
 *   "openai:gpt-5.6-sol:high"   -> { source: 'openai',   model: 'gpt-5.6-sol', effort: 'high' }
 *
 * NOTA: los nombres de modelo de todas las fuentes usan `/` o `.`, nunca `:`, así que el split
 * por `:` es seguro.
 */

export type LlmSource = 'omniroute' | 'claude' | 'openai' | 'opencode';

export const LLM_SOURCES: readonly LlmSource[] = ['omniroute', 'claude', 'openai', 'opencode'];

export interface ParsedModel {
  source: LlmSource;
  /** Cadena vacía = "usar el modelo por defecto del servidor" (solo válido para omniroute). */
  model: string;
  /** Esfuerzo de razonamiento, solo para fuentes que lo soportan (openai). */
  effort?: string;
}

function isKnownSource(value: string): value is LlmSource {
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

export function buildModelString(source: LlmSource, model: string, effort?: string): string {
  const cleanModel = (model ?? '').trim();
  // Compatibilidad hacia atrás: omniroute no lleva prefijo.
  if (source === 'omniroute') return cleanModel;

  const base = `${source}:${cleanModel}`;
  const cleanEffort = (effort ?? '').trim();
  return cleanEffort ? `${base}:${cleanEffort}` : base;
}

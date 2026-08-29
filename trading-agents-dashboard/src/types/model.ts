export type LlmSourceId = 'omniroute' | 'claude' | 'openai' | 'opencode';

export interface LlmSourceInfo {
  id: LlmSourceId;
  label: string;
  /** Si la fuente/modelo admite elegir esfuerzo de razonamiento (p. ej. codex). */
  supportsEffort: boolean;
  efforts?: string[];
  /** Aviso corto para la UI (latencia, límites de suscripción, etc.). */
  note?: string;
}

/** Respuesta de `GET /api/models`. */
export interface ModelsResponse {
  sources: LlmSourceInfo[];
  modelsBySource: Record<string, string[]>;
}

import { randomBytes } from 'node:crypto';

/**
 * Smoke test L2 con nonce: se pide al modelo devolver un JSON con un token aleatorio. Si el
 * nonce vuelve intacto, el modelo respondió de verdad a ESTA petición (no hay caché ni texto
 * alucinado), tiene cupo y respeta el formato.
 */

export function generateNonce(): string {
  return randomBytes(6).toString('hex');
}

export const SMOKE_TEST_SYSTEM_PROMPT =
  'Eres un verificador de conectividad. Responde exclusivamente con el JSON pedido, sin texto adicional.';

export function buildSmokeTestPrompt(nonce: string): string {
  return [
    'Devuelve únicamente JSON con este esquema, sin explicación ni texto adicional:',
    `{"status":"ready","nonce":"${nonce}","message":"preparado"}`,
    'No uses herramientas ni ejecutes comandos.',
  ].join('\n');
}

export interface SmokeTestParse {
  /** La respuesta contenía un objeto JSON parseable. */
  valid: boolean;
  /** `status === 'ready'` y el nonce coincide exactamente. */
  nonceValidated: boolean;
}

/** Extrae el primer objeto JSON de `text` (tolera fences ```json y texto alrededor). */
function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseSmokeTestResponse(text: string, expectedNonce: string): SmokeTestParse {
  const parsed = extractJsonObject(String(text ?? '')) as { status?: unknown; nonce?: unknown } | null;
  if (!parsed || typeof parsed !== 'object') return { valid: false, nonceValidated: false };
  return {
    valid: true,
    nonceValidated: parsed.status === 'ready' && parsed.nonce === expectedNonce,
  };
}

/**
 * Taxonomía normalizada de errores de los motores de IA (Claude CLI, codex CLI, OmniRoute).
 * Cada proveedor devuelve errores en formatos distintos; el panel de Ajustes de IA los mapea a
 * estos códigos para mostrar mensajes claros y una acción concreta.
 * Ver docs/funcionalidades/ajustes-ia.md.
 */

export type AiErrorCode =
  | 'ENGINE_UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'MODEL_NOT_FOUND'
  | 'MODEL_ACCESS_DENIED'
  | 'BILLING_REQUIRED'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'DEADLINE_EXCEEDED'
  | 'INVALID_RESPONSE'
  | 'CANCELLED';

export interface AiErrorInfo {
  title: string;
  action: string;
}

export const AI_ERROR_INFO: Record<AiErrorCode, AiErrorInfo> = {
  ENGINE_UNAVAILABLE: {
    title: 'Motor no disponible',
    action: 'Instala el CLI (o arranca el servicio local) y vuelve a comprobar.',
  },
  AUTH_REQUIRED: {
    title: 'Sesión no iniciada o caducada',
    action: 'Pulsa «Iniciar sesión» en la tarjeta del proveedor.',
  },
  MODEL_NOT_FOUND: {
    title: 'Modelo no encontrado',
    action: 'Elige otro modelo del desplegable.',
  },
  MODEL_ACCESS_DENIED: {
    title: 'Sin acceso a este modelo',
    action: 'Comprueba que tu suscripción o plan incluye ese modelo.',
  },
  BILLING_REQUIRED: {
    title: 'Requiere saldo o método de pago',
    action: 'Recarga créditos en el panel del proveedor.',
  },
  QUOTA_EXCEEDED: {
    title: 'Límite de uso alcanzado',
    action: 'Espera a que se renueve el cupo de tu suscripción o usa otro proveedor.',
  },
  RATE_LIMITED: {
    title: 'Demasiadas peticiones',
    action: 'Reintenta en unos segundos.',
  },
  NETWORK_ERROR: {
    title: 'Error de conexión',
    action: 'Comprueba la conexión a Internet o que el servicio local esté en marcha.',
  },
  DEADLINE_EXCEEDED: {
    title: 'Tiempo de espera agotado',
    action: 'Usa un modelo más rápido o reintenta.',
  },
  INVALID_RESPONSE: {
    title: 'Respuesta inválida',
    action: 'El modelo respondió, pero no devolvió el nonce exacto en JSON.',
  },
  CANCELLED: {
    title: 'Prueba cancelada',
    action: 'Ninguna.',
  },
};

// El orden importa: el primer patrón que coincide gana.
const TEXT_ERROR_PATTERNS: Array<[RegExp, AiErrorCode]> = [
  [/detenido por el usuario|cancelad[oa]|aborted/i, 'CANCELLED'],
  [/timeout|timed out|deadline|tiempo de espera/i, 'DEADLINE_EXCEEDED'],
  [/ENOENT|no se encuentra el entry|no se pudo lanzar|not (?:found|installed) in (?:the )?path|no se encontr[oó]/i, 'ENGINE_UNAVAILABLE'],
  [
    /not logged in|please run \/login|invalid api key|oauth token (?:has )?(?:expired|revoked)|authentication_error|unauthorized|\b401\b|no autenticad|missing api key|OMNIROUTE_API_KEY/i,
    'AUTH_REQUIRED',
  ],
  [/model not found|unknown model|model_not_found|does not exist|is archived|\b404\b/i, 'MODEL_NOT_FOUND'],
  [/not supported when using codex|access denied|forbidden|\b403\b|no tiene acceso|not available in your subscription/i, 'MODEL_ACCESS_DENIED'],
  [/billing|payment required|insufficient (?:funds|balance|credit)|\b402\b/i, 'BILLING_REQUIRED'],
  [
    /usage limit|limit reached|quota exceeded|free\s+quota|out of credits|cuota (?:agotada|excedida)|resets? at|weekly limit|5-hour limit/i,
    'QUOTA_EXCEEDED',
  ],
  [/rate.?limit|\b429\b|too many requests|demasiadas peticiones|\b503\b|overloaded/i, 'RATE_LIMITED'],
  [/ECONNREFUSED|ENOTFOUND|ECONNRESET|network|fetch failed|no se pudo conectar|CircuitBreaker/i, 'NETWORK_ERROR'],
];

/** Clasifica el texto de un error de proveedor. Si nada coincide → `INVALID_RESPONSE`. */
export function classifyErrorText(text: unknown): AiErrorCode {
  const value = String(text ?? '');
  for (const [pattern, code] of TEXT_ERROR_PATTERNS) {
    if (pattern.test(value)) return code;
  }
  return 'INVALID_RESPONSE';
}

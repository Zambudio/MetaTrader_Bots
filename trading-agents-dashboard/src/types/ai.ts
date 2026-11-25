/** Tipos de los Ajustes de IA. Reflejan `server/src/engine/aiHealth/*` y `server/src/routes/ai.ts`. */

export type AiProviderId = 'claude' | 'openai' | 'omniroute';

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

export interface AiProviderStatus {
  id: AiProviderId;
  label: string;
  available: boolean;
  authenticated: boolean;
  detail: string;
  errorCode: AiErrorCode | null;
  version?: string;
  account?: string;
  plan?: string;
  loginSupported: boolean;
}

export type AiModelCheckState = 'operational' | 'failed' | 'expired';

export interface AiModelCheck {
  state: AiModelCheckState;
  errorCode: AiErrorCode | null;
  errorDetail: string | null;
  durationMs: number;
  checkedAt: string;
}

export interface AiErrorInfo {
  title: string;
  action: string;
}

/** Respuesta de `GET /api/ai/status`. */
export interface AiStatusResponse {
  providers: AiProviderStatus[];
  checkedAt: string | null;
  refreshing: boolean;
  /** Últimas pruebas L2, indexadas por el string de modelo de la app (`claude:sonnet`). */
  checks: Record<string, AiModelCheck>;
  errorInfo: Record<AiErrorCode, AiErrorInfo>;
}

export type AiLoginState = 'starting' | 'waiting' | 'success' | 'failed' | 'cancelled';

export interface AiLoginSession {
  id: string;
  provider: 'claude' | 'openai';
  state: AiLoginState;
  url: string | null;
  userCode: string | null;
  acceptsCode: boolean;
  output: string;
  error: string | null;
}

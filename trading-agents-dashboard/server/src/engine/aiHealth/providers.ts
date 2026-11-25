import { fetchWithTimeout } from '../omniClient.js';
import { resolveClaudeBin, resolveCodexEntry, spawnCli, type CliRunResult } from '../cliClients/shared.js';
import { classifyErrorText, type AiErrorCode } from './errorTaxonomy.js';
import { createStatusCache } from './statusCache.js';

/**
 * Comprobación L1 (pasiva, coste cero) de cada proveedor de IA: binario instalado, sesión
 * iniciada y, en OmniRoute, catálogo de modelos accesible. No hace inferencia.
 */

export type ProviderId = 'claude' | 'openai' | 'omniroute';

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  /** El binario / servicio existe y responde. */
  available: boolean;
  /** Hay sesión (CLI) o la clave es válida (OmniRoute). */
  authenticated: boolean;
  detail: string;
  errorCode: AiErrorCode | null;
  version?: string;
  /** Email de la cuenta (CLI con sesión). */
  account?: string;
  /** Plan de la suscripción (p. ej. `pro`). */
  plan?: string;
  /** Se puede iniciar sesión desde la web (los CLIs sí; OmniRoute usa clave en `.env`). */
  loginSupported: boolean;
}

const CLI_TIMEOUT_MS = 15_000;
// 8 s: el primer contacto con el NAS tras un rato inactivo puede tardar más de 4 s.
const OMNIROUTE_TIMEOUT_MS = 8_000;

function cliText(run: CliRunResult): string {
  return `${run.stdout}\n${run.stderr}`.replace(/\x1b\[[0-9;]*m/g, '').trim();
}

export async function checkClaudeStatus(): Promise<ProviderStatus> {
  const base = { id: 'claude' as const, label: 'Claude (suscripción)', loginSupported: true };
  const bin = resolveClaudeBin();
  let version: string;
  try {
    const run = await spawnCli(bin, ['--version'], { timeoutMs: CLI_TIMEOUT_MS });
    if (run.code !== 0) throw new Error(cliText(run) || `código ${run.code}`);
    version = run.stdout.trim();
  } catch (err: any) {
    return {
      ...base,
      available: false,
      authenticated: false,
      errorCode: 'ENGINE_UNAVAILABLE',
      detail: `Claude Code no encontrado (${bin}): ${err?.message ?? err}`,
    };
  }

  try {
    const run = await spawnCli(bin, ['auth', 'status'], { timeoutMs: CLI_TIMEOUT_MS });
    let loggedIn = false;
    let account: string | undefined;
    let plan: string | undefined;
    try {
      const data = JSON.parse(run.stdout);
      loggedIn = Boolean(data?.loggedIn);
      account = typeof data?.email === 'string' ? data.email : undefined;
      plan = typeof data?.subscriptionType === 'string' ? data.subscriptionType : undefined;
    } catch {
      loggedIn = /logged in/i.test(cliText(run)) && !/not logged in/i.test(cliText(run));
    }
    return {
      ...base,
      available: true,
      authenticated: loggedIn,
      errorCode: loggedIn ? null : 'AUTH_REQUIRED',
      version,
      account,
      plan,
      detail: loggedIn ? 'Sesión activa' : 'Falta iniciar sesión',
    };
  } catch (err: any) {
    return { ...base, available: true, authenticated: false, errorCode: classifyErrorText(err?.message), version, detail: String(err?.message ?? err) };
  }
}

export async function checkCodexStatus(): Promise<ProviderStatus> {
  const base = { id: 'openai' as const, label: 'OpenAI / Codex (ChatGPT)', loginSupported: true };
  let entry: string;
  try {
    entry = resolveCodexEntry();
  } catch (err: any) {
    return { ...base, available: false, authenticated: false, errorCode: 'ENGINE_UNAVAILABLE', detail: String(err?.message ?? err) };
  }

  try {
    const versionRun = await spawnCli(process.execPath, [entry, '--version'], { timeoutMs: CLI_TIMEOUT_MS });
    const version = cliText(versionRun).split('\n')[0]?.trim() || undefined;
    // `codex login status` escribe en stderr ("Logged in using ChatGPT") y sale con 0 si hay sesión.
    const statusRun = await spawnCli(process.execPath, [entry, 'login', 'status'], { timeoutMs: CLI_TIMEOUT_MS });
    const text = cliText(statusRun);
    const loggedIn = statusRun.code === 0 && /logged in/i.test(text) && !/not logged in/i.test(text);
    return {
      ...base,
      available: true,
      authenticated: loggedIn,
      errorCode: loggedIn ? null : 'AUTH_REQUIRED',
      version,
      detail: loggedIn ? text || 'Sesión activa' : 'Falta iniciar sesión',
    };
  } catch (err: any) {
    return { ...base, available: false, authenticated: false, errorCode: classifyErrorText(err?.message), detail: String(err?.message ?? err) };
  }
}

export async function checkOmniRouteStatus(): Promise<ProviderStatus> {
  const base = { id: 'omniroute' as const, label: 'OmniRoute (router local)', loginSupported: false };
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;
  if (!baseUrl || !apiKey) {
    return {
      ...base,
      available: false,
      authenticated: false,
      errorCode: 'AUTH_REQUIRED',
      detail: 'Faltan OMNIROUTE_BASE_URL / OMNIROUTE_API_KEY en server/.env',
    };
  }
  try {
    const res = await fetchWithTimeout(`${baseUrl}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } }, OMNIROUTE_TIMEOUT_MS);
    if (res.status === 401 || res.status === 403) {
      return { ...base, available: true, authenticated: false, errorCode: 'AUTH_REQUIRED', detail: `Clave de API rechazada (HTTP ${res.status})` };
    }
    if (!res.ok) {
      return { ...base, available: false, authenticated: false, errorCode: 'NETWORK_ERROR', detail: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data: any = await res.json().catch(() => ({}));
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ...base, available: true, authenticated: true, errorCode: null, detail: `Conectado a ${baseUrl} (${count} modelos)` };
  } catch (err: any) {
    return { ...base, available: false, authenticated: false, errorCode: 'NETWORK_ERROR', detail: `Inaccesible en ${baseUrl} (${err?.message ?? err})` };
  }
}

export const providerStatusCache = createStatusCache<ProviderStatus>(() =>
  Promise.all([checkClaudeStatus(), checkCodexStatus(), checkOmniRouteStatus()])
);

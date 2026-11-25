import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ChatMessage } from '../omniClient.js';

/**
 * Helpers comunes a los adaptadores de CLI (`claudeCli.ts`, `codexCli.ts`).
 *
 * Requisito duro del proyecto: las llamadas a Claude / OpenAI se hacen por CLI usando la
 * autenticación de SUSCRIPCIÓN del usuario (`claude` logueado, `codex` "Logged in using
 * ChatGPT"). NUNCA por clave de API de pago por token. Por eso `stripPaidApiKeys` quita
 * `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` del entorno del proceso hijo: si están presentes,
 * los CLIs facturarían por API en vez de consumir la suscripción.
 */

const PAID_API_KEY_VARS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'OPENAI_API_KEY'] as const;

export function stripPaidApiKeys(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = { ...env };
  for (const key of PAID_API_KEY_VARS) delete clean[key];
  return clean;
}

/**
 * Timeout (ms) para UNA llamada a un CLI de agente de análisis (`claude -p`, `codex exec`).
 * Configurable con `AGENT_CLI_TIMEOUT_MS`; si no está definido o es basura, se usa `fallbackMs`.
 *
 * Los revisores (`fx-risk`/`fx-critic` y equivalentes) reciben por stdin la cadena de contexto de
 * TODOS sus ancestros + snapshot + propuesta de estrategia, y varios agentes del mismo nivel del
 * grafo se lanzan en paralelo. Con el tope fijo de 180 s (`claude`) se les mataba a mitad de
 * inferencia — evidencia: run `_rWt37-Ku2` (TSLA), `stock-risk` y `stock-critic` fallaron con
 * `[claudeCli] timeout (180s)` y dejaron al juez en `waiting` y el run en `error`. Mismo patrón que
 * `MQL5_GEN_TIMEOUT_MS` para la generación de código.
 */
export function resolveAgentCliTimeoutMs(fallbackMs: number): number {
  const raw = Number(process.env.AGENT_CLI_TIMEOUT_MS);
  return Number.isFinite(raw) && raw >= 1000 ? Math.floor(raw) : fallbackMs;
}

/**
 * Nº de reintentos ante fallos TRANSITORIOS de un CLI de agente (`AGENT_CLI_RETRIES`, def.
 * `fallback`, tope 5). Un hipo puntual de la suscripción (`claude` sale con código 1 y stdout/
 * stderr vacíos en pocos segundos) no debe tumbar un run entero cuando `llmRouter` no hace
 * fallback entre fuentes.
 */
export function resolveAgentCliRetries(fallback: number): number {
  const raw = Number(process.env.AGENT_CLI_RETRIES);
  if (!Number.isFinite(raw) || raw < 0) return fallback;
  return Math.min(5, Math.floor(raw));
}

/**
 * ¿El error de una invocación de CLI es TRANSITORIO (merece reintento) y no un fallo de
 * contenido/entrada? Transitorio: salida no cero con stdout/stderr vacíos, stdout no parseable
 * como el sobre JSON del CLI, `.result` vacío, `subtype != success`, "no se pudo lanzar", o
 * cualquier fallo reportado por `codex`. NO transitorio: detención deliberada del usuario, timeout
 * (probable prompt demasiado grande / saturación — reintentar agrava), límite de sesión/uso de la
 * suscripción (reintentar no lo levanta), y errores de parseo del JSON de la RESPUESTA del modelo
 * (`extractBalancedJson` — el reintento probablemente reproduce el mismo formato roto).
 */
export function isTransientCliError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/detenido por el usuario/i.test(msg)) return false;
  if (/timeout \(\d+s\)/i.test(msg)) return false;
  if (/hit your (?:session|usage) limit|l[ií]mite de (?:sesi[oó]n|uso)|usage limit reached/i.test(msg)) return false;
  if (/no contiene ning[uú]n objeto JSON|objeto JSON sin cerrar/i.test(msg)) return false;
  return (
    /sali[oó] con c[oó]digo \d+\.\s*stdout y stderr vac[ií]os/i.test(msg) ||
    /stdout no es JSON parseable/i.test(msg) ||
    /no devolvi[oó] texto en \.result/i.test(msg) ||
    /devolvi[oó] error \(subtype=/i.test(msg) ||
    /no se pudo lanzar/i.test(msg) ||
    /codex fall[oó] \(c[oó]digo/i.test(msg)
  );
}

export interface CliRunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** El usuario pidió detener el análisis (botón "Detener") — distinto de un timeout normal. */
  aborted: boolean;
}

export interface CliRunOptions {
  input?: string;
  cwd?: string;
  timeoutMs?: number;
  /** Si se dispara, mata el proceso igual que un timeout pero marca `aborted: true`. */
  signal?: AbortSignal;
}

/**
 * Lanza un CLI, le pasa el prompt por stdin (evita límites de longitud/escape en la línea de
 * comandos de Windows) y captura stdout/stderr con un timeout duro.
 */
export function spawnCli(command: string, args: string[], options: CliRunOptions = {}): Promise<CliRunResult> {
  const { input, cwd, timeoutMs = 180_000, signal } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: stripPaidApiKeys(process.env),
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let aborted = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const onAbort = () => {
      aborted = true;
      child.kill('SIGKILL');
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve({ code, stdout, stderr, timedOut, aborted });
    });

    if (input != null) {
      child.stdin.on('error', () => {
        /* EPIPE si el hijo muere antes de leer stdin — el timeout / close lo maneja */
      });
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

const ROLE_LABEL: Record<ChatMessage['role'], string> = {
  system: 'INSTRUCCIONES DEL SISTEMA',
  user: 'USUARIO',
  assistant: 'ASISTENTE',
};

/**
 * Aplana la conversación estilo OpenAI (`messages[]`) a un único prompt de texto para un CLI
 * que solo acepta un prompt plano. `includeSystem: false` para cuando el system va por un flag
 * nativo del CLI (p. ej. `claude --system-prompt`).
 */
export function flattenMessages(messages: ChatMessage[], opts: { includeSystem?: boolean } = {}): string {
  const includeSystem = opts.includeSystem ?? true;
  return messages
    .filter((m) => includeSystem || m.role !== 'system')
    .map((m) => `${ROLE_LABEL[m.role] ?? m.role.toUpperCase()}:\n${m.content.trim()}`)
    .join('\n\n');
}

/**
 * Extrae el primer objeto JSON balanceado (`{ ... }`) de un texto. Los modelos por CLI a veces
 * envuelven el JSON en prosa pese a las instrucciones; esto lo rescata antes de `JSON.parse`.
 * `sanitizeJsonResponse` (de omniClient) ya quita fences markdown; esto cubre la prosa.
 */
export function extractBalancedJson(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('la salida del CLI no contiene ningún objeto JSON');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('la salida del CLI tiene un objeto JSON sin cerrar');
}

/**
 * Envuelve el texto extraído en la forma que esperan `parseToolArgs` (realExecutor) y el
 * codegen (`mql5Generator`): `{ choices: [{ message: { content } }] }`.
 */
export function toChoicesResponse(content: string): any {
  return { choices: [{ message: { content } }] };
}

function firstExisting(candidates: Array<string | undefined>): string | undefined {
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return undefined;
}

/**
 * Ruta al binario `claude` (Claude Code). Orden: `CLAUDE_CLI_BIN` explícito -> el propio
 * ejecutable que lanzó esta sesión (`CLAUDE_CODE_EXECPATH`) -> instalación estándar en
 * `~/.local/bin/claude.exe` -> `claude` (confía en el PATH).
 */
export function resolveClaudeBin(): string {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  return (
    process.env.CLAUDE_CLI_BIN ||
    firstExisting([
      process.env.CLAUDE_CODE_EXECPATH,
      home ? join(home, '.local', 'bin', 'claude.exe') : undefined,
      home ? join(home, '.local', 'bin', 'claude') : undefined,
    ]) ||
    'claude'
  );
}

/**
 * Ruta al entry JS de `codex` (codex-cli). Se lanza con `node <codex.js>` en vez del wrapper
 * `.cmd` para evitar el requisito de `shell: true` de Node en Windows al spawnear `.cmd`.
 * Orden: `CODEX_CLI_JS` explícito -> instalación global de npm en `%APPDATA%\npm\...`.
 */
export function resolveCodexEntry(): string {
  const appData = process.env.APPDATA ?? '';
  const resolved =
    process.env.CODEX_CLI_JS ||
    firstExisting([
      appData ? join(appData, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js') : undefined,
    ]);
  if (!resolved) {
    throw new Error(
      '[codexCli] no se encuentra el entry de codex-cli. Instálalo (`npm i -g @openai/codex`) o define CODEX_CLI_JS con la ruta a bin/codex.js'
    );
  }
  return resolved;
}

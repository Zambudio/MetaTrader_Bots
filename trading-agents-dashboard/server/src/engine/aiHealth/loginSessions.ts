import { spawn, type ChildProcess } from 'node:child_process';
import { nanoid } from 'nanoid';
import { resolveClaudeBin, resolveCodexEntry, stripPaidApiKeys } from '../cliClients/shared.js';

/**
 * Sesiones de login guiado desde la web. El servidor lanza el login del CLI en el PC donde corre
 * (`claude auth login` / `codex login --device-auth`), extrae la URL (y el código de un solo uso
 * en codex) y se la muestra al usuario. En Claude, si el navegador pide pegar un código, se
 * reenvía al stdin del proceso. Verificado 2026-09-19 en Windows sin terminal:
 *   - claude: imprime "visit: <url>" y "Paste code here if prompted >" (lee stdin).
 *   - codex --device-auth: imprime la URL de verificación y un código `XXXX-XXXXX`.
 *
 * Solo hay una sesión activa por proveedor: iniciar otra cancela la anterior.
 */

export type LoginProvider = 'claude' | 'openai';
export type LoginState = 'starting' | 'waiting' | 'success' | 'failed' | 'cancelled';

export interface LoginSessionView {
  id: string;
  provider: LoginProvider;
  state: LoginState;
  /** URL que el usuario debe abrir (si el navegador no se abrió solo). */
  url: string | null;
  /** Código de un solo uso a introducir en la página (codex device auth). */
  userCode: string | null;
  /** Este login admite pegar un código de vuelta (claude). */
  acceptsCode: boolean;
  /** Últimas líneas de salida del CLI, sin códigos ANSI, para diagnóstico. */
  output: string;
  error: string | null;
}

const LOGIN_TIMEOUT_MS = 15 * 60_000;
const FINISHED_SESSION_TTL_MS = 10 * 60_000;
const MAX_OUTPUT_CHARS = 4000;
const MAX_CODE_LENGTH = 512;

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/** Extrae la URL de login y el código de un solo uso de la salida del CLI. Función pura. */
export function parseLoginOutput(
  provider: LoginProvider,
  text: string
): { url: string | null; userCode: string | null } {
  const clean = stripAnsi(text);
  const url = /https:\/\/[^\s"'<>]+/.exec(clean)?.[0] ?? null;
  // Solo codex usa código de un solo uso (`XXXX-XXXXX`); la URL larga de Claude podría dar falsos positivos.
  const userCode = provider === 'openai' ? (/\b([A-Z0-9]{4}-[A-Z0-9]{4,6})\b/.exec(clean)?.[1] ?? null) : null;
  return { url, userCode };
}

interface InternalSession {
  view: LoginSessionView;
  child: ChildProcess;
  timer: NodeJS.Timeout;
}

const sessions = new Map<string, InternalSession>();
let onSuccess: (() => void) | undefined;

/** Registra un callback para cuando un login termina bien (invalida la caché de estado). */
export function setLoginSuccessListener(listener: () => void): void {
  onSuccess = listener;
}

function commandFor(provider: LoginProvider): { command: string; args: string[] } {
  if (provider === 'claude') return { command: resolveClaudeBin(), args: ['auth', 'login', '--claudeai'] };
  return { command: process.execPath, args: [resolveCodexEntry(), 'login', '--device-auth'] };
}

function toView(s: InternalSession): LoginSessionView {
  return { ...s.view };
}

function endSession(s: InternalSession, state: LoginState, error: string | null): void {
  if (s.view.state !== 'starting' && s.view.state !== 'waiting') return;
  clearTimeout(s.timer);
  s.view.state = state;
  s.view.error = error;
  // Las sesiones terminadas se conservan un rato para que la UI lea el resultado final.
  setTimeout(() => sessions.delete(s.view.id), FINISHED_SESSION_TTL_MS).unref();
  if (state === 'success') onSuccess?.();
}

export function startLogin(provider: LoginProvider): LoginSessionView {
  for (const existing of sessions.values()) {
    if (existing.view.provider === provider) cancelLogin(existing.view.id);
  }

  const { command, args } = commandFor(provider);
  const child = spawn(command, args, { env: stripPaidApiKeys(process.env), windowsHide: true });
  const view: LoginSessionView = {
    id: nanoid(10),
    provider,
    state: 'starting',
    url: null,
    userCode: null,
    acceptsCode: provider === 'claude',
    output: '',
    error: null,
  };
  const session: InternalSession = {
    view,
    child,
    timer: setTimeout(() => {
      endSession(session, 'failed', 'Tiempo de espera agotado (15 min) sin completar el inicio de sesión.');
      child.kill();
    }, LOGIN_TIMEOUT_MS),
  };
  sessions.set(view.id, session);

  const onData = (chunk: Buffer | string) => {
    view.output = (view.output + stripAnsi(String(chunk))).slice(-MAX_OUTPUT_CHARS);
    const parsed = parseLoginOutput(provider, view.output);
    view.url = parsed.url ?? view.url;
    view.userCode = parsed.userCode ?? view.userCode;
    if (view.state === 'starting') view.state = 'waiting';
  };
  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);
  child.stdin?.on('error', () => {
    /* EPIPE si el CLI ya terminó */
  });
  child.on('error', (err) => endSession(session, 'failed', `No se pudo lanzar el CLI: ${err.message}`));
  child.on('close', (code) => {
    if (code === 0) endSession(session, 'success', null);
    else endSession(session, 'failed', `El inicio de sesión terminó con código ${code}. ${view.output.trim().split('\n').slice(-3).join(' ')}`.trim());
  });

  return toView(session);
}

export function getLogin(id: string): LoginSessionView | null {
  const s = sessions.get(id);
  return s ? toView(s) : null;
}

/** Reenvía el código pegado por el usuario al stdin del CLI (solo login de Claude). */
export function submitLoginCode(id: string, code: string): LoginSessionView | null {
  const s = sessions.get(id);
  if (!s) return null;
  const clean = code.trim();
  if (!s.view.acceptsCode) throw new Error('Este proveedor no admite pegar un código: completa el paso en el navegador.');
  if (s.view.state !== 'waiting') throw new Error('La sesión de login ya no está esperando un código.');
  if (!clean || clean.length > MAX_CODE_LENGTH || /[\r\n]/.test(clean)) throw new Error('Código no válido.');
  s.child.stdin?.write(`${clean}\n`);
  return toView(s);
}

export function cancelLogin(id: string): LoginSessionView | null {
  const s = sessions.get(id);
  if (!s) return null;
  endSession(s, 'cancelled', null);
  s.child.kill();
  return toView(s);
}

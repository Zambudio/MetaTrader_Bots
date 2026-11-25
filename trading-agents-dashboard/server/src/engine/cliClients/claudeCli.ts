import {
  buildJsonSchemaSystemMessage,
  sanitizeJsonResponse,
  type ChatMessage,
  type OmniClientOptions,
  type ToolDefinition,
} from '../omniClient.js';
import {
  extractBalancedJson,
  flattenMessages,
  isTransientCliError,
  resolveAgentCliRetries,
  resolveAgentCliTimeoutMs,
  resolveClaudeBin,
  spawnCli,
  toChoicesResponse,
} from './shared.js';

/**
 * Adaptador de la CLI `claude` (Claude Code) usando la SUSCRIPCIÓN del usuario.
 *
 * Comando (verificado 2026-08-29 desde child_process en Windows):
 *   claude -p --output-format json --model <model> --system-prompt <sys> \
 *          --disallowedTools Bash Edit Write Read Glob Grep WebFetch WebSearch Task NotebookEdit
 *   (el user prompt va por stdin)
 *
 * stdout = un objeto JSON envoltorio con `.result` (string = texto del modelo), `.is_error`,
 * `.subtype`, `.total_cost_usd` (informativo — lo que costaría por API; la suscripción NO
 * cobra por token).
 */

// El default de `claude -p` incluye TODO el system prompt del agente Claude Code (herramientas,
// etc.). Con `--system-prompt` lo reemplazamos por el prompt del agente. Además prohibimos las
// tools para que no intente leer ficheros / ejecutar comandos en una petición de puro texto.
const DISALLOWED_TOOLS = [
  'Bash', 'Edit', 'Write', 'Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit',
];

const CLAUDE_BIN = resolveClaudeBin();

/**
 * Texto de diagnóstico para un `claude -p` que terminó con código != 0.
 *
 * Con `--output-format json`, los errores de sesión, límite de uso o modelo NO van a stderr:
 * `claude` imprime el sobre JSON (`is_error`, `result`, `subtype`) en stdout y sale con código 1.
 * Antes solo se mostraba stderr, así que el error salía siempre como `stderr: (vacío)` y la causa
 * real (p. ej. "Claude AI usage limit reached") quedaba oculta.
 */
export function describeClaudeFailure(stdout: string, stderr: string): string {
  const err = stderr.trim();
  const out = stdout.trim();
  let detail = '';
  try {
    const envelope = JSON.parse(out);
    const result = typeof envelope?.result === 'string' ? envelope.result.trim() : '';
    const subtype = typeof envelope?.subtype === 'string' ? envelope.subtype : '';
    detail = [subtype && `subtype=${subtype}`, result].filter(Boolean).join(': ');
  } catch {
    detail = out.slice(0, 500);
  }
  const parts = [detail && `stdout: ${detail.slice(0, 500)}`, err && `stderr: ${err.slice(0, 500)}`].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : 'stdout y stderr vacíos';
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function claudeCliAttempt(
  model: string,
  messages: ChatMessage[],
  tool: ToolDefinition | null | undefined,
  options: OmniClientOptions
): Promise<any> {
  const systemPrompt = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join('\n\n');

  let userPrompt = flattenMessages(messages, { includeSystem: false });
  if (tool) userPrompt += `\n\n${buildJsonSchemaSystemMessage(tool)}`;

  const args = ['-p', '--output-format', 'json'];
  if (model.trim()) args.push('--model', model.trim());
  if (systemPrompt) args.push('--system-prompt', systemPrompt);
  // `--disallowedTools <tools...>` es variádico: va el último para no tragarse otros flags.
  args.push('--disallowedTools', ...DISALLOWED_TOOLS);

  const timeoutMs = options.timeoutMs ?? resolveAgentCliTimeoutMs(180_000);
  const startedAt = Date.now();
  console.log(`[claudeCli] spawn: ${CLAUDE_BIN} -p --model ${model || 'sonnet'}${tool ? ` (JSON tool=${tool.function.name})` : ''} — suscripción`);
  let run;
  try {
    run = await spawnCli(CLAUDE_BIN, args, { input: userPrompt, timeoutMs, signal: options.signal });
  } catch (err: any) {
    throw new Error(`[claudeCli] no se pudo lanzar '${CLAUDE_BIN}': ${err?.message ?? err}`);
  }
  console.log(`[claudeCli] claude terminó en ${((Date.now() - startedAt) / 1000).toFixed(1)}s (código ${run.code})`);

  if (run.aborted) {
    throw new Error('[claudeCli] detenido por el usuario');
  }
  if (run.timedOut) {
    throw new Error(`[claudeCli] timeout (${Math.round(timeoutMs / 1000)}s) esperando a claude`);
  }
  if (run.code !== 0) {
    throw new Error(`[claudeCli] claude salió con código ${run.code}. ${describeClaudeFailure(run.stdout, run.stderr)}`);
  }

  let envelope: any;
  try {
    envelope = JSON.parse(run.stdout);
  } catch {
    throw new Error(`[claudeCli] stdout no es JSON parseable: ${run.stdout.slice(0, 400)}`);
  }

  if (envelope?.is_error || (typeof envelope?.subtype === 'string' && envelope.subtype !== 'success')) {
    throw new Error(
      `[claudeCli] claude devolvió error (subtype=${envelope?.subtype}): ${String(envelope?.result ?? '').slice(0, 400)}`
    );
  }

  const result = typeof envelope?.result === 'string' ? envelope.result : '';
  if (!result.trim()) {
    throw new Error('[claudeCli] claude no devolvió texto en .result');
  }

  const content = tool ? extractBalancedJson(sanitizeJsonResponse(result)) : result;
  return toChoicesResponse(content);
}

/**
 * Reintento acotado ante fallos TRANSITORIOS (salida rápida con stdout/stderr vacíos, stdout no
 * parseable, `.result` vacío, subtype != success). Evidencia real (rama `validacion-real-forex`):
 * run `real-forex-20260830150301-r1-current` — `fx-judge` falló con "claude salió con código 1.
 * stdout y stderr vacíos" en 6.1 s, en la 3ª pasada, y tumbó un run de ~30 min ya completado hasta
 * el juez. `llmRouter` NO hace fallback entre fuentes, así que sin esto un hipo puntual de la
 * suscripción cuesta la ejecución entera. Nunca reintenta si el usuario abortó o si es timeout
 * (ver `isTransientCliError`).
 */
export async function claudeCliChatCompletion(
  model: string,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
): Promise<any> {
  const maxRetries = resolveAgentCliRetries(2);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await claudeCliAttempt(model, messages, tool, options);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isTransientCliError(err)) {
        const backoffMs = 2_000 * (attempt + 1);
        console.warn(`[claudeCli] fallo transitorio (intento ${attempt + 1}/${maxRetries + 1}): ${err instanceof Error ? err.message : err}. Reintento en ${backoffMs / 1000}s.`);
        await delay(backoffMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

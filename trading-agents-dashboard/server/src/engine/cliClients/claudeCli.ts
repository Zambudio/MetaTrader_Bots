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

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Una sola invocación de `claude -p`. Lanza en cualquier fallo; el reintento lo gestiona el caller. */
async function claudeCliAttempt(
  args: string[],
  userPrompt: string,
  timeoutMs: number,
  model: string,
  tool?: ToolDefinition | null
): Promise<any> {
  const startedAt = Date.now();
  console.log(`[claudeCli] spawn: ${CLAUDE_BIN} -p --model ${model || 'sonnet'}${tool ? ` (JSON tool=${tool.function.name})` : ''} — suscripción`);
  let run;
  try {
    run = await spawnCli(CLAUDE_BIN, args, { input: userPrompt, timeoutMs });
  } catch (err: any) {
    throw new Error(`[claudeCli] no se pudo lanzar '${CLAUDE_BIN}': ${err?.message ?? err}`);
  }
  console.log(`[claudeCli] claude terminó en ${((Date.now() - startedAt) / 1000).toFixed(1)}s (código ${run.code})`);

  if (run.timedOut) {
    throw new Error(`[claudeCli] timeout (${Math.round(timeoutMs / 1000)}s) esperando a claude`);
  }
  if (run.code !== 0) {
    throw new Error(
      `[claudeCli] claude salió con código ${run.code}. stderr: ${run.stderr.slice(0, 500) || '(vacío)'}`
    );
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

export async function claudeCliChatCompletion(
  model: string,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
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
  const maxRetries = resolveAgentCliRetries(2);

  // Reintento acotado ante fallos TRANSITORIOS (salida rápida con código 1 y stderr vacío,
  // stdout no parseable, `.result` vacío, subtype != success). Evidencia: run
  // `real-forex-20260830150301-r1-current` — `fx-judge` falló con `claude salió con código 1.
  // stderr: (vacío)` en 6.1 s, en la 3ª pasada, y tumbó un run de ~30 min ya completado hasta el
  // juez. `llmRouter` NO hace fallback entre fuentes, así que sin esto un hipo puntual de la
  // suscripción cuesta la ejecución entera. Un timeout NO se reintenta (probablemente el prompt
  // es demasiado grande o el modelo está saturado — reintentar solo agravaría).
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await claudeCliAttempt(args, userPrompt, timeoutMs, model, tool);
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

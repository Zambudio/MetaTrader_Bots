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

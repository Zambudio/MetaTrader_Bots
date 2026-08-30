import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  resolveCodexEntry,
  spawnCli,
  toChoicesResponse,
} from './shared.js';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Adaptador de la CLI `codex` (codex-cli) usando la SUSCRIPCIÓN ChatGPT del usuario
 * ("Logged in using ChatGPT").
 *
 * Comando (verificado 2026-08-29 desde child_process en Windows):
 *   node <codex.js> exec - -o <tmpOut> --skip-git-repo-check --sandbox read-only --color never \
 *        -c model_reasoning_effort=<effort> [-m <model>]
 *   (el prompt aplanado va por stdin; el mensaje final del modelo se escribe LIMPIO en <tmpOut>)
 *
 * Se lanza con `node <codex.js>` (no el wrapper `.cmd`) para no necesitar `shell: true`.
 * El cwd es un directorio temporal LOCAL (no el disco de red del proyecto) porque el sandbox
 * `read-only` de codex deniega `\\Zambu-nas\` de forma intermitente.
 *
 * ⚠️ codex con cuenta ChatGPT usa nombres de modelo de plan (`gpt-5.6-sol`, `gpt-5.6-terra`,
 * `gpt-5.5`, `gpt-5.4-mini`…, ver `codex` -> `/model`). Los nombres genéricos (`gpt-5`,
 * `gpt-5-codex`) dan 400 "not supported when using Codex with a ChatGPT account".
 * Esfuerzos válidos: none|low|medium|high|xhigh|max (NO `minimal`).
 */

const VALID_EFFORTS = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max']);

// Resolución perezosa y memoizada: si codex no está instalado, solo debe fallar cuando alguien
// elige de verdad la fuente "openai", no al arrancar el servidor.
let cachedCodexEntry: string | undefined;
function codexEntry(): string {
  if (cachedCodexEntry === undefined) cachedCodexEntry = resolveCodexEntry();
  return cachedCodexEntry;
}

export async function codexCliChatCompletion(
  model: string,
  effort: string | undefined,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
): Promise<any> {
  const maxRetries = resolveAgentCliRetries(2);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await codexCliAttempt(model, effort, messages, tool, options);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isTransientCliError(err)) {
        const backoffMs = 2_000 * (attempt + 1);
        console.warn(`[codexCli] fallo transitorio (intento ${attempt + 1}/${maxRetries + 1}): ${err instanceof Error ? err.message : err}. Reintento en ${backoffMs / 1000}s.`);
        await delay(backoffMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function codexCliAttempt(
  model: string,
  effort: string | undefined,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
): Promise<any> {
  let prompt = flattenMessages(messages, { includeSystem: true });
  if (tool) prompt += `\n\n${buildJsonSchemaSystemMessage(tool)}`;

  const workDir = await mkdtemp(join(tmpdir(), 'codex-agent-'));
  const outFile = join(workDir, 'last-message.txt');
  const timeoutMs = options.timeoutMs ?? resolveAgentCliTimeoutMs(240_000);

  try {
    const args = [
      codexEntry(),
      'exec',
      '-',
      '-o', outFile,
      '--skip-git-repo-check',
      '--sandbox', 'read-only',
      '--color', 'never',
    ];
    if (effort && VALID_EFFORTS.has(effort)) {
      args.push('-c', `model_reasoning_effort=${effort}`);
    }
    if (model.trim()) {
      args.push('-m', model.trim());
    }

    const startedAt = Date.now();
    console.log(
      `[codexCli] spawn: codex exec -m ${model || 'gpt-5.6-sol (def)'}${effort ? ` effort=${effort}` : ''}` +
        `${tool ? ` (JSON tool=${tool.function.name})` : ''} — suscripción ChatGPT`
    );
    let run;
    try {
      run = await spawnCli(process.execPath, args, { input: prompt, cwd: workDir, timeoutMs });
    } catch (err: any) {
      throw new Error(`[codexCli] no se pudo lanzar codex: ${err?.message ?? err}`);
    }
    console.log(`[codexCli] codex terminó en ${((Date.now() - startedAt) / 1000).toFixed(1)}s (código ${run.code})`);

    if (run.timedOut) {
      throw new Error(`[codexCli] timeout (${Math.round(timeoutMs / 1000)}s) esperando a codex`);
    }

    let lastMessage = '';
    try {
      lastMessage = await readFile(outFile, 'utf8');
    } catch {
      /* el fichero no se escribió — se maneja abajo */
    }

    if (run.code !== 0 || !lastMessage.trim()) {
      // codex escribe `ERROR: {json}` en stdout ante errores de API (rate limit, modelo no
      // permitido por el plan, etc.) — extraerlo para un mensaje útil.
      const apiError = /ERROR:\s*(\{[\s\S]*?\})\s*$/m.exec(run.stdout)?.[1];
      const detail =
        apiError ||
        run.stderr.slice(0, 500).trim() ||
        run.stdout.slice(-500).trim() ||
        '(sin salida)';
      throw new Error(`[codexCli] codex falló (código ${run.code}): ${detail}`);
    }

    const content = tool
      ? extractBalancedJson(sanitizeJsonResponse(lastMessage))
      : lastMessage.trim();
    return toChoicesResponse(content);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

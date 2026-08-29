import { chatCompletion, type ChatMessage, type OmniClientOptions, type ToolDefinition } from './omniClient.js';
import { parseModelString } from '../utils/modelString.js';
import { claudeCliChatCompletion } from './cliClients/claudeCli.js';
import { codexCliChatCompletion } from './cliClients/codexCli.js';

/**
 * Router de LLM. Firma IDÉNTICA a `omniClient.chatCompletion` para no tocar a los llamadores
 * (`realExecutor.ts`, `mql5Generator.ts` la importan con alias `chatCompletion`).
 *
 * Despacha según el prefijo de fuente del string `model` (`"<fuente>:<modelo>[:<esfuerzo>]"`,
 * ver `utils/modelString.ts`):
 *   - `omniroute` (o cualquier string sin prefijo conocido) -> `omniClient.chatCompletion` tal
 *     cual, con su cadena de fallback de modelo.
 *   - `claude`  -> CLI `claude` con la suscripción del usuario.
 *   - `openai`  -> CLI `codex` con la suscripción ChatGPT del usuario.
 *   - `opencode` -> aún no implementado.
 *
 * Devuelve SIEMPRE la forma `{ choices: [{ message: { content?, tool_calls? } }] }` que ya
 * saben leer `parseToolArgs` (realExecutor) y `requestEa` (mql5Generator).
 *
 * A diferencia de OmniRoute, el router NO hace fallback entre fuentes: si el CLI de una fuente
 * falla, el agente falla y el orquestador lo marca `error` (comportamiento actual ante fallo
 * de LLM). No se reintenta en bucle contra límites de suscripción.
 */
export async function routeChatCompletion(
  model: string,
  messages: ChatMessage[],
  tool?: ToolDefinition | null,
  options: OmniClientOptions = {}
): Promise<any> {
  const { source, model: bareModel, effort } = parseModelString(model);

  if (source !== 'omniroute') {
    console.log(
      `[llmRouter] fuente=${source} modelo=${bareModel || '(por defecto)'}${effort ? ` esfuerzo=${effort}` : ''}` +
        `${tool ? ` tool=${tool.function.name}` : ''}`
    );
  }

  switch (source) {
    case 'claude':
      return claudeCliChatCompletion(bareModel, messages, tool, options);

    case 'openai':
      return codexCliChatCompletion(bareModel, effort, messages, tool, options);

    case 'opencode':
      throw new Error(
        'La fuente "opencode" aún no está implementada. Ver el plan del selector CLI, §"Añadir una fuente nueva".'
      );

    case 'omniroute':
    default: {
      const omniModel = bareModel || process.env.OMNIROUTE_DEFAULT_MODEL || 'auto/best-reasoning';
      return chatCompletion(omniModel, messages, tool, options);
    }
  }
}

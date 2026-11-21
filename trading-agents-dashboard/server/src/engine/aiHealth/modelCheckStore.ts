import { readJson, writeJson } from '../../store/jsonStore.js';
import { MODEL_CHECKS_FILE } from '../../paths.js';
import type { AiErrorCode } from './errorTaxonomy.js';

/**
 * Persistencia del último smoke test L2 de cada modelo (`server/data/modelChecks.json`, fuera de
 * git). La clave es el string de modelo de la app (`claude:sonnet`, `openai:gpt-5.6-sol`,
 * `auto/best-coding`), el mismo que se guarda en `Agent.model`.
 */

/** Pasadas 24 h desde la última prueba correcta, el modelo se considera `expired`. */
export const CHECK_EXPIRY_MS = 24 * 60 * 60 * 1000;

export type ModelCheckState = 'operational' | 'failed';
export type ModelCheckViewState = ModelCheckState | 'expired';

export interface ModelCheckResult {
  state: ModelCheckState;
  errorCode: AiErrorCode | null;
  errorDetail: string | null;
  durationMs: number;
  checkedAt: string;
}

export interface ModelCheckView extends Omit<ModelCheckResult, 'state'> {
  state: ModelCheckViewState;
}

type Store = Record<string, ModelCheckResult>;

export function effectiveCheckState(result: ModelCheckResult, now = Date.now()): ModelCheckViewState {
  if (result.state !== 'operational') return result.state;
  const checkedAt = Date.parse(result.checkedAt);
  return Number.isNaN(checkedAt) || now - checkedAt > CHECK_EXPIRY_MS ? 'expired' : 'operational';
}

export async function recordModelCheck(modelKey: string, result: ModelCheckResult): Promise<void> {
  const store = await readJson<Store>(MODEL_CHECKS_FILE, {});
  store[modelKey] = result;
  await writeJson(MODEL_CHECKS_FILE, store);
}

export async function listModelChecks(now = Date.now()): Promise<Record<string, ModelCheckView>> {
  const store = await readJson<Store>(MODEL_CHECKS_FILE, {});
  const views: Record<string, ModelCheckView> = {};
  for (const [key, result] of Object.entries(store)) {
    views[key] = { ...result, state: effectiveCheckState(result, now) };
  }
  return views;
}

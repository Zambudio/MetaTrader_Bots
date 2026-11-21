import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { localOnly } from '../middleware/localOnly.js';
import { AI_ERROR_INFO } from '../engine/aiHealth/errorTaxonomy.js';
import { providerStatusCache } from '../engine/aiHealth/providers.js';
import { listModelChecks } from '../engine/aiHealth/modelCheckStore.js';
import { runModelSmokeTest, TESTABLE_SOURCES, type TestableSource } from '../engine/aiHealth/smokeTestRunner.js';
import {
  cancelLogin,
  getLogin,
  setLoginSuccessListener,
  startLogin,
  submitLoginCode,
  type LoginProvider,
} from '../engine/aiHealth/loginSessions.js';

/**
 * Ajustes de IA: estado L1 de los proveedores, smoke test L2 de modelos y login guiado de los
 * CLIs. TODO el router es `localOnly` (ver `middleware/localOnly.ts`).
 * Ver docs/funcionalidades/ajustes-ia.md.
 */
export const aiRouter = Router();
aiRouter.use(localOnly);

// Tras un login correcto el estado cacheado ya no es válido.
setLoginSuccessListener(() => providerStatusCache.invalidate());

const LOGIN_PROVIDERS: readonly LoginProvider[] = ['claude', 'openai'];

function isLoginProvider(value: string): value is LoginProvider {
  return (LOGIN_PROVIDERS as readonly string[]).includes(value);
}

function isTestableSource(value: unknown): value is TestableSource {
  return typeof value === 'string' && (TESTABLE_SOURCES as readonly string[]).includes(value);
}

/** `GET /api/ai/status[?forceRefresh=true]` → estado L1 de cada proveedor + últimas pruebas L2. */
aiRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const snapshot = await providerStatusCache.get(req.query.forceRefresh === 'true');
    res.json({ ...snapshot, checks: await listModelChecks(), errorInfo: AI_ERROR_INFO });
  })
);

/** `POST /api/ai/models/check` `{ source, model }` → smoke test L2. Cancelable cerrando la petición. */
aiRouter.post(
  '/models/check',
  asyncHandler(async (req, res) => {
    const { source, model } = req.body ?? {};
    if (!isTestableSource(source)) {
      res.status(400).json({ error: `source inválido. Usa: ${TESTABLE_SOURCES.join(', ')}` });
      return;
    }
    if (typeof model !== 'string' || model.length > 200) {
      res.status(400).json({ error: 'model debe ser un string' });
      return;
    }

    // El botón "Cancelar" del panel aborta el fetch → se cierra la conexión → se mata el proceso.
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    const { modelKey, result } = await runModelSmokeTest({ source, model: model.trim(), signal: controller.signal });
    res.json({ modelKey, ...result });
  })
);

/** `POST /api/ai/login/:provider` (claude | openai) → arranca el login guiado. */
aiRouter.post(
  '/login/:provider',
  asyncHandler(async (req, res) => {
    const provider = String(req.params.provider);
    if (!isLoginProvider(provider)) {
      res.status(400).json({ error: 'Este proveedor no admite login desde la web.' });
      return;
    }
    res.json(startLogin(provider));
  })
);

aiRouter.get('/login/:id', (req, res) => {
  const session = getLogin(String(req.params.id));
  if (!session) {
    res.status(404).json({ error: 'Sesión de login no encontrada o caducada.' });
    return;
  }
  res.json(session);
});

/** `POST /api/ai/login/:id/code` `{ code }` → reenvía el código pegado al CLI (solo Claude). */
aiRouter.post('/login/:id/code', (req, res) => {
  const code = req.body?.code;
  if (typeof code !== 'string') {
    res.status(400).json({ error: 'code debe ser un string' });
    return;
  }
  try {
    const session = submitLoginCode(String(req.params.id), code);
    if (!session) {
      res.status(404).json({ error: 'Sesión de login no encontrada o caducada.' });
      return;
    }
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo enviar el código' });
  }
});

aiRouter.delete('/login/:id', (req, res) => {
  const session = cancelLogin(String(req.params.id));
  if (!session) {
    res.status(404).json({ error: 'Sesión de login no encontrada o caducada.' });
    return;
  }
  res.json(session);
});

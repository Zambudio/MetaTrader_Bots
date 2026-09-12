import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import { agentsRouter } from './routes/agents.js';
import { agentConfigsRouter } from './routes/agentConfigs.js';
import { runsRouter } from './routes/runs.js';
import { pairsRouter } from './routes/pairs.js';
import { modelsRouter } from './routes/models.js';
import { candlesRouter } from './routes/candles.js';
import { symbolSearchRouter } from './routes/symbolSearch.js';
import { mql5Router } from './routes/mql5.js';
import { backtestRouter } from './routes/backtest.js';
import { newsRouter } from './routes/news.js';
import { reconcileOrphanedRuns } from './store/runsStore.js';
import { reconcileOrphanedMql5Jobs } from './engine/mql5Jobs.js';
import { startNewsScheduler } from './engine/newsScheduler.js';

import { apiKeyAuth } from './middleware/auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 5175;

app.use(cors());
// Los logs del Strategy Tester de MetaTrader (docs/BACKTEST_LOG_ANALYZER.md) pueden pesar
// varios MB en backtests largos, muy por encima del límite por defecto de express.json (100kb).
app.use(express.json({ limit: '25mb' }));
app.use(apiKeyAuth);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/agents', agentsRouter);
app.use('/api/agent-configs', agentConfigsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/candles', candlesRouter);
app.use('/api/symbols/search', symbolSearchRouter);
app.use('/api/mql5', mql5Router);
app.use('/api/backtest', backtestRouter);
app.use('/api/news', newsRouter);

// ── Frontend compilado (producción) ────────────────────────────────────────────
// En `npm run dev` el frontend lo sirve Vite (localhost:5173) y proxya /api aquí.
// En producción (servicio siempre-activo) este mismo proceso sirve el build de
// `dist/` en el mismo origen, así que el cliente llama a `/api/...` sin CORS ni
// segundo puerto. Si `dist/` no existe, el server sigue en modo API-only.
// Ver docs/DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md.
const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
if (existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: cualquier GET que no sea /api/* ni un fichero estático → index.html
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
  console.log(`[trading-agents-server] frontend servido desde ${CLIENT_DIST}`);
} else {
  console.log('[trading-agents-server] dist/ no encontrado — modo API-only (frontend vía "npm run dev")');
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'internal error' });
});

Promise.allSettled([
  reconcileOrphanedRuns()
    .then((count) => {
      if (count > 0) console.warn(`[trading-agents-server] ${count} run(s) huérfano(s) de un arranque anterior marcado(s) como error.`);
    })
    .catch((err) => console.error('[trading-agents-server] error reconciliando runs huérfanos', err)),
  reconcileOrphanedMql5Jobs()
    .then((count) => {
      if (count > 0) console.warn(`[trading-agents-server] ${count} job(s) de generación MQL5 huérfano(s) reconciliado(s).`);
    })
    .catch((err) => console.error('[trading-agents-server] error reconciliando jobs MQL5 huérfanos', err)),
]).finally(() => {
  app.listen(PORT, () => {
    console.log(`[trading-agents-server] listening on http://localhost:${PORT}`);
    startNewsScheduler();
  });
});

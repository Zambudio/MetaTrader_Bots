import express from 'express';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import { agentsRouter } from './routes/agents.js';
import { runsRouter } from './routes/runs.js';
import { pairsRouter } from './routes/pairs.js';
import { modelsRouter } from './routes/models.js';
import { candlesRouter } from './routes/candles.js';
import { symbolSearchRouter } from './routes/symbolSearch.js';
import { mql5Router } from './routes/mql5.js';
import { backtestRouter } from './routes/backtest.js';

const app = express();
const PORT = Number(process.env.PORT) || 5175;

app.use(cors());
// Los logs del Strategy Tester de MetaTrader (docs/BACKTEST_LOG_ANALYZER.md) pueden pesar
// varios MB en backtests largos, muy por encima del límite por defecto de express.json (100kb).
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/agents', agentsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/candles', candlesRouter);
app.use('/api/symbols/search', symbolSearchRouter);
app.use('/api/mql5', mql5Router);
app.use('/api/backtest', backtestRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'internal error' });
});

app.listen(PORT, () => {
  console.log(`[trading-agents-server] listening on http://localhost:${PORT}`);
});

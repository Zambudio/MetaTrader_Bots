import express from 'express';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import { agentsRouter } from './routes/agents.js';
import { runsRouter } from './routes/runs.js';
import { pairsRouter } from './routes/pairs.js';
import { modelsRouter } from './routes/models.js';
import { candlesRouter } from './routes/candles.js';
import { symbolSearchRouter } from './routes/symbolSearch.js';

const app = express();
const PORT = Number(process.env.PORT) || 5175;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/agents', agentsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/candles', candlesRouter);
app.use('/api/symbols/search', symbolSearchRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'internal error' });
});

app.listen(PORT, () => {
  console.log(`[trading-agents-server] listening on http://localhost:${PORT}`);
});

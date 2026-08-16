import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseMt5Log } from '../engine/mt5LogParser.js';

export const backtestRouter = Router();

backtestRouter.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    const { logText } = req.body ?? {};
    if (typeof logText !== 'string' || logText.trim().length === 0) {
      res.status(400).json({ error: 'logText vacío o inválido' });
      return;
    }

    const sessions = parseMt5Log(logText);
    if (sessions.length === 0) {
      res.status(422).json({
        error:
          'No se reconoció ninguna prueba del Strategy Tester en este archivo. ¿Es el log de la carpeta Tester/.../Agent-.../logs/AAAAMMDD.log?',
      });
      return;
    }

    res.json({ sessions });
  })
);

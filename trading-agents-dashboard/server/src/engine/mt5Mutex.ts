import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from '../paths.js';

const MT5_LOCK_FILE = path.join(DATA_DIR, '.mt5-lock');
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 min timeout (backtest max is ~3 min per job)

interface LockInfo {
  pid: number;
  timestamp: number;
  jobId: string;
}

export async function acquireMt5Lock(jobId: string, timeoutMs: number = LOCK_TIMEOUT_MS): Promise<void> {
  const startTime = Date.now();
  const lockInfo: LockInfo = {
    pid: process.pid,
    timestamp: Date.now(),
    jobId,
  };

  while (true) {
    try {
      // Intenta crear el archivo de lock de forma atómica
      const handle = await fs.open(MT5_LOCK_FILE, 'wx');
      await handle.write(JSON.stringify(lockInfo, null, 2));
      await handle.close();
      return; // Lock adquirido exitosamente
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }

      // El archivo de lock existe; comprobar si es válido
      try {
        const lockData = await fs.readFile(MT5_LOCK_FILE, 'utf8');
        const existingLock: LockInfo = JSON.parse(lockData);
        const lockAge = Date.now() - existingLock.timestamp;

        if (lockAge > LOCK_TIMEOUT_MS) {
          // Lock expirado; intenta eliminarlo y reintentar
          await fs.unlink(MT5_LOCK_FILE);
          continue;
        }
      } catch {
        // No se puede leer el lock; espera y reintenta
      }

      // Lock activo; espera un poco e intenta de nuevo
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `MT5 lock timeout: No se pudo adquirir acceso a MetaTrader tras ${Math.round(timeoutMs / 1000)}s. ` +
          `Otro job MQL5 está en curso; reintenta en unos minutos.`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export async function releaseMt5Lock(): Promise<void> {
  try {
    await fs.unlink(MT5_LOCK_FILE);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // Lock file no existe; nada que hacer
  }
}

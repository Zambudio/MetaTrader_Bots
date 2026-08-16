import { promises as fs } from 'node:fs';
import path from 'node:path';

const writeQueues = new Map<string, Promise<void>>();

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

const RENAME_RETRY_ATTEMPTS = 5;
const RENAME_RETRY_DELAY_MS = 150;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// El proyecto vive en una unidad de red (NAS por SMB), donde el rename atómico usado abajo
// para escribir sin corromper el archivo puede fallar de forma transitoria con EPERM/EBUSY si
// algo (antivirus, indexador, el propio cliente SMB) retiene el destino un instante — algo que
// en disco local casi nunca pasa. Visto en producción con mql5-known-issues.json. Reintentamos
// unas pocas veces con espera creciente antes de rendirnos; cualquier otro código de error se
// relanza de inmediato.
async function renameWithRetry(tmpPath: string, filePath: string): Promise<void> {
  for (let attempt = 1; attempt <= RENAME_RETRY_ATTEMPTS; attempt++) {
    try {
      await fs.rename(tmpPath, filePath);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt === RENAME_RETRY_ATTEMPTS || (code !== 'EPERM' && code !== 'EBUSY')) {
        await fs.unlink(tmpPath).catch(() => {});
        throw err;
      }
      await sleep(RENAME_RETRY_DELAY_MS * attempt);
    }
  }
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  const prev = writeQueues.get(filePath) ?? Promise.resolve();
  const next = prev.then(async () => {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await renameWithRetry(tmpPath, filePath);
  });
  writeQueues.set(
    filePath,
    next.catch(() => undefined)
  );
  return next;
}

import { promises as fs, constants as fsConstants } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { MQL5_COMPILE_DIR } from '../paths.js';

const DEFAULT_METAEDITOR_PATH = 'C:\\Program Files\\MetaTrader 5\\metaeditor64.exe';
const COMPILE_TIMEOUT_MS = 30_000;

export interface CompileResult {
  status: 'ok' | 'errors' | 'unverified';
  errors: string[];
  warnings: string[];
}

async function resolveMetaeditorPath(): Promise<string | null> {
  const candidate = process.env.METAEDITOR_PATH || DEFAULT_METAEDITOR_PATH;
  try {
    await fs.access(candidate, fsConstants.F_OK);
    return candidate;
  } catch {
    return null;
  }
}

function parseLog(raw: string, srcPath: string, displayName: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // MetaEditor también reporta errores/warnings de los headers estándar que el EA incluye
    // (p.ej. Trade.mqh: "declaration of 'request' hides global variable" en casi cualquier EA
    // que use CTrade) — no son accionables porque no forman parte del código generado, así que
    // se descartan y solo se muestran los que apuntan al propio archivo compilado.
    if (!line.includes(srcPath)) continue;
    const readable = line.split(srcPath).join(displayName);
    if (/:\s*error\s+\d+:/i.test(line)) {
      errors.push(readable);
    } else if (/:\s*warning\s+\d+:/i.test(line)) {
      warnings.push(readable);
    }
  }
  return { errors, warnings };
}

export async function compileMql5(code: string, displayName: string): Promise<CompileResult> {
  const exe = await resolveMetaeditorPath();
  if (!exe) {
    return { status: 'unverified', errors: [], warnings: [] };
  }

  await fs.mkdir(MQL5_COMPILE_DIR, { recursive: true });
  const id = nanoid(10);
  const srcPath = path.join(MQL5_COMPILE_DIR, `${id}.mq5`);
  const logPath = path.join(MQL5_COMPILE_DIR, `${id}.log`);
  const ex5Path = path.join(MQL5_COMPILE_DIR, `${id}.ex5`);

  await fs.writeFile(srcPath, code, 'utf-8');

  try {
    await new Promise<void>((resolve) => {
      // metaeditor's process exit code does not reliably reflect compile success/failure
      // (observed both 0 and 1 for a clean compile) — the /log output is the source of truth.
      execFile(exe, [`/compile:${srcPath}`, `/log:${logPath}`], { timeout: COMPILE_TIMEOUT_MS }, () => resolve());
    });

    let raw: string;
    try {
      raw = (await fs.readFile(logPath, 'utf16le')).replace(/^\uFEFF/, '');
    } catch {
      return { status: 'unverified', errors: [], warnings: [] };
    }

    const { errors, warnings } = parseLog(raw, srcPath, displayName);
    return { status: errors.length > 0 ? 'errors' : 'ok', errors, warnings };
  } finally {
    await Promise.all([
      fs.unlink(srcPath).catch(() => {}),
      fs.unlink(logPath).catch(() => {}),
      fs.unlink(ex5Path).catch(() => {}),
    ]);
  }
}

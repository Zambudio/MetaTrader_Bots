import { promises as fs, constants as fsConstants } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { MQL5_COMPILE_DIR, MQL5_DELIVERABLES_DIR } from '../paths.js';

const DEFAULT_METAEDITOR_PATH = 'C:\\Program Files\\MetaTrader 5\\metaeditor64.exe';
const COMPILE_TIMEOUT_MS = 30_000;

export interface CompileResult {
  status: 'ok' | 'errors' | 'unverified';
  errors: string[];
  warnings: string[];
  compiledEx5Buffer?: Buffer;
}

export interface DeliverableProvenance {
  filename: string;
  timestamp: string;
  model: string;
  pair: string;
  timeframe: string;
  attempts: number;
  compileStatus: 'ok' | 'errors' | 'unverified';
  assumptions: string[];
  qualityGatePassed?: boolean;
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
      execFile(exe, [`/compile:${srcPath}`, `/log:${logPath}`], { timeout: COMPILE_TIMEOUT_MS }, () => resolve());
    });

    let raw: string;
    try {
      raw = (await fs.readFile(logPath, 'utf16le')).replace(/^\uFEFF/, '');
    } catch {
      return { status: 'unverified', errors: [], warnings: [] };
    }

    const { errors, warnings } = parseLog(raw, srcPath, displayName);
    let compiledEx5Buffer: Buffer | undefined;

    if (errors.length === 0) {
      try {
        compiledEx5Buffer = await fs.readFile(ex5Path);
      } catch {
        // Ignorar si no generó ex5
      }
    }

    return {
      status: errors.length > 0 ? 'errors' : 'ok',
      errors,
      warnings,
      compiledEx5Buffer,
    };
  } finally {
    await Promise.all([
      fs.unlink(srcPath).catch(() => {}),
      fs.unlink(logPath).catch(() => {}),
      fs.unlink(ex5Path).catch(() => {}),
    ]);
  }
}

// 3.6: Trazabilidad completa del código entregado (agent_provenance)
export async function persistDeliverable(
  code: string,
  provenance: DeliverableProvenance,
  ex5Buffer?: Buffer
): Promise<void> {
  try {
    await fs.mkdir(MQL5_DELIVERABLES_DIR, { recursive: true });
    const baseName = provenance.filename.replace(/\.mq5$/i, '');
    const timestampTag = new Date().toISOString().replace(/[:.]/g, '-');
    const outMq5 = path.join(MQL5_DELIVERABLES_DIR, `${baseName}_${timestampTag}.mq5`);
    const outMeta = path.join(MQL5_DELIVERABLES_DIR, `${baseName}_${timestampTag}.meta.json`);

    await fs.writeFile(outMq5, code, 'utf-8');
    await fs.writeFile(outMeta, JSON.stringify(provenance, null, 2), 'utf-8');

    if (ex5Buffer) {
      const outEx5 = path.join(MQL5_DELIVERABLES_DIR, `${baseName}_${timestampTag}.ex5`);
      await fs.writeFile(outEx5, ex5Buffer);
    }
  } catch (err) {
    console.warn(`[mql5Compiler] Error persistiendo entregable de trazabilidad:`, err);
  }
}

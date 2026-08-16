import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from './jsonStore.js';
import { MQL5_ATTEMPTS_LOG, MQL5_KNOWN_ISSUES_FILE, MQL5_KNOWN_ISSUES_DOC } from '../paths.js';

export interface AttemptLogEntry {
  timestamp: string;
  pair: string;
  timeframe: string;
  attemptNumber: number;
  errorsFound: string[];
  warningsFound: string[];
  fixSummary: string | null;
  resolvedFromPrevious: string[];
}

export interface KnownIssue {
  id: string;
  signature: string;
  example: string;
  fixDescription: string;
  timesSeen: number;
  timesConfirmedFixed: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastConfirmedFixedAt: string;
}

export function normalizeSignature(rawError: string): string {
  return rawError
    .replace(/^.*?\.mq5(\(\d+,\d+\))?\s*:\s*/i, '')
    .replace(/'[^']*'/g, "'<X>'")
    .trim();
}

function signatureId(signature: string): string {
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function appendAttemptLog(entry: AttemptLogEntry): Promise<void> {
  await fs.mkdir(path.dirname(MQL5_ATTEMPTS_LOG), { recursive: true });
  await fs.appendFile(MQL5_ATTEMPTS_LOG, `${JSON.stringify(entry)}\n`, 'utf-8');
}

async function loadAllIssues(): Promise<KnownIssue[]> {
  return readJson<KnownIssue[]>(MQL5_KNOWN_ISSUES_FILE, []);
}

function renderMarkdownDoc(issues: KnownIssue[]): string {
  const sorted = [...issues].sort((a, b) => b.timesConfirmedFixed - a.timesConfirmedFixed);
  const rows = sorted
    .map(
      (i) =>
        `| \`${i.signature.replace(/\|/g, '\\|')}\` | ${i.fixDescription.replace(/\|/g, '\\|')} | ${i.timesSeen} | ${i.timesConfirmedFixed} | ${i.lastConfirmedFixedAt} |`
    )
    .join('\n');

  return `# Errores conocidos al generar EAs en MQL5

> Documento autogenerado por el bucle de generación + compilación de \`trading-agents-dashboard\`
> (\`server/src/engine/mql5Generator.ts\` + \`mql5Compiler.ts\` + \`mql5KnowledgeStore.ts\`).
> No editar a mano — se regenera cada vez que se confirma una corrección nueva. Estas lecciones
> se inyectan automáticamente en el prompt de generación antes de crear un nuevo EA, para que
> cada análisis nuevo se beneficie de los errores ya resueltos en análisis anteriores.

${issues.length === 0 ? 'Todavía no hay correcciones confirmadas.' : `| Error (firma normalizada) | Corrección aplicada | Veces visto | Veces confirmado | Última confirmación |
|---|---|---|---|---|
${rows}`}
`;
}

export async function recordConfirmedFix(rawError: string, fixDescription: string): Promise<void> {
  const signature = normalizeSignature(rawError);
  const id = signatureId(signature);
  const issues = await loadAllIssues();
  const now = new Date().toISOString();

  const existing = issues.find((i) => i.id === id);
  if (existing) {
    existing.example = rawError;
    existing.fixDescription = fixDescription;
    existing.timesSeen += 1;
    existing.timesConfirmedFixed += 1;
    existing.lastSeenAt = now;
    existing.lastConfirmedFixedAt = now;
  } else {
    issues.push({
      id,
      signature,
      example: rawError,
      fixDescription,
      timesSeen: 1,
      timesConfirmedFixed: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      lastConfirmedFixedAt: now,
    });
  }

  await writeJson(MQL5_KNOWN_ISSUES_FILE, issues);
  await fs.mkdir(path.dirname(MQL5_KNOWN_ISSUES_DOC), { recursive: true });
  await fs.writeFile(MQL5_KNOWN_ISSUES_DOC, renderMarkdownDoc(issues), 'utf-8');
}

export async function loadTopIssues(maxEntries = 20): Promise<KnownIssue[]> {
  const issues = await loadAllIssues();
  return [...issues].sort((a, b) => b.timesConfirmedFixed - a.timesConfirmedFixed).slice(0, maxEntries);
}

export function renderIssuesForPrompt(issues: KnownIssue[]): string {
  if (issues.length === 0) return '';
  const lines = issues.map((i) => `- ${i.signature} → ${i.fixDescription}`);
  return `Lecciones aprendidas de generaciones anteriores (verificadas por compilación real —
aplícalas de entrada para no repetir estos errores):
${lines.join('\n')}`;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NewsItem } from '../types.js';

export interface GenerateDigestOptions {
  wikiDir: string;
  indexFile: string;
  /** YYYY-MM-DD; por defecto, hoy en UTC. Parametrizable para tests deterministas. */
  date?: string;
}

export interface GenerateDigestResult {
  pageRelPath: string | null;
  digestedIds: string[];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function renderPage(date: string, items: NewsItem[]): string {
  const lines = [`# Noticias — ${date}`, '', 'Resumen automático de artículos obtenidos por el sistema de noticias. No es análisis: son titulares y extractos tal como los publicó la fuente, sin interpretación añadida.', ''];
  for (const item of items) {
    lines.push(`## ${item.title}`);
    lines.push('');
    lines.push(`- Fuente: ${item.sourceId}`);
    lines.push(`- Publicado: ${item.publishedAt ?? '(no indicado por la fuente)'}`);
    lines.push(`- Enlace: ${item.url}`);
    if (item.summary) {
      lines.push('');
      lines.push(item.summary);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function upsertIndexEntry(indexContent: string, pageRelPath: string, description: string): string {
  const categoryHeading = '## Noticias';
  const bullet = `- [\`${pageRelPath}\`](${pageRelPath}) — ${description}`;

  if (indexContent.includes(categoryHeading)) {
    const lines = indexContent.split('\n');
    const headingIndex = lines.findIndex((l) => l.trim() === categoryHeading);
    
    // Busca si ya existe una entrada para este mismo archivo
    let existingLineIndex = -1;
    for (let i = headingIndex + 1; i < lines.length; i++) {
      if (!lines[i].startsWith('- ')) break;
      if (lines[i].includes(pageRelPath)) {
        existingLineIndex = i;
        break;
      }
    }
    
    if (existingLineIndex >= 0) {
      // Reemplaza la línea existente
      lines[existingLineIndex] = bullet;
    } else {
      // Inserta después del último bullet de la categoría
      let insertAt = headingIndex + 1;
      while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++;
      while (insertAt < lines.length && lines[insertAt].startsWith('- ')) insertAt++;
      lines.splice(insertAt, 0, bullet);
    }
    
    return lines.join('\n');
  }

  // Categoría nueva: se añade al final del fichero con una línea en blanco antes.
  const trimmed = indexContent.replace(/\n+$/, '');
  return `${trimmed}\n\n${categoryHeading}\n\n${bullet}\n`;
}

export async function generateNewsDigest(items: NewsItem[], opts: GenerateDigestOptions): Promise<GenerateDigestResult> {
  const pending = items.filter((i) => !i.digestedToWiki);
  if (pending.length === 0) {
    return { pageRelPath: null, digestedIds: [] };
  }

  const date = opts.date ?? todayUtc();
  const pageRelPath = `noticias/${date}.md`;
  const pageAbsPath = path.join(opts.wikiDir, pageRelPath);

  await fs.mkdir(path.dirname(pageAbsPath), { recursive: true });
  await fs.writeFile(pageAbsPath, renderPage(date, pending), 'utf-8');

  let indexContent = '';
  try {
    indexContent = await fs.readFile(opts.indexFile, 'utf-8');
  } catch (err) {
    const isNotFound = err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (!isNotFound) throw err;
    await fs.mkdir(path.dirname(opts.indexFile), { recursive: true });
  }
  const description = `${pending.length} artículo(s) obtenidos el ${date} — ver detalle en la página.`;
  const updatedIndex = upsertIndexEntry(indexContent, pageRelPath, description);
  await fs.writeFile(opts.indexFile, updatedIndex, 'utf-8');

  return { pageRelPath, digestedIds: pending.map((i) => i.id) };
}

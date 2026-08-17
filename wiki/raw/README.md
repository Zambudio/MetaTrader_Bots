# raw/ — fuentes inmutables

Esta carpeta es el "dropbox" de fuentes en bruto de la wiki: artículos, notas, extractos, capturas de investigación que Pedro va dejando aquí (o pegando directamente en la conversación).

Reglas:

- **Inmutable.** Claude lee estas fuentes para ingerirlas en la wiki (ver [`../CLAUDE.md`](../CLAUDE.md) → Operaciones → Ingest), pero nunca las edita ni las borra. Son la fuente de verdad de dónde salió cada afirmación de la wiki.
- Cada fuente puede referenciarse desde el frontmatter (`fuentes:`) de las páginas de contenido que la usan.
- Si en el futuro se usa el Obsidian Web Clipper para recortar artículos, las imágenes descargadas pueden vivir en una subcarpeta `raw/assets/` (ver el consejo correspondiente en [`../METHODOLOGY.md`](../METHODOLOGY.md) → Tips and tricks).

Por ahora está vacía — no se ha ingerido ninguna fuente todavía.

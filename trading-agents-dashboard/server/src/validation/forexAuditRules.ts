function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function contextAround(text: string, index: number, radius = 180): string {
  return fold(text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)));
}

function negatesCurrentDateComparison(context: string): boolean {
  return /no (?:se )?(?:evalua|compara|usa|aplica)(?:[^.]{0,100})(?:fecha actual|fecha del sistema|fecha de sistema)/.test(context)
    || /(?:fecha actual|fecha del sistema|fecha de sistema)[^.]{0,100}no (?:aplica|se usa|se evalua)/.test(context)
    || /nunca[^.]{0,120}(?:fecha actual|fecha del sistema|fecha de sistema)/.test(context);
}

/** Detecta comparación temporal real; ignora declaraciones explícitas de que esa comparación NO se hace. */
export function hasHistoricalTemporalContextError(
  text: string,
  _snapshot: string,
  dataQuality?: string,
): boolean {
  if (dataQuality === 'stale') return true;
  const currentDatePattern = /meses (?:posterior|despu[eé]s)|(?:obsolet|desactualiz|stale)[^.]{0,160}(?:fecha actual|fecha (?:del|de) sistema|hoy)|(?:fecha actual|fecha (?:del|de) sistema|hoy)[^.]{0,160}(?:obsolet|desactualiz|stale)/gi;
  for (const match of text.matchAll(currentDatePattern)) {
    if (!negatesCurrentDateComparison(contextAround(text, match.index ?? 0))) return true;
  }
  return false;
}

/** Máximo 1 evento + 1 filtro; las frases "No incluye..." son declaraciones, no restricciones. */
export function hasOverloadedEntryCondition(condition: string): boolean {
  const withoutNegativeDeclarations = condition.replace(
    /(?:^|[.!?]\s+)(?:no incluye|no usa|no depende de|sin filtros? de)[^.?!]*(?:[.?!]|$)/gi,
    ' ',
  );
  return /no abrir si|ignorar si|primera vela|calendario|spread|slippage|\bH4\b|\bD1\b/i.test(withoutNegativeDeclarations);
}

/** Un coste de ejecución ausente puede mencionarse, pero no recibir una cifra inventada. */
export function hasUnsupportedNumericExecutionCosts(text: string): boolean {
  return /(?:spread|slippage|deslizamiento)[^.;\n]{0,100}\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:pip(?:s)?|puntos?|%)/i.test(text);
}

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

/** Contrasta cualquier pareja fecha ISO + día cercano con el calendario UTC real. */
export function findWeekdayMismatch(text: string): { date: string; stated: string; expected: string } | null {
  for (const match of text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)) {
    const date = match[1];
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime())) continue;
    const context = fold(text.slice(Math.max(0, (match.index ?? 0) - 80), (match.index ?? 0) + 140));
    const statedIndex = WEEKDAYS_ES.map((day) => fold(day)).findIndex((day) => new RegExp(`\\b${day}\\b`).test(context));
    if (statedIndex < 0 || statedIndex === parsed.getUTCDay()) continue;
    return { date, stated: WEEKDAYS_ES[statedIndex], expected: WEEKDAYS_ES[parsed.getUTCDay()] };
  }
  return null;
}

/**
 * Si el fill se produce en la apertura siguiente, anclar SL/TP al cierre anterior rompe el R:R
 * efectivo. Los tres precios deben compartir la referencia ejecutable.
 */
export function hasInconsistentEntryReference(
  condition: string,
  entry: string,
  stopLoss: string,
  takeProfit: string,
): boolean {
  const entryText = fold(`${condition} ${entry}`);
  const exits = fold(`${stopLoss} ${takeProfit}`);
  const entersNextOpen = /apertura de la vela (?:h1 )?(?:inmediatamente )?(?:siguiente|posterior)/.test(entryText);
  const exitsFromSignalClose = /cierre de la vela de senal/.test(exits);
  const exitsFromExecutableEntry = /(?:precio (?:real )?de entrada|precio de fill|apertura de la vela (?:siguiente|posterior))/.test(exits);
  return entersNextOpen && exitsFromSignalClose && !exitsFromExecutableEntry;
}

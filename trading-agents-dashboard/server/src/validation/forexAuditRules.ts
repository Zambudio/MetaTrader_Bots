function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function contextAround(text: string, index: number, radius = 180): string {
  return fold(text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)));
}

function negatesCurrentDateComparison(context: string): boolean {
  return /no (?:se )?(?:evalua|compara|usa|aplica)(?:[^.]{0,100})(?:fecha actual|fecha del sistema|fecha de sistema)/.test(context)
    || /(?:fecha actual|fecha del sistema|fecha de sistema)[^.]{0,100}no (?:aplica|se usa|se evalua)/.test(context)
    || /nunca[^.]{0,120}(?:fecha actual|fecha del sistema|fecha de sistema)/.test(context)
    || /no (?:esta )?(?:obsolet|desactualiz|stale)/.test(context)
    || /no (?:debe )?(?:evaluarse|considerarse|tratarse) como (?:obsolet|desactualiz|stale)/.test(context);
}

/** Detecta comparación temporal real; ignora declaraciones explícitas de que esa comparación NO se hace. */
export function hasHistoricalTemporalContextError(
  text: string,
  _snapshot: string,
  dataQuality?: string,
): boolean {
  if (dataQuality === 'stale') return true;
  // `text` suele ser JSON serializado: no cruzar comillas hacia otro campo, porque una
  // invalidación legítima sobre `as_of` y una mención separada a la fecha del sistema formarían
  // un falso positivo al concatenarse.
  const currentDatePattern = /meses (?:posterior|despu[eé]s)|(?:obsolet|desactualiz|stale)[^."}]{0,160}(?:fecha actual|fecha (?:del|de) sistema|hoy)|(?:fecha actual|fecha (?:del|de) sistema|hoy)[^."}]{0,160}(?:obsolet|desactualiz|stale)/gi;
  for (const match of text.matchAll(currentDatePattern)) {
    if (!negatesCurrentDateComparison(contextAround(text, match.index ?? 0))) return true;
  }
  return false;
}

/** Máximo 1 evento + 1 filtro; las frases "No incluye..." son declaraciones, no restricciones. */
export function hasOverloadedEntryCondition(condition: string): boolean {
  const withoutNegativeDeclarations = condition.replace(
    /(?:^|[.!?;]\s+)(?:no incluye|no usa|no depende de|sin filtros? de)[^.?!]*(?:[.?!]|$)/gi,
    ' ',
  );
  return /no abrir si|ignorar si|primera vela|calendario|spread|slippage|\bH4\b|\bD1\b/i.test(withoutNegativeDeclarations);
}

/** Un coste de ejecución ausente puede mencionarse, pero no recibir una cifra inventada. */
export function hasUnsupportedNumericExecutionCosts(text: string): boolean {
  return /(?:spread|slippage|deslizamiento)(?:\s+(?:t[ií]pic[oa]|estimad[oa]|modelad[oa]|supuest[oa]))?\s*(?:(?:=|:|de|entre|aprox(?:imadamente)?|~)\s*)?\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:pip(?:s)?|puntos?|%)/i.test(text);
}

/** No hay métrica de liquidez en el snapshot; hora/sesión no permite asignarle intensidad. */
export function hasUnsupportedLiquidityClaim(text: string): boolean {
  const normalized = fold(text);
  const intensityPattern = /(?:baja|alta|menor|mayor|reducida|escasa|fina) liquidez|liquidez[^.;\n]{0,40}(?:baja|alta|menor|mayor|reducida|escasa|fina)/g;
  for (const match of normalized.matchAll(intensityPattern)) {
    const index = match.index ?? 0;
    const clauseStart = Math.max(
      normalized.lastIndexOf('.', index - 1),
      normalized.lastIndexOf(';', index - 1),
      normalized.lastIndexOf('\n', index - 1),
    );
    const prefix = normalized.slice(clauseStart + 1, index);
    if (/no (?:se )?(?:afirma|infiere|deduce)[^.;\n]{0,80}$/.test(prefix)) continue;
    return true;
  }
  return false;
}

/** Un gap observado antes del as_of no predice la apertura de una vela futura. */
export function hasPredictedFutureFill(text: string): boolean {
  const normalized = fold(text);
  const assertions = normalized
    .split(/[!?]|\.(?=\s|$)/)
    .filter((sentence) => !(
      /gap[^;]{0,140}no (?:se )?(?:asume|usa|considera|toma)(?: como)? (?:proxy|aproxim|referencia)/.test(sentence)
      || /gap (?:pasado|anterior)[^;]{0,100}no (?:predice|anticipa)/.test(sentence)
      || /no (?:se )?(?:asume|usa|considera|toma)[^;]{0,100}gap/.test(sentence)
    ))
    .join('.');
  return /apertura[^.]{0,100}(?:siguiente|posterior)/.test(assertions)
    && /gap[^.]{0,140}(?:proxy|razonable|aproxim|~?0)/.test(assertions);
}

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

/** Contrasta cualquier pareja fecha ISO + día cercano con el calendario UTC real. */
export function findWeekdayMismatch(text: string): { date: string; stated: string; expected: string } | null {
  for (const match of text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)) {
    const date = match[1];
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime())) continue;
    const index = match.index ?? 0;
    const before = fold(text.slice(Math.max(0, index - 60), index));
    const after = fold(text.slice(index + date.length, Math.min(text.length, index + date.length + 60)));
    const weekdayPattern = WEEKDAYS_ES.map((day) => fold(day)).join('|');
    const beforeMatch = before.match(new RegExp(`\\b(${weekdayPattern})\\b[^.;"}\\n]{0,45}$`));
    const afterMatch = after.match(new RegExp(`^[^.;"{\\n]{0,45}\\b(${weekdayPattern})\\b`));
    const stated = afterMatch?.[1] ?? beforeMatch?.[1];
    const statedIndex = stated ? WEEKDAYS_ES.map((day) => fold(day)).indexOf(stated) : -1;
    if (statedIndex < 0 || statedIndex === parsed.getUTCDay()) continue;
    return { date, stated: WEEKDAYS_ES[statedIndex], expected: WEEKDAYS_ES[parsed.getUTCDay()] };
  }
  return null;
}

export interface ForexPipArithmeticMismatch {
  firstPrice: number;
  secondPrice: number;
  statedPips: number;
  expectedPips: number;
}

/**
 * Recalcula una distancia EUR/USD expresada dentro de una misma afirmación.
 *
 * La regla es deliberadamente conservadora: exige una relación explícita entre un sujeto de
 * precio y otro nivel, o una distancia/diferencia declarada. Así no empareja accidentalmente
 * cifras pertenecientes a hechos JSON vecinos ni objetos intermedios de una enumeración.
 */
export function findForexPipArithmeticMismatch(text: string): ForexPipArithmeticMismatch | null {
  const jsonStrings = [...text.matchAll(/"(?:\\.|[^"\\])*"/g)].map((match) => match[0].slice(1, -1));
  const segments = jsonStrings.length > 0 ? jsonStrings : [text];

  for (const segment of segments) {
    const normalized = fold(segment);
    const price = '([0-2]\\.[0-9]{4,5})';
    const pips = '(?<![\\d.,])[~≈]?\\s*([+-]?\\d+(?:[.,]\\d+)?)\\s*pips?\\b';
    const between = '[^.;"\\n]{0,70}?';
    const adjacentToPips = '[^.;"\\n\\d]{0,25}?';
    const relation = '(?:por encima(?: de)?|por debajo(?: de)?)';
    const subject = '(?:precio|cierre|entrada|entry|fill|sl|stop\\s*loss|tp|take\\s*profit)\\s*[:=~]?\\s*';
    const patterns: Array<{ regex: RegExp; order: [number, number, number] }> = [
      { regex: new RegExp(`${subject}${price}${between}${relation}${between}${price}${adjacentToPips}${pips}`, 'gi'), order: [1, 2, 3] },
      { regex: new RegExp(`(?:distancia|diferencia)[^.;"\\n]{0,40}?${price}${between}${price}${adjacentToPips}${pips}`, 'gi'), order: [1, 2, 3] },
    ];

    for (const { regex, order } of patterns) {
      for (const match of normalized.matchAll(regex)) {
        const firstPrice = Number(match[order[0]]);
        const secondPrice = Number(match[order[1]]);
        const statedPips = Math.abs(Number(match[order[2]].replace(',', '.')));
        // Excluye ATR/distancias decimales (0.00073, 0.00395): los dos operandos deben parecer
        // cotizaciones del par, no magnitudes auxiliares expresadas en unidades de precio.
        if (firstPrice < 0.5 || secondPrice < 0.5 || !Number.isFinite(statedPips)) continue;
        const expectedPipsRaw = Math.abs(firstPrice - secondPrice) * 10_000;
        const expectedPips = Math.round(expectedPipsRaw * 10) / 10;
        const tolerance = Math.max(0.51, expectedPips * 0.02);
        if (Math.abs(statedPips - expectedPips) <= tolerance) continue;

        return { firstPrice, secondPrice, statedPips, expectedPips };
      }
    }
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

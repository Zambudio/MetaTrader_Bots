import { describe, expect, it } from 'vitest';
import { resolveForexMaxRevisionRounds, isDirectEntrypoint } from '../scripts/validateRealForex.js';

describe('resolveForexMaxRevisionRounds (cap fail-fast de rondas AJUSTAR)', () => {
  it('usa el fallback del preset cuando la env no está definida', () => {
    expect(resolveForexMaxRevisionRounds(undefined, 2)).toBe(2);
    expect(resolveForexMaxRevisionRounds('', 2)).toBe(2);
  });

  it('respeta literalmente 0 en vez de caer al fallback del preset', () => {
    expect(resolveForexMaxRevisionRounds('0', 2)).toBe(0);
  });

  it('acepta 1 y 2 dentro del rango permitido', () => {
    expect(resolveForexMaxRevisionRounds('1', 2)).toBe(1);
    expect(resolveForexMaxRevisionRounds('2', 2)).toBe(2);
  });

  it('rechaza valores fuera de 0..2 o no enteros', () => {
    expect(() => resolveForexMaxRevisionRounds('3', 2)).toThrow(/FOREX_VALIDATION_MAX_REVISION_ROUNDS inválido/);
    expect(() => resolveForexMaxRevisionRounds('-1', 2)).toThrow(/inválido/);
    expect(() => resolveForexMaxRevisionRounds('1.5', 2)).toThrow(/inválido/);
    expect(() => resolveForexMaxRevisionRounds('abc', 2)).toThrow(/inválido/);
  });
});

describe('isDirectEntrypoint (guard de ejecución directa vs. import en tests)', () => {
  it('reconoce ejecución directa en Windows con letra de unidad (file:/// triple barra)', () => {
    const argv1 = 'C:\\proj\\scripts\\validateRealForex.ts';
    expect(isDirectEntrypoint(argv1, 'file:///C:/proj/scripts/validateRealForex.ts')).toBe(true);
  });

  it('devuelve false cuando el módulo se importa desde otro archivo (p. ej. un test)', () => {
    const argv1 = 'C:\\proj\\node_modules\\.bin\\vitest.js';
    expect(isDirectEntrypoint(argv1, 'file:///C:/proj/scripts/validateRealForex.ts')).toBe(false);
  });

  it('devuelve false cuando argv1 no está definido', () => {
    expect(isDirectEntrypoint(undefined, 'file:///C:/proj/scripts/validateRealForex.ts')).toBe(false);
  });

  it('rechaza la construcción manual ingenua de dos barras que motivó este bug', () => {
    const argv1 = 'C:\\proj\\scripts\\validateRealForex.ts';
    const naiveTwoSlashes = `file://${argv1.replace(/\\/g, '/')}`;
    // La comparación ingenua nunca coincide con `import.meta.url` real en Windows.
    expect(naiveTwoSlashes).not.toBe('file:///C:/proj/scripts/validateRealForex.ts');
  });
});

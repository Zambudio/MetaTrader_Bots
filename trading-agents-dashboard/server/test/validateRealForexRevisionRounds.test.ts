import { describe, expect, it } from 'vitest';
import { resolveForexMaxRevisionRounds } from '../scripts/validateRealForex.js';

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

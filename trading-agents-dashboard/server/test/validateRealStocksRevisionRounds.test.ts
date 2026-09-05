import { describe, expect, it } from 'vitest';
import { resolveStockMaxRevisionRounds } from '../scripts/validateRealStocks.js';

describe('resolveStockMaxRevisionRounds (cap fail-fast de rondas AJUSTAR, ACCIONES)', () => {
  it('usa el fallback del preset cuando la env no está definida', () => {
    expect(resolveStockMaxRevisionRounds(undefined, 2)).toBe(2);
    expect(resolveStockMaxRevisionRounds('', 2)).toBe(2);
  });

  it('respeta literalmente 0 en vez de caer al fallback del preset', () => {
    expect(resolveStockMaxRevisionRounds('0', 2)).toBe(0);
  });

  it('acepta 1 y 2 dentro del rango permitido', () => {
    expect(resolveStockMaxRevisionRounds('1', 2)).toBe(1);
    expect(resolveStockMaxRevisionRounds('2', 2)).toBe(2);
  });

  it('rechaza valores fuera de 0..2 o no enteros', () => {
    expect(() => resolveStockMaxRevisionRounds('3', 2)).toThrow(/STOCKS_VALIDATION_MAX_REVISION_ROUNDS inválido/);
    expect(() => resolveStockMaxRevisionRounds('-1', 2)).toThrow(/inválido/);
    expect(() => resolveStockMaxRevisionRounds('abc', 2)).toThrow(/inválido/);
  });
});

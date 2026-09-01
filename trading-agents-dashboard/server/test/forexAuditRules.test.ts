import { describe, expect, it } from 'vitest';
import {
  hasHistoricalTemporalContextError,
  hasInconsistentEntryReference,
  hasOverloadedEntryCondition,
  hasUnsupportedNumericExecutionCosts,
  hasUnsupportedLiquidityClaim,
  hasPredictedFutureFill,
  findWeekdayMismatch,
} from '../src/validation/forexAuditRules.js';

describe('reglas puras del audit FOREX real', () => {
  it('no confunde una negación HISTORICAL_AS_OF con contaminación temporal', () => {
    const snapshot = 'Corte 2026-03-25T00:00:00Z';
    expect(hasHistoricalTemporalContextError(
      'El snapshot no se evalúa contra la fecha actual del sistema (2026-09-01).',
      snapshot,
      'good',
    )).toBe(false);
    expect(hasHistoricalTemporalContextError(
      'Evaluado contra el corte y no contra la fecha del sistema (2026-09-01).',
      snapshot,
      'good',
    )).toBe(false);
    expect(hasHistoricalTemporalContextError(
      'La fecha de sistema 2026-09-01 no se usa para evaluar frescura.',
      snapshot,
      'good',
    )).toBe(false);
    expect(hasHistoricalTemporalContextError(
      'La foto está vigente respecto al as_of y no obsoleta frente a la fecha del sistema.',
      snapshot,
      'good',
    )).toBe(false);
    expect(hasHistoricalTemporalContextError(
      'La foto está vigente y no debe evaluarse como obsoleta frente a la fecha del sistema.',
      snapshot,
      'good',
    )).toBe(false);
    expect(hasHistoricalTemporalContextError(
      'El snapshot está obsoleto frente a la fecha actual del sistema 2026-09-01.',
      snapshot,
      'good',
    )).toBe(true);
  });

  it('acepta una declaración negativa y detecta restricciones positivas extra', () => {
    expect(hasOverloadedEntryCondition(
      'EVENTO: cruce EMA20. FILTRO: MACD > señal. No incluye filtros de calendario, spread, sesión, primera vela semanal ni H4.',
    )).toBe(false);
    expect(hasOverloadedEntryCondition(
      'EVENTO: cruce EMA20. FILTRO: MACD > señal. No abrir si el spread es alto ni en la primera vela semanal.',
    )).toBe(true);
  });

  it('marca costes numéricos sin fuente, no la mera ausencia declarada', () => {
    expect(hasUnsupportedNumericExecutionCosts(
      'Modelar spread 0.6–1.0 pip y slippage 0.2–0.5 pip.',
    )).toBe(true);
    expect(hasUnsupportedNumericExecutionCosts(
      'Spread y slippage DATA_NOT_AVAILABLE; no se asignan cifras.',
    )).toBe(false);
    expect(hasUnsupportedNumericExecutionCosts(
      'Spread DATA_NOT_AVAILABLE; volumen último 0 y ratio 0x.',
    )).toBe(false);
  });

  it('detecta SL/TP anclados al cierre cuando la entrada real es la apertura siguiente', () => {
    expect(hasInconsistentEntryReference(
      'Entrada a mercado en la apertura de la vela siguiente.',
      'Compra en la apertura de la vela siguiente.',
      'Cierre de la vela de señal − 1.3 × ATR.',
      'Cierre de la vela de señal + 2.2 × ATR.',
    )).toBe(true);
    expect(hasInconsistentEntryReference(
      'Entrada a mercado en la apertura de la vela siguiente.',
      'Compra en la apertura de la vela siguiente.',
      'Precio real de entrada − 1.3 × ATR.',
      'Precio real de entrada + 2.2 × ATR.',
    )).toBe(false);
  });

  it('recalcula de forma determinista el día de una fecha ISO', () => {
    expect(findWeekdayMismatch('Corte 2026-03-25 00:00 UTC (martes).')).toEqual({
      date: '2026-03-25', stated: 'martes', expected: 'miércoles',
    });
    expect(findWeekdayMismatch('Corte 2026-03-25 00:00 UTC (miércoles).')).toBeNull();
  });

  it('detecta liquidez afirmada sin métrica y no la ausencia declarada', () => {
    expect(hasUnsupportedLiquidityClaim('00:00 UTC es una franja típicamente de baja liquidez.')).toBe(true);
    expect(hasUnsupportedLiquidityClaim('Liquidez DATA_NOT_AVAILABLE; no se infiere desde la hora.')).toBe(false);
  });

  it('detecta el gap anterior usado para predecir una apertura futura', () => {
    expect(hasPredictedFutureFill(
      'Entrada en la apertura siguiente; el cierre es un proxy razonable porque el gap intervela previo fue ~0.',
    )).toBe(true);
    expect(hasPredictedFutureFill(
      'Entrada en la apertura siguiente; SL/TP se recalculan desde el precio real de fill.',
    )).toBe(false);
  });
});

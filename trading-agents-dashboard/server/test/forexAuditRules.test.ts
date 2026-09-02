import { describe, expect, it } from 'vitest';
import {
  hasHistoricalTemporalContextError,
  hasInconsistentEntryReference,
  hasOverloadedEntryCondition,
  hasUnsupportedNumericExecutionCosts,
  hasUnsupportedLiquidityClaim,
  hasPredictedFutureFill,
  findWeekdayMismatch,
  findForexPipArithmeticMismatch,
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
    expect(hasOverloadedEntryCondition(
      'EVENTO: cruce MACD. FILTRO UNICO: cierre > EMA(50). Ambas condiciones se evaluan sobre velas cerradas; no incluye calendario, spread, primera vela semanal ni multi-timeframe.',
    )).toBe(false);
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
    expect(hasUnsupportedNumericExecutionCosts(
      'Spread y slippage DATA_NOT_AVAILABLE: con SL ~10.9 pips los costes pueden ser materiales.',
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
    expect(findWeekdayMismatch(
      'Modo HISTORICAL_AS_OF (as_of 2026-08-25T00:00:00Z). La vela abre a las 23:00 UTC del lunes 2026-08-24.',
    )).toBeNull();
    expect(findWeekdayMismatch(
      '{"claim":"2026-08-24 es lunes (calculado)."},{"claim":"Modo HISTORICAL_AS_OF as_of 2026-08-25T00:00:00Z."}',
    )).toBeNull();
  });

  it('recalcula distancias EUR/USD declaradas en pips sin cruzar afirmaciones', () => {
    expect(findForexPipArithmeticMismatch(
      'Estructura mixta: precio 1.16684 por encima de SMA200 (1.16462, ~+222 pips) → fondo alcista; por debajo de EMA50 1.16726 y SMA50 1.16761.',
    )).toEqual({
      firstPrice: 1.16684,
      secondPrice: 1.16462,
      statedPips: 222,
      expectedPips: 22.2,
    });
    expect(findForexPipArithmeticMismatch(
      'El precio 1.16684 está por encima de SMA200 (1.16462, ~22 pips).',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      '{"claim":"ATR 0.00073 (~7.3 pips)."},{"claim":"Precio 1.16684 y SMA200 1.16462."}',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      'Niveles 1.16674, 1.16726 y 1.16761 dentro de un clúster de ~9 pips.',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      'MACD 1.16176 sobre su referencia 1.16253; ATR 0.00188 (~18.8 pips).',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      'TP 1.15768 (+0.00395 = 39.5 pips).',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      'Cierre 1.16684 ~0.7 pips por encima de EMA20 1.16677 y ~1 pip por encima de SMA20 1.16674.',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      'SL 1.16574 (riesgo ~11 pips), calculado desde E 1.16684; TP 1.16870.',
    )).toBeNull();
    expect(findForexPipArithmeticMismatch(
      'El precio 1.16684 está por encima de EMA20 1.16677, SMA20 1.16674, pero por debajo de EMA50 1.16726 (~4.2 pips).',
    )).toBeNull();
  });

  it('detecta liquidez afirmada sin métrica y no la ausencia declarada', () => {
    expect(hasUnsupportedLiquidityClaim('00:00 UTC es una franja típicamente de baja liquidez.')).toBe(true);
    expect(hasUnsupportedLiquidityClaim('Liquidez DATA_NOT_AVAILABLE; no se infiere desde la hora.')).toBe(false);
    expect(hasUnsupportedLiquidityClaim('No se infiere liquidez baja desde la hora.')).toBe(false);
    expect(hasUnsupportedLiquidityClaim(
      'Entradas próximas a Asia: liquidez potencialmente más fina; no hay métrica aportada y no se infiere desde la hora.',
    )).toBe(true);
  });

  it('detecta el gap anterior usado para predecir una apertura futura', () => {
    expect(hasPredictedFutureFill(
      'Entrada en la apertura siguiente; el cierre es un proxy razonable porque el gap intervela previo fue ~0.',
    )).toBe(true);
    expect(hasPredictedFutureFill(
      'Entrada en la apertura siguiente; SL/TP se recalculan desde el precio real de fill.',
    )).toBe(false);
    expect(hasPredictedFutureFill(
      'Entrada en la apertura siguiente. Un gap pasado (aqui -0.00002) no se asume como proxy del gap futuro.',
    )).toBe(false);
  });
});

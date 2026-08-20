import { describe, it, expect } from 'vitest';
import { parseMt5Log } from '../src/engine/mt5LogParser.js';

describe('3.4 Tests automatizados: Parser de Logs MT5 y Cálculo de Drawdown', () => {
  const sampleLog = [
    '2026.08.15 10:00:00\t0\tTester\t1\texpert file added: Experts\\EA_EURUSD_H1.ex5. 54321 bytes loaded',
    '2026.08.15 10:00:00\t0\tTester\t1\tinitial deposit 10000.00 USD, leverage 1:100',
    '2026.08.15 10:05:00\t0\tTester\t1\tdeal #1 buy 0.10 EURUSD at 1.08500 done (based on order #1)',
    '2026.08.15 12:30:00\t0\tTester\t1\ttake profit triggered #2 buy 0.10 EURUSD 1.08500 sl: 1.08200 tp: 1.09100 [#1 buy 0.10 EURUSD at 1.09100]',
    '2026.08.16 09:00:00\t0\tTester\t1\tdeal #3 sell 0.10 EURUSD at 1.09000 done (based on order #2)',
    '2026.08.16 11:15:00\t0\tTester\t1\tstop loss triggered #4 sell 0.10 EURUSD 1.09000 sl: 1.09300 tp: 1.08400 [#3 sell 0.10 EURUSD at 1.09300]',
    '2026.08.17 18:00:00\t0\tTester\t1\tfinal balance 10300.00 USD',
    '2026.08.17 18:00:00\t0\tTester\t1\ttest EURUSD on H1 thread finished',
  ].join('\n');

  it('Parsea deals, triggers y calcula estadísticas correctamente', () => {
    const sessions = parseMt5Log(sampleLog);
    expect(sessions.length).toBe(1);
    const s = sessions[0];

    expect(s.initialDeposit).toBe(10000);
    expect(s.finalBalance).toBe(10300);
    expect(s.deals.length).toBe(2);
    expect(s.triggers.length).toBe(2);
    expect(s.stats.closedTrades).toBe(2);
    expect(s.stats.wins).toBe(1);
    expect(s.stats.losses).toBe(1);
    expect(s.stats.winRatePct).toBeCloseTo(50.0);
    expect(s.stats.netProfit).toBe(300);
    expect(s.stats.maxDrawdownUSD).toBeGreaterThanOrEqual(0);
    expect(s.stats.rejectedOrdersCount).toBe(0);
  });

  it('Detecta órdenes rechazadas en el log', () => {
    const logWithRejection = `${sampleLog}\n2026.08.16 14:00:00\t0\tTester\t1\torder #5 rejected by broker: trade context busy`;
    const sessions = parseMt5Log(logWithRejection);
    expect(sessions[0].stats.rejectedOrdersCount).toBe(1);
  });
});

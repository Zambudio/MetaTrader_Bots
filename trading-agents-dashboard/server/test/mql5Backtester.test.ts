import { describe, it, expect } from 'vitest';
import { isTerminalRunning } from '../src/engine/mql5Backtester.js';

// El backtest headless necesita arrancar su propia instancia de MT5; si ya hay una abierta la
// config del tester se ignora y el sondeo agota 180s. isTerminalRunning es el guard que corta
// antes con un aviso claro.
describe('isTerminalRunning', () => {
  it('devuelve false para un ejecutable que no está en marcha', async () => {
    expect(await isTerminalRunning('C:\\ruta\\inventada\\noexiste_zzz_terminal64.exe')).toBe(false);
  });

  it('detecta un proceso que sí está corriendo (el propio node del test)', async () => {
    // El runner de vitest corre bajo node.exe en Windows; en otros SO tasklist no existe y la
    // función devuelve false por diseño (no bloquear el test) — solo comprobamos que no lanza.
    const result = await isTerminalRunning(process.execPath);
    expect(typeof result).toBe('boolean');
    if (process.platform === 'win32') {
      expect(result).toBe(true);
    }
  });
});

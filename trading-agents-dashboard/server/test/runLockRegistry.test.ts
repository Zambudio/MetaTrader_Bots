import { describe, it, expect, beforeEach } from 'vitest';
import { tryAcquireRunLock, releaseRunLock, isRunLocked } from '../src/engine/runLockRegistry.js';

describe('runLockRegistry — lock de idempotencia en memoria por run.id (H2)', () => {
  beforeEach(() => {
    releaseRunLock('r1');
    releaseRunLock('r2');
  });

  it('la primera adquisición tiene éxito; la segunda sobre el mismo id falla mientras esté activa', () => {
    expect(tryAcquireRunLock('r1')).toBe(true);
    expect(tryAcquireRunLock('r1')).toBe(false);
    expect(isRunLocked('r1')).toBe(true);
  });

  it('tras liberar, una nueva adquisición vuelve a tener éxito', () => {
    expect(tryAcquireRunLock('r1')).toBe(true);
    releaseRunLock('r1');
    expect(isRunLocked('r1')).toBe(false);
    expect(tryAcquireRunLock('r1')).toBe(true);
  });

  it('los locks de runs distintos son independientes', () => {
    expect(tryAcquireRunLock('r1')).toBe(true);
    expect(tryAcquireRunLock('r2')).toBe(true);
    expect(isRunLocked('r1')).toBe(true);
    expect(isRunLocked('r2')).toBe(true);
  });

  it('liberar un id no bloqueado no falla ni afecta a otros', () => {
    expect(tryAcquireRunLock('r1')).toBe(true);
    releaseRunLock('r2'); // nunca se adquirió — no debe tocar r1
    expect(isRunLocked('r1')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { abortRun, clearAbortController, createAbortControllerForRun, getAbortSignal } from '../src/engine/runAbortRegistry.js';

describe('runAbortRegistry (soporte del botón "Detener análisis")', () => {
  it('crea un controlador cuyo signal empieza sin abortar', () => {
    const controller = createAbortControllerForRun('run-a');
    expect(controller.signal.aborted).toBe(false);
    expect(getAbortSignal('run-a')).toBe(controller.signal);
  });

  it('abortRun dispara el signal y devuelve true la primera vez', () => {
    const controller = createAbortControllerForRun('run-b');
    expect(abortRun('run-b')).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });

  it('abortRun devuelve false si no hay run registrado o ya estaba abortado', () => {
    expect(abortRun('run-inexistente')).toBe(false);
    createAbortControllerForRun('run-c');
    abortRun('run-c');
    expect(abortRun('run-c')).toBe(false);
  });

  it('crear un nuevo controlador para el mismo runId aborta el anterior', () => {
    const first = createAbortControllerForRun('run-d');
    const second = createAbortControllerForRun('run-d');
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    expect(getAbortSignal('run-d')).toBe(second.signal);
  });

  it('clearAbortController elimina el registro sin abortar', () => {
    const controller = createAbortControllerForRun('run-e');
    clearAbortController('run-e');
    expect(getAbortSignal('run-e')).toBeUndefined();
    expect(controller.signal.aborted).toBe(false);
  });
});

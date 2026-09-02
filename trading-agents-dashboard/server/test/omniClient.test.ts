import { describe, expect, it } from 'vitest';
import { resolveOmniRouteFallbackModels, resolveOmniRouteMaxRetries } from '../src/engine/omniClient.js';

describe('controles de coste OmniRoute', () => {
  it('permite fail-fast y limita valores inválidos', () => {
    expect(resolveOmniRouteMaxRetries('0')).toBe(0);
    expect(resolveOmniRouteMaxRetries('3')).toBe(3);
    expect(resolveOmniRouteMaxRetries('-1')).toBe(2);
    expect(resolveOmniRouteMaxRetries('no-numero')).toBe(2);
  });

  it('permite desactivar fallbacks o fijar una cadena explícita', () => {
    expect(resolveOmniRouteFallbackModels('')).toEqual([]);
    expect(resolveOmniRouteFallbackModels('auto/best-fast, auto/smart')).toEqual(['auto/best-fast', 'auto/smart']);
  });
});

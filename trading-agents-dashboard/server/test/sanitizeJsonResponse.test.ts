import { describe, it, expect } from 'vitest';
import { sanitizeJsonResponse } from '../src/engine/omniClient.js';

describe('sanitizeJsonResponse — control characters sin escapar dentro de strings', () => {
  it('escapa un salto de línea real dentro de un literal de cadena (JSON.parse debe poder parsearlo)', () => {
    // Reproduce el fallo real: generateValidatedForexMql5.ts contra un tool-call de Claude para
    // `deliver_ea` — "SyntaxError: Bad control character in string literal in JSON" al incluir
    // código MQL5 multilínea con un \n real en vez de escapado dentro del campo "code".
    const raw = '{"code":"void OnTick()\n  {\n   Print(1);\n  }","assumptionsToVerify":[]}';
    const cleaned = sanitizeJsonResponse(raw);
    const parsed = JSON.parse(cleaned);
    expect(parsed.code).toBe('void OnTick()\n  {\n   Print(1);\n  }');
    expect(parsed.assumptionsToVerify).toEqual([]);
  });

  it('no toca los saltos de línea legítimos de JSON fuera de los strings', () => {
    const raw = '{\n  "a": 1,\n  "b": "texto normal"\n}';
    const parsed = JSON.parse(sanitizeJsonResponse(raw));
    expect(parsed).toEqual({ a: 1, b: 'texto normal' });
  });

  it('respeta los escapes ya válidos (\\n, \\", \\\\) sin doble-escaparlos', () => {
    const raw = String.raw`{"code":"line1\nline2 \"quoted\" and backslash \\ end"}`;
    const parsed = JSON.parse(sanitizeJsonResponse(raw));
    expect(parsed.code).toBe('line1\nline2 "quoted" and backslash \\ end');
  });

  it('sigue quitando fences de markdown y prefijo SSE como antes', () => {
    expect(JSON.parse(sanitizeJsonResponse('```json\n{"a":1}\n```'))).toEqual({ a: 1 });
    expect(JSON.parse(sanitizeJsonResponse('data: {"a":1}'))).toEqual({ a: 1 });
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AGENTS_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'agents.json');

function loadAgent(id: string) {
  const agents = JSON.parse(readFileSync(AGENTS_PATH, 'utf-8')) as Array<{ id: string; systemPrompt: string }>;
  const agent = agents.find((a) => a.id === id);
  if (!agent) throw new Error(`agente ${id} no encontrado en data/agents.json`);
  return agent;
}

describe('data/agents.json — roster por defecto no debe bloquear GO por "mercado cerrado ahora"', () => {
  // Regresión real: el usuario reportó en producción que un veredicto GO quedaba con 4
  // objeciones sin resolver, todas irrelevantes para generar/backtestear código (mercado
  // cerrado por fin de semana, snapshot con volumen 0, DATA_NOT_AVAILABLE de spread/calendario)
  // -- el sistema nunca ejecuta ordenes reales, asi que el estado actual del mercado es
  // irrelevante para esa decision. Verificado en vivo tras el fix: GO limpio, 0 blockers.

  it('fx-simple-judge debe instruir explícitamente que el mercado cerrado no es un blocker de GO', () => {
    const judge = loadAgent('fx-simple-judge');
    expect(judge.systemPrompt).toMatch(/NUNCA ejecuta órdenes reales/i);
    expect(judge.systemPrompt).toMatch(/mercado.*NUNCA es un blocker/i);
  });

  it('fx-simple-judge debe instruir que DATA_NOT_AVAILABLE no usado por la regla no bloquea GO', () => {
    const judge = loadAgent('fx-simple-judge');
    expect(judge.systemPrompt).toMatch(/DATA_NOT_AVAILABLE.*NO es un blocker por sí sola/i);
  });

  it('fx-simple-analyst debe tratar "mercado cerrado" como dato informativo, no como objeción', () => {
    const analyst = loadAgent('fx-simple-analyst');
    expect(analyst.systemPrompt).toMatch(/nunca como una objeción/i);
  });
});

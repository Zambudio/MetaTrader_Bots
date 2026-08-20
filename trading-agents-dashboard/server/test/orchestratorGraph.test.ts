import { describe, it, expect } from 'vitest';
import {
  detectCycle,
  buildLevels,
  validateGraphIntegrity,
  computeRetrySubgraph,
  filterEnabledAgents,
} from '../src/engine/orchestrator.js';
import type { Agent } from '../src/types.js';

describe('3.4 Tests automatizados: Orquestador y Grafo de Agentes', () => {
  const baseAgents: Agent[] = [
    { id: 'a1', name: 'A1', role: 'Técnico', systemPrompt: '', dependsOn: [], outputType: 'text' },
    { id: 'a2', name: 'A2', role: 'Fundamental', systemPrompt: '', dependsOn: [], outputType: 'text' },
    { id: 'a3', name: 'A3', role: 'Riesgo', systemPrompt: '', dependsOn: ['a1', 'a2'], outputType: 'strategy' },
    { id: 'a4', name: 'A4', role: 'Validador', systemPrompt: '', dependsOn: ['a3'], outputType: 'text' },
    { id: 'a5', name: 'A5', role: 'Razonador', systemPrompt: '', dependsOn: ['a4'], outputType: 'verdict' },
  ];

  it('Construye niveles topológicos correctamente', () => {
    const levels = buildLevels(baseAgents);
    expect(levels.length).toBe(4);
    expect(levels[0].map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(levels[1].map((a) => a.id)).toEqual(['a3']);
    expect(levels[2].map((a) => a.id)).toEqual(['a4']);
    expect(levels[3].map((a) => a.id)).toEqual(['a5']);
  });

  it('Detecta ciclo directo y transitivo', () => {
    expect(detectCycle(baseAgents, 'a1', 'a1')).toBe(true);
    // a1 -> a3 -> a4 -> a1 (ciclo)
    const cyclicAgents: Agent[] = [
      { id: 'a1', name: 'A1', role: '', systemPrompt: '', dependsOn: ['a4'], outputType: 'text' },
      { id: 'a3', name: 'A3', role: '', systemPrompt: '', dependsOn: ['a1'], outputType: 'strategy' },
      { id: 'a4', name: 'A4', role: '', systemPrompt: '', dependsOn: ['a3'], outputType: 'text' },
    ];
    expect(detectCycle(cyclicAgents, 'a1', 'a4')).toBe(true);
  });

  it('Valida integridad del grafo y rechaza dependencias huérfanas', () => {
    const orphanedAgents: Agent[] = [
      { id: 'a1', name: 'A1', role: '', systemPrompt: '', dependsOn: ['no-existe'], outputType: 'text' },
    ];
    const val = validateGraphIntegrity(orphanedAgents);
    expect(val.valid).toBe(false);
    expect(val.error).toMatch(/depende de un agente inexistente/i);
  });

  it('Calcula subgrafo de reintentos excluyendo especialistas de nivel 0', () => {
    const subgraph = computeRetrySubgraph(baseAgents, 'a5');
    expect(subgraph.has('a5')).toBe(true);
    expect(subgraph.has('a4')).toBe(true);
    expect(subgraph.has('a3')).toBe(true);
    // a1 y a2 son nivel 0 (dependsOn vacio), no deben reejecutarse
    expect(subgraph.has('a1')).toBe(false);
    expect(subgraph.has('a2')).toBe(false);
  });

  it('filterEnabledAgents quita un agente desactivado y sus dependientes transitivos', () => {
    const withDisabled: Agent[] = baseAgents.map((a) => (a.id === 'a1' ? { ...a, enabled: false } : a));
    const result = filterEnabledAgents(withDisabled);
    const ids = result.map((a) => a.id);
    // a1 desactivado; a3 depende de a1 (se quita); a4/a5 dependen transitivamente de a3 (se quitan)
    expect(ids).toEqual(['a2']);
  });

  it('filterEnabledAgents no afecta a agentes independientes de la rama desactivada', () => {
    const withDisabled: Agent[] = [
      { id: 'b1', name: 'B1', role: '', systemPrompt: '', dependsOn: [], outputType: 'text', enabled: false },
      { id: 'b2', name: 'B2', role: '', systemPrompt: '', dependsOn: [], outputType: 'text' },
      { id: 'b3', name: 'B3', role: '', systemPrompt: '', dependsOn: ['b2'], outputType: 'verdict' },
    ];
    const result = filterEnabledAgents(withDisabled);
    expect(result.map((a) => a.id)).toEqual(['b2', 'b3']);
  });

  it('filterEnabledAgents trata enabled undefined como activo', () => {
    expect(filterEnabledAgents(baseAgents).map((a) => a.id)).toEqual(baseAgents.map((a) => a.id));
  });
});

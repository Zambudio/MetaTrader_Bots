import { useEffect, useState } from 'react';
import { useAgentStore } from '../lib/store';
import { AgentCard } from './AgentCard';
import { AgentConfigModal } from './AgentConfigModal';
import { PairSelector } from './PairSelector';
import { PriceChart } from './PriceChart';
import { StrategyResultCard } from './StrategyResultCard';
import type { Agent } from '../types/agent';
import type { AgentRunResult } from '../types/run';

function buildLevels(agents: Agent[]): Agent[][] {
  const byParent = new Map<string | null, Agent[]>();
  for (const agent of agents) {
    const key = agent.dependsOn;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(agent);
  }

  const levels: Agent[][] = [];
  const seen = new Set<string>();
  let level = byParent.get(null) ?? [];
  while (level.length > 0) {
    levels.push(level);
    level.forEach((agent) => seen.add(agent.id));
    level = level.flatMap((agent) => byParent.get(agent.id) ?? []);
  }
  const orphaned = agents.filter((agent) => !seen.has(agent.id));
  if (orphaned.length > 0) levels.push(orphaned);
  return levels;
}

function connectorState(agentsInLevel: Agent[], resultsByAgentId: Map<string, AgentRunResult>) {
  const statuses = agentsInLevel.map((a) => resultsByAgentId.get(a.id)?.status ?? 'idle');
  if (statuses.some((s) => s === 'error')) return 'error';
  if (statuses.some((s) => s === 'running')) return 'running';
  if (statuses.length > 0 && statuses.every((s) => s === 'done')) return 'done';
  return 'idle';
}

const CONNECTOR_LINE: Record<string, string> = {
  idle: 'bg-line',
  running: 'flow-y',
  done: 'bg-bull',
  error: 'bg-bear',
};

const CONNECTOR_ARROW: Record<string, string> = {
  idle: 'text-line',
  running: 'text-cyan',
  done: 'text-bull',
  error: 'text-bear',
};

function FlowConnector({ state }: { state: string }) {
  return (
    <div className="flex flex-col items-center py-1" aria-hidden="true">
      <span className={`w-0.5 h-7 rounded-full block ${CONNECTOR_LINE[state]}`} />
      <span className={`text-xl leading-none -mt-1.5 ${CONNECTOR_ARROW[state]}`}>&#9660;</span>
    </div>
  );
}

export const Dashboard = () => {
  const {
    agents,
    currentRun,
    isAnalysing,
    isLoading,
    error,
    loadInitialData,
    addAgent,
    updateAgent,
    removeAgent,
    runWorkflow,
  } = useAgentStore();

  const [editingAgent, setEditingAgent] = useState<Agent | null | 'new'>(null);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const resultsByAgentId = new Map((currentRun?.results ?? []).map((r) => [r.agentId, r]));
  const strategyResults = (currentRun?.results ?? []).filter((r) => r.strategy);
  const levels = buildLevels(agents);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este agente? Los agentes que dependían de él dejarán de esperar respuesta.')) {
      return;
    }
    await removeAgent(id);
    setEditingAgent(null);
  };

  return (
    <div className="min-h-screen text-paper font-body">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-10">
        <header className="pb-8 mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-line/60">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-bull pulse-soft shadow-[0_0_8px_1px_var(--color-bull)]" aria-hidden="true" />
              <span className="text-sm font-medium tracking-wide text-muted uppercase">Sistema activo</span>
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-paper tracking-wide">
              MESA DE <span className="text-cyan">TRADING</span>
            </h1>
            <p className="text-muted mt-2 text-base">Consola de agentes de análisis · cadena de estrategia</p>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <PairSelector />
            <button
              onClick={runWorkflow}
              disabled={isAnalysing || agents.length === 0}
              className="rounded-xl border border-cyan/60 bg-cyan/10 text-cyan font-semibold text-base px-6 py-3 hover:bg-cyan/20 hover:glow-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {isAnalysing ? 'Analizando…' : 'Ejecutar análisis'}
            </button>
          </div>
        </header>

        <PriceChart />

        {error && (
          <div className="mb-6 px-4 py-3 bg-bear/10 border border-bear/30 rounded-xl">
            <p className="text-base text-bear">{error}</p>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted text-base">Cargando agentes…</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-base font-medium text-cyan whitespace-nowrap">Cadena de agentes</span>
              <span className="h-px flex-1 bg-line/60" aria-hidden="true" />
            </div>

            <div className="flex flex-col items-center">
              {levels.map((level, levelIndex) => (
                <div key={level.map((a) => a.id).join('-')} className="flex flex-col items-center">
                  {levelIndex > 0 && <FlowConnector state={connectorState(level, resultsByAgentId)} />}
                  <div className="flex flex-row flex-wrap items-start justify-center gap-4">
                    {level.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        runResult={resultsByAgentId.get(agent.id)}
                        onConfigure={() => setEditingAgent(agent)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-col items-center">
                {levels.length > 0 && <FlowConnector state="idle" />}
                <button
                  onClick={() => setEditingAgent('new')}
                  className="w-72 min-h-[120px] border border-dashed border-line rounded-2xl flex items-center justify-center text-base font-medium text-muted hover:text-cyan hover:border-cyan/50 transition-colors px-6"
                >
                  + Añadir agente
                </button>
              </div>
            </div>

            {strategyResults.length > 0 && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-base font-medium text-cyan whitespace-nowrap">Propuesta de estrategia</span>
                  <span className="h-px flex-1 bg-line/60" aria-hidden="true" />
                </div>
                <div className="space-y-6">
                  {strategyResults.map((r) => {
                    const agent = agents.find((a) => a.id === r.agentId);
                    return r.strategy && agent ? (
                      <StrategyResultCard key={r.agentId} agentName={agent.name} strategy={r.strategy} />
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editingAgent && (
        <AgentConfigModal
          agent={editingAgent === 'new' ? null : editingAgent}
          otherAgents={agents.filter((a) => a.id !== (editingAgent === 'new' ? undefined : editingAgent.id))}
          onClose={() => setEditingAgent(null)}
          onSave={async (data) => {
            if (editingAgent === 'new') {
              await addAgent(data);
            } else {
              await updateAgent(editingAgent.id, data);
            }
          }}
          onDelete={editingAgent !== 'new' ? () => handleDelete(editingAgent.id) : undefined}
        />
      )}
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useAgentStore } from '../lib/store';
import { AgentCard } from './AgentCard';
import { AgentConfigModal } from './AgentConfigModal';
import { AgentConnections } from './AgentConnections';
import { PairSelector } from './PairSelector';
import { PriceChart } from './PriceChart';
import { StrategyResultCard } from './StrategyResultCard';
import { buildLevels, wouldCreateCycle } from '../lib/agentGraph';
import type { Agent } from '../types/agent';

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const chainContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

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

  const reportDependencyError = (err: unknown) => {
    useAgentStore.setState({ error: err instanceof Error ? err.message : 'No se pudo actualizar la dependencia' });
  };

  const handleCardDragStart = (agentId: string) => (e: DragEvent<HTMLDivElement>) => {
    setDraggingId(agentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const handleCardDragOver = (agentId: string) => (e: DragEvent<HTMLDivElement>) => {
    if (!draggingId || draggingId === agentId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = wouldCreateCycle(agents, draggingId, agentId) ? 'none' : 'move';
    setDropTargetId(agentId);
  };

  const handleCardDragLeave = (agentId: string) => () => {
    setDropTargetId((current) => (current === agentId ? null : current));
  };

  const handleCardDrop = (agentId: string) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId || sourceId === agentId) return;
    const source = agents.find((a) => a.id === sourceId);
    if (!source || source.dependsOn.includes(agentId)) return;
    if (wouldCreateCycle(agents, sourceId, agentId)) return;
    try {
      await updateAgent(sourceId, { dependsOn: [...source.dependsOn, agentId] });
    } catch (err) {
      reportDependencyError(err);
    }
  };

  const handleContainerDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleContainerDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId) return;
    const source = agents.find((a) => a.id === sourceId);
    if (!source || source.dependsOn.length === 0) return;
    try {
      await updateAgent(sourceId, { dependsOn: [] });
    } catch (err) {
      reportDependencyError(err);
    }
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
              BOTS DE <span className="text-cyan">TRADING</span>
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

            {draggingId && (
              <p className="text-sm text-muted text-center mb-4">
                Suelta sobre otra tarjeta para conectar la dependencia, o en un espacio vacío para quitarla.
              </p>
            )}

            <div
              ref={chainContainerRef}
              className="relative flex flex-col items-center gap-16"
              onDragOver={handleContainerDragOver}
              onDrop={handleContainerDrop}
            >
              <AgentConnections
                agents={agents}
                resultsByAgentId={resultsByAgentId}
                containerRef={chainContainerRef}
                cardRefs={cardRefs}
              />
              {levels.map((level) => (
                <div
                  key={level.map((a) => a.id).join('-')}
                  className="flex flex-row flex-wrap items-start justify-center gap-4"
                >
                  {level.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(agent.id, el);
                        else cardRefs.current.delete(agent.id);
                      }}
                      agent={agent}
                      runResult={resultsByAgentId.get(agent.id)}
                      onConfigure={() => setEditingAgent(agent)}
                      isDragging={draggingId === agent.id}
                      dropState={
                        dropTargetId === agent.id
                          ? wouldCreateCycle(agents, draggingId ?? '', agent.id)
                            ? 'invalid'
                            : 'valid'
                          : null
                      }
                      onDragStart={handleCardDragStart(agent.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleCardDragOver(agent.id)}
                      onDragLeave={handleCardDragLeave(agent.id)}
                      onDrop={handleCardDrop(agent.id)}
                    />
                  ))}
                </div>
              ))}
              <button
                onClick={() => setEditingAgent('new')}
                className="w-72 min-h-[120px] border border-dashed border-line rounded-2xl flex items-center justify-center text-base font-medium text-muted hover:text-cyan hover:border-cyan/50 transition-colors px-6"
              >
                + Añadir agente
              </button>
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

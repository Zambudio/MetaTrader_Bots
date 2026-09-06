import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useAgentStore } from '../lib/store';
import { AgentCard } from './AgentCard';
import { AgentConfigBar } from './AgentConfigBar';
import { AgentConfigModal } from './AgentConfigModal';
import { AgentConnections } from './AgentConnections';
import { AgentLogsPanel } from './AgentLogsPanel';
import { PairSelector } from './PairSelector';
import { PriceChart } from './PriceChart';
import { RunHistoryModal } from './RunHistoryModal';
import { NewsPanel } from './NewsPanel';
import { StrategyResultCard } from './StrategyResultCard';
import { VerdictResultCard } from './VerdictResultCard';
import { buildLevels, filterEnabledAgents, wouldCreateCycle } from '../lib/agentGraph';
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
    resumeWorkflow,
    stopWorkflow,
    loadRun,
    maxRetries,
    setMaxRetries,
  } = useAgentStore();

  const [editingAgent, setEditingAgent] = useState<Agent | null | 'new'>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const chainContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const resultsByAgentId = new Map((currentRun?.results ?? []).map((r) => [r.agentId, r]));
  const strategyResults = (currentRun?.results ?? []).filter((r) => r.strategy);
  const verdictResults = (currentRun?.results ?? []).filter((r) => r.verdict);
  const levels = buildLevels(agents);
  const reachableIds = new Set(filterEnabledAgents(agents).map((a) => a.id));

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
    <div className="min-h-screen text-paper font-body relative">
      {/* Luces de neón ambientales de fondo */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-neon-halo" />
      <div className="fixed top-20 right-10 w-[500px] h-[500px] bg-pink/10 rounded-full blur-[160px] pointer-events-none -z-10 animate-neon-halo" style={{ animationDelay: '1.5s' }} />
      <div className="fixed bottom-10 left-10 w-[450px] h-[450px] bg-violet/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:px-10">
        <header className="pb-10 mb-10 flex flex-col items-center text-center gap-7 border-b border-line-bright/50 relative">
          <div className="laser-line w-full max-w-lg h-[1px] absolute top-0" />
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-void/80 border border-cyan/30 shadow-[0_0_20px_rgba(0,240,255,0.15)] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-bull pulse-soft shadow-[0_0_10px_2px_#00ff9f]" aria-hidden="true" />
              <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">Sistema Activo</span>
              <span className="text-cyan/40 font-mono text-xs">/</span>
              <span className="text-xs font-mono tracking-widest text-cyan glow-text-cyan uppercase">● Live Neural Core</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-paper tracking-wider uppercase flex items-center justify-center gap-3.5 md:gap-4">
              <img
                src="/logo.png"
                alt="Logo Bots de Trading"
                className="w-11 h-11 md:w-13 md:h-13 object-contain drop-shadow-[0_0_16px_rgba(0,240,255,0.5)] select-none"
              />
              <span>
                Bots de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-cyan-soft to-pink glow-text-cyan">Trading</span>
              </span>
            </h1>
            <p className="text-muted text-sm md:text-base max-w-xl mx-auto font-body">
              Consola neuronal de agentes de análisis · Algoritmos adaptativos en tiempo real
            </p>
          </div>

          <div className="cyber-panel rounded-2xl p-4 md:p-5 border border-cyan/25 shadow-[0_0_30px_rgba(0,240,255,0.07)] flex items-end justify-center gap-3.5 flex-wrap w-full max-w-5xl">
            <PairSelector />
            <div>
              <label htmlFor="maxRetriesSelect" className="block text-sm font-medium text-muted mb-1.5">
                Reintentos máx.
              </label>
              <select
                id="maxRetriesSelect"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="h-11 bg-panel border border-line-bright rounded-xl px-3 text-base text-paper font-semibold focus:outline-none focus:border-cyan focus:shadow-[0_0_0_3px_rgba(0,240,255,0.2)] transition-all cursor-pointer"
              >
                <option value={0} className="bg-panel text-paper">0 reintentos</option>
                <option value={1} className="bg-panel text-paper">1 reintento</option>
                <option value={2} className="bg-panel text-paper">2 reintentos</option>
                <option value={3} className="bg-panel text-paper">3 reintentos</option>
              </select>
            </div>
            <button
              onClick={() => setShowHistory(true)}
              className="h-11 rounded-xl border border-line-bright bg-panel-raised/70 backdrop-blur-md text-paper/90 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_18px_rgba(0,240,255,0.3)] font-semibold text-base px-5 transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>👁️</span>
              <span>Análisis anteriores</span>
            </button>
            <button
              onClick={() => setShowNews(true)}
              className="h-11 rounded-xl border border-line-bright bg-panel-raised/70 backdrop-blur-md text-paper/90 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_18px_rgba(0,240,255,0.3)] font-semibold text-base px-5 transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📰</span>
              <span>Noticias</span>
            </button>
            <button
              onClick={runWorkflow}
              disabled={isAnalysing || agents.length === 0}
              className="h-11 rounded-xl cyber-btn-cta font-bold text-base text-cyan hover:text-white px-7 transition-all whitespace-nowrap inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className={isAnalysing ? 'animate-spin text-lg' : 'text-lg'}>
                {isAnalysing ? '⚙️' : '⚡'}
              </span>
              <span>{isAnalysing ? 'Analizando…' : 'Ejecutar análisis'}</span>
            </button>
            {isAnalysing && (
              <button
                onClick={stopWorkflow}
                className="h-11 rounded-xl border border-bear/50 bg-bear/10 text-bear font-bold text-base px-5 hover:bg-bear/20 hover:border-bear transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⏹</span>
                <span>Detener análisis</span>
              </button>
            )}
          </div>
        </header>

        {showHistory && (
          <RunHistoryModal
            onClose={() => setShowHistory(false)}
            onSelect={(id) => {
              setShowHistory(false);
              loadRun(id);
            }}
          />
        )}

        {showNews && <NewsPanel onClose={() => setShowNews(false)} />}

        <PriceChart />

        {error && (
          <div className="mb-6 px-5 py-4 bg-bear/10 border border-bear/40 rounded-2xl shadow-[0_0_20px_rgba(255,42,109,0.2)]">
            <p className="text-base text-bear font-medium">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
            <p className="text-cyan font-mono text-sm tracking-widest uppercase">Cargando agentes de red…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <span className="font-mono text-xs text-cyan bg-cyan/10 border border-cyan/30 px-2 py-0.5 rounded tracking-widest glow-text-cyan uppercase">[01]</span>
              <span className="text-base font-display font-semibold text-paper tracking-wider uppercase">Cadena de agentes</span>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan/40 via-line-bright to-transparent" aria-hidden="true" />
              <AgentConfigBar />
            </div>

            {draggingId && (
              <p className="text-sm text-cyan/90 bg-cyan/10 border border-cyan/30 rounded-xl px-4 py-2 text-center mb-6 shadow-[0_0_15px_rgba(0,240,255,0.15)] font-medium">
                ⚡ Suelta sobre otra tarjeta para conectar la dependencia, o en un espacio vacío para quitarla.
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
                  className="flex flex-row flex-wrap items-start justify-center gap-5"
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
                      isOrphanedByDisabled={agent.enabled !== false && !reachableIds.has(agent.id)}
                      onToggleEnabled={() => updateAgent(agent.id, { enabled: agent.enabled === false })}
                      onConfigure={() => setEditingAgent(agent)}
                      onRetry={() => resumeWorkflow(agent.id)}
                      isAnalysing={isAnalysing}
                      hasCurrentRun={Boolean(currentRun)}
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
                className="w-72 min-h-[120px] border-2 border-dashed border-line-bright/60 hover:border-cyan/80 bg-panel/30 hover:bg-cyan/[0.04] rounded-2xl flex flex-col items-center justify-center gap-2 text-base font-medium text-muted hover:text-cyan transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] px-6 group cursor-pointer"
              >
                <span className="w-8 h-8 rounded-full border border-line-bright group-hover:border-cyan flex items-center justify-center text-lg text-muted group-hover:text-cyan transition-colors">
                  +
                </span>
                <span>Añadir agente</span>
              </button>
            </div>

            {/* Panel de Registro y Logs de Respuestas de Agentes */}
            <AgentLogsPanel
              agents={agents}
              currentRun={currentRun}
              isAnalysing={isAnalysing}
              onResume={resumeWorkflow}
            />

            {verdictResults.length > 0 && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-base font-medium text-cyan whitespace-nowrap">Veredicto</span>
                  <span className="h-px flex-1 bg-line/60" aria-hidden="true" />
                </div>
                <div className="space-y-6">
                  {verdictResults.map((r) => {
                    const agent = agents.find((a) => a.id === r.agentId);
                    return r.verdict && agent ? (
                      <VerdictResultCard
                        key={r.agentId}
                        agentName={agent.name}
                        verdict={r.verdict}
                        attempt={r.attempt}
                        retryCount={currentRun?.retryCount}
                        maxRetries={currentRun?.maxRetries}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {strategyResults.length > 0 && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-base font-medium text-cyan whitespace-nowrap">Propuesta de estrategia</span>
                  <span className="h-px flex-1 bg-line/60" aria-hidden="true" />
                </div>
                <div className="space-y-6">
                  {strategyResults.map((r) => {
                    const agent = agents.find((a) => a.id === r.agentId);
                    const verdictRes = currentRun?.results.find((res) => res.verdict);
                    return r.strategy && agent ? (
                      <StrategyResultCard
                        key={r.agentId}
                        agentName={agent.name}
                        strategy={r.strategy}
                        agentModel={agent.model}
                        runId={currentRun?.id}
                        isRunComplete={currentRun?.status === 'done'}
                        verdictDecision={verdictRes?.verdict?.veredicto}
                        initialResult={currentRun?.mql5Result}
                      />
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

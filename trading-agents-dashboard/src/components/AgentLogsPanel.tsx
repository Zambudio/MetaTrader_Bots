import { useState } from 'react';
import type { Agent } from '../types/agent';
import type { Run, AgentRunResult } from '../types/run';
import { MarkdownText } from './MarkdownText';

interface AgentLogsPanelProps {
  agents: Agent[];
  currentRun: Run | null;
  isAnalysing: boolean;
  onResume: (agentId?: string) => Promise<void>;
}

type FilterTab = 'all' | 'text' | 'strategy' | 'verdict' | 'errors';

export const AgentLogsPanel = ({ agents, currentRun, isAnalysing, onResume }: AgentLogsPanelProps) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [copied, setCopied] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  if (!currentRun || currentRun.results.length === 0) {
    return null;
  }

  const agentsById = new Map(agents.map((a) => [a.id, a]));
  const resultsWithAgents = currentRun.results
    .map((result) => ({
      result,
      agent: agentsById.get(result.agentId),
    }))
    .filter((item): item is { result: AgentRunResult; agent: Agent } => Boolean(item.agent));

  const errorResults = resultsWithAgents.filter((i) => i.result.status === 'error');
  const hasErrors = errorResults.length > 0 || currentRun.status === 'error';
  const completedCount = resultsWithAgents.filter((i) => i.result.status === 'done').length;

  const handleCopyAll = () => {
    const textLines: string[] = [
      `=== REGISTRO DE ANÁLISIS AGÉNTICO ===`,
      `ID: ${currentRun.id} | Par: ${currentRun.pair} | Timeframe: ${currentRun.timeframe}`,
      `Fecha: ${currentRun.createdAt} | Estado: ${currentRun.status.toUpperCase()}`,
      `--------------------------------------\n`,
    ];

    for (const { result, agent } of resultsWithAgents) {
      textLines.push(`[AGENTE: ${agent.name} (${agent.role}) | Modelo: ${agent.model ?? 'auto'}]`);
      textLines.push(`Estado: ${result.status.toUpperCase()}`);
      if (result.startedAt && result.finishedAt) {
        const duration = (
          (new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime()) /
          1000
        ).toFixed(2);
        textLines.push(`Duración: ${duration}s`);
      }
      if (result.error) {
        textLines.push(`ERROR: ${result.error}`);
      }
      if (result.output) {
        textLines.push(`\nRESPUESTA:\n${result.output}\n`);
      }
      if (result.strategy) {
        textLines.push(`\nESTRATEGIA:\n${JSON.stringify(result.strategy, null, 2)}\n`);
      }
      if (result.verdict) {
        textLines.push(`\nVEREDICTO:\n${JSON.stringify(result.verdict, null, 2)}\n`);
      }
      textLines.push(`--------------------------------------\n`);
    }

    navigator.clipboard
      .writeText(textLines.join('\n'))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.warn('Fallo al copiar logs al portapapeles:', err);
        alert('No se pudo copiar el registro al portapapeles. Verifica los permisos de tu navegador.');
      });
  };

  const toggleCollapsed = (agentId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const allCollapsed =
    resultsWithAgents.length > 0 && resultsWithAgents.every(({ agent }) => collapsedIds.has(agent.id));

  const toggleCollapseAll = () => {
    setCollapsedIds(allCollapsed ? new Set() : new Set(resultsWithAgents.map(({ agent }) => agent.id)));
  };

  const filteredItems = resultsWithAgents.filter(({ result, agent }) => {
    if (filter === 'errors') return result.status === 'error';
    if (filter === 'strategy') return agent.outputType === 'strategy' && result.strategy;
    if (filter === 'verdict') return agent.outputType === 'verdict' && result.verdict;
    if (filter === 'text') return agent.outputType === 'text' && result.output;
    return true;
  });

  return (
    <section className="mt-14 border border-line/70 bg-card/60 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-line/60">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <h2 className="font-display font-bold text-2xl text-paper tracking-wide">
              Registro de Respuestas y Logs de Agentes
            </h2>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                currentRun.status === 'done'
                  ? 'bg-bull/20 text-bull border border-bull/40'
                  : currentRun.status === 'error'
                    ? 'bg-bear/20 text-bear border border-bear/40'
                    : 'bg-cyan/20 text-cyan border border-cyan/40 animate-pulse'
              }`}
            >
              {currentRun.status === 'done'
                ? 'Completado'
                : currentRun.status === 'error'
                  ? 'Pausado por Error'
                  : 'En Ejecución'}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            {completedCount} de {resultsWithAgents.length} agentes completados · Par: {currentRun.pair} ({currentRun.timeframe})
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {hasErrors && (
            <button
              onClick={() => onResume(errorResults[0]?.result.agentId)}
              disabled={isAnalysing}
              className="px-4 py-2.5 rounded-xl bg-bear/20 hover:bg-bear/30 text-bear border border-bear/50 font-semibold text-sm transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            >
              🔄 Reintentar agente fallido
            </button>
          )}

          <button
            onClick={toggleCollapseAll}
            className="px-4 py-2.5 rounded-xl bg-paper/5 hover:bg-paper/10 text-paper/80 border border-line font-medium text-sm transition-colors flex items-center gap-2"
          >
            {allCollapsed ? '▾ Expandir todos' : '▸ Colapsar todos'}
          </button>

          <button
            onClick={handleCopyAll}
            className="px-4 py-2.5 rounded-xl bg-paper/5 hover:bg-paper/10 text-paper/80 border border-line font-medium text-sm transition-colors flex items-center gap-2"
          >
            {copied ? '✓ Copiado' : '📋 Copiar todo'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pt-6 pb-4 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-cyan/20 text-cyan border border-cyan/50'
              : 'text-muted hover:text-paper hover:bg-paper/5 border border-transparent'
          }`}
        >
          Todos ({resultsWithAgents.length})
        </button>
        <button
          onClick={() => setFilter('text')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'text'
              ? 'bg-cyan/20 text-cyan border border-cyan/50'
              : 'text-muted hover:text-paper hover:bg-paper/5 border border-transparent'
          }`}
        >
          Análisis Técnicos/Fundamentales
        </button>
        <button
          onClick={() => setFilter('strategy')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'strategy'
              ? 'bg-cyan/20 text-cyan border border-cyan/50'
              : 'text-muted hover:text-paper hover:bg-paper/5 border border-transparent'
          }`}
        >
          Estrategia
        </button>
        <button
          onClick={() => setFilter('verdict')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'verdict'
              ? 'bg-cyan/20 text-cyan border border-cyan/50'
              : 'text-muted hover:text-paper hover:bg-paper/5 border border-transparent'
          }`}
        >
          Veredicto
        </button>
        {errorResults.length > 0 && (
          <button
            onClick={() => setFilter('errors')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === 'errors'
                ? 'bg-bear/20 text-bear border border-bear/50'
                : 'text-bear/80 hover:bg-bear/10 border border-transparent'
            }`}
          >
            Errores ({errorResults.length})
          </button>
        )}
      </div>

      {/* Logs Feed */}
      <div className="space-y-6 mt-4">
        {filteredItems.map(({ result, agent }, index) => {
          const duration =
            result.startedAt && result.finishedAt
              ? (
                  (new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime()) /
                  1000
                ).toFixed(1)
              : null;
          const isCollapsed = collapsedIds.has(agent.id);

          return (
            <div
              key={agent.id}
              className={`rounded-xl border transition-all ${
                result.status === 'error'
                  ? 'border-bear/50 bg-bear/5'
                  : result.status === 'running'
                    ? 'border-cyan/50 bg-cyan/5'
                    : 'border-line/60 bg-paper/[0.02]'
              }`}
            >
              {/* Agent Log Header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleCollapsed(agent.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCollapsed(agent.id);
                  }
                }}
                aria-expanded={!isCollapsed}
                className={`w-full flex flex-wrap items-center justify-between gap-3 p-4 md:px-6 cursor-pointer hover:bg-paper/[0.03] transition-colors ${
                  isCollapsed ? '' : 'border-b border-line/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-muted text-sm" aria-hidden="true">
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                  <div className="relative">
                    {agent.photo ? (
                      <img
                        src={agent.photo}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full object-cover border border-line bg-paper/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center font-bold text-cyan">
                        {agent.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -top-1 -right-1 text-xs px-1.5 py-0.2 bg-paper/20 rounded-full font-mono text-muted">
                      #{index + 1}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base text-paper">{agent.name}</h3>
                      <span className="text-xs text-muted">({agent.role})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-cyan bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20">
                        {agent.model ?? 'auto'}
                      </span>
                      {duration && (
                        <span className="text-xs font-mono text-muted">⏱️ {duration}s</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result.status === 'done'
                        ? 'bg-bull/15 text-bull border border-bull/30'
                        : result.status === 'error'
                          ? 'bg-bear/20 text-bear border border-bear/40'
                          : result.status === 'running'
                            ? 'bg-cyan/20 text-cyan border border-cyan/40 animate-pulse'
                            : 'bg-paper/5 text-muted border border-line'
                    }`}
                  >
                    {result.status === 'done' && '✓ Completado'}
                    {result.status === 'error' && '⚠️ Error'}
                    {result.status === 'running' && '⏳ Procesando…'}
                    {result.status === 'waiting' && '⏱️ En espera'}
                  </span>

                  {result.status === 'error' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResume(agent.id);
                      }}
                      disabled={isAnalysing}
                      className="px-3 py-1 rounded-lg bg-bear/20 hover:bg-bear/30 text-bear border border-bear/50 text-xs font-semibold transition-colors"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </div>

              {/* Agent Log Body */}
              {!isCollapsed && (
              <div className="p-4 md:p-6 space-y-4">
                {/* Error Box */}
                {result.status === 'error' && (
                  <div className="p-4 bg-bear/10 border border-bear/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-bear font-semibold text-sm">
                      <span>⚠️ Fallo durante la ejecución</span>
                    </div>
                    <p className="font-mono text-xs text-bear/90 break-words whitespace-pre-wrap">
                      {result.error}
                    </p>
                    <p className="text-xs text-muted pt-2 border-t border-bear/20">
                      El flujo se ha detenido para no enviar datos inconsistentes a los siguientes agentes. Pulsa en <strong>Reintentar</strong> para volver a ejecutar desde este nodo.
                    </p>
                  </div>
                )}

                {/* Strategy Output */}
                {result.strategy && (
                  <div className="p-5 bg-card/80 border border-line rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-line/60 pb-3">
                      <span className="text-xs font-semibold text-cyan uppercase tracking-wider">
                        Estrategia Propuesta
                      </span>
                      {result.strategy.confianza && (
                        <span className="text-xs font-mono px-2 py-0.5 bg-cyan/10 text-cyan rounded border border-cyan/20">
                          Confianza: {result.strategy.confianza}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-paper font-medium">{result.strategy.resumen}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 bg-paper/[0.03] border border-line/60 rounded-lg">
                        <span className="text-xs text-muted block">Punto de Entrada</span>
                        <span className="font-mono font-bold text-sm text-paper">
                          {result.strategy.puntoEntrada}
                        </span>
                      </div>
                      <div className="p-3 bg-bear/10 border border-bear/30 rounded-lg">
                        <span className="text-xs text-bear/80 block">Stop Loss</span>
                        <span className="font-mono font-bold text-sm text-bear">
                          {result.strategy.stopLoss}
                        </span>
                      </div>
                      <div className="p-3 bg-bull/10 border border-bull/30 rounded-lg">
                        <span className="text-xs text-bull/80 block">Take Profit</span>
                        <span className="font-mono font-bold text-sm text-bull">
                          {result.strategy.takeProfit}
                        </span>
                      </div>
                    </div>

                    {result.strategy.indicadoresClave.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs text-muted block mb-1.5">Factores / Indicadores:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.strategy.indicadoresClave.map((ind, i) => (
                            <span
                              key={i}
                              className="text-xs font-mono bg-paper/5 text-paper/80 px-2 py-0.5 rounded border border-line/60"
                            >
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Verdict Output */}
                {result.verdict && (
                  <div className="p-5 bg-card/80 border border-line rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted uppercase">Veredicto Emitido:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          result.verdict.veredicto === 'go'
                            ? 'bg-bull/20 text-bull border border-bull/40'
                            : result.verdict.veredicto === 'ajustar'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-bear/20 text-bear border border-bear/40'
                        }`}
                      >
                        {result.verdict.veredicto}
                      </span>
                    </div>

                    <p className="text-sm text-paper">{result.verdict.razon}</p>

                    {result.verdict.objeciones && result.verdict.objeciones.length > 0 && (
                      <div className="pt-2 border-t border-line/40">
                        <span className="text-xs font-semibold text-amber-400 block mb-1">
                          Objeciones / Ajustes solicitados:
                        </span>
                        <ul className="list-disc list-inside text-xs text-muted space-y-1">
                          {result.verdict.objeciones.map((obj, i) => (
                            <li key={i} className="text-paper/80">
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Text Output */}
                {result.output && (
                  <div className="text-sm text-paper/90 leading-relaxed max-w-none">
                    <MarkdownText>{result.output}</MarkdownText>
                  </div>
                )}

                {/* Waiting State Details */}
                {result.status === 'waiting' && (
                  <p className="text-xs text-muted italic">
                    En espera de que se completen los agentes predecesores de los cuales depende.
                  </p>
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

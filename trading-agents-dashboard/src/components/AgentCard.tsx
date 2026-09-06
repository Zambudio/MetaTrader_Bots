import { forwardRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { Agent } from '../types/agent';
import type { AgentRunResult } from '../types/run';
import { MarkdownText } from './MarkdownText';

interface Props {
  agent: Agent;
  runResult?: AgentRunResult;
  isOrphanedByDisabled?: boolean;
  onToggleEnabled?: () => void;
  onConfigure: () => void;
  onRetry?: () => void;
  isAnalysing?: boolean;
  hasCurrentRun?: boolean;
  isDragging?: boolean;
  dropState?: 'valid' | 'invalid' | null;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'En espera',
  waiting: 'En cola',
  running: 'Ejecutando',
  done: 'Ejecutada',
  error: 'Rechazada',
};

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-muted',
  waiting: 'bg-muted',
  running: 'bg-cyan shadow-[0_0_10px_2px_var(--color-cyan)]',
  done: 'bg-bull shadow-[0_0_10px_2px_var(--color-bull)]',
  error: 'bg-bear shadow-[0_0_10px_2px_var(--color-bear)]',
};

const STATUS_TEXT: Record<string, string> = {
  idle: 'text-muted',
  waiting: 'text-muted',
  running: 'text-cyan',
  done: 'text-bull',
  error: 'text-bear',
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export const AgentCard = forwardRef<HTMLDivElement, Props>(
  (
    {
      agent,
      runResult,
      isOrphanedByDisabled,
      onToggleEnabled,
      onConfigure,
      onRetry,
      isAnalysing,
      hasCurrentRun,
      isDragging,
      dropState,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref,
  ) => {
    const status = runResult?.status ?? 'idle';
    const isRunning = status === 'running';
    const isError = status === 'error';
    const isDisabled = agent.enabled === false;
    const [photoFailed, setPhotoFailed] = useState(false);
    const showPhoto = Boolean(agent.photo) && !photoFailed;

    const dropRing =
      dropState === 'valid'
        ? 'ring-2 ring-cyan'
        : dropState === 'invalid'
          ? 'ring-2 ring-bear'
          : '';

    return (
      <div
        ref={ref}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-72 cyber-card-interactive rounded-2xl p-5 cursor-grab active:cursor-grabbing card-edge card-sheen relative ${
          isRunning ? 'border-cyan shadow-[0_0_30px_rgba(0,240,255,0.4)] ring-1 ring-cyan/50' :
          status === 'done' ? 'border-bull/50 shadow-[0_0_22px_rgba(0,255,159,0.25)]' :
          isError ? 'border-bear/60 shadow-[0_0_22px_rgba(255,42,109,0.35)]' : ''
        } ${isDragging ? 'opacity-40 scale-95' : isDisabled ? 'opacity-40' : ''} ${dropRing}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`relative rounded-full ring-2 ${
            isRunning ? 'ring-cyan shadow-[0_0_18px_rgba(0,240,255,0.8)] pulse-soft' :
            status === 'done' ? 'ring-bull shadow-[0_0_14px_rgba(0,255,159,0.6)]' :
            isError ? 'ring-bear shadow-[0_0_14px_rgba(255,42,109,0.6)]' : 'ring-line-bright'
          } p-1 bg-void/60`}>
            {showPhoto ? (
              <img
                src={agent.photo}
                alt={agent.name}
                onError={() => setPhotoFailed(true)}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-panel-raised border border-cyan/30 flex items-center justify-center font-display font-black text-lg text-cyan glow-text-cyan">
                {initials(agent.name) || '?'}
              </div>
            )}
          </div>

          <h3 className="font-display font-bold text-lg text-paper mt-3 tracking-wide">{agent.name}</h3>
          <p className="text-xs font-mono uppercase tracking-wider text-muted mt-0.5">{agent.role}</p>

          <div className="flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-void/70 border border-line-bright shadow-inner">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className={`text-xs font-mono font-semibold tracking-wide uppercase ${STATUS_TEXT[status]}`}>{STATUS_LABELS[status]}</span>
          </div>

          {isDisabled && (
            <span className="mt-2 text-[11px] font-mono font-bold text-muted uppercase tracking-widest bg-void/60 px-2 py-0.5 rounded border border-line">Inactivo</span>
          )}
          {!isDisabled && isOrphanedByDisabled && (
            <span className="mt-2 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-lg">
              Omitido: depende de un agente inactivo
            </span>
          )}

          {(agent.dependsOn.length > 0 || agent.model || (runResult?.attempt ?? 1) > 1) && (
            <div className="flex flex-col items-center gap-1 mt-3 w-full">
              {agent.model && (
                <span className="truncate max-w-full text-cyan-soft bg-cyan/10 border border-cyan/30 px-2.5 py-0.5 rounded-md font-mono text-xs shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                  {agent.model}
                </span>
              )}
              {agent.dependsOn.length > 0 && (
                <span className="text-xs text-muted font-mono">⮡ Encadenado ({agent.dependsOn.length})</span>
              )}
              {(runResult?.attempt ?? 1) > 1 && (
                <span className="text-pink font-mono text-xs glow-text-pink">Intento {runResult?.attempt}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-line/60 w-full flex-wrap">
            <button
              onClick={onConfigure}
              className="text-xs font-mono tracking-wider font-semibold text-cyan hover:text-white uppercase transition-colors cursor-pointer"
            >
              Configurar
            </button>
            {onToggleEnabled && (
              <>
                <span className="text-line/80">·</span>
                <button
                  onClick={onToggleEnabled}
                  className={`text-sm font-medium transition-colors ${
                    isDisabled ? 'text-bull hover:text-bull/80' : 'text-muted hover:text-paper'
                  }`}
                >
                  {isDisabled ? 'Activar' : 'Desactivar'}
                </button>
              </>
            )}
            {hasCurrentRun && onRetry && (
              <>
                <span className="text-line/80">·</span>
                <button
                  onClick={onRetry}
                  disabled={isAnalysing}
                  title="Reejecutar el análisis a partir de este agente"
                  className={`text-sm font-medium transition-all flex items-center gap-1 ${
                    isError
                      ? 'text-bear hover:text-bear/80 font-semibold underline'
                      : 'text-muted hover:text-cyan disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  ↻ {isError ? 'Reintentar' : 'Reejecutar'}
                </button>
              </>
            )}
          </div>
        </div>

        {runResult?.error && (
          <div className="mt-4 p-3 bg-bear/10 border border-bear/25 rounded-xl text-left">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-bear uppercase tracking-wider">Error en este agente</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  disabled={isAnalysing}
                  className="text-xs text-bear font-bold hover:underline disabled:opacity-40"
                >
                  ↻ Reintentar
                </button>
              )}
            </div>
            <p className="text-sm text-bear/90 break-words">{runResult.error}</p>
          </div>
        )}

        {runResult?.output && (
          <div className="mt-4 p-3 bg-void/60 rounded-xl max-h-40 overflow-y-auto text-left">
            <MarkdownText className="text-sm text-paper/85">{runResult.output}</MarkdownText>
          </div>
        )}
      </div>
    );
  },
);

AgentCard.displayName = 'AgentCard';

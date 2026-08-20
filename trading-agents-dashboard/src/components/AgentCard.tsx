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
  running: 'bg-cyan shadow-[0_0_8px_1px_var(--color-cyan)]',
  done: 'bg-bull shadow-[0_0_8px_1px_var(--color-bull)]',
  error: 'bg-bear shadow-[0_0_8px_1px_var(--color-bear)]',
};

const STATUS_TEXT: Record<string, string> = {
  idle: 'text-muted',
  waiting: 'text-muted',
  running: 'text-cyan',
  done: 'text-bull',
  error: 'text-bear',
};

const RING: Record<string, string> = {
  idle: 'ring-line',
  waiting: 'ring-line',
  running: 'ring-cyan',
  done: 'ring-bull',
  error: 'ring-bear',
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
        ? 'ring-2 ring-cyan/70 shadow-[0_0_20px_-4px_var(--color-cyan)]'
        : dropState === 'invalid'
          ? 'ring-2 ring-bear/70'
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
        className={`w-72 bg-panel border border-line/70 rounded-2xl p-5 cursor-grab active:cursor-grabbing transition-[opacity,box-shadow] ${isDragging ? 'opacity-40' : isDisabled ? 'opacity-50' : ''} ${dropRing}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`relative rounded-full ring-2 ${RING[status]} ${isRunning ? 'pulse-soft' : ''} p-0.5`}>
            {showPhoto ? (
              <img
                src={agent.photo}
                alt={agent.name}
                onError={() => setPhotoFailed(true)}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-panel-raised flex items-center justify-center font-display font-bold text-base text-cyan">
                {initials(agent.name) || '?'}
              </div>
            )}
          </div>

          <h3 className="font-semibold text-lg text-paper mt-3">{agent.name}</h3>
          <p className="text-sm text-muted">{agent.role}</p>

          <div className="flex items-center gap-1.5 mt-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
            <span className={`text-sm font-medium ${STATUS_TEXT[status]}`}>{STATUS_LABELS[status]}</span>
          </div>

          {isDisabled && (
            <span className="mt-1.5 text-xs font-semibold text-muted uppercase tracking-wider">Inactivo</span>
          )}
          {!isDisabled && isOrphanedByDisabled && (
            <span className="mt-1.5 text-xs font-medium text-amber-400/90">
              Omitido: depende de un agente inactivo
            </span>
          )}

          {(agent.dependsOn.length > 0 || agent.model || (runResult?.attempt ?? 1) > 1) && (
            <div className="flex flex-col items-center gap-0.5 mt-2 text-sm text-muted">
              {agent.dependsOn.length > 0 && <span>Encadenado</span>}
              {agent.model && <span className="truncate max-w-full text-cyan-soft">{agent.model}</span>}
              {(runResult?.attempt ?? 1) > 1 && <span className="text-violet">Intento {runResult?.attempt}</span>}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
            <button
              onClick={onConfigure}
              className="text-sm font-medium text-cyan hover:text-cyan-soft transition-colors"
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

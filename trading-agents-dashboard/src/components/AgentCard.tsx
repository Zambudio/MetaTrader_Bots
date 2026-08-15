import { forwardRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { Agent } from '../types/agent';
import type { AgentRunResult } from '../types/run';
import { MarkdownText } from './MarkdownText';

interface Props {
  agent: Agent;
  runResult?: AgentRunResult;
  onConfigure: () => void;
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
    { agent, runResult, onConfigure, isDragging, dropState, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop },
    ref,
  ) => {
    const status = runResult?.status ?? 'idle';
    const isRunning = status === 'running';
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
        className={`w-72 bg-panel border border-line/70 rounded-2xl p-5 cursor-grab active:cursor-grabbing transition-[opacity,box-shadow] ${isDragging ? 'opacity-40' : ''} ${dropRing}`}
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

          {(agent.dependsOn.length > 0 || agent.model) && (
            <div className="flex flex-col items-center gap-0.5 mt-2 text-sm text-muted">
              {agent.dependsOn.length > 0 && <span>Encadenado</span>}
              {agent.model && <span className="truncate max-w-full text-cyan-soft">{agent.model}</span>}
            </div>
          )}

          <button
            onClick={onConfigure}
            className="mt-3 text-base font-medium text-cyan hover:text-cyan-soft transition-colors"
          >
            Configurar
          </button>
        </div>

        {runResult?.error && (
          <div className="mt-4 p-3 bg-bear/10 border border-bear/25 rounded-xl">
            <p className="text-base text-bear">{runResult.error}</p>
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

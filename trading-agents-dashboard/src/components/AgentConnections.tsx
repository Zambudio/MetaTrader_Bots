import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Agent } from '../types/agent';
import type { AgentRunResult, AgentRunStatus } from '../types/run';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface EdgePath {
  id: string;
  d: string;
  status: AgentRunStatus;
  title: string;
}

interface Props {
  agents: Agent[];
  resultsByAgentId: Map<string, AgentRunResult>;
  containerRef: RefObject<HTMLDivElement | null>;
  cardRefs: RefObject<Map<string, HTMLDivElement>>;
}

const EDGE_COLOR: Record<AgentRunStatus, string> = {
  idle: 'var(--color-line)',
  waiting: 'var(--color-line)',
  running: 'var(--color-cyan)',
  done: 'var(--color-bull)',
  skipped: 'var(--color-muted)',
  error: 'var(--color-bear)',
};

const MARKER_STATES: AgentRunStatus[] = ['idle', 'waiting', 'running', 'done', 'skipped', 'error'];
const ANCHOR_GAP = 6;

/**
 * Draws one arrow per real `dependsOn` relationship (agent-to-agent), not one
 * generic bar per row. When several agents depend on the same parent, their
 * arrows share the vertical trunk out of that parent's card (same path
 * coordinates), then branch out individually to each dependent card.
 */
export function AgentConnections({ agents, resultsByAgentId, containerRef, cardRefs }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [edges, setEdges] = useState<EdgePath[]>([]);

  const recompute = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const containerBox = containerEl.getBoundingClientRect();
    setSize({ width: containerBox.width, height: containerBox.height });

    const rectOf = (id: string): Rect | null => {
      const el = cardRefs.current?.get(id);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return {
        top: box.top - containerBox.top,
        left: box.left - containerBox.left,
        width: box.width,
        height: box.height,
      };
    };

    const childrenByParent = new Map<string, Agent[]>();
    for (const agent of agents) {
      for (const parentId of [...agent.dependsOn, ...(agent.optionalDependsOn ?? [])]) {
        if (!agents.some((candidate) => candidate.id === parentId)) continue;
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId)!.push(agent);
      }
    }

    const nextEdges: EdgePath[] = [];
    for (const [parentId, children] of childrenByParent) {
      const parentRect = rectOf(parentId);
      if (!parentRect) continue;
      const parentAgent = agents.find((candidate) => candidate.id === parentId);
      const px = parentRect.left + parentRect.width / 2;
      const py = parentRect.top + parentRect.height + ANCHOR_GAP;

      const childEntries = children
        .map((child) => ({ child, rect: rectOf(child.id) }))
        .filter((entry): entry is { child: Agent; rect: Rect } => entry.rect !== null);
      if (childEntries.length === 0) continue;

      const minChildTop = Math.min(...childEntries.map((entry) => entry.rect.top)) - ANCHOR_GAP;
      const busY = py + (minChildTop - py) / 2;

      for (const { child, rect: childRect } of childEntries) {
        const cx = childRect.left + childRect.width / 2;
        const cy = childRect.top - ANCHOR_GAP;
        const status = resultsByAgentId.get(child.id)?.status ?? 'idle';
        nextEdges.push({
          id: `${parentId}->${child.id}`,
          d: `M ${px} ${py} L ${px} ${busY} L ${cx} ${busY} L ${cx} ${cy}`,
          status,
          title: `${parentAgent?.name ?? 'Agente'} → ${child.name}`,
        });
      }
    }
    setEdges(nextEdges);
  }, [agents, resultsByAgentId, containerRef, cardRefs]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const observer = new ResizeObserver(() => recompute());
    observer.observe(containerEl);
    window.addEventListener('resize', recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [recompute, containerRef]);

  if (edges.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none -z-10"
      width={size.width}
      height={size.height}
      aria-hidden="true"
    >
      <defs>
        <filter id="neon-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00f0ff" floodOpacity="0.85" />
        </filter>
        <filter id="neon-glow-bull" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00ff9f" floodOpacity="0.75" />
        </filter>
        <filter id="neon-glow-bear" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff2a6d" floodOpacity="0.75" />
        </filter>

        {MARKER_STATES.map((state) => (
          <marker
            key={state}
            id={`agent-arrow-${state}`}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLOR[state]} />
          </marker>
        ))}
      </defs>
      {edges.map((edge) => (
        <path
          key={edge.id}
          d={edge.d}
          fill="none"
          stroke={EDGE_COLOR[edge.status]}
          strokeWidth={edge.status === 'running' ? 2.5 : 2}
          strokeLinejoin="round"
          strokeLinecap="round"
          markerEnd={`url(#agent-arrow-${edge.status})`}
          filter={
            edge.status === 'running'
              ? 'url(#neon-glow-cyan)'
              : edge.status === 'done'
              ? 'url(#neon-glow-bull)'
              : edge.status === 'error'
              ? 'url(#neon-glow-bear)'
              : undefined
          }
          className={edge.status === 'running' ? 'agent-edge-flow' : undefined}
        >
          <title>{edge.title}</title>
        </path>
      ))}
    </svg>
  );
}

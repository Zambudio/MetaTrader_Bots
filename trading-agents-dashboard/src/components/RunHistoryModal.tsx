import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { RunSummary } from '../types/run';

interface Props {
  onClose: () => void;
  onSelect: (id: string) => void;
}

const STATUS_LABEL: Record<RunSummary['status'], string> = {
  done: 'Completado',
  error: 'Error',
  running: 'En curso',
};

const STATUS_CLASS: Record<RunSummary['status'], string> = {
  done: 'text-bull',
  error: 'text-bear',
  running: 'text-cyan',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const RunHistoryModal = ({ onClose, onSelect }: Props) => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRuns()
      .then(setRuns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando análisis anteriores'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este análisis guardado?')) return;
    await api.deleteRun(id);
    setRuns((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-20">
      <div className="cyber-panel border border-cyan/30 rounded-2xl w-full max-w-2xl max-h-[75vh] flex flex-col overflow-hidden card-edge shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
        <div className="laser-line w-full h-[1px] absolute top-0" />
        <div className="p-5 border-b border-line-bright/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan">👁️</span>
            <h2 className="font-display font-black text-lg text-paper tracking-wider uppercase">Análisis anteriores</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-cyan font-mono text-sm transition-colors cursor-pointer">
            [✕ Cerrar]
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-line-bright/40">
          {loading && (
            <div className="p-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-cyan uppercase tracking-wider">Cargando historial…</p>
            </div>
          )}
          {error && <p className="p-8 text-center text-bear text-sm">{error}</p>}
          {!loading && !error && runs.length === 0 && (
            <p className="p-8 text-center text-muted text-sm font-mono">No hay análisis guardados aún.</p>
          )}
          {runs.map((r) => (
            <div
              key={r.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-cyan/[0.04] transition-colors"
            >
              <button
                onClick={() => onSelect(r.id)}
                className="flex-1 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <div>
                  <p className="font-display font-bold text-base text-paper flex items-center gap-2">
                    <span className="text-cyan glow-text-cyan">{r.pair}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-void/60 border border-line-bright text-slate-300">
                      {r.timeframe}
                    </span>
                  </p>
                  <p className="text-xs font-mono text-muted mt-0.5">{formatDate(r.createdAt)}</p>
                </div>
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${STATUS_CLASS[r.status]}`}>
                  ● {STATUS_LABEL[r.status]}
                </span>
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                title="Eliminar del historial"
                className="text-muted hover:text-bear p-2 transition-colors cursor-pointer"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

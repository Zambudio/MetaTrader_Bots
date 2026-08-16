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
  running: 'text-muted',
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
    <div className="fixed inset-0 bg-void/90 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-panel border border-line/70 rounded-2xl w-full max-w-2xl max-h-[75vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-line/60 flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg text-paper tracking-wide">Análisis anteriores</h2>
          <button onClick={onClose} className="text-muted hover:text-paper transition-colors text-sm">
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && <p className="text-muted text-base p-5 text-center">Cargando…</p>}
          {!loading && error && <p className="text-bear text-base p-5 text-center">{error}</p>}
          {!loading && !error && runs.length === 0 && (
            <p className="text-muted text-base p-5 text-center">Todavía no hay análisis guardados.</p>
          )}
          {!loading &&
            !error &&
            runs.map((r) => (
              <div
                key={r.id}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 border-b border-line/40 last:border-b-0 hover:bg-panel-raised/60 transition-colors"
              >
                <button onClick={() => onSelect(r.id)} className="min-w-0 flex-1 text-left">
                  <p className="text-base font-semibold text-paper truncate">
                    {r.pair} <span className="text-muted font-normal">· {r.timeframe}</span>
                  </p>
                  <p className="text-sm text-muted truncate">
                    {formatDate(r.createdAt)} ·{' '}
                    <span className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</span>
                    {r.hasStrategy ? ' · con estrategia' : ''}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg text-muted hover:text-bear hover:bg-bear/10 transition-colors"
                >
                  Borrar
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

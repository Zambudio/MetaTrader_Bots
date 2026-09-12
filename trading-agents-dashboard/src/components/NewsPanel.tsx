import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { NewsSource, NewsItem } from '../types/agent';

export const NewsPanel = ({ onClose }: { onClose: () => void }) => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<'rss' | 'generic_url'>('rss');
  const [newUrl, setNewUrl] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([api.listNewsSources(), api.listNewsItems()]);
      setSources(s);
      setItems(i);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando noticias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleAddSource = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const trimmedUrl = newUrl.trim();
    try {
      new URL(trimmedUrl);
    } catch {
      setError('URL inválida');
      return;
    }
    await api.addNewsSource({ name: newName.trim(), kind: newKind, url: trimmedUrl });
    setNewName('');
    setNewUrl('');
    setError(null);
    await reload();
  };

  const handleFetchAll = async () => {
    setLoading(true);
    try {
      await api.fetchAllNews();
      await reload();
    } finally {
      setLoading(false);
    }
  };

  const handleDigest = async () => {
    await api.generateNewsDigest();
    await reload();
  };

  return (
    <div className="fixed inset-0 bg-void/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-panel border border-line/70 rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto space-y-5 card-edge shadow-2xl">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <h2 className="font-display font-bold text-lg text-paper tracking-wide">NOTICIAS</h2>
          <button onClick={onClose} className="text-muted hover:text-paper text-lg font-mono px-1 cursor-pointer">✕</button>
        </div>

        {error && <p className="text-sm text-bear">{error}</p>}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Añadir fuente</p>
          <div className="flex gap-2 flex-wrap">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre"
              className="flex-1 min-w-[140px] bg-void/50 border border-line/70 rounded-xl px-3 py-2 text-sm text-paper" />
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as 'rss' | 'generic_url')}
              className="bg-panel border border-line/70 rounded-xl px-3 py-2 text-sm text-paper">
              <option value="rss">RSS/Atom</option>
              <option value="generic_url">URL genérica</option>
            </select>
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..."
              className="flex-1 min-w-[200px] bg-void/50 border border-line/70 rounded-xl px-3 py-2 text-sm text-paper" />
            <button onClick={handleAddSource} className="rounded-xl border border-cyan/60 bg-cyan/10 text-cyan text-sm px-4 py-2 cursor-pointer">Añadir</button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Fuentes ({sources.length})</p>
            <div className="relative">
              <button onClick={() => setShowActionMenu(!showActionMenu)} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-cyan/60 bg-cyan/10 text-cyan hover:bg-cyan/20 cursor-pointer disabled:opacity-40">
                ⚙ Acciones
              </button>
              {showActionMenu && (
                <div className="absolute right-0 mt-2 bg-panel border border-line/70 rounded-lg shadow-lg overflow-hidden z-10">
                  <button onClick={() => { handleFetchAll(); setShowActionMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-cyan hover:bg-void/60 text-nowrap">Actualizar todas</button>
                  <button onClick={() => { handleDigest(); setShowActionMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-cyan hover:bg-void/60 text-nowrap">Generar resumen wiki</button>
                </div>
              )}
            </div>
          </div>
          <ul className="divide-y divide-line/40 border border-line/70 rounded-xl overflow-hidden bg-void/40">
            {sources.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-void/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-paper">{s.name}</p>
                    <span className="text-xs text-muted shrink-0">({s.kind})</span>
                    {s.lastFetchStatus === 'error' && <span className="inline-flex h-2 w-2 rounded-full bg-bear shrink-0" title={s.lastFetchError} />}
                  </div>
                  <p className="text-xs text-muted truncate">{s.url}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={async () => { await api.fetchNewsSource(s.id); await reload(); }}
                    className="text-xs px-2 py-1 rounded text-cyan border border-cyan/40 hover:bg-cyan/10 cursor-pointer">Actualizar</button>
                  <button onClick={async () => { await api.deleteNewsSource(s.id); await reload(); }}
                    className="text-xs px-2 py-1 rounded text-bear border border-bear/40 hover:bg-bear/10 cursor-pointer">Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Registro ({items.length})</p>
          <ul className="divide-y divide-line/40 border border-line/70 rounded-xl overflow-hidden bg-void/40 max-h-64 overflow-y-auto">
            {items.map((i) => (
              <li key={i.id} className="px-4 py-3">
                <a href={i.url} target="_blank" rel="noreferrer" className="text-sm text-paper hover:text-cyan">{i.title}</a>
                <p className="text-xs text-muted">{i.fetchedAt}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

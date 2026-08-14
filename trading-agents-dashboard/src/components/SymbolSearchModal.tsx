import { useEffect, useRef, useState } from 'react';
import { useAgentStore } from '../lib/store';
import { api } from '../lib/api';
import type { SymbolSearchResult } from '../types/pair';

export type TabKey = 'favoritos' | 'todos' | 'acciones' | 'fondos' | 'forex' | 'indices' | 'cripto';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'favoritos', label: 'Favoritos' },
  { key: 'todos', label: 'Todos' },
  { key: 'acciones', label: 'Acciones' },
  { key: 'fondos', label: 'Fondos' },
  { key: 'forex', label: 'Forex' },
  { key: 'indices', label: 'Índices' },
  { key: 'cripto', label: 'Cripto' },
];

function matchesTab(tab: TabKey, type?: string): boolean {
  switch (tab) {
    case 'acciones':
      return type === 'Common Stock' || type === 'Depositary Receipt';
    case 'fondos':
      return type === 'Mutual Fund' || type === 'ETF';
    case 'forex':
      return type === 'Physical Currency';
    case 'indices':
      return type === 'Index';
    case 'cripto':
      return type === 'Digital Currency';
    default:
      return true;
  }
}

function StarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-cyan shrink-0"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

interface Props {
  onClose: () => void;
  initialTab?: TabKey;
  initialQuery?: string;
}

export const SymbolSearchModal = ({ onClose, initialTab = 'favoritos', initialQuery = '' }: Props) => {
  const { pairs, setSelectedPair } = useAgentStore();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (initialQuery) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    } else {
      el.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeoutId = window.setTimeout(() => {
      api
        .searchSymbols(query.trim())
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Error buscando símbolos');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSelect = (symbol: string) => {
    setSelectedPair(symbol);
    onClose();
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (tab === 'favoritos' && value.trim()) setTab('todos');
  };

  const favoritePairs = pairs.filter((p) => p.favorite);
  const filteredResults = results.filter((r) => matchesTab(tab, r.type));

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-panel border border-line/70 rounded-2xl w-full max-w-2xl max-h-[75vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-line/60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-bold text-lg text-paper tracking-wide">Buscar símbolo</h2>
            <button onClick={onClose} className="text-muted hover:text-paper transition-colors text-sm">
              Cerrar
            </button>
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ej. AAPL, EUR/USD, ETH..."
            className="w-full bg-void/50 border border-line/70 rounded-xl px-3.5 py-2.5 text-paper text-base outline-none focus:border-cyan/60"
          />
          <div className="flex gap-1.5 mt-3 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  tab === t.key
                    ? 'bg-cyan/15 border-cyan/60 text-cyan'
                    : 'border-line/70 text-muted hover:text-paper hover:border-line'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'favoritos' ? (
            favoritePairs.length === 0 ? (
              <p className="text-muted text-base p-5 text-center">
                Aún no tienes pares favoritos. Márcalos con la estrella junto al par en la pantalla principal.
              </p>
            ) : (
              favoritePairs.map((p) => (
                <button
                  key={p.symbol}
                  onClick={() => handleSelect(p.symbol)}
                  className="w-full flex items-center gap-3 px-5 py-3 border-b border-line/40 last:border-b-0 hover:bg-panel-raised/60 transition-colors text-left"
                >
                  <StarIcon />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-paper truncate">
                      {p.symbol} {p.name && <span className="text-muted font-normal">· {p.name}</span>}
                    </p>
                    {p.exchange && (
                      <p className="text-sm text-muted truncate">
                        {p.type} · {p.exchange}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )
          ) : (
            <>
              {loading && <p className="text-muted text-base p-5 text-center">Buscando…</p>}
              {!loading && error && <p className="text-bear text-base p-5 text-center">{error}</p>}
              {!loading && !error && !query.trim() && (
                <p className="text-muted text-base p-5 text-center">Escribe para buscar símbolos.</p>
              )}
              {!loading && !error && query.trim() && filteredResults.length === 0 && (
                <p className="text-muted text-base p-5 text-center">Sin resultados.</p>
              )}
              {!loading &&
                !error &&
                filteredResults.map((r, i) => (
                  <button
                    key={`${r.symbol}-${r.exchange}-${i}`}
                    onClick={() => handleSelect(r.symbol)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 border-b border-line/40 last:border-b-0 hover:bg-panel-raised/60 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-paper truncate">
                        {r.symbol} <span className="text-muted font-normal">· {r.name}</span>
                      </p>
                      <p className="text-sm text-muted truncate">
                        {r.type} {r.exchange ? `· ${r.exchange}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

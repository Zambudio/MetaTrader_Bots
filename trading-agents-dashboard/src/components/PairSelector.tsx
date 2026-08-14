import { useEffect, useState } from 'react';
import { useAgentStore, TIMEFRAME_OPTIONS } from '../lib/store';
import { SymbolSearchModal, type TabKey } from './SymbolSearchModal';

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

interface ModalState {
  tab: TabKey;
  query: string;
}

export const PairSelector = () => {
  const { pairs, selectedPair, timeframe, setTimeframe, toggleFavorite } = useAgentStore();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [inputValue, setInputValue] = useState(selectedPair);

  useEffect(() => {
    setInputValue(selectedPair);
  }, [selectedPair]);

  const currentSaved = pairs.find((p) => p.symbol === selectedPair);
  const isFavorite = currentSaved?.favorite ?? false;

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!modal) setModal({ tab: 'todos', query: value });
  };

  const closeModal = () => {
    setModal(null);
    setInputValue(selectedPair);
  };

  return (
    <>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setModal({ tab: 'favoritos', query: '' })}
          title="Buscar símbolo"
          className="mb-0.5 w-10 h-10 flex items-center justify-center rounded-xl border border-line/70 text-muted hover:text-cyan hover:border-cyan/50 transition-colors shrink-0"
        >
          <SearchIcon />
        </button>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Par</label>
          <div className="flex items-center gap-2">
            <input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Buscar par..."
              className="bg-panel border border-line/70 rounded-xl font-semibold text-base text-cyan px-3.5 py-2.5 outline-none w-40 focus:border-cyan/60 placeholder:text-muted placeholder:font-normal transition-colors"
            />
            <button
              type="button"
              onClick={() => toggleFavorite(selectedPair, !isFavorite)}
              title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors shrink-0 ${
                isFavorite
                  ? 'border-cyan/60 text-cyan bg-cyan/10'
                  : 'border-line/70 text-muted hover:text-cyan hover:border-cyan/50'
              }`}
            >
              <StarIcon filled={isFavorite} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-panel border border-line/70 rounded-xl text-base text-paper px-3 py-2.5 outline-none focus:border-cyan/60"
          >
            {TIMEFRAME_OPTIONS.map((tf) => (
              <option key={tf} value={tf} className="bg-panel text-paper">
                {tf}
              </option>
            ))}
          </select>
        </div>
      </div>

      {modal && <SymbolSearchModal onClose={closeModal} initialTab={modal.tab} initialQuery={modal.query} />}
    </>
  );
};

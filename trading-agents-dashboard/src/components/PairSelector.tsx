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
      <div className="flex items-end gap-3">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setModal({ tab: 'favoritos', query: '' })}
            title="Buscar símbolo"
            className="h-11 w-11 flex items-center justify-center rounded-xl border border-line-bright bg-panel text-muted hover:text-cyan hover:border-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all shrink-0 cursor-pointer"
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
                className="h-11 bg-panel border border-line-bright rounded-xl font-semibold text-base text-cyan glow-text-cyan px-3.5 outline-none w-36 sm:w-40 focus:border-cyan focus:shadow-[0_0_18px_rgba(0,240,255,0.25)] placeholder:text-muted placeholder:font-normal transition-all"
              />
              <button
                type="button"
                onClick={() => toggleFavorite(selectedPair, !isFavorite)}
                title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer ${
                  isFavorite
                    ? 'border-cyan text-cyan bg-cyan/15 shadow-[0_0_16px_rgba(0,240,255,0.55)]'
                    : 'border-line-bright bg-panel text-muted hover:text-cyan hover:border-cyan hover:shadow-[0_0_14px_rgba(0,240,255,0.25)]'
                }`}
              >
                <StarIcon filled={isFavorite} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-11 bg-panel border border-line-bright rounded-xl text-base text-paper font-semibold px-3 outline-none focus:border-cyan focus:shadow-[0_0_18px_rgba(0,240,255,0.25)] transition-all cursor-pointer"
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

import { useState } from 'react';
import { useAgentStore } from '../lib/store';

export const AgentConfigBar = () => {
  const presets = useAgentStore((state) => state.presets);
  const activePresetId = useAgentStore((state) => state.activePresetId);
  const isAnalysing = useAgentStore((state) => state.isAnalysing);
  const savePresetAs = useAgentStore((state) => state.savePresetAs);
  const overwriteActivePreset = useAgentStore((state) => state.overwriteActivePreset);
  const loadPreset = useAgentStore((state) => state.loadPreset);
  const deletePreset = useAgentStore((state) => state.deletePreset);

  const [showSaveAs, setShowSaveAs] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleLoad = (id: string) => {
    if (!id || id === activePresetId) return;
    loadPreset(id);
  };

  const handleDelete = () => {
    if (!activePresetId) return;
    const preset = presets.find((p) => p.id === activePresetId);
    if (!window.confirm(`¿Borrar la configuración "${preset?.name ?? ''}"? Los agentes activos ahora mismo no se ven afectados.`)) {
      return;
    }
    deletePreset(activePresetId);
  };

  const handleSaveAsConfirm = async () => {
    if (!newName.trim()) {
      setSaveError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await savePresetAs(newName.trim());
      setShowSaveAs(false);
      setNewName('');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={activePresetId ?? ''}
        onChange={(e) => handleLoad(e.target.value)}
        disabled={isAnalysing}
        className="bg-panel border border-line/70 rounded-xl px-3 py-2 text-sm text-paper font-medium focus:outline-none focus:border-cyan disabled:opacity-40"
      >
        <option value="" className="bg-panel">
          — sin guardar —
        </option>
        {presets.map((p) => (
          <option key={p.id} value={p.id} className="bg-panel">
            {p.name}
          </option>
        ))}
      </select>

      {activePresetId && (
        <button
          onClick={() => loadPreset(activePresetId)}
          disabled={isAnalysing}
          title="Descarta los cambios hechos desde que se cargó y vuelve a dejar los agentes tal como estaban guardados"
          className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 transition-all disabled:opacity-40"
        >
          ↺ Restaurar
        </button>
      )}

      {activePresetId && (
        <button
          onClick={() => overwriteActivePreset()}
          disabled={isAnalysing}
          className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 transition-all disabled:opacity-40"
        >
          💾 Guardar
        </button>
      )}

      <button
        onClick={() => setShowSaveAs(true)}
        disabled={isAnalysing}
        className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 transition-all disabled:opacity-40"
      >
        Guardar como…
      </button>

      {activePresetId && (
        <button
          onClick={handleDelete}
          disabled={isAnalysing}
          title="Borrar esta configuración"
          className="rounded-xl border border-line/70 text-bear/80 font-medium text-sm px-3 py-2 hover:text-bear hover:border-bear/50 transition-all disabled:opacity-40"
        >
          🗑️
        </button>
      )}

      {showSaveAs && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line/70 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-display font-bold text-lg text-paper tracking-wide">GUARDAR COMO…</h2>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Nombre de la configuración</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAsConfirm();
                }}
                className="w-full bg-void/50 border border-line/70 rounded-xl px-3.5 py-2.5 text-paper text-base outline-none focus:border-cyan/60 transition-colors"
              />
            </div>
            {saveError && (
              <div className="px-3.5 py-2.5 bg-bear/10 border border-bear/25 rounded-xl">
                <p className="text-sm text-bear">{saveError}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => {
                  setShowSaveAs(false);
                  setNewName('');
                  setSaveError(null);
                }}
                className="text-base font-medium text-muted hover:text-paper transition-colors px-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsConfirm}
                disabled={saving}
                className="rounded-xl border border-cyan/60 bg-cyan/10 text-cyan font-semibold text-base px-5 py-2.5 hover:bg-cyan/20 hover:glow-cyan disabled:opacity-50 transition-all"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

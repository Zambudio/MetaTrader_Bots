import { useState } from 'react';
import { useAgentStore } from '../lib/store';

export const AgentConfigBar = () => {
  const presets = useAgentStore((state) => state.presets);
  const activePresetId = useAgentStore((state) => state.activePresetId);
  const agents = useAgentStore((state) => state.agents);
  const isAnalysing = useAgentStore((state) => state.isAnalysing);
  const savePresetAs = useAgentStore((state) => state.savePresetAs);
  const overwriteActivePreset = useAgentStore((state) => state.overwriteActivePreset);
  const loadPreset = useAgentStore((state) => state.loadPreset);
  const detachAgentRelations = useAgentStore((state) => state.detachAgentRelations);
  const deletePreset = useAgentStore((state) => state.deletePreset);

  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activePreset = presets.find((p) => p.id === activePresetId);
  const isProtected = Boolean(activePreset?.isProtected);
  const deletablePresets = presets.filter((p) => !p.isProtected);
  const isDeleteDisabled = isAnalysing;

  const handleLoad = (id: string) => {
    if (!id || id === activePresetId) return;
    loadPreset(id);
  };

  const handleDetach = () => {
    if (
      window.confirm(
        'Esto desconecta las relaciones entre los agentes que ves ahora mismo (solo en esta edición, nada se guarda todavía). Puedes desactivar agentes, añadir nuevos y reconectar a tu gusto. Si no guardas, "Restaurar" recupera la configuración original tal cual. ¿Continuar?'
      )
    ) {
      detachAgentRelations();
    }
  };

  const handleDeleteClick = () => {
    if (activePreset && !isProtected) {
      const details = [activePreset.version, activePreset.referenceAsset].filter(Boolean).join(' · ');
      const label = details ? `"${activePreset.name}" (${details})` : `"${activePreset.name}"`;
      if (window.confirm(`¿Borrar la configuración guardada ${label}? Los agentes actuales en pantalla no se verán afectados.`)) {
        deletePreset(activePreset.id);
      }
      return;
    }
    setShowDeleteModal(true);
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

  const getDeleteButtonTitle = () => {
    if (activePreset && !isProtected) {
      return `Borrar la configuración guardada "${activePreset.name}"`;
    }
    if (activePreset && isProtected) {
      return `"${activePreset.name}" es una plantilla base oficial (protegida). Haz clic para gestionar o borrar otras configuraciones guardadas.`;
    }
    return 'Gestionar o borrar configuraciones guardadas.';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={activePresetId ?? ''}
        onChange={(e) => handleLoad(e.target.value)}
        disabled={isAnalysing}
        className="bg-panel border border-line/70 rounded-xl px-3 py-2 text-sm text-paper font-medium focus:outline-none focus:border-cyan focus:shadow-[0_0_0_3px_rgba(45,230,244,0.15)] disabled:opacity-40 transition-all cursor-pointer"
      >
        <option value="" className="bg-panel">
          — sin guardar —
        </option>
        {presets.map((p) => {
          const details = [p.version, p.referenceAsset].filter(Boolean).join(' · ');
          return (
            <option key={p.id} value={p.id} className="bg-panel">
              {details ? `${p.name} · ${details}` : p.name}
            </option>
          );
        })}
      </select>

      {activePresetId && (
        <button
          onClick={() => loadPreset(activePresetId)}
          disabled={isAnalysing}
          title="Descarta los cambios hechos desde que se cargó y vuelve a dejar los agentes tal como estaban guardados"
          className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
        >
          ↺ Restaurar
        </button>
      )}

      {activePresetId && !isProtected && (
        <button
          onClick={() => overwriteActivePreset()}
          disabled={isAnalysing}
          title="Sobrescribir esta configuración con los agentes actuales"
          className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
        >
          💾 Guardar
        </button>
      )}

      <button
        onClick={handleDetach}
        disabled={isAnalysing || agents.length === 0}
        title="Desconecta las relaciones de los agentes actuales para rediseñar la cadena desde cero, sin guardar nada todavía"
        className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
      >
        🧩 Crear nueva estrategia
      </button>

      <button
        onClick={() => setShowSaveAs(true)}
        disabled={isAnalysing}
        className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-3 py-2 hover:text-cyan hover:border-cyan/50 hover:shadow-[0_0_12px_-4px_rgba(45,230,244,0.3)] transition-all disabled:opacity-40 cursor-pointer"
      >
        Guardar como…
      </button>

      <button
        onClick={handleDeleteClick}
        disabled={isDeleteDisabled}
        title={getDeleteButtonTitle()}
        className={`rounded-xl border font-medium text-sm px-3 py-2 transition-all ${
          isDeleteDisabled
            ? 'border-line/40 text-muted/30 cursor-not-allowed opacity-40'
            : 'border-line/70 text-bear/80 hover:text-bear hover:border-bear/50 hover:shadow-[0_0_12px_-4px_rgba(255,61,110,0.3)] cursor-pointer'
        }`}
      >
        🗑️
      </button>

      {showSaveAs && (
        <div className="fixed inset-0 bg-void/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line/70 rounded-2xl p-6 w-full max-w-sm space-y-4 card-edge shadow-2xl">
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
                className="w-full bg-void/50 border border-line/70 rounded-xl px-3.5 py-2.5 text-paper text-base outline-none focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(45,230,244,0.15)] transition-all"
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
                className="text-base font-medium text-muted hover:text-paper transition-colors px-2 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsConfirm}
                disabled={saving}
                className="rounded-xl border border-cyan/60 bg-cyan/10 text-cyan font-semibold text-base px-5 py-2.5 hover:bg-cyan/20 hover:glow-cyan disabled:opacity-50 transition-all shadow-[0_0_14px_-4px_rgba(45,230,244,0.4)] cursor-pointer"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-void/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line/70 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h2 className="font-display font-bold text-lg text-paper tracking-wide">
                GESTIONAR / BORRAR CONFIGURACIONES
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-muted hover:text-paper text-lg font-mono px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-muted">
              Las plantillas base del sistema (<span className="text-cyan font-medium">FOREX</span>,{' '}
              <span className="text-cyan font-medium">ACCIONES</span>,{' '}
              <span className="text-cyan font-medium">CRIPTOMONEDAS</span> y sus versiones <span className="text-cyan font-medium">Simple</span>) están protegidas como puntos de partida oficiales.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Configuraciones guardadas y personalizadas:
              </p>
              {deletablePresets.length === 0 ? (
                <div className="p-4 rounded-xl border border-line/40 bg-void/30 text-center">
                  <p className="text-sm text-muted italic">No hay configuraciones personalizadas guardadas para borrar.</p>
                  <p className="text-xs text-muted/70 mt-1">Cualquier estrategia guardada con "Guardar como…" aparecerá aquí para gestionarse o borrarse.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line/40 border border-line/70 rounded-xl overflow-hidden bg-void/40 max-h-72 overflow-y-auto">
                  {deletablePresets.map((p) => {
                    const details = [p.version, p.referenceAsset].filter(Boolean).join(' · ');
                    return (
                      <li key={p.id} className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-void/60 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-paper truncate">
                            {p.name} {details ? <span className="text-xs font-normal text-cyan/80">({details})</span> : null}
                          </p>
                          <p className="text-xs text-muted">
                            {p.agents.length} agentes · {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'guardada'}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                `¿Seguro que deseas eliminar permanentemente la configuración "${p.name}"?`
                              )
                            ) {
                              await deletePreset(p.id);
                              if (deletablePresets.length <= 1) {
                                setShowDeleteModal(false);
                              }
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg border border-bear/40 bg-bear/10 text-bear font-medium text-xs hover:bg-bear/20 hover:border-bear/60 transition-all shrink-0 cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-line/70 text-paper/80 font-medium text-sm px-4 py-2 hover:text-paper hover:border-line transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

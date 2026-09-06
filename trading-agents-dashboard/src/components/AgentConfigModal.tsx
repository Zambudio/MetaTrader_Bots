import { useState } from 'react';
import type { Agent, OutputType } from '../types/agent';
import { useAgentStore } from '../lib/store';
import { wouldCreateCycle } from '../lib/agentGraph';
import { ModelSelector } from './ModelSelector';

interface Props {
  agent: Agent | null;
  otherAgents: Agent[];
  onClose: () => void;
  onSave: (data: Partial<Agent>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const fieldLabel = 'block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1.5';
const fieldInput =
  'w-full bg-void/70 border border-line-bright rounded-xl px-3.5 py-2.5 text-paper font-medium text-base outline-none focus:border-cyan focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all';

export const AgentConfigModal = ({ agent, otherAgents, onClose, onSave, onDelete }: Props) => {
  const allAgents = useAgentStore((state) => state.agents);
  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(agent?.dependsOn ?? []);

  const toggleDependsOn = (id: string) => {
    setDependsOn((current) => (current.includes(id) ? current.filter((depId) => depId !== id) : [...current, id]));
  };
  const [outputType, setOutputType] = useState<OutputType>(agent?.outputType ?? 'text');
  const [photo, setPhoto] = useState(agent?.photo ?? '');
  const [photoFailed, setPhotoFailed] = useState(false);

  // Selector en cascada fuente -> modelo -> esfuerzo. `agent.model` es el string
  // "<fuente>:<modelo>[:<esfuerzo>]" (ver src/lib/modelString.ts).
  const [model, setModel] = useState(agent?.model ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim() || 'Agente',
        systemPrompt,
        dependsOn,
        outputType,
        photo: photo || undefined,
        model: model || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el agente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="cyber-panel border border-cyan/30 rounded-2xl p-6 md:p-8 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto card-edge shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
        <div className="laser-line w-full h-[1px] absolute top-0" />
        <div className="pb-4 border-b border-line-bright/60 flex items-center gap-3">
          {photo && !photoFailed ? (
            <img
              src={photo}
              alt=""
              onError={() => setPhotoFailed(true)}
              className="w-12 h-12 rounded-full object-cover border-2 border-cyan/40 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-panel-raised border border-cyan/30 flex items-center justify-center font-display font-black text-cyan glow-text-cyan">
              {(name.trim()[0] ?? '?').toUpperCase()}
            </div>
          )}
          <h2 className="font-display font-black text-xl text-paper tracking-wider uppercase">
            {agent ? 'Configurar Agente' : 'Añadir Agente'}
          </h2>
        </div>

        <div>
          <label className={fieldLabel}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldInput} />
        </div>

        <div>
          <label className={fieldLabel}>Rol</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ej. Analista Técnico"
            className={fieldInput}
          />
        </div>

        <div>
          <label className={fieldLabel}>Foto (URL, opcional — se muestra en formato circular)</label>
          <input
            value={photo}
            onChange={(e) => {
              setPhoto(e.target.value);
              setPhotoFailed(false);
            }}
            className={fieldInput}
          />
        </div>

        <div>
          <label className={fieldLabel}>Prompt del agente</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            placeholder="Instrucciones que definen cómo analiza este agente..."
            className={`${fieldInput} resize-y leading-relaxed`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Espera respuesta de</label>
            <div className="border border-line/70 rounded-xl divide-y divide-line/50 max-h-40 overflow-y-auto">
              {otherAgents.length === 0 ? (
                <p className="px-3.5 py-2.5 text-sm text-muted">No hay otros agentes todavía.</p>
              ) : (
                otherAgents.map((a) => {
                  const disabled = agent ? wouldCreateCycle(allAgents, agent.id, a.id) : false;
                  return (
                    <label
                      key={a.id}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-base ${
                        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={dependsOn.includes(a.id)}
                        disabled={disabled}
                        onChange={() => toggleDependsOn(a.id)}
                        className="accent-cyan"
                      />
                      <span className="text-paper">{a.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Tipo de salida</label>
            <select
              value={outputType}
              onChange={(e) => setOutputType(e.target.value as OutputType)}
              className={fieldInput}
            >
              <option value="text" className="bg-panel">
                Análisis de texto
              </option>
              <option value="analysis" className="bg-panel">
                Análisis estructurado
              </option>
              <option value="strategy" className="bg-panel">
                Estrategia final
              </option>
              <option value="verdict" className="bg-panel">
                Veredicto (validación final)
              </option>
            </select>
          </div>
        </div>

        <ModelSelector value={model} onChange={setModel} idPrefix="agent-model" />

        {error && (
          <div className="px-3.5 py-2.5 bg-bear/10 border border-bear/25 rounded-xl">
            <p className="text-base text-bear">{error}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-line/60">
          {onDelete ? (
            <button onClick={onDelete} className="text-base font-medium text-bear hover:text-paper transition-colors">
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="text-base font-medium text-muted hover:text-paper transition-colors px-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl cyber-btn-cta text-cyan hover:text-white font-bold text-base px-6 py-2.5 transition-all shadow-[0_0_16px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

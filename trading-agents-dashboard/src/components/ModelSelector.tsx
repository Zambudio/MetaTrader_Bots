import type { LlmSourceId } from '../types/model';
import { useAgentStore } from '../lib/store';
import { buildModelString, parseModelString } from '../lib/modelString';

interface Props {
  /** String `"<fuente>:<modelo>[:<esfuerzo>]"` (o `""` = por defecto del servidor). */
  value: string;
  onChange: (value: string) => void;
  /** Muestra la opción "Modelo por defecto del servidor" cuando la fuente es OmniRoute. */
  allowServerDefault?: boolean;
  idPrefix?: string;
}

const fieldLabel = 'block text-sm font-medium text-muted mb-1.5';
const fieldInput =
  'w-full bg-void/50 border border-line/70 rounded-xl px-3.5 py-2.5 text-paper text-base outline-none focus:border-cyan/60 transition-colors';

/**
 * Selector en cascada Fuente -> Modelo -> Esfuerzo. Totalmente controlado: recibe/emite el
 * string que se guarda en `Agent.model` (y que reusa el generador MQL5). La lógica de
 * "al cambiar de fuente, resetea el modelo y el esfuerzo" vive aquí dentro.
 */
export const ModelSelector = ({ value, onChange, allowServerDefault = true, idPrefix = 'model' }: Props) => {
  const sources = useAgentStore((state) => state.sources);
  const modelsBySource = useAgentStore((state) => state.modelsBySource);

  const parsed = parseModelString(value);
  const source = parsed.source;
  const modelName = parsed.model;
  const effort = parsed.effort ?? '';

  const currentSource = sources.find((s) => s.id === source);
  const modelsForSource = modelsBySource[source] ?? [];

  const handleSourceChange = (nextSource: LlmSourceId) => {
    const nextModels = modelsBySource[nextSource] ?? [];
    const nextModel = nextSource === 'omniroute' ? '' : nextModels[0] ?? '';
    const nextInfo = sources.find((s) => s.id === nextSource);
    const nextEffort = nextInfo?.supportsEffort
      ? nextInfo.efforts?.includes('medium')
        ? 'medium'
        : nextInfo.efforts?.[0] ?? ''
      : '';
    onChange(buildModelString(nextSource, nextModel, nextEffort));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel} htmlFor={`${idPrefix}-source`}>
          Fuente del modelo
        </label>
        <select
          id={`${idPrefix}-source`}
          value={source}
          onChange={(e) => handleSourceChange(e.target.value as LlmSourceId)}
          className={fieldInput}
        >
          {sources.length === 0 && (
            <option value={source} className="bg-panel">
              {source}
            </option>
          )}
          {sources.map((s) => (
            <option key={s.id} value={s.id} className="bg-panel">
              {s.label}
            </option>
          ))}
        </select>
        {currentSource?.note && <p className="mt-1.5 text-sm text-muted">{currentSource.note}</p>}
      </div>

      <div>
        <label className={fieldLabel} htmlFor={`${idPrefix}-model`}>
          Modelo
        </label>
        <select
          id={`${idPrefix}-model`}
          value={modelName}
          onChange={(e) => onChange(buildModelString(source, e.target.value, effort))}
          className={fieldInput}
        >
          {source === 'omniroute' && allowServerDefault && (
            <option value="" className="bg-panel">
              Modelo por defecto del servidor
            </option>
          )}
          {modelsForSource.map((m) => (
            <option key={m} value={m} className="bg-panel">
              {m}
            </option>
          ))}
          {modelName && !modelsForSource.includes(modelName) && (
            <option value={modelName} className="bg-panel">
              {modelName} (actual)
            </option>
          )}
        </select>
      </div>

      {currentSource?.supportsEffort && (
        <div>
          <label className={fieldLabel} htmlFor={`${idPrefix}-effort`}>
            Esfuerzo de razonamiento
          </label>
          <select
            id={`${idPrefix}-effort`}
            value={effort}
            onChange={(e) => onChange(buildModelString(source, modelName, e.target.value))}
            className={fieldInput}
          >
            {(currentSource.efforts ?? []).map((ef) => (
              <option key={ef} value={ef} className="bg-panel">
                {ef}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

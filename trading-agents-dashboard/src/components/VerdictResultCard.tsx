import type { VerdictResult, Veredicto } from '../types/verdict';

interface Props {
  agentName: string;
  verdict: VerdictResult;
  attempt?: number;
  retryCount?: number;
  maxRetries?: number;
}

const VEREDICTO_LABEL: Record<Veredicto, string> = {
  go: 'GO',
  ajustar: 'AJUSTAR',
  no_operar: 'NO OPERAR',
};

const VEREDICTO_STYLE: Record<Veredicto, string> = {
  go: 'text-bull border-bull/30 bg-bull/10',
  ajustar: 'text-violet border-violet/30 bg-violet/10',
  no_operar: 'text-bear border-bear/30 bg-bear/10',
};

export const VerdictResultCard = ({ agentName, verdict, attempt, retryCount, maxRetries }: Props) => {
  const needsManualReview = verdict.veredicto === 'ajustar' && (retryCount ?? 0) >= (maxRetries ?? 0);

  return (
    <div className="bg-panel border border-line/70 rounded-2xl overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-5 mb-5 border-b border-line/60">
          <div>
            <p className="text-sm font-medium text-muted mb-1.5 tracking-wide uppercase">Veredicto final</p>
            <h3 className="font-display font-bold text-3xl text-paper tracking-wide">{agentName}</h3>
          </div>
          <span className={`text-base font-semibold px-4 py-2 rounded-xl border ${VEREDICTO_STYLE[verdict.veredicto]}`}>
            {VEREDICTO_LABEL[verdict.veredicto]}
          </span>
        </div>

        {verdict.veredicto === 'go' && (
          <p className="text-xs text-muted mb-3">
            GO = coherencia técnica de esta operación sobre el snapshot actual, no una confirmación de
            rentabilidad histórica. Eso lo decide el Quality Gate cuantitativo tras el backtest real (ver
            propuesta de estrategia abajo).
          </p>
        )}

        <p className="text-base text-paper/90 leading-relaxed">{verdict.razon}</p>

        {verdict.objeciones && verdict.objeciones.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-muted mb-2">Objeciones</p>
            <ul className="list-disc list-inside space-y-1 text-base text-paper/80">
              {verdict.objeciones.map((objecion, i) => (
                <li key={i}>{objecion}</li>
              ))}
            </ul>
          </div>
        )}

        {attempt && attempt > 1 && (
          <p className="text-sm text-muted mt-5">
            Intento {attempt}
            {typeof maxRetries === 'number' ? ` de ${maxRetries + 1}` : ''}
          </p>
        )}

        {needsManualReview && (
          <p className="text-sm text-violet mt-3 pt-4 border-t border-line/60">
            Reintentos agotados sin llegar a GO — revisión manual recomendada antes de operar.
          </p>
        )}
      </div>
    </div>
  );
};

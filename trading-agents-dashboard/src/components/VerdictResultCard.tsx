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
  go: 'text-bull border-bull bg-bull/15 shadow-[0_0_24px_rgba(0,255,159,0.55)] glow-text-bull',
  ajustar: 'text-violet border-violet bg-violet/15 shadow-[0_0_24px_rgba(168,85,247,0.55)] glow-text-violet',
  no_operar: 'text-bear border-bear bg-bear/15 shadow-[0_0_24px_rgba(255,42,109,0.55)] glow-text-pink',
};

export const VerdictResultCard = ({ agentName, verdict, attempt, retryCount, maxRetries }: Props) => {
  const needsManualReview = verdict.veredicto === 'ajustar' && (retryCount ?? 0) >= (maxRetries ?? 0);

  return (
    <div className={`cyber-panel rounded-2xl overflow-hidden card-edge relative ${
      verdict.veredicto === 'go' ? 'border-bull/45 shadow-[0_0_35px_rgba(0,255,159,0.2)]' :
      verdict.veredicto === 'ajustar' ? 'border-violet/45 shadow-[0_0_35px_rgba(168,85,247,0.2)]' :
      'border-bear/50 shadow-[0_0_35px_rgba(255,42,109,0.25)]'
    }`}>
      <div className="laser-line w-full h-[1px] absolute top-0" />
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-line-bright/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_#00f0ff]" />
              <p className="text-xs font-mono font-bold text-cyan tracking-widest uppercase glow-text-cyan">Veredicto Final</p>
            </div>
            <h3 className="font-display font-black text-2xl md:text-3xl text-paper tracking-wide">{agentName}</h3>
          </div>
          <span className={`font-display font-black text-xl md:text-2xl px-6 py-2 rounded-xl border tracking-widest uppercase transition-all ${VEREDICTO_STYLE[verdict.veredicto]}`}>
            {VEREDICTO_LABEL[verdict.veredicto]}
          </span>
        </div>

        {verdict.veredicto === 'go' && (
          <div className="mb-4 p-3 rounded-xl bg-bull/10 border border-bull/25 text-xs text-bull/90 font-mono">
            ⚡ GO = Coherencia técnica validada sobre el snapshot actual. El Quality Gate cuantitativo evaluará la rentabilidad en el backtest MQL5.
          </div>
        )}

        <p className="text-base md:text-lg text-slate-100 leading-relaxed font-body">{verdict.razon}</p>

        {verdict.objeciones && verdict.objeciones.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-bear/5 border border-bear/25">
            <p className="text-xs font-mono font-bold text-bear uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>⚠️</span> Objeciones Detectadas:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm md:text-base text-slate-200">
              {verdict.objeciones.map((objecion, i) => (
                <li key={i}>{objecion}</li>
              ))}
            </ul>
          </div>
        )}

        {attempt && attempt > 1 && (
          <p className="text-xs font-mono text-muted mt-5 pt-3 border-t border-line-bright/40">
            Intento {attempt}
            {typeof maxRetries === 'number' ? ` de ${maxRetries + 1}` : ''}
          </p>
        )}

        {needsManualReview && (
          <div className="mt-4 p-3 rounded-xl bg-violet/10 border border-violet/35 text-xs text-violet font-mono flex items-center gap-2">
            <span>⚠️</span> Reintentos agotados sin llegar a GO — revisión manual recomendada antes de operar.
          </div>
        )}
      </div>
    </div>
  );
};

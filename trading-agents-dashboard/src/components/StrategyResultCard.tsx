import type { StrategyProposalLite } from '../types/strategy';
import { MarkdownText } from './MarkdownText';

interface Props {
  agentName: string;
  strategy: StrategyProposalLite;
}

export const StrategyResultCard = ({ agentName, strategy }: Props) => {
  return (
    <div className="bg-panel border border-cyan/30 rounded-2xl overflow-hidden glow-cyan">
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-5 mb-5 border-b border-line/60">
          <div>
            <p className="text-sm font-medium text-cyan mb-1.5 tracking-wide uppercase">Propuesta de estrategia</p>
            <h3 className="font-display font-bold text-3xl text-paper tracking-wide">{strategy.pair}</h3>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold text-bull">Ejecutada</p>
            <p className="text-sm text-muted mt-1">
              {agentName} · {strategy.timeframe}
            </p>
          </div>
        </div>

        <MarkdownText className="text-base text-paper/90 leading-relaxed">{strategy.resumen}</MarkdownText>

        <div className="mt-5">
          <p className="text-sm font-medium text-muted mb-2">Indicadores clave</p>
          <div className="flex flex-wrap gap-2">
            {strategy.indicadoresClave.map((ind) => (
              <span key={ind} className="text-sm bg-panel-raised text-paper/80 px-3 py-1.5 rounded-full">
                {ind}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-void/50 rounded-xl p-4">
            <p className="text-sm font-medium text-muted">Entrada</p>
            <MarkdownText className="text-base text-cyan mt-2 tabular-nums leading-relaxed">
              {strategy.puntoEntrada}
            </MarkdownText>
          </div>
          <div className="bg-void/50 rounded-xl p-4">
            <p className="text-sm font-medium text-muted">Stop loss</p>
            <MarkdownText className="text-base text-bear mt-2 tabular-nums leading-relaxed">
              {strategy.stopLoss}
            </MarkdownText>
          </div>
          <div className="bg-void/50 rounded-xl p-4">
            <p className="text-sm font-medium text-muted">Take profit</p>
            <MarkdownText className="text-base text-bull mt-2 tabular-nums leading-relaxed">
              {strategy.takeProfit}
            </MarkdownText>
          </div>
        </div>

        {strategy.entradasEscalonadas && (
          <div className="mt-5">
            <p className="text-sm font-medium text-muted mb-1.5">Entradas escalonadas</p>
            <MarkdownText className="text-base text-paper/80 leading-relaxed">{strategy.entradasEscalonadas}</MarkdownText>
          </div>
        )}

        {strategy.confianza && (
          <p className="text-base text-muted mt-5 pt-4 border-t border-line/60">
            Confianza: <span className="text-paper font-medium">{strategy.confianza}</span>
          </p>
        )}
      </div>
    </div>
  );
};

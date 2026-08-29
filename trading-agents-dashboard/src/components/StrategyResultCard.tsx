import { useState, useEffect } from 'react';
import type { Mql5GenerationProgress, Mql5GenerationResult, StrategyProposalLite } from '../types/strategy';
import type { Veredicto } from '../types/verdict';
import { MarkdownText } from './MarkdownText';
import { Mql5CodeBlock } from './Mql5CodeBlock';
import { BacktestLogAnalyzer } from './BacktestLogAnalyzer';
import { ModelSelector } from './ModelSelector';
import { api } from '../lib/api';
import { useAgentStore } from '../lib/store';

interface Props {
  agentName: string;
  strategy: StrategyProposalLite;
  agentModel?: string;
  runId?: string;
  isRunComplete?: boolean;
  verdictDecision?: Veredicto;
  initialResult?: Mql5GenerationResult;
}

export const StrategyResultCard = ({
  agentName,
  strategy,
  agentModel,
  runId,
  isRunComplete = true,
  verdictDecision,
  initialResult,
}: Props) => {
  const [mql5State, setMql5State] = useState<
    | { status: 'idle' }
    | { status: 'loading'; progress?: Mql5GenerationProgress }
    | { status: 'error'; message: string }
    | { status: 'done'; result: Mql5GenerationResult }
  >(initialResult ? { status: 'done', result: initialResult } : { status: 'idle' });
  const [acknowledgeAdjust, setAcknowledgeAdjust] = useState(false);

  const mql5Model = useAgentStore((s) => s.mql5Model);
  const setMql5Model = useAgentStore((s) => s.setMql5Model);
  // El generador de MQL5 usa el modelo elegido explícitamente para codegen; si no hay ninguno,
  // hereda el del agente de estrategia (comportamiento histórico).
  const effectiveMql5Model = mql5Model ?? agentModel ?? '';
  const usingStrategyAgentModel = mql5Model === null;

  useEffect(() => {
    if (initialResult) {
      setMql5State({ status: 'done', result: initialResult });
    } else {
      setMql5State({ status: 'idle' });
    }
  }, [initialResult, runId]);

  const handleGenerate = async () => {
    setMql5State({ status: 'loading' });
    try {
      const result = await api.generateMql5(strategy, effectiveMql5Model || undefined, runId, (progress) =>
        setMql5State({ status: 'loading', progress })
      );
      setMql5State({ status: 'done', result });
    } catch (err) {
      setMql5State({ status: 'error', message: err instanceof Error ? err.message : 'Error desconocido' });
    }
  };

  const handleOptimize = async () => {
    if (mql5State.status !== 'done') return;
    const currentResult = mql5State.result;
    const nextIteration = (currentResult.iteration ?? 1) + 1;

    setMql5State({
      status: 'loading',
      progress: { attempt: 1, maxAttempts: 3, phase: 'optimizing', details: `Optimizando (Iteración #${nextIteration})…` },
    });

    try {
      const optimizedResult = await api.optimizeMql5(
        strategy,
        currentResult.code,
        currentResult.backtestSession ?? null,
        nextIteration,
        effectiveMql5Model || undefined,
        runId,
        (progress) => setMql5State({ status: 'loading', progress }),
        currentResult.optimizationNotes
      );
      setMql5State({ status: 'done', result: optimizedResult });
    } catch (err) {
      setMql5State({ status: 'error', message: err instanceof Error ? err.message : 'Error en la optimización' });
    }
  };

  const isAdjustPending = verdictDecision === 'ajustar' && !acknowledgeAdjust;
  const canGenerate = isRunComplete && verdictDecision !== 'no_operar' && !isAdjustPending;

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

        {strategy.condicionEntrada && (
          <div className="mt-5 bg-void/50 rounded-xl p-4">
            <p className="text-sm font-medium text-muted">Condición de entrada (regla que codificará el EA)</p>
            <MarkdownText className="text-base text-paper/90 mt-2 leading-relaxed">
              {strategy.condicionEntrada}
            </MarkdownText>
          </div>
        )}

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

        {/* Generation & Backtest Controls */}
        {mql5State.status === 'idle' && (
          <div className="mt-6 pt-6 border-t border-line/60">
            {!isRunComplete ? (
              <div className="p-4 rounded-xl bg-paper/5 border border-line text-sm text-muted flex items-center gap-3">
                <span className="text-lg">⏳</span>
                <span>
                  El flujo de agentes está en ejecución. El código MQL5 se habilitará automáticamente al completar el análisis.
                </span>
              </div>
            ) : verdictDecision === 'no_operar' ? (
              <div className="p-4 rounded-xl bg-bear/10 border border-bear/30 text-sm text-bear flex items-center gap-3">
                <span className="text-lg">🛑</span>
                <span>
                  El Razonador ha emitido un veredicto de <strong>NO OPERAR</strong> para este par y condiciones de mercado.
                </span>
              </div>
            ) : isAdjustPending ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-start gap-3 text-sm text-amber-300">
                  <span className="text-lg">⚠️</span>
                  <span>
                    El Razonador pidió <strong>AJUSTAR</strong> la propuesta y quedan objeciones sin resolver (se agotaron los
                    reintentos automáticos). Generar el EA ahora codificaría esos niveles de entrada/SL/TP tal cual, sin corregir
                    lo que el Refutador señaló como débil.
                  </span>
                </div>
                <label className="flex items-center gap-2 pt-1.5 border-t border-amber-500/20 cursor-pointer text-xs text-paper/80">
                  <input
                    type="checkbox"
                    checked={acknowledgeAdjust}
                    onChange={(e) => setAcknowledgeAdjust(e.target.checked)}
                    className="rounded bg-panel border-line text-amber-400 focus:ring-amber-400/40"
                  />
                  <span>Entiendo las objeciones pendientes y quiero generar el código de todas formas bajo mi responsabilidad.</span>
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <details className="bg-void/40 border border-line/60 rounded-xl px-4 py-3 text-sm">
                  <summary className="cursor-pointer text-paper/90 font-medium select-none">
                    Motor de generación del EA:{' '}
                    <span className="text-cyan font-mono">{effectiveMql5Model || 'por defecto del servidor'}</span>
                    {usingStrategyAgentModel && <span className="text-muted font-normal"> · hereda del agente de estrategia</span>}
                  </summary>
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-muted">
                      Qué modelo escribe el código MQL5 y aplica las optimizaciones tras cada backtest. Independiente de
                      los modelos del panel de agentes.
                    </p>
                    <ModelSelector
                      value={effectiveMql5Model}
                      onChange={(v) => setMql5Model(v)}
                      idPrefix="mql5-model"
                    />
                    {!usingStrategyAgentModel && (
                      <button
                        type="button"
                        onClick={() => setMql5Model(null)}
                        className="text-xs text-cyan hover:text-paper transition-colors"
                      >
                        ↺ Volver a heredar el del agente de estrategia
                      </button>
                    )}
                  </div>
                </details>
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="px-5 py-2.5 rounded-xl bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/50 font-semibold text-sm transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    🚀 Generar código MQL5 y Simular en MT5
                  </button>
                  <span className="text-xs text-muted">
                    Incluye compilación con MetaEditor64 y backtest headless automático.
                  </span>
                </div>
                <p className="text-xs text-muted/80">
                  El veredicto de arriba es una hipótesis de coherencia sobre una operación concreta, no una
                  confirmación de rentabilidad histórica — eso solo lo da el Quality Gate cuantitativo tras el
                  backtest real que verás debajo. Si no lo supera, el panel de agentes reconsiderará la
                  estrategia automáticamente antes de rendirse.
                </p>
              </div>
            )}
          </div>
        )}

        {mql5State.status === 'loading' && (
          <div className="mt-6 pt-6 border-t border-line/60">
            <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/30 space-y-2">
              <div className="flex items-center justify-between text-sm text-cyan font-semibold">
                <span className="flex items-center gap-2">
                  <span className="animate-spin text-base">⏳</span>
                  {mql5State.progress?.details ?? 'Procesando pipeline MQL5…'}
                </span>
                {mql5State.progress && (
                  <span className="text-xs font-mono">
                    Paso: {mql5State.progress.phase.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {mql5State.progress?.phase === 'generating' && 'Generando estructura de inputs, CTrade, indicadores y control de lotaje...'}
                {mql5State.progress?.phase === 'compiling' && 'Verificando compilación con MetaEditor64...'}
                {mql5State.progress?.phase === 'backtesting' && 'Lanzando simulación desatendida en MetaTrader 5 y analizando operaciones...'}
                {mql5State.progress?.phase === 'optimizing' && 'Ajustando reglas de entrada, R:R y filtros técnicos con IA...'}
                {mql5State.progress?.phase === 'restrategizing' && 'El backtest real no convence: el panel de agentes (Gestor de Riesgos → Razonador) está reconsiderando la tesis con esos datos...'}
              </p>
            </div>
          </div>
        )}

        {mql5State.status === 'error' && (
          <div className="mt-6 pt-6 border-t border-line/60">
            <div className="p-4 bg-bear/10 border border-bear/30 rounded-xl space-y-3">
              <p className="text-sm text-bear font-medium">Error en el pipeline MQL5: {mql5State.message}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-lg bg-cyan/10 text-cyan hover:bg-cyan/20 transition-colors border border-cyan/30 text-sm font-semibold"
              >
                Reintentar generación
              </button>
            </div>
          </div>
        )}

        {mql5State.status === 'done' && (
          <>
            <Mql5CodeBlock
              result={mql5State.result}
              onOptimize={handleOptimize}
              isOptimizing={false}
            />
            <div className="mt-6 pt-6 border-t border-line/60">
              <p className="text-xs text-muted uppercase tracking-wider mb-3">Analizador de logs complementario</p>
              <BacktestLogAnalyzer />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

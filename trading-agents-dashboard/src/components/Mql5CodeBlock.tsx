import { useState } from 'react';
import type { Mql5GenerationResult } from '../types/strategy';

interface Props {
  result: Mql5GenerationResult;
  onOptimize?: () => void;
  isOptimizing?: boolean;
}

export const Mql5CodeBlock = ({ result, onOptimize, isOptimizing }: Props) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [allowUnsafeAction, setAllowUnsafeAction] = useState(false);

  const hasErrors = result.compileStatus === 'errors';
  const isUnverified = result.compileStatus === 'unverified';
  const isClean = result.compileStatus === 'ok';

  const canExport = isClean || isUnverified || (hasErrors && allowUnsafeAction);

  const handleCopy = async () => {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('No se pudo copiar al portapapeles. Verifica los permisos de tu navegador.');
    }
  };

  const handleDownload = () => {
    if (!canExport) return;
    const blob = new Blob([result.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const session = result.backtestSession;
  const stats = session?.stats;
  const flags = stats?.flags ?? [];

  return (
    <div className="mt-6 pt-6 border-t border-line/60 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-bold text-cyan tracking-wide font-mono uppercase">{result.filename}</p>
          {result.iteration && result.iteration > 1 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan/20 text-cyan border border-cyan/40">
              Iteración #{result.iteration}
            </span>
          )}
          {isClean && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-bull/20 text-bull border border-bull/40">
              ✓ Compilado OK
            </span>
          )}
          {isUnverified && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ⚠ Sin verificar
            </span>
          )}
          {hasErrors && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-bear/20 text-bear border border-bear/40">
              ⛔ Errores de compilación
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOptimize && (
            <button
              onClick={onOptimize}
              disabled={isOptimizing}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/50 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            >
              {isOptimizing ? '⏳ Optimizando…' : '🧠 Iterar con IA (Optimizar)'}
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!canExport}
            title={!canExport ? 'Acción bloqueada: el código tiene errores de compilación' : undefined}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              canExport
                ? 'bg-panel-raised text-paper/80 hover:text-cyan border-line'
                : 'bg-panel/40 text-muted/50 border-line/30 cursor-not-allowed'
            }`}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!canExport}
            title={!canExport ? 'Acción bloqueada: el código tiene errores de compilación' : undefined}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              canExport
                ? 'bg-panel-raised text-paper/80 hover:text-cyan border-line'
                : 'bg-panel/40 text-muted/50 border-line/30 cursor-not-allowed'
            }`}
          >
            Descargar .mq5
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-panel-raised text-paper/80 hover:text-cyan border border-line transition-colors"
          >
            {collapsed ? 'Expandir código' : 'Contraer código'}
          </button>
        </div>
      </div>

      {/* 1.4 Bloqueo y advertencia para código con errores */}
      {hasErrors && (
        <div className="px-4 py-3 bg-bear/15 border border-bear/50 rounded-xl space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="text-base text-bear">⛔</span>
            <div>
              <p className="text-sm text-bear font-bold">
                Entrega bloqueada: Este EA no compiló limpiamente tras {result.attempts} intentos.
              </p>
              <p className="text-xs text-paper/70 mt-0.5">
                Por seguridad, la copia y descarga están deshabilitadas hasta resolver los errores de MetaEditor.
              </p>
            </div>
          </div>
          <ul className="list-disc pl-7 space-y-0.5 text-xs text-paper/90 font-mono">
            {result.compileErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <label className="flex items-center gap-2 pt-1.5 border-t border-bear/30 cursor-pointer text-xs text-paper/80">
            <input
              type="checkbox"
              checked={allowUnsafeAction}
              onChange={(e) => setAllowUnsafeAction(e.target.checked)}
              className="rounded bg-panel border-line text-bear focus:ring-bear/40"
            />
            <span>Entiendo los riesgos y deseo desbloquear la copia/descarga bajo mi responsabilidad.</span>
          </label>
        </div>
      )}

      {/* Compile Status Clean Banner */}
      {isClean && (
        <div className="px-4 py-2.5 bg-bull/10 border border-bull/30 rounded-xl">
          <p className="text-sm text-bull font-medium">
            ✓ Compilado con 0 errores en MetaEditor ({result.attempts === 1 ? '1 intento' : `${result.attempts} intentos`})
          </p>
          {result.compileWarnings.length > 0 && (
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-xs text-paper/70 font-mono">
              {result.compileWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isUnverified && (
        <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-xs text-amber-300 font-medium">
            ℹ Entorno de laboratorio — MetaEditor64 no disponible en servidor. Código generado según especificación Doc 17 sin validación de compilador binario.
          </p>
        </div>
      )}

      {/* Backtest Simulation Results Card */}
      {(stats || (result.optimizationNotes && result.optimizationNotes.length > 0)) && (
        <div className="p-5 bg-void/70 border border-cyan/30 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <h4 className="text-sm font-semibold text-paper uppercase tracking-wider">
                Resultados de la Simulación Histórica (MetaTrader 5)
              </h4>
            </div>
            {stats && stats.netProfit !== null && (
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold font-mono ${
                  stats.netProfit >= 0
                    ? 'bg-bull/20 text-bull border border-bull/40'
                    : 'bg-bear/20 text-bear border border-bear/40'
                }`}
              >
                {stats.netProfit >= 0 ? `+${stats.netProfit.toFixed(2)} USD` : `${stats.netProfit.toFixed(2)} USD`}
              </span>
            )}
          </div>

          {!stats && (
            <p className="text-xs text-amber-300">
              El backtest automático no devolvió una sesión verificable — revisa la nota de abajo.
            </p>
          )}

          {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-panel rounded-xl border border-line/50">
              <span className="text-xs text-muted block">Balance Final</span>
              <span className="text-sm font-mono font-bold text-paper">
                {session?.finalBalance !== null && session?.finalBalance !== undefined
                  ? `${session.finalBalance.toFixed(2)} USD`
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                Inicial: {session?.initialDeposit ? `${session.initialDeposit.toFixed(0)} USD` : '10000 USD'}
              </span>
            </div>

            <div className="p-3 bg-panel rounded-xl border border-line/50">
              <span className="text-xs text-muted block">Win Rate</span>
              <span
                className={`text-sm font-mono font-bold ${
                  stats.winRatePct !== null && stats.winRatePct >= 50 ? 'text-bull' : 'text-paper'
                }`}
              >
                {stats.winRatePct !== null ? `${stats.winRatePct.toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                {stats.wins} Wins / {stats.losses} Losses
              </span>
            </div>

            <div className="p-3 bg-panel rounded-xl border border-line/50">
              <span className="text-xs text-muted block">Operaciones</span>
              <span className="text-sm font-mono font-bold text-paper">{stats.closedTrades}</span>
              <span className="text-[10px] text-muted block mt-0.5">
                {stats.rejectedOrdersCount ? `(${stats.rejectedOrdersCount} rechazadas)` : '0 rechazadas'}
              </span>
            </div>

            <div className="p-3 bg-panel rounded-xl border border-line/50">
              <span className="text-xs text-muted block">Drawdown Máx.</span>
              <span
                className={`text-sm font-mono font-bold ${
                  stats.maxDrawdownPct !== null && stats.maxDrawdownPct <= 15.0
                    ? 'text-bull'
                    : stats.maxDrawdownPct !== null
                      ? 'text-bear'
                      : 'text-paper'
                }`}
              >
                {stats.maxDrawdownPct !== null ? `${stats.maxDrawdownPct.toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                PF: {stats.profitFactorApprox ? stats.profitFactorApprox.toFixed(2) : 'N/A'} | Edge: {stats.expectancyR ? `${stats.expectancyR.toFixed(2)}R` : 'N/A'}
              </span>
            </div>
          </div>
          )}

          {result.optimizationNotes && result.optimizationNotes.length > 0 && (
            <div className="pt-2 border-t border-line/40">
              <span className="text-xs font-semibold text-cyan block mb-1">Quality Gate Cuantitativo (Doc 20 §4):</span>
              <ul className="list-disc list-inside text-xs text-muted space-y-0.5 font-mono">
                {result.optimizationNotes.map((note, idx) => (
                  <li
                    key={idx}
                    className={
                      note.includes('[PASA]')
                        ? 'text-bull'
                        : note.includes('[FALLA]')
                          ? 'text-bear'
                          : 'text-paper/80'
                    }
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {flags.length > 0 && (
            <div className="pt-2 border-t border-line/40">
              <span className="text-xs font-semibold text-amber-400 block mb-1">Alertas detectadas en la simulación:</span>
              <div className="space-y-1">
                {flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded border font-mono bg-amber-500/10 text-amber-300 border-amber-500/30"
                  >
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Viewer */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full text-left bg-void/50 rounded-xl px-4 py-3 text-sm text-muted hover:text-paper border border-line/40 transition-colors"
        >
          Código oculto ({result.code.split('\n').length} líneas) — pulsa para expandir
        </button>
      ) : (
        <pre className="bg-void/70 rounded-xl p-4 overflow-x-auto text-sm text-paper/90 font-mono leading-relaxed border border-line/40">
          <code>{result.code}</code>
        </pre>
      )}

      {result.assumptionsToVerify.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Supuestos a verificar antes de operar
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-paper/80 font-mono">
            {result.assumptionsToVerify.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

import { useRef, useState } from 'react';
import type { Mt5LogSession } from '../types/backtest';
import { api } from '../lib/api';

// El log del Strategy Tester de MetaTrader se guarda en UTF-16LE con BOM, no en UTF-8 —
// hay que detectar el BOM y decodificar en consecuencia o el texto sale ilegible.
async function readLogFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer);
  }
  return new TextDecoder('utf-8').decode(buffer);
}

function fmtMoney(value: number | null, currency: string | null): string {
  if (value === null) return '—';
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(2)} ${currency ?? 'USD'}`;
}

function fmtPct(value: number | null): string {
  return value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(1)} %`;
}

export const BacktestLogAnalyzer = () => {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'done'; sessions: Mt5LogSession[]; selected: number }
  >({ status: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setState({ status: 'loading' });
    try {
      const logText = await readLogFileAsText(file);
      const { sessions } = await api.analyzeBacktestLog(logText);
      setState({ status: 'done', sessions, selected: sessions.length - 1 });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Error desconocido' });
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const session = state.status === 'done' ? state.sessions[state.selected] : null;
  const s = session?.stats;

  return (
    <div className="mt-8 pt-6 border-t border-line/60">
      <p className="text-sm font-medium text-cyan mb-1.5 tracking-wide uppercase">Validar con backtest</p>
      <p className="text-sm text-muted mb-4">
        Sube el log del Strategy Tester (carpeta <code>Tester\...\Agent-.../logs\AAAAMMDD.log</code>) para calcular
        win rate, R:R y resultado neto automáticamente en vez de leerlo a mano.
      </p>

      {state.status !== 'done' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-cyan bg-cyan/5' : 'border-line/60'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".log,.txt" className="hidden" onChange={onFileInputChange} />
          {state.status === 'loading' ? (
            <p className="text-sm text-muted">Analizando log…</p>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">Arrastra aquí el archivo .log, o</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-cyan/10 text-cyan hover:bg-cyan/20 transition-colors border border-cyan/30"
              >
                Elegir archivo…
              </button>
            </>
          )}
          {state.status === 'error' && <p className="text-sm text-bear mt-3">{state.message}</p>}
        </div>
      )}

      {state.status === 'done' && session && s && (
        <div>
          {state.sessions.length > 1 && (
            <div className="mb-4">
              <label className="text-sm text-muted mr-2">Prueba encontrada en el log:</label>
              <select
                value={state.selected}
                onChange={(e) => setState({ ...state, selected: Number(e.target.value) })}
                className="text-sm bg-panel-raised text-paper px-3 py-1.5 rounded-lg border border-line/60"
              >
                {state.sessions.map((sess, i) => (
                  <option key={i} value={i}>
                    {sess.expertFile ?? `Prueba ${i + 1}`} · {sess.stats.periodStart ?? '?'} → {sess.stats.periodEnd ?? '?'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-line/60">
            <div>
              <h4 className="font-display font-bold text-xl text-paper">{session.expertFile ?? 'EA desconocido'}</h4>
              <p className="text-sm text-muted mt-1">
                {session.symbol ?? '?'} · {session.timeframe ?? '?'} · {s.periodStart ?? '?'} → {s.periodEnd ?? '?'}
              </p>
            </div>
            <button
              onClick={() => setState({ status: 'idle' })}
              className="text-sm font-medium px-3 py-1.5 rounded-lg bg-panel-raised text-muted hover:text-paper transition-colors"
            >
              Analizar otro log
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Balance inicial → final</p>
              <p className="text-base text-paper mt-2 tabular-nums">
                {fmtMoney(session.initialDeposit, session.currency)} → {fmtMoney(session.finalBalance, session.currency)}
              </p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Resultado neto</p>
              <p className={`text-base mt-2 tabular-nums ${(s.netProfit ?? 0) >= 0 ? 'text-bull' : 'text-bear'}`}>
                {fmtMoney(s.netProfit, session.currency)} ({fmtPct(s.netProfitPct)})
              </p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Operaciones cerradas</p>
              <p className="text-base text-paper mt-2 tabular-nums">
                {s.closedTrades} ({s.wins} TP / {s.losses} SL)
              </p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Win rate</p>
              <p className="text-base text-paper mt-2 tabular-nums">{s.winRatePct === null ? '—' : `${s.winRatePct.toFixed(1)} %`}</p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">R:R medio (SL/TP del log)</p>
              <p className="text-base text-paper mt-2 tabular-nums">{s.avgRR === null ? '—' : `1:${s.avgRR.toFixed(2)}`}</p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Esperanza matemática</p>
              <p className={`text-base mt-2 tabular-nums ${(s.expectancyR ?? 0) >= 0 ? 'text-bull' : 'text-bear'}`}>
                {s.expectancyR === null ? '—' : `${s.expectancyR >= 0 ? '+' : ''}${s.expectancyR.toFixed(2)} R / operación`}
              </p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Profit factor (aprox.)</p>
              <p className="text-base text-paper mt-2 tabular-nums">
                {s.profitFactorApprox === null ? '—' : s.profitFactorApprox.toFixed(2)}
              </p>
            </div>
            <div className="bg-void/50 rounded-xl p-4">
              <p className="text-sm font-medium text-muted">Bruto ganado / perdido (aprox.)</p>
              <p className="text-base text-paper mt-2 tabular-nums">
                {fmtMoney(s.grossProfitApprox, session.currency)} / {fmtMoney(s.grossLossApprox && -s.grossLossApprox, session.currency)}
              </p>
            </div>
          </div>

          {s.flags.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {s.flags.map((flag, i) => (
                <p key={i} className="text-sm text-bear/90">
                  ⚠ {flag}
                </p>
              ))}
            </div>
          )}

          <p className="text-sm text-muted mt-4">
            Las cifras en USD "aprox." asumen contrato estándar de 100 000 unidades y símbolo cotizado directo contra
            USD, sin comisión ni swap — para cifras exactas usa el informe completo del Strategy Tester.
          </p>
        </div>
      )}
    </div>
  );
};

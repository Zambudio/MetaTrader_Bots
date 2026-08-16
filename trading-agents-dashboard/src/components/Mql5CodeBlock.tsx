import { useState } from 'react';
import type { Mql5GenerationResult } from '../types/strategy';

interface Props {
  result: Mql5GenerationResult;
}

export const Mql5CodeBlock = ({ result }: Props) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 pt-6 border-t border-line/60">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-cyan tracking-wide uppercase">{result.filename}</p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-panel-raised text-paper/80 hover:text-cyan transition-colors"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleDownload}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-panel-raised text-paper/80 hover:text-cyan transition-colors"
          >
            Descargar .mq5
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-panel-raised text-paper/80 hover:text-cyan transition-colors"
          >
            {collapsed ? 'Expandir código' : 'Contraer código'}
          </button>
        </div>
      </div>

      {result.compileStatus === 'ok' && (
        <div className="mb-3 px-4 py-2.5 bg-bull/10 border border-bull/30 rounded-xl">
          <p className="text-sm text-bull font-medium">
            ✓ Compilado sin errores en MetaEditor ({result.attempts === 1 ? '1 intento' : `${result.attempts} intentos`})
          </p>
          {result.compileWarnings.length > 0 && (
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-sm text-paper/70">
              {result.compileWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result.compileStatus === 'errors' && (
        <div className="mb-3 px-4 py-2.5 bg-bear/10 border border-bear/30 rounded-xl">
          <p className="text-sm text-bear font-medium">
            ⚠ No se logró un código sin errores tras {result.attempts} intentos — revisa antes de usarlo:
          </p>
          <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-sm text-paper/80">
            {result.compileErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result.compileStatus === 'unverified' && (
        <div className="mb-3 px-4 py-2.5 bg-panel-raised border border-line/60 rounded-xl">
          <p className="text-sm text-muted">
            No se pudo verificar la compilación en este equipo (MetaEditor no encontrado) — revísalo manualmente.
          </p>
        </div>
      )}

      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full text-left bg-void/50 rounded-xl px-4 py-3 text-sm text-muted hover:text-paper transition-colors"
        >
          Código oculto ({result.code.split('\n').length} líneas) — pulsa para expandir
        </button>
      ) : (
        <pre className="bg-void/50 rounded-xl p-4 overflow-x-auto text-sm text-paper/90 font-mono leading-relaxed">
          <code>{result.code}</code>
        </pre>
      )}

      {result.assumptionsToVerify.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-muted mb-2">Supuestos a verificar antes de backtest</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-paper/80">
            {result.assumptionsToVerify.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-muted mt-4">
        Generado por IA — compílalo y revísalo en MetaEditor antes de usarlo en cualquier cuenta; no lo actives sin
        pasar por backtest/validación.
      </p>
    </div>
  );
};

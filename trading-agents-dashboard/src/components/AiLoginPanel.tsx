import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AiLoginSession } from '../types/ai';

interface Props {
  provider: 'claude' | 'openai';
  /** Se llama al terminar la sesión de login (con `true` si fue correcta). */
  onFinished: (success: boolean) => void;
  onClose: () => void;
}

const POLL_MS = 1500;

/**
 * Login guiado: el servidor lanza el login del CLI en el PC y esta tarjeta muestra la URL (y el
 * código de un solo uso en codex). En Claude, si la página del navegador muestra un código, se
 * pega aquí y se reenvía al CLI.
 */
export const AiLoginPanel = ({ provider, onFinished, onClose }: Props) => {
  const [session, setSession] = useState<AiLoginSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (id: string) => {
      try {
        const next = await api.getAiLogin(id);
        if (disposed) return;
        setSession(next);
        if (next.state === 'success' || next.state === 'failed' || next.state === 'cancelled') {
          if (!finishedRef.current) {
            finishedRef.current = true;
            onFinished(next.state === 'success');
          }
          return;
        }
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : 'Error consultando el login');
        return;
      }
      timer = setTimeout(() => poll(id), POLL_MS);
    };

    api
      .startAiLogin(provider)
      .then((started) => {
        if (disposed) {
          void api.cancelAiLogin(started.id).catch(() => {});
          return;
        }
        sessionIdRef.current = started.id;
        setSession(started);
        timer = setTimeout(() => poll(started.id), POLL_MS);
      })
      .catch((err) => !disposed && setError(err instanceof Error ? err.message : 'No se pudo iniciar el login'));

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      // Cerrar el panel a medias cancela el proceso de login pendiente en el servidor.
      const id = sessionIdRef.current;
      if (id && !finishedRef.current) void api.cancelAiLogin(id).catch(() => {});
    };
    // Solo al montar: `onFinished` cambia de identidad en cada render del padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleSendCode = async () => {
    if (!session || !code.trim()) return;
    setSending(true);
    setError(null);
    try {
      setSession(await api.submitAiLoginCode(session.id, code.trim()));
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setSending(false);
    }
  };

  const active = !session || session.state === 'starting' || session.state === 'waiting';

  return (
    <div className="rounded-xl border border-cyan/30 bg-cyan/[0.04] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-paper">
          Iniciar sesión en {provider === 'claude' ? 'Claude' : 'OpenAI / Codex'}
        </p>
        <button onClick={onClose} className="text-xs font-mono text-muted hover:text-cyan cursor-pointer">
          {active ? '[Cancelar]' : '[Cerrar]'}
        </button>
      </div>

      {!session && !error && (
        <p className="text-xs font-mono text-cyan flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          Arrancando el login en el PC del servidor…
        </p>
      )}

      {session && active && (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            {provider === 'claude'
              ? 'Se ha abierto el navegador en el PC. Si no, abre el enlace, autoriza el acceso y, si la página te muestra un código, pégalo abajo.'
              : 'Abre el enlace, inicia sesión con tu cuenta de ChatGPT e introduce el código de un solo uso. Este panel se actualizará solo.'}
          </p>
          {session.url ? (
            <a
              href={session.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 rounded-lg bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 font-semibold text-sm"
            >
              Abrir página de inicio de sesión ↗
            </a>
          ) : (
            <p className="text-xs font-mono text-muted">Esperando el enlace del CLI…</p>
          )}
          {session.userCode && (
            <p className="text-sm">
              Código de un solo uso:{' '}
              <span className="font-mono font-bold text-lg text-cyan tracking-widest select-all">{session.userCode}</span>
            </p>
          )}
          {session.acceptsCode && (
            <div className="flex flex-wrap gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                placeholder="Pega aquí el código de la página (si te lo pide)"
                className="flex-1 min-w-[16rem] h-10 bg-panel border border-line-bright rounded-lg px-3 text-sm text-paper focus:outline-none focus:border-cyan"
              />
              <button
                onClick={handleSendCode}
                disabled={sending || !code.trim()}
                className="h-10 px-4 rounded-lg border border-cyan/30 bg-cyan/10 text-cyan font-semibold text-sm hover:bg-cyan/20 disabled:opacity-40 cursor-pointer"
              >
                Enviar código
              </button>
            </div>
          )}
          <p className="text-xs font-mono text-muted flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            Esperando a que completes el inicio de sesión…
          </p>
        </div>
      )}

      {session?.state === 'success' && (
        <p className="text-sm text-bull font-semibold">✓ Sesión iniciada correctamente. Comprobando estado…</p>
      )}
      {session?.state === 'failed' && (
        <p className="text-sm text-bear">✕ {session.error ?? 'El inicio de sesión ha fallado.'}</p>
      )}
      {session?.state === 'cancelled' && <p className="text-sm text-muted">Inicio de sesión cancelado.</p>}
      {error && <p className="text-sm text-bear">{error}</p>}
    </div>
  );
};

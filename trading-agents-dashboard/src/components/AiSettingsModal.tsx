import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAgentStore } from '../lib/store';
import { buildModelString } from '../lib/modelString';
import { BADGE_CLASS, formatCheckedAt, modelBadge, providerBadge } from '../lib/aiStatus';
import type { AiModelCheck, AiProviderId, AiProviderStatus, AiStatusResponse } from '../types/ai';
import { AiLoginPanel } from './AiLoginPanel';

interface Props {
  onClose: () => void;
}

const Badge = ({ tone, label }: { tone: keyof typeof BADGE_CLASS; label: string }) => (
  <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${BADGE_CLASS[tone]}`}>
    ● {label}
  </span>
);

/**
 * Ajustes de IA: estado de cada proveedor (L1), prueba real de cada modelo con nonce (L2) y login
 * guiado de los CLIs. Los endpoints solo responden desde el propio PC del servidor; a través del
 * túnel público el panel muestra un aviso en vez de fallar.
 * Ver docs/funcionalidades/ajustes-ia.md.
 */
export const AiSettingsModal = ({ onClose }: Props) => {
  const modelsBySource = useAgentStore((s) => s.modelsBySource);
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<AiProviderId>('claude');
  const [loginFor, setLoginFor] = useState<'claude' | 'openai' | null>(null);
  /** Modelos con prueba en curso: clave → instante de inicio (para mostrar el tiempo transcurrido). */
  const [testing, setTesting] = useState<Record<string, number>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const controllers = useRef(new Map<string, AbortController>());
  const stopQueue = useRef(false);

  const handleStatusError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 403) setLocked(true);
    else setError(err instanceof Error ? err.message : 'No se pudo cargar el estado de la IA');
  }, []);

  /** Recarga manual (botón «Comprobar conexión», tras un login). La carga inicial va en el efecto. */
  const loadStatus = useCallback(
    async (forceRefresh: boolean) => {
      setLoading(true);
      setError(null);
      try {
        setStatus(await api.getAiStatus(forceRefresh));
        setLocked(false);
      } catch (err) {
        handleStatusError(err);
      } finally {
        setLoading(false);
      }
    },
    [handleStatusError]
  );

  useEffect(() => {
    let cancelled = false;
    api
      .getAiStatus(false)
      .then((s) => !cancelled && setStatus(s))
      .catch((err) => !cancelled && handleStatusError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [handleStatusError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cierra el modal → aborta las pruebas en curso (el servidor mata el proceso al cerrarse la conexión).
  useEffect(() => {
    const active = controllers.current;
    return () => {
      stopQueue.current = true;
      active.forEach((c) => c.abort());
    };
  }, []);

  useEffect(() => {
    if (Object.keys(testing).length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [testing]);

  const testModel = useCallback(async (source: AiProviderId, model: string) => {
    const key = buildModelString(source, model);
    if (controllers.current.has(key)) return;
    const controller = new AbortController();
    controllers.current.set(key, controller);
    setTesting((prev) => ({ ...prev, [key]: Date.now() }));
    setNow(Date.now());
    try {
      const result = await api.checkAiModel(source, model, controller.signal);
      if (result.errorCode !== 'CANCELLED') {
        const check: AiModelCheck = { ...result };
        setStatus((prev) => (prev ? { ...prev, checks: { ...prev.checks, [key]: check } } : prev));
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Error al probar el modelo');
    } finally {
      controllers.current.delete(key);
      setTesting((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, []);

  const testAll = async (source: AiProviderId, models: string[]) => {
    stopQueue.current = false;
    setRunningAll(true);
    for (const model of models) {
      if (stopQueue.current) break;
      await testModel(source, model);
    }
    setRunningAll(false);
  };

  const cancelTests = () => {
    stopQueue.current = true;
    controllers.current.forEach((c) => c.abort());
  };

  const providers = status?.providers ?? [];
  const provider: AiProviderStatus | undefined = providers.find((p) => p.id === selected);
  const allModels = modelsBySource[selected] ?? [];
  // OmniRoute expone cientos de modelos: los `auto/*` (los que usa la app) van primero y son los
  // únicos que entran en «Probar todos»; el resto se prueba uno a uno.
  const models =
    selected === 'omniroute'
      ? [...allModels].sort((a, b) => Number(b.startsWith('auto/')) - Number(a.startsWith('auto/')))
      : allModels;
  const batchModels = selected === 'omniroute' ? models.filter((m) => m.startsWith('auto/')) : models;
  const checksFor = (id: AiProviderId): AiModelCheck[] =>
    (modelsBySource[id] ?? [])
      .map((m) => status?.checks[buildModelString(id, m)])
      .filter((c): c is AiModelCheck => Boolean(c));

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto">
      <div className="cyber-panel border border-cyan/30 rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden card-edge shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
        <div className="laser-line w-full h-[1px] absolute top-0" />
        <div className="p-5 border-b border-line-bright/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan">⚙️</span>
            <h2 className="font-display font-black text-lg text-paper tracking-wider uppercase">Ajustes de IA</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => loadStatus(true)}
              disabled={loading || locked}
              className="text-xs font-mono text-muted hover:text-cyan transition-colors cursor-pointer disabled:opacity-40"
              title="Comprobación L1: instalación, sesión y conexión (no consume tokens)"
            >
              [↻ Comprobar conexión]
            </button>
            <button onClick={onClose} className="text-muted hover:text-cyan font-mono text-sm transition-colors cursor-pointer">
              [✕ Cerrar]
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {locked && (
            <div className="p-4 rounded-xl border border-amber/40 bg-amber/10 text-sm text-amber space-y-1">
              <p className="font-semibold">Solo disponible desde el PC del servidor</p>
              <p className="text-amber/80">
                Por seguridad, los Ajustes de IA (iniciar sesión y probar modelos) solo funcionan desde el PC donde corre
                el servidor: en <span className="font-mono">http://localhost:5175</span> o en el enlace público abierto
                desde ese mismo PC. Si ya lo estás haciendo así, es posible que tu conexión salga a Internet con otra IP
                (VPN, proxy o un DNS que no coincide); prueba en localhost.
              </p>
            </div>
          )}
          {error && <p className="p-3 rounded-xl border border-bear/40 bg-bear/10 text-sm text-bear">{error}</p>}

          {loading && !status && !locked && (
            <div className="py-10 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-cyan uppercase tracking-wider">Comprobando proveedores…</p>
            </div>
          )}

          {status && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {providers.map((p) => {
                  const badge = providerBadge(p, checksFor(p.id));
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className={`text-left p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        selected === p.id
                          ? 'border-cyan/60 bg-cyan/[0.06] shadow-[0_0_18px_rgba(0,240,255,0.15)]'
                          : 'border-line-bright bg-panel-raised/50 hover:border-cyan/30'
                      }`}
                    >
                      <p className="font-display font-bold text-sm text-paper">{p.label}</p>
                      <Badge tone={badge.tone} label={badge.label} />
                      <p className="text-xs text-muted break-words">
                        {p.account ? `${p.account}${p.plan ? ` · ${p.plan}` : ''}` : p.detail}
                      </p>
                    </button>
                  );
                })}
              </div>

              {provider && (
                <section className="rounded-xl border border-line-bright bg-panel-raised/40 p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-display font-bold text-paper">{provider.label}</h3>
                      <p className="text-sm text-muted break-words">{provider.detail}</p>
                      {(provider.version || status.checkedAt) && (
                        <p className="text-xs font-mono text-muted">
                          {provider.version && <>Versión {provider.version} · </>}
                          {status.checkedAt && <>comprobado {formatCheckedAt(status.checkedAt)}</>}
                        </p>
                      )}
                      {provider.errorCode && status.errorInfo[provider.errorCode] && (
                        <p className="text-xs text-amber">{status.errorInfo[provider.errorCode].action}</p>
                      )}
                    </div>
                    {provider.loginSupported && provider.available && (
                      <button
                        onClick={() => {
                          // `codex login` cierra la sesión existente nada más arrancar: si se cancela
                          // a medias, la cuenta queda sin sesión. Se avisa antes de empezar.
                          if (
                            provider.id === 'openai' &&
                            provider.authenticated &&
                            !window.confirm('Codex cerrará tu sesión actual al empezar el nuevo inicio de sesión. ¿Continuar?')
                          ) {
                            return;
                          }
                          setLoginFor(provider.id as 'claude' | 'openai');
                        }}
                        disabled={loginFor !== null}
                        className="h-10 px-4 rounded-lg border border-cyan/30 bg-cyan/10 text-cyan font-semibold text-sm hover:bg-cyan/20 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        {provider.authenticated ? '🔑 Cambiar de cuenta' : '🔑 Iniciar sesión'}
                      </button>
                    )}
                    {provider.id === 'omniroute' && !provider.authenticated && (
                      <p className="text-xs text-muted max-w-xs">
                        OmniRoute no usa login: define OMNIROUTE_BASE_URL y OMNIROUTE_API_KEY en <span className="font-mono">server/.env</span> y reinicia el servidor.
                      </p>
                    )}
                  </div>

                  {loginFor && loginFor === provider.id && (
                    <AiLoginPanel
                      provider={loginFor}
                      onClose={() => setLoginFor(null)}
                      onFinished={(success) => {
                        if (success) void loadStatus(true);
                      }}
                    />
                  )}

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted">
                        Modelos · prueba real con nonce (L2, consume una llamada mínima)
                      </p>
                      {runningAll ? (
                        <button
                          onClick={cancelTests}
                          className="h-8 px-3 rounded-lg border border-bear/50 bg-bear/10 text-bear text-xs font-semibold hover:bg-bear/20 cursor-pointer"
                        >
                          ⏹ Detener pruebas
                        </button>
                      ) : (
                        <button
                          onClick={() => testAll(selected, batchModels)}
                          disabled={!provider.authenticated || batchModels.length === 0 || Object.keys(testing).length > 0}
                          className="h-8 px-3 rounded-lg border border-cyan/30 bg-cyan/10 text-cyan text-xs font-semibold hover:bg-cyan/20 disabled:opacity-40 cursor-pointer"
                        >
                          ⚡ Probar {selected === 'omniroute' ? `los ${batchModels.length} auto/*` : `los ${batchModels.length} modelos`}
                        </button>
                      )}
                    </div>

                    <div className="max-h-[22rem] overflow-y-auto divide-y divide-line-bright/40 rounded-lg border border-line-bright/60">
                      {models.length === 0 && <p className="p-4 text-sm text-muted">Sin modelos disponibles para este proveedor.</p>}
                      {models.map((model) => {
                        const key = buildModelString(selected, model);
                        const check = status.checks[key];
                        const startedAt = testing[key];
                        const isTesting = startedAt !== undefined;
                        const badge = modelBadge(check, isTesting);
                        const info = check?.errorCode ? status.errorInfo[check.errorCode] : undefined;
                        return (
                          <div key={key} className="p-3 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="font-mono text-sm text-paper break-all">{model}</span>
                                <Badge tone={badge.tone} label={badge.label} />
                                {isTesting && (
                                  <span className="text-xs font-mono text-cyan">{Math.max(0, Math.round((now - startedAt) / 1000))} s</span>
                                )}
                                {!isTesting && check && (
                                  <span className="text-xs font-mono text-muted">
                                    {check.state === 'operational' && `${check.durationMs} ms · `}
                                    {formatCheckedAt(check.checkedAt)}
                                  </span>
                                )}
                              </div>
                              {isTesting ? (
                                <button
                                  onClick={() => controllers.current.get(key)?.abort()}
                                  className="text-xs font-mono text-bear hover:underline cursor-pointer"
                                >
                                  [Cancelar]
                                </button>
                              ) : (
                                <button
                                  onClick={() => testModel(selected, model)}
                                  disabled={!provider.authenticated}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line-bright text-paper/90 hover:text-cyan hover:border-cyan/50 disabled:opacity-40 cursor-pointer"
                                >
                                  ⚡ Probar modelo
                                </button>
                              )}
                            </div>
                            {check?.state === 'failed' && (
                              <div className="text-xs space-y-0.5">
                                <p className="text-bear font-semibold">{info?.title ?? check.errorCode}</p>
                                {info && <p className="text-amber">{info.action}</p>}
                                {check.errorDetail && (
                                  <details>
                                    <summary className="text-muted cursor-pointer">Detalle técnico</summary>
                                    <pre className="mt-1 p-2 rounded bg-void/70 text-muted whitespace-pre-wrap break-words font-mono">{check.errorDetail}</pre>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

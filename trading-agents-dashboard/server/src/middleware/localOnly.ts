import type { NextFunction, Request, Response } from 'express';
import { getOwnAddresses, normalizeIp } from './ownAddresses.js';

/**
 * Restringe un endpoint al propio PC donde corre el servidor. La web es pública a través del
 * túnel de Cloudflare y no tiene login, así que los endpoints que lanzan procesos (login de los
 * CLIs, pruebas de modelos que consumen suscripción) no deben ser alcanzables desde Internet.
 *
 * Hay dos vías legítimas:
 *  1. Directa: `http://localhost:5175` — la conexión es loopback, sin cabeceras de proxy y con
 *     `Origin` local (si lo trae).
 *  2. Por el túnel (`https://trading.buenchollotech.com`), pero solo si el visitante ES este PC.
 *     `cloudflared` conecta siempre desde localhost, así que la IP de la conexión no sirve;
 *     Cloudflare rellena `cf-connecting-ip` con la IP real del visitante (la reescribe, no se
 *     puede falsificar desde fuera) y se compara con las direcciones del propio PC
 *     (`ownAddresses.ts`). Se puede desactivar con `AI_SETTINGS_ALLOW_TUNNEL=0`.
 *
 * En ambas vías se rechaza un `Origin` ajeno: `cors()` está abierto a todos los orígenes y una
 * web maliciosa abierta en tu navegador podría, si no, llamar a estos endpoints.
 */

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
/** Cabeceras de proxy distintas de `cf-*`: solo se aceptan junto a `cf-connecting-ip`. */
const OTHER_PROXY_HEADERS = ['x-forwarded-for', 'x-forwarded-host', 'forwarded'];

export interface LocalCheckInput {
  remoteAddress: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  /** Direcciones del propio PC (para la vía del túnel). Vacío = túnel no permitido. */
  ownAddresses?: ReadonlySet<string>;
  /** Hostnames públicos cuyo `Origin` se acepta en la vía del túnel. */
  tunnelHostnames?: readonly string[];
}

type CheckResult = { ok: true } | { ok: false; reason: string };

function header(headers: LocalCheckInput['headers'], name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function originHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

export function checkLocalRequest(input: LocalCheckInput): CheckResult {
  const { remoteAddress, headers, ownAddresses, tunnelHostnames = [] } = input;
  if (!remoteAddress || !LOOPBACK_ADDRESSES.has(remoteAddress)) {
    return { ok: false, reason: 'la petición no procede del propio PC' };
  }

  const cfIp = header(headers, 'cf-connecting-ip');
  const viaTunnel = cfIp !== undefined;
  const hasOtherProxy = OTHER_PROXY_HEADERS.some((h) => headers[h] !== undefined);
  const hasCfHeaders = ['cf-ray', 'cf-visitor'].some((h) => headers[h] !== undefined);

  if (viaTunnel) {
    if (!ownAddresses || ownAddresses.size === 0) {
      return { ok: false, reason: 'acceso por el túnel no permitido' };
    }
    if (!ownAddresses.has(normalizeIp(cfIp))) {
      return { ok: false, reason: 'la petición llega por el túnel desde una IP que no es la de este PC' };
    }
  } else if (hasOtherProxy || hasCfHeaders) {
    return { ok: false, reason: 'la petición llega a través de un proxy desconocido' };
  }

  const origin = header(headers, 'origin');
  if (origin !== undefined) {
    const hostname = origin === 'null' ? null : originHostname(origin);
    const allowed = hostname !== null && (LOCAL_HOSTNAMES.has(hostname) || (viaTunnel && tunnelHostnames.includes(hostname)));
    if (!allowed) return { ok: false, reason: 'origen no permitido' };
  }
  return { ok: true };
}

function tunnelHostnamesFromEnv(): string[] {
  return (process.env.AI_SETTINGS_TUNNEL_HOSTNAMES ?? 'trading.buenchollotech.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function localOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tunnelAllowed = process.env.AI_SETTINGS_ALLOW_TUNNEL !== '0';
    // Solo se consultan las direcciones propias si la petición viene por el túnel.
    const ownAddresses = tunnelAllowed && req.headers['cf-connecting-ip'] !== undefined ? await getOwnAddresses() : undefined;
    const check = checkLocalRequest({
      remoteAddress: req.socket.remoteAddress,
      headers: req.headers,
      ownAddresses,
      tunnelHostnames: tunnelHostnamesFromEnv(),
    });
    if (check.ok) {
      next();
      return;
    }
    res.status(403).json({
      error:
        'Los Ajustes de IA solo están disponibles desde el propio PC del servidor (http://localhost:5175 o el enlace público abierto desde ese mismo PC).',
      code: 'LOCAL_ONLY',
      reason: check.reason,
    });
  } catch (err) {
    next(err);
  }
}

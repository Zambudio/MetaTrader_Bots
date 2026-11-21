import { networkInterfaces } from 'node:os';
import { fetchWithTimeout } from '../engine/omniClient.js';

/**
 * Direcciones IP que identifican al propio PC del servidor. Sirven para reconocer, en una
 * petición que llega por el túnel de Cloudflare, que quien navega es el propio PC (o su misma
 * conexión a Internet) y no un visitante cualquiera. Ver `middleware/localOnly.ts`.
 *
 *  - Direcciones de las interfaces de red (incluidas las IPv6 globales y las temporales): si el
 *    navegador del PC sale a Cloudflare por IPv6, `cf-connecting-ip` será una de ellas.
 *  - IP pública de salida (IPv4 e IPv6), consultada al endpoint de traza de Cloudflare: con IPv4
 *    el visitante que navega desde la misma red comparte la IP pública tras el NAT del router.
 */

const CACHE_TTL_MS = 5 * 60_000;
const LOOKUP_TIMEOUT_MS = 3_000;
const TRACE_URLS = ['https://1.1.1.1/cdn-cgi/trace', 'https://[2606:4700:4700::1111]/cdn-cgi/trace'];

/** Normaliza una IP para compararla: minúsculas, sin zona (`%eth0`) y sin prefijo IPv4-mapeado. */
export function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase().replace(/%.+$/, '').replace(/^::ffff:/, '');
}

export function localInterfaceAddresses(): string[] {
  const out: string[] = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) out.push(normalizeIp(a.address));
  }
  return out;
}

/** Extrae `ip=...` de la respuesta de `/cdn-cgi/trace`. */
export function parseTraceIp(body: string): string | null {
  const match = /^ip=(.+)$/m.exec(body);
  return match ? normalizeIp(match[1]) : null;
}

async function fetchPublicIps(): Promise<string[]> {
  const results = await Promise.all(
    TRACE_URLS.map(async (url) => {
      try {
        const res = await fetchWithTimeout(url, {}, LOOKUP_TIMEOUT_MS);
        return res.ok ? parseTraceIp(await res.text()) : null;
      } catch {
        return null; // sin IPv6 o sin red: esa familia simplemente no cuenta
      }
    })
  );
  return results.filter((ip): ip is string => ip !== null);
}

let publicIps: string[] = [];
let publicIpsCheckedAt = 0;
let inFlight: Promise<void> | null = null;

async function refreshPublicIps(): Promise<void> {
  const found = await fetchPublicIps();
  // Si la consulta falla del todo se conserva el valor anterior en vez de perder el acceso.
  if (found.length > 0) publicIps = found;
  publicIpsCheckedAt = Date.now();
}

/** Conjunto (normalizado) de direcciones que se consideran «este PC». */
export async function getOwnAddresses(): Promise<ReadonlySet<string>> {
  if (Date.now() - publicIpsCheckedAt > CACHE_TTL_MS) {
    inFlight ??= refreshPublicIps().finally(() => {
      inFlight = null;
    });
    await inFlight;
  }
  return new Set([...localInterfaceAddresses(), ...publicIps]);
}

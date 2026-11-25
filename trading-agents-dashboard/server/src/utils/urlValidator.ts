/**
 * Validar URLs para prevenir SSRF (Server-Side Request Forgery).
 * Bloquea intentos de acceder a:
 * - Hosts locales (127.0.0.1, localhost, etc.)
 * - IP privadas (10.*, 172.16-31.*, 192.168.*)
 * - Esquemas no HTTP/HTTPS
 */
export function validateNewsSourceUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Solo permitir HTTP y HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: `Protocolo no permitido: ${url.protocol} (solo HTTP/HTTPS)` };
    }

    const hostname = url.hostname;

    // Bloquear localhost y 127.0.0.1
    if (hostname === 'localhost' || hostname.startsWith('127.')) {
      return { valid: false, error: `No se permite acceder a localhost` };
    }

    // Bloquear IPv6 loopback
    if (hostname === '::1' || hostname === '::') {
      return { valid: false, error: `No se permite acceder a IPv6 loopback` };
    }

    // Bloquear IPs privadas (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    if (hostname.match(/^10\./)) {
      return { valid: false, error: `No se permite acceder a IPs privadas (10.x.x.x)` };
    }
    if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
      return { valid: false, error: `No se permite acceder a IPs privadas (172.16-31.x.x)` };
    }
    if (hostname.match(/^192\.168\./)) {
      return { valid: false, error: `No se permite acceder a IPs privadas (192.168.x.x)` };
    }

    // Bloquear 0.0.0.0 y multicast
    if (hostname.startsWith('0.') || hostname.match(/^(169\.254|224-239|240-255)\./)) {
      return { valid: false, error: `No se permite acceder a redes reservadas` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `URL inválida: ${err instanceof Error ? err.message : 'formato desconocido'}` };
  }
}

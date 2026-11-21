import { describe, expect, it } from 'vitest';
import { checkLocalRequest } from '../src/middleware/localOnly.js';
import { normalizeIp, parseTraceIp } from '../src/middleware/ownAddresses.js';

describe('checkLocalRequest', () => {
  it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])('acepta loopback %s sin cabeceras de proxy', (remoteAddress) => {
    expect(checkLocalRequest({ remoteAddress, headers: {} }).ok).toBe(true);
  });

  it('acepta un Origin de localhost (dev con Vite y producción)', () => {
    for (const origin of ['http://localhost:5175', 'http://localhost:5173', 'http://127.0.0.1:5175', 'http://[::1]:5175']) {
      expect(checkLocalRequest({ remoteAddress: '127.0.0.1', headers: { origin } }).ok).toBe(true);
    }
  });

  it('rechaza una IP de la LAN', () => {
    expect(checkLocalRequest({ remoteAddress: '192.168.1.50', headers: {} }).ok).toBe(false);
  });

  it('rechaza tráfico del túnel de Cloudflare aunque llegue desde loopback', () => {
    for (const header of ['cf-connecting-ip', 'cf-ray', 'x-forwarded-for']) {
      expect(checkLocalRequest({ remoteAddress: '127.0.0.1', headers: { [header]: 'x' } }).ok).toBe(false);
    }
  });

  it('rechaza un Origin ajeno o nulo (web maliciosa llamando a localhost)', () => {
    for (const origin of ['https://evil.example', 'https://trading.buenchollotech.com', 'null', 'basura']) {
      expect(checkLocalRequest({ remoteAddress: '127.0.0.1', headers: { origin } }).ok).toBe(false);
    }
  });

  it('rechaza si no hay dirección remota', () => {
    expect(checkLocalRequest({ remoteAddress: undefined, headers: {} }).ok).toBe(false);
  });
});

describe('checkLocalRequest por el túnel de Cloudflare', () => {
  const own = new Set(['203.0.113.7', '2a01:db8::1234']);
  const tunnelHostnames = ['trading.buenchollotech.com'];
  // null = sin direcciones propias conocidas (un undefined activaría el valor por defecto).
  const viaTunnel = (extra: Record<string, string> = {}, ownAddresses: ReadonlySet<string> | null = own) =>
    checkLocalRequest({
      remoteAddress: '::1',
      ownAddresses: ownAddresses ?? undefined,
      tunnelHostnames,
      headers: { 'cf-connecting-ip': '203.0.113.7', 'cf-ray': 'abc-MAD', 'x-forwarded-for': '203.0.113.7', ...extra },
    });

  it('acepta al visitante cuya IP es la del propio PC (IPv4 pública o IPv6)', () => {
    expect(viaTunnel().ok).toBe(true);
    expect(viaTunnel({ 'cf-connecting-ip': '2A01:DB8::1234' }).ok).toBe(true);
  });

  it('acepta el Origin del dominio público solo por el túnel', () => {
    expect(viaTunnel({ origin: 'https://trading.buenchollotech.com' }).ok).toBe(true);
    const direct = checkLocalRequest({
      remoteAddress: '127.0.0.1',
      tunnelHostnames,
      headers: { origin: 'https://trading.buenchollotech.com' },
    });
    expect(direct.ok).toBe(false);
  });

  it('rechaza a un visitante de Internet con otra IP', () => {
    expect(viaTunnel({ 'cf-connecting-ip': '198.51.100.9' }).ok).toBe(false);
  });

  it('rechaza el túnel si no hay direcciones propias conocidas o está desactivado', () => {
    expect(viaTunnel({}, null).ok).toBe(false);
    expect(viaTunnel({}, new Set()).ok).toBe(false);
  });

  it('rechaza un Origin ajeno aunque la IP sea la del PC (web maliciosa en tu navegador)', () => {
    expect(viaTunnel({ origin: 'https://evil.example' }).ok).toBe(false);
  });

  it('rechaza cabeceras cf-*/x-forwarded-* sin cf-connecting-ip (proxy desconocido)', () => {
    const noCfIp = { remoteAddress: '127.0.0.1', ownAddresses: own, headers: { 'x-forwarded-for': '203.0.113.7' } };
    expect(checkLocalRequest(noCfIp).ok).toBe(false);
  });

  it('no acepta el túnel desde una conexión que no es loopback', () => {
    const lan = checkLocalRequest({ remoteAddress: '192.168.1.50', ownAddresses: own, headers: { 'cf-connecting-ip': '203.0.113.7' } });
    expect(lan.ok).toBe(false);
  });
});

describe('ownAddresses', () => {
  it('normaliza IPs para compararlas', () => {
    expect(normalizeIp(' ::FFFF:203.0.113.7 ')).toBe('203.0.113.7');
    expect(normalizeIp('FE80::1%Ethernet')).toBe('fe80::1');
  });

  it('extrae la IP de la respuesta de /cdn-cgi/trace', () => {
    expect(parseTraceIp('fl=1\nh=1.1.1.1\nip=2A01:DB8::1234\nts=1\n')).toBe('2a01:db8::1234');
    expect(parseTraceIp('sin ip')).toBeNull();
  });
});

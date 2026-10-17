import { lookup as dnsLookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

/**
 * Fetching a URL a candidate controls is a classic SSRF hole: they could point us at
 * localhost, a cloud metadata address or an internal service. Every request here is made to a
 * public address only, and the address we validate is the one we connect to (no DNS-rebinding gap).
 */

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return (
      v === '::' || v === '::1' ||
      /^f[cd]/.test(v) || // unique local fc00::/7
      /^fe[89ab]/.test(v) || // link-local fe80::/10
      v.startsWith('ff') || // multicast
      v.startsWith('2001:db8') ||
      v.startsWith('64:ff9b') // NAT64 can reach IPv4 private space
    );
  }
  return true;
}

/** Throws if the URL is not a plain public http(s) URL. */
export function assertPublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Not a valid URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http(s) links can be inspected');
  if (u.username || u.password) throw new Error('Links with credentials are not allowed');
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('Only standard web ports are allowed');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Private addresses are not allowed');
  if (net.isIP(host) && isPrivateIp(host)) throw new Error('Private addresses are not allowed');
  return u;
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number) => void;
const safeLookup = (hostname: string, options: { all?: boolean; family?: number }, cb: LookupCb) => {
  dnsLookup(hostname, { all: true, family: options.family }, (err, addrs) => {
    if (err) return cb(err, '');
    // refuse if *any* answer is private: a hostile DNS record can mix public and private
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return cb(Object.assign(new Error('Private addresses are not allowed'), { code: 'EBLOCKED' }), '');
    if (options.all) cb(null, addrs);
    else cb(null, addrs[0].address, addrs[0].family);
  });
};

export interface SafeResponse {
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  truncated: boolean;
}

const TEXTY = /^(text\/|application\/(javascript|x-javascript|ecmascript|json|xml|xhtml\+xml)|image\/svg)/i;

/** GET a public URL as text. Caps size and time, follows at most 4 redirects, re-validating each hop. */
export async function safeGet(raw: string, opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {}): Promise<SafeResponse> {
  const { maxBytes = 600_000, timeoutMs = 8000, maxRedirects = 4 } = opts;
  let url = assertPublicUrl(raw);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await new Promise<SafeResponse & { location?: string }>((resolve, reject) => {
      const mod = url.protocol === 'https:' ? https : http;
      const req = mod.request(
        url,
        {
          method: 'GET',
          lookup: safeLookup as never,
          headers: { 'user-agent': 'LaunchLoop-Inspector/1.0 (+proof-task review)', accept: 'text/html,text/css,application/javascript,text/*;q=0.8', 'accept-encoding': 'identity' },
        },
        (r) => {
          const status = r.statusCode ?? 0;
          const contentType = String(r.headers['content-type'] ?? '');
          if (status >= 300 && status < 400 && r.headers.location) {
            r.resume();
            return resolve({ status, finalUrl: url.href, contentType, body: '', truncated: false, location: String(r.headers.location) });
          }
          if (!TEXTY.test(contentType) && status < 400) {
            r.destroy();
            return resolve({ status, finalUrl: url.href, contentType, body: '', truncated: false });
          }
          const chunks: Buffer[] = [];
          let size = 0;
          let truncated = false;
          r.on('data', (c: Buffer) => {
            size += c.length;
            if (size > maxBytes) {
              truncated = true;
              chunks.push(c.subarray(0, c.length - (size - maxBytes)));
              r.destroy();
              return;
            }
            chunks.push(c);
          });
          const done = () => resolve({ status, finalUrl: url.href, contentType, body: Buffer.concat(chunks).toString('utf8'), truncated });
          r.on('end', done);
          r.on('close', done);
          r.on('error', reject);
        },
      );
      const timer = setTimeout(() => req.destroy(new Error('timeout')), timeoutMs);
      req.on('error', (e) => { clearTimeout(timer); reject(e); });
      req.on('close', () => clearTimeout(timer));
      req.end();
    });
    if (res.location) {
      url = assertPublicUrl(new URL(res.location, url).href);
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

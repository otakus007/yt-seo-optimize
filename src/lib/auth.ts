/**
 * Cloudflare Access gate. Requests arriving via PUBLIC_ORIGIN must carry a valid
 * Cf-Access-Jwt-Assertion (RS256, aud = CF_ACCESS_AUD). localhost passes.
 * Verified with WebCrypto so it runs in proxy.ts and route handlers alike.
 */
type Jwk = JsonWebKey & { kid: string };
let jwks: { keys: Jwk[]; fetchedAt: number } | null = null;

async function keys(): Promise<Jwk[]> {
  if (jwks && Date.now() - jwks.fetchedAt < 60 * 60 * 1000) return jwks.keys;
  const res = await fetch(`https://${process.env.CF_ACCESS_TEAM}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('cannot fetch Cloudflare Access certs');
  jwks = { keys: (await res.json()).keys, fetchedAt: Date.now() };
  return jwks.keys;
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function verifyAccessJwt(token: string | null): Promise<boolean> {
  if (!token) return false;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return false;
  const header = JSON.parse(new TextDecoder().decode(b64url(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
  const aud = process.env.CF_ACCESS_AUD;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud || !auds.includes(aud) || payload.exp * 1000 < Date.now()) return false;
  const jwk = (await keys()).find((k) => k.kid === header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
}

/** True when the request is trusted: local, or public with a valid Access JWT. */
export async function isAuthorized(req: { headers: { get(n: string): string | null } }): Promise<boolean> {
  const host = req.headers.get('host') ?? '';
  const publicHost = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).host : '';
  // Host is client-controlled; the server binds 127.0.0.1 (package.json -H) so only local processes and the tunnel reach it.
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;
  if (publicHost && host === publicHost) return verifyAccessJwt(req.headers.get('cf-access-jwt-assertion'));
  return false;
}

/** Origin to build absolute URLs from (OAuth redirect_uri): PUBLIC_ORIGIN when the request came through it, else the local one. */
export function requestOrigin(req: { headers: { get(n: string): string | null }; nextUrl: { origin: string } }): string {
  const pub = process.env.PUBLIC_ORIGIN;
  return pub && req.headers.get('host') === new URL(pub).host ? pub : req.nextUrl.origin;
}

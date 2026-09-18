import { decrypt } from './crypto';

export const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
];

function creds() {
  const id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set');
  return { id, secret };
}

export function authUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: creds().id, redirect_uri: redirectUri, response_type: 'code',
    scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`OAuth token error: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

export function exchangeCode(code: string, redirectUri: string) {
  const { id, secret } = creds();
  return tokenRequest({ code, client_id: id, client_secret: secret, redirect_uri: redirectUri, grant_type: 'authorization_code' });
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { id, secret } = creds();
  return (await tokenRequest({ refresh_token: refreshToken, client_id: id, client_secret: secret, grant_type: 'refresh_token' })).access_token;
}

// ponytail: in-memory cache per process; fine for one machine.
const cache = new Map<string, { token: string; exp: number }>();

/** Access token for an own channel whose encrypted refresh token is stored in DB. */
export async function accessTokenFor(channel: { id: string; refreshToken: string | null }): Promise<string> {
  if (!channel.refreshToken) throw new Error('Channel is not connected (no refresh token)');
  const hit = cache.get(channel.id);
  if (hit && hit.exp > Date.now()) return hit.token;
  const token = await refreshAccessToken(decrypt(channel.refreshToken));
  cache.set(channel.id, { token, exp: Date.now() + 50 * 60 * 1000 });
  return token;
}

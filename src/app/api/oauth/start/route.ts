import { randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { authUrl } from '@/lib/oauth';

export async function GET(req: NextRequest) {
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(authUrl(`${req.nextUrl.origin}/api/oauth/callback`, state));
  res.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
  return res;
}

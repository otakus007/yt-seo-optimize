import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/lib/auth';
import prisma from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { exchangeCode } from '@/lib/oauth';
import { getMyChannel } from '@/lib/youtube';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code'), state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('oauth_state')?.value) return new NextResponse('Bad OAuth state', { status: 400 });
  const tok = await exchangeCode(code, `${requestOrigin(req)}/api/oauth/callback`);
  if (!tok.refresh_token) return new NextResponse('Google did not return a refresh token; remove the app at myaccount.google.com/permissions and retry', { status: 400 });
  const { youtubeId, ...info } = await getMyChannel(tok.access_token);
  const ch = await prisma.channel.upsert({
    where: { youtubeId },
    update: { ...info, isOwn: true, refreshToken: encrypt(tok.refresh_token) },
    create: { youtubeId, ...info, isOwn: true, refreshToken: encrypt(tok.refresh_token) },
  });
  const res = NextResponse.redirect(new URL(`/channel/${ch.id}`, requestOrigin(req)));
  res.cookies.delete('oauth_state');
  return res;
}

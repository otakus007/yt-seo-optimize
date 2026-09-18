import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorized } from '@/lib/auth';

/** Gate every page/action: localhost passes, public host needs a valid Cloudflare Access JWT. */
export async function proxy(req: NextRequest) {
  if (await isAuthorized(req)) return NextResponse.next();
  return new NextResponse('Forbidden', { status: 403 });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

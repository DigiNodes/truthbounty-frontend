import { NextRequest, NextResponse } from 'next/server';
import { generateNonce, buildCsp } from '@/lib/csp';

export function middleware(req: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Copy incoming request headers cleanly (preserves multi-value headers)
  // then append x-nonce so the layout Server Component can read it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  res.headers.set('Content-Security-Policy', csp);

  return res;
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};

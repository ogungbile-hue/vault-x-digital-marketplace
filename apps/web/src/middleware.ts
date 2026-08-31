import { NextRequest, NextResponse } from 'next/server';
import { checkoutRateLimiter, webhookRateLimiter, authRateLimiter } from './lib/rate-limiter';

export function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  const pathname = req.nextUrl.pathname;

  // 1. Rate Limiting for Checkout
  if (pathname.startsWith('/api/checkout')) {
    const limit = checkoutRateLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many checkout requests. Please wait a minute before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(limit.resetMs / 1000)),
          },
        }
      );
    }
  }

  // 2. Rate Limiting for Webhooks
  if (pathname.startsWith('/api/webhooks')) {
    const limit = webhookRateLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded for webhooks' },
        { status: 429 }
      );
    }
  }

  // 3. Rate Limiting for Order Reveal
  if (pathname.includes('/reveal')) {
    const limit = authRateLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many reveal requests. Please wait before revealing more credentials.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }
  }

  // 4. Attach Strict Production Security Response Headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

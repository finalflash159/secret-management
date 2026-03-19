import { NextRequest, NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';
import { checkRateLimit, loginRateLimiter } from '@/backend/middleware/rate-limit';

const { GET } = handlers;

// Wrap POST with rate limiting for login protection
async function POST(req: NextRequest): Promise<Response> {
  const rateLimit = checkRateLimit(loginRateLimiter, req);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: loginRateLimiter.message,
        retryAfterMs: rateLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.retryAfterMs || 0) / 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    );
  }

  return handlers.POST(req);
}

export { GET, POST };

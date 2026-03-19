import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  Array.from(store.entries()).forEach(([key, entry]) => {
    // Remove timestamps older than 1 hour
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  });
}

/**
 * Get client IP from request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  config: RateLimitConfig,
  req: NextRequest
): RateLimitResult {
  cleanup();

  const key = getClientIP(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= config.max) {
    const oldestTimestamp = Math.min(...entry.timestamps);
    const resetAt = oldestTimestamp + config.windowMs;
    const retryAfterMs = resetAt - now;

    return {
      success: false,
      remaining: 0,
      resetAt,
      retryAfterMs,
    };
  }

  // Add current request timestamp
  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    success: true,
    remaining: Math.max(0, config.max - entry.timestamps.length),
    resetAt: now + config.windowMs,
  };
}

/**
 * Create a rate limit middleware function for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = checkRateLimit(config, req);

    if (!result.success) {
      return NextResponse.json(
        {
          error: config.message || 'Too many requests. Please try again later.',
          retryAfterMs: result.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.retryAfterMs || 0) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toString(),
          },
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetAt.toString());

    return response;
  };
}

// ─── Preset Rate Limiters ──────────────────────────────────────────────────

/**
 * Login rate limiter: 5 requests per 60 seconds per IP
 */
export const loginRateLimiter: RateLimitConfig = {
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in a minute.',
};

/**
 * Register rate limiter: 3 requests per 60 seconds per IP
 */
export const registerRateLimiter: RateLimitConfig = {
  windowMs: 60 * 1000,
  max: 3,
  message: 'Too many registration attempts. Please try again in a minute.',
};

/**
 * General API rate limiter: 100 requests per 60 seconds per IP
 */
export const apiRateLimiter: RateLimitConfig = {
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests. Please slow down.',
};

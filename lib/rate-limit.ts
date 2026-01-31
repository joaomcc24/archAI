// Simple in-memory rate limiting
// For production, consider using Redis or Vercel KV

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetAt < now) {
        delete store[key];
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function rateLimit(
  request: Request,
  options: RateLimitOptions
): RateLimitResult {
  const { windowMs, maxRequests, keyGenerator } = options;
  
  // Generate key (default: use IP address or user ID)
  const key = keyGenerator
    ? keyGenerator(request)
    : request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || 
      'unknown';

  const now = Date.now();
  const entry = store[key];

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Increment count
  entry.count += 1;

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // LLM endpoints - stricter limits
  llm: (request: Request, userId?: string) => {
    const key = userId || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    return rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5, // 5 requests per minute
      keyGenerator: () => `llm:${key}`,
    });
  },

  // General API endpoints
  api: (request: Request, userId?: string) => {
    const key = userId || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    return rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      keyGenerator: () => `api:${key}`,
    });
  },

  // Authentication endpoints
  auth: (request: Request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    return rateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
      keyGenerator: () => `auth:${ip}`,
    });
  },
};

// Helper to create rate limit middleware for Next.js API routes
export function withRateLimit(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<Response>,
  limiter: (request: Request, userId?: string) => RateLimitResult
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<Response> => {
    // Try to get user ID from auth if available
    let userId: string | undefined;
    try {
      const auth = await import('@/lib/auth').then(m => m.authenticateRequest(request));
      if (!('error' in auth)) {
        userId = auth.user.id;
      }
    } catch {
      // Ignore auth errors for rate limiting
    }

    const result = limiter(request, userId);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request, ...args);
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    return response;
  };
}

// Type for NextRequest (imported from next/server)
import type { NextRequest } from 'next/server';

import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
// For production with multiple instances, use Redis (Upstash)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60 * 1000);

interface RateLimitConfig {
  // Maximum requests allowed in the window
  limit: number;
  // Time window in seconds
  windowSeconds: number;
}

// Different rate limits for different endpoints
export const RATE_LIMITS = {
  // Public endpoints - more lenient
  public: { limit: 100, windowSeconds: 60 }, // 100 req/min
  // Auth endpoints - stricter to prevent brute force
  auth: { limit: 10, windowSeconds: 60 }, // 10 req/min
  // Vote endpoints - prevent vote manipulation
  vote: { limit: 30, windowSeconds: 60 }, // 30 req/min
  // Admin endpoints - moderate
  admin: { limit: 50, windowSeconds: 60 }, // 50 req/min
  // Create/Update endpoints - stricter
  write: { limit: 20, windowSeconds: 60 }, // 20 req/min
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Get client identifier from request
 * Uses IP address or forwarded IP from Vercel
 */
function getClientId(request: NextRequest): string {
  // Vercel provides the real IP in this header
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback to real IP header
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Last resort - use a generic identifier
  return "unknown";
}

/**
 * Check rate limit for a request
 * Returns null if allowed, or a NextResponse with 429 if exceeded
 */
export function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = "public"
): NextResponse | null {
  const config = RATE_LIMITS[type];
  const clientId = getClientId(request);
  const key = `${type}:${clientId}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    });
    return null; // Allowed
  }

  if (entry.count >= config.limit) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetTime),
        },
      }
    );
  }

  // Increment counter
  entry.count++;
  return null; // Allowed
}

/**
 * Middleware helper - wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: RateLimitType = "public"
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = checkRateLimit(request, type);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}

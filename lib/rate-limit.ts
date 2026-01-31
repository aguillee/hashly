import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit configurations per endpoint type
export const RATE_LIMITS = {
  public: { limit: 100, windowSeconds: 60 },
  auth: { limit: 10, windowSeconds: 60 },
  vote: { limit: 30, windowSeconds: 60 },
  admin: { limit: 50, windowSeconds: 60 },
  write: { limit: 20, windowSeconds: 60 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// Use Upstash Redis if configured, otherwise fall back to in-memory
const hasRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis-backed rate limiters for each type
const rateLimiters: Record<string, Ratelimit> = {};

if (hasRedis) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  for (const [key, config] of Object.entries(RATE_LIMITS)) {
    rateLimiters[key] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      prefix: `rl:${key}`,
      analytics: true,
    });
  }
}

// In-memory fallback for development / when Redis is not configured
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (entry.resetTime < now) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Vercel provides the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  // Fallback — still rate-limited but shared bucket
  return "anonymous";
}

/**
 * Check rate limit for a request
 * Uses Upstash Redis in production, in-memory in development
 */
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = "public"
): Promise<NextResponse | null> {
  const clientId = getClientId(request);

  // Use Redis-backed rate limiter if available
  if (hasRedis && rateLimiters[type]) {
    try {
      const result = await rateLimiters[type].limit(clientId);

      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
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
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": String(result.remaining),
              "X-RateLimit-Reset": String(result.reset),
            },
          }
        );
      }
      return null;
    } catch (error) {
      // If Redis fails, fall through to in-memory
      console.error("Redis rate limit error, falling back to in-memory:", error);
    }
  }

  // In-memory fallback
  const config = RATE_LIMITS[type];
  const key = `${type}:${clientId}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    });
    return null;
  }

  if (entry.count >= config.limit) {
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

  entry.count++;
  return null;
}

/**
 * Middleware helper - wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: RateLimitType = "public"
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await checkRateLimit(request, type);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}

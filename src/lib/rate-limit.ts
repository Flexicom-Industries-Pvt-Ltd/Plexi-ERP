import { NextRequest, NextResponse } from "next/server";
import { cache } from "./cache";

export interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix epoch ms
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds } = options;
  const cacheKey = `ratelimit:${identifier}`;
  const now = Date.now();

  let bucket = await cache.get<BucketEntry>(cacheKey);

  if (!bucket || now >= bucket.resetAt) {
    bucket = {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    };
    await cache.set(cacheKey, bucket, windowSeconds);
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: bucket.resetAt,
    };
  }

  bucket.count += 1;
  const remainingTtl = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  await cache.set(cacheKey, bucket, remainingTtl);

  const remaining = Math.max(0, maxRequests - bucket.count);
  const success = bucket.count <= maxRequests;

  return {
    success,
    limit: maxRequests,
    remaining,
    reset: bucket.resetAt,
  };
}

/**
 * Helper to extract client identifier (IP address or authorization token).
 */
export function getClientIdentifier(request: NextRequest, customSuffix = ""): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return customSuffix ? `${ip}:${customSuffix}` : ip;
}

/**
 * Apply rate limit response headers.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", Math.ceil(result.reset / 1000).toString());
  return response;
}

/**
 * Pre-configured rate limiting profiles
 */
export const rateLimiters = {
  // Login / Auth endpoints: 10 req/min
  auth: (req: NextRequest) =>
    rateLimit(getClientIdentifier(req, "auth"), { maxRequests: 10, windowSeconds: 60 }),

  // High-frequency mutations: 60 req/min
  mutation: (req: NextRequest) =>
    rateLimit(getClientIdentifier(req, "mutation"), { maxRequests: 60, windowSeconds: 60 }),

  // General read queries: 300 req/min
  general: (req: NextRequest) =>
    rateLimit(getClientIdentifier(req, "general"), { maxRequests: 300, windowSeconds: 60 }),
};

import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, applyRateLimitHeaders, getClientIdentifier } from "../rate-limit";
import { cache } from "../cache";
import { NextRequest, NextResponse } from "next/server";

describe("Sliding-Window Rate Limiter", () => {
  beforeEach(async () => {
    await cache.clear();
  });

  it("should allow requests under the maximum limit", async () => {
    const res1 = await rateLimit("ip-127.0.0.1", { maxRequests: 5, windowSeconds: 60 });
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = await rateLimit("ip-127.0.0.1", { maxRequests: 5, windowSeconds: 60 });
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it("should block requests when maximum limit is exceeded", async () => {
    for (let i = 0; i < 3; i++) {
      await rateLimit("user-test-client", { maxRequests: 3, windowSeconds: 60 });
    }

    const blockedRes = await rateLimit("user-test-client", { maxRequests: 3, windowSeconds: 60 });
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it("should apply rate limit headers to response", () => {
    const response = NextResponse.json({ ok: true });
    const rateLimitResult = {
      success: true,
      limit: 100,
      remaining: 85,
      reset: Date.now() + 30000,
    };

    applyRateLimitHeaders(response, rateLimitResult);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("85");
    expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("should extract client identifier from x-forwarded-for header", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18",
      },
    });

    const identifier = getClientIdentifier(request, "mutation");
    expect(identifier).toBe("203.0.113.195:mutation");
  });
});

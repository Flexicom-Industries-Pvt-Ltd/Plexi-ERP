import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronRequest } from "../cron-auth";
import { NextRequest } from "next/server";

describe("Cron Authorization (verifyCronRequest)", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("should fail closed (401) when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest("http://localhost:3000/api/cron/shift-digest");
    const result = verifyCronRequest(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("should reject request with 401 when Authorization header is missing or incorrect", () => {
    process.env.CRON_SECRET = "super-secret-cron-key-123";
    const req = new NextRequest("http://localhost:3000/api/cron/shift-digest", {
      headers: {
        authorization: "Bearer wrong-token",
      },
    });

    const result = verifyCronRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("should authorize request when valid Bearer token matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "super-secret-cron-key-123";
    const req = new NextRequest("http://localhost:3000/api/cron/shift-digest", {
      headers: {
        authorization: "Bearer super-secret-cron-key-123",
      },
    });

    const result = verifyCronRequest(req);
    expect(result.ok).toBe(true);
  });
});

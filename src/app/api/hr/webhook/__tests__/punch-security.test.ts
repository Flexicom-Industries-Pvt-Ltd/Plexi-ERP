import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../punch/route";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    biometricDevice: { findUnique: vi.fn() },
    attendancePunch: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((cb) => cb({
      attendancePunch: { findFirst: vi.fn(), create: vi.fn() },
    })),
  },
}));

vi.mock("@/lib/hr/attendance-processor", () => ({
  AttendanceProcessor: {
    processDate: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Biometric Webhook Security & Fail-Closed Validation (ERP-021)", () => {
  const originalSecret = process.env.TIMEWATCH_WEBHOOK_SECRET;
  const originalApiKey = process.env.TIMEWATCH_API_KEY;

  beforeEach(() => {
    process.env.TIMEWATCH_WEBHOOK_SECRET = "test-secret-key-123";
    delete process.env.TIMEWATCH_API_KEY;
  });

  afterEach(() => {
    process.env.TIMEWATCH_WEBHOOK_SECRET = originalSecret;
    process.env.TIMEWATCH_API_KEY = originalApiKey;
    vi.clearAllMocks();
  });

  it("should fail closed (401) if webhook secret is not configured on server", async () => {
    delete process.env.TIMEWATCH_WEBHOOK_SECRET;
    delete process.env.TIMEWATCH_API_KEY;

    const req = new NextRequest("http://localhost:3000/api/hr/webhook/punch", {
      method: "POST",
      headers: { "x-webhook-secret": "test-secret-key-123" },
      body: JSON.stringify([{ UserID: "1001", PunchTime: "2026-11-24 10:00:00" }]),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("should reject requests with invalid or missing credentials (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/hr/webhook/punch", {
      method: "POST",
      headers: { "x-webhook-secret": "wrong-secret" },
      body: JSON.stringify([{ UserID: "1001", PunchTime: "2026-11-24 10:00:00" }]),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should reject requests with empty payload (400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/hr/webhook/punch", {
      method: "POST",
      headers: { "x-webhook-secret": "test-secret-key-123" },
      body: JSON.stringify([]),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should reject excessively large payloads (413)", async () => {
    const hugePayload = Array.from({ length: 501 }, (_, i) => ({
      UserID: `USER-${i}`,
      PunchTime: "2026-11-24 10:00:00",
    }));

    const req = new NextRequest("http://localhost:3000/api/hr/webhook/punch", {
      method: "POST",
      headers: { "x-webhook-secret": "test-secret-key-123" },
      body: JSON.stringify(hugePayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });
});

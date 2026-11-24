import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withIdempotency, buildIdempotencyCacheKey } from "../idempotency";
import { cache } from "../cache";

describe("Idempotency Middleware (withIdempotency)", () => {
  beforeEach(async () => {
    await cache.clear();
  });

  it("should execute handler normally when no Idempotency-Key header is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/dispatch/orders/1/pick", {
      method: "POST",
    });

    const handler = vi.fn(async () => NextResponse.json({ success: true, orderId: "1" }, { status: 200 }));

    const response = await withIdempotency(request, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Idempotent-Replay")).toBeNull();
  });

  it("should cache successful response on first request and replay on duplicate request", async () => {
    const request1 = new NextRequest("http://localhost:3000/api/dispatch/orders/1/pick", {
      method: "POST",
      headers: {
        "Idempotency-Key": "test-key-12345",
      },
    });

    const handler = vi.fn(async () =>
      NextResponse.json({ success: true, pickedLots: ["LOT-1", "LOT-2"] }, { status: 200 })
    );

    // First Request
    const response1 = await withIdempotency(request1, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(response1.status).toBe(200);

    const data1 = await response1.json();
    expect(data1.pickedLots).toEqual(["LOT-1", "LOT-2"]);

    // Second Duplicate Request (e.g. operator double click or network retry)
    const request2 = new NextRequest("http://localhost:3000/api/dispatch/orders/1/pick", {
      method: "POST",
      headers: {
        "Idempotency-Key": "test-key-12345",
      },
    });

    const response2 = await withIdempotency(request2, handler);
    expect(handler).toHaveBeenCalledTimes(1); // Handler was NOT re-executed!
    expect(response2.status).toBe(200);
    expect(response2.headers.get("X-Idempotent-Replay")).toBe("true");

    const data2 = await response2.json();
    expect(data2.pickedLots).toEqual(["LOT-1", "LOT-2"]);
  });

  it("should return 409 Conflict if an operation is currently processing", async () => {
    const request = new NextRequest("http://localhost:3000/api/dispatch/orders/1/pick", {
      method: "POST",
      headers: {
        "Idempotency-Key": "in-flight-key",
      },
    });

    const scopedKey = buildIdempotencyCacheKey(request, "in-flight-key");
    await cache.set(
      scopedKey,
      {
        status: "PROCESSING",
        createdAt: Date.now(),
      },
      60
    );

    const handler = vi.fn();
    const response = await withIdempotency(request, handler);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(409);

    const data = await response.json();
    expect(data.code).toBe("IDEMPOTENT_OPERATION_IN_PROGRESS");
  });

  it("should isolate idempotency keys across different endpoints (ERP-004)", async () => {
    const requestA = new NextRequest("http://localhost:3000/api/dispatch/orders/1/pick", {
      method: "POST",
      headers: { "Idempotency-Key": "shared-key-001" },
    });
    const requestB = new NextRequest("http://localhost:3000/api/production/rolls/cut", {
      method: "POST",
      headers: { "Idempotency-Key": "shared-key-001" },
    });

    const handlerA = vi.fn(async () => NextResponse.json({ action: "pick" }, { status: 200 }));
    const handlerB = vi.fn(async () => NextResponse.json({ action: "cut" }, { status: 200 }));

    const resA = await withIdempotency(requestA, handlerA);
    const resB = await withIdempotency(requestB, handlerB);

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1); // Not suppressed because endpoint paths differ!
    const bodyA = await resA.json();
    const bodyB = await resB.json();
    expect(bodyA.action).toBe("pick");
    expect(bodyB.action).toBe("cut");
  });

  it("should release the lock if the handler throws an error, allowing subsequent retries", async () => {
    const request = new NextRequest("http://localhost:3000/api/gate", {
      method: "POST",
      headers: {
        "Idempotency-Key": "failing-key-999",
      },
    });

    const failingHandler = vi.fn(async () => {
      throw new Error("Temporary database connection error");
    });

    await expect(withIdempotency(request, failingHandler)).rejects.toThrow("Temporary database connection error");

    const scopedKey = buildIdempotencyCacheKey(request, "failing-key-999");
    expect(await cache.get(scopedKey)).toBeNull();
  });
});

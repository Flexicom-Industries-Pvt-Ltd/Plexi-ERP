import { NextRequest, NextResponse } from "next/server";
import { cache } from "./cache";

export interface IdempotencyRecord {
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
}

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const LOCK_TIMEOUT_SECONDS = 60; // 60s lock for processing

/**
 * Extract the idempotency key from request headers.
 */
export function extractIdempotencyKey(request: NextRequest): string | null {
  return (
    request.headers.get("Idempotency-Key") ||
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    request.headers.get("X-Idempotency-Key") ||
    null
  );
}

/**
 * withIdempotency
 *
 * Enterprise wrapper for transactional API mutation handlers (POST, PUT, PATCH).
 * Protects against double stock deductions, duplicate gate passes, and double picking
 * caused by operator double-clicks or network retries.
 */
export async function withIdempotency(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const idempotencyKey = extractIdempotencyKey(request);

  // If no idempotency key was supplied, execute handler directly
  if (!idempotencyKey) {
    return handler();
  }

  const cacheKey = `idempotency:${idempotencyKey}`;
  const existing = await cache.get<IdempotencyRecord>(cacheKey);

  if (existing) {
    if (existing.status === "PROCESSING") {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict: This transaction is currently being processed. Please do not retry concurrently.",
          code: "IDEMPOTENT_OPERATION_IN_PROGRESS",
        },
        { status: 409 }
      );
    }

    if (existing.status === "COMPLETED") {
      const response = NextResponse.json(existing.body, {
        status: existing.statusCode || 200,
      });
      response.headers.set("X-Idempotent-Replay", "true");
      return response;
    }
  }

  // Lock the key in PROCESSING state
  await cache.set(
    cacheKey,
    {
      status: "PROCESSING",
      createdAt: Date.now(),
    },
    LOCK_TIMEOUT_SECONDS
  );

  try {
    const result = await handler();

    // Only cache successful 2xx responses
    if (result.status >= 200 && result.status < 300) {
      let body: unknown;
      try {
        body = await result.clone().json();
      } catch {
        body = { status: "OK" };
      }

      await cache.set(
        cacheKey,
        {
          status: "COMPLETED",
          statusCode: result.status,
          body,
          createdAt: Date.now(),
        },
        IDEMPOTENCY_TTL_SECONDS
      );
    } else {
      // If the response is a client/server error, release the lock so the client can retry
      await cache.del(cacheKey);
    }

    return result;
  } catch (err) {
    // Release the lock on unhandled exception so future retries are not blocked
    await cache.del(cacheKey);
    throw err;
  }
}

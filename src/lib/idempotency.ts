import { NextRequest, NextResponse } from "next/server";
import { cache } from "./cache";
import { withResourceLock } from "./concurrency-lock";
import { auth } from "@/auth";
import crypto from "crypto";

export interface IdempotencyRecord {
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  requestHash?: string;
  userId?: string;
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
 * Compute SHA-256 request fingerprint to detect key reuse with different payloads (ERP-004)
 */
export async function computeRequestFingerprint(request: NextRequest): Promise<string> {
  try {
    const clone = request.clone();
    const text = await clone.text();
    return crypto.createHash("sha256").update(text || "").digest("hex");
  } catch {
    return "empty-payload";
  }
}

/**
 * Construct a scoped idempotency cache key incorporating the endpoint path,
 * HTTP method, and verified server-side user identity to prevent cross-endpoint
 * and cross-user key collisions without relying on unauthenticated client headers (ERP-004).
 */
export function buildIdempotencyCacheKey(
  request: NextRequest,
  idempotencyKey: string,
  userId?: string
): string {
  const pathname = request.nextUrl?.pathname || "global";
  const method = request.method || "POST";
  const user = userId || "anonymous";
  const normalizedPath = pathname.replace(/^\//, "").replace(/\//g, ":");
  return `idempotency:${normalizedPath}:${method}:${user}:${idempotencyKey}`;
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
  handler: () => Promise<NextResponse>,
  options: { userId?: string } = {}
): Promise<NextResponse> {
  const idempotencyKey = extractIdempotencyKey(request);

  // If no idempotency key was supplied, execute handler directly
  if (!idempotencyKey) {
    return handler();
  }

  // Derive authenticated user identity securely from server session or explicit verified caller
  let userId = options.userId;
  if (!userId) {
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // In tests or non-session contexts, fallback safely
    }
  }

  const requestHash = await computeRequestFingerprint(request);
  const cacheKey = buildIdempotencyCacheKey(request, idempotencyKey, userId);

  // Atomic lock acquisition using withResourceLock to prevent check-before-insert races (ERP-003)
  return withResourceLock(`lock:${cacheKey}`, async () => {
    const existing = await cache.get<IdempotencyRecord>(cacheKey);

    if (existing) {
      // Reject reuse of same idempotency key with different request payload (ERP-004)
      if (existing.requestHash && existing.requestHash !== requestHash) {
        return NextResponse.json(
          {
            success: false,
            error: "Unprocessable Entity: Idempotency key cannot be reused with a different request payload",
            code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
          },
          { status: 422 }
        );
      }

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
        requestHash,
        userId,
      },
      LOCK_TIMEOUT_SECONDS
    );

    try {
      const result = await handler();

      // Only cache successful 2xx responses
      if (result && result.status >= 200 && result.status < 300) {
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
            requestHash,
            userId,
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
  });
}

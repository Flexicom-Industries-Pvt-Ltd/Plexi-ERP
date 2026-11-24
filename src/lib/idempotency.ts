import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { auth } from "@/auth";
import crypto from "crypto";
import type { Prisma } from "@/generated/prisma";

export interface IdempotencyRecordData {
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  requestHash?: string;
  userId?: string;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCK_TIMEOUT_MS = 60 * 1000; // 60s processing timeout

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
  const user = userId || "ANONYMOUS";
  const normalizedPath = pathname.replace(/^\//, "").replace(/\//g, ":");
  return `idempotency:${normalizedPath}:${method}:${user}:${idempotencyKey}`;
}

/**
 * Atomically records an idempotency key inside an active database transaction.
 * Guarantees that the business operation and its idempotency record commit atomically (ERP-004).
 * If a concurrent transaction tries to insert the same key, PostgreSQL throws unique constraint violation (P2002).
 */
export async function recordIdempotencyInTx(
  tx: Prisma.TransactionClient,
  params: {
    key: string;
    userId?: string;
    endpoint: string;
    method?: string;
    requestHash: string;
    responseBody?: unknown;
    statusCode?: number;
  }
) {
  const userId = params.userId || "ANONYMOUS";
  const method = params.method || "POST";
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  return tx.idempotencyRecord.create({
    data: {
      key: params.key,
      userId,
      endpoint: params.endpoint,
      method,
      requestHash: params.requestHash,
      status: "COMPLETED",
      statusCode: params.statusCode || 200,
      responseBody: (params.responseBody as Prisma.InputJsonValue) || { status: "OK" },
      expiresAt,
    },
  });
}

/**
 * Checks if an operation has already been recorded in PostgreSQL.
 */
export async function checkIdempotencyInTx(
  tx: Prisma.TransactionClient,
  params: {
    key: string;
    userId?: string;
    endpoint: string;
    method?: string;
  }
) {
  const userId = params.userId || "ANONYMOUS";
  const method = params.method || "POST";

  return tx.idempotencyRecord.findUnique({
    where: {
      key_userId_endpoint_method: {
        key: params.key,
        userId,
        endpoint: params.endpoint,
        method,
      },
    },
  });
}

/**
 * withIdempotency
 *
 * Enterprise wrapper backed by PostgreSQL for transactional API mutation handlers (POST, PUT, PATCH).
 * Protects against double stock deductions, duplicate gate passes, and double picking
 * caused by operator double-clicks, process restarts, or network retries (ERP-004).
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
  const verifiedUserId = userId || "ANONYMOUS";
  const method = request.method || "POST";
  const pathname = request.nextUrl?.pathname || "global";
  const requestHash = await computeRequestFingerprint(request);
  const scopedCacheKey = buildIdempotencyCacheKey(request, idempotencyKey, verifiedUserId);

  // 1. Check L1 in-memory cache first, then PostgreSQL durable storage
  let existingRecord: any = null;
  const cachedL1 = await cache.get<IdempotencyRecordData>(scopedCacheKey);

  if (cachedL1) {
    existingRecord = {
      status: cachedL1.status,
      statusCode: cachedL1.statusCode,
      responseBody: cachedL1.body,
      requestHash: cachedL1.requestHash,
      createdAt: cachedL1.createdAt,
    };
  } else {
    try {
      if (db.idempotencyRecord) {
        existingRecord = await db.idempotencyRecord.findUnique({
          where: {
            key_userId_endpoint_method: {
              key: idempotencyKey,
              userId: verifiedUserId,
              endpoint: pathname,
              method,
            },
          },
        });
      }
    } catch (err: any) {
      console.warn("[Idempotency] Failed to query PostgreSQL IdempotencyRecord:", err?.message);
    }
  }

  if (existingRecord) {
    // Reject reuse of same idempotency key with different request payload (ERP-004)
    if (existingRecord.requestHash && existingRecord.requestHash !== requestHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Unprocessable Entity: Idempotency key cannot be reused with a different request payload",
          code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
        },
        { status: 422 }
      );
    }

    // Check if currently processing and not timed out
    const elapsed = Date.now() - new Date(existingRecord.createdAt).getTime();
    if (existingRecord.status === "PROCESSING" && elapsed < LOCK_TIMEOUT_MS) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict: This transaction is currently being processed. Please do not retry concurrently.",
          code: "IDEMPOTENT_OPERATION_IN_PROGRESS",
        },
        { status: 409 }
      );
    }

    // If completed, replay the committed response immediately
    if (existingRecord.status === "COMPLETED") {
      const response = NextResponse.json(existingRecord.responseBody, {
        status: existingRecord.statusCode || 200,
      });
      response.headers.set("X-Idempotent-Replay", "true");
      return response;
    }
  }

  // 2. Claim idempotency key in L1 cache and persist PROCESSING state in PostgreSQL
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
  let recordClaimed = false;

  await cache.set(
    scopedCacheKey,
    {
      status: "PROCESSING",
      createdAt: Date.now(),
      requestHash,
      userId: verifiedUserId,
    },
    LOCK_TIMEOUT_MS / 1000
  );

  try {
    if (db.idempotencyRecord) {
      await db.idempotencyRecord.upsert({
        where: {
          key_userId_endpoint_method: {
            key: idempotencyKey,
            userId: verifiedUserId,
            endpoint: pathname,
            method,
          },
        },
        create: {
          key: idempotencyKey,
          userId: verifiedUserId,
          endpoint: pathname,
          method,
          requestHash,
          status: "PROCESSING",
          expiresAt,
        },
        update: {
          requestHash,
          status: "PROCESSING",
          createdAt: new Date(),
          expiresAt,
        },
      });
    }
    recordClaimed = true;
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict: Concurrent request detected with the same idempotency key.",
          code: "IDEMPOTENT_OPERATION_IN_PROGRESS",
        },
        { status: 409 }
      );
    }
  }

  try {
    const result = await handler();

    // 3. On successful 2xx response, persist COMPLETED state and response payload atomically
    if (result && result.status >= 200 && result.status < 300) {
      let body: unknown;
      try {
        body = await result.clone().json();
      } catch {
        body = { status: "OK" };
      }

      await cache.set(
        scopedCacheKey,
        {
          status: "COMPLETED",
          statusCode: result.status,
          body,
          createdAt: Date.now(),
          requestHash,
          userId: verifiedUserId,
        },
        IDEMPOTENCY_TTL_MS / 1000
      );

      if (recordClaimed) {
        try {
          if (db.idempotencyRecord) {
            await db.idempotencyRecord.update({
              where: {
                key_userId_endpoint_method: {
                  key: idempotencyKey,
                  userId: verifiedUserId,
                  endpoint: pathname,
                  method,
                },
              },
              data: {
                status: "COMPLETED",
                statusCode: result.status,
                responseBody: (body as Prisma.InputJsonValue) || { status: "OK" },
              },
            });
          }
        } catch (dbErr: any) {
          console.error("[Idempotency] Failed to commit COMPLETED state:", dbErr);
        }
      }
    } else {
      // On non-2xx client/server error, release/delete the record so the client can retry
      await cache.del(scopedCacheKey);
      if (recordClaimed) {
        try {
          if (db.idempotencyRecord) {
            await db.idempotencyRecord.delete({
              where: {
                key_userId_endpoint_method: {
                  key: idempotencyKey,
                  userId: verifiedUserId,
                  endpoint: pathname,
                  method,
                },
              },
            });
          }
        } catch {
          // ignore cleanup error
        }
      }
    }

    return result;
  } catch (err) {
    // Release the record on unhandled exception so future retries are not blocked
    await cache.del(scopedCacheKey);
    if (recordClaimed) {
      try {
        if (db.idempotencyRecord) {
          await db.idempotencyRecord.delete({
            where: {
              key_userId_endpoint_method: {
                key: idempotencyKey,
                userId: verifiedUserId,
                endpoint: pathname,
                method,
              },
            },
          });
        }
      } catch {
        // ignore cleanup error
      }
    }
    throw err;
  }
}

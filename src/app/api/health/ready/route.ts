import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "DOWN";
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "UP";
  } catch (err: any) {
    dbStatus = "DOWN";
    dbError = err.message || "Database connection error";
  }

  const cacheStats = cache.getStats();
  const totalLatencyMs = Date.now() - startTime;
  const isReady = dbStatus === "UP";

  return NextResponse.json(
    {
      status: isReady ? "READY" : "NOT_READY",
      timestamp: new Date().toISOString(),
      totalLatencyMs,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
        cache: {
          status: "UP",
          entries: cacheStats.size,
          maxCapacity: cacheStats.maxEntries,
        },
      },
    },
    { status: isReady ? 200 : 503 }
  );
}

import { NextRequest, NextResponse } from "next/server";

/**
 * verifyCronRequest
 * Validates that the request has a valid Bearer token matching CRON_SECRET.
 * Fails closed: if CRON_SECRET is not configured or mismatch, rejects with 401.
 */
export function verifyCronRequest(request: Request | NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim().length === 0) {
    console.error("[CRON_SECURITY_ALERT] CRON_SECRET environment variable is not configured. Failing closed.");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: CRON_SECRET is not configured on server" },
        { status: 401 }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Invalid or missing cron secret" },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

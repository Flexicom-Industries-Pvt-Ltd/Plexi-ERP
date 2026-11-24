import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, isSuperAdminRole } from "@/lib/api-auth";
import { apiError } from "@/lib/api-response";
import { taskQueue } from "@/lib/queue/task-queue";
import { rateLimiters, applyRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = await rateLimiters.general(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const job = await taskQueue.getJob(id);

    if (!job) {
      return applyRateLimitHeaders(apiError("Job not found", 404), rateLimitRes);
    }

    // Enforce job ownership & authorized access (ERP-030)
    if (job.createdById && job.createdById !== auth.user.id && !isSuperAdminRole(auth.user.role)) {
      return applyRateLimitHeaders(
        apiError("Forbidden: Cannot download another user's export job", 403),
        rateLimitRes
      );
    }

    if (job.status !== "COMPLETED") {
      return applyRateLimitHeaders(
        apiError(`Job is not yet completed. Current status: ${job.status}`, 400),
        rateLimitRes
      );
    }

    const result = job.result as any;
    if (!result?.csvData) {
      return applyRateLimitHeaders(
        apiError("No exported data file found for this job", 404),
        rateLimitRes
      );
    }

    const filename = `export-${job.type.toLowerCase()}-${job.id}.csv`;
    return new Response(result.csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    return applyRateLimitHeaders(
      apiError(err.message || "Failed to download exported file", 500),
      rateLimitRes
    );
  }
}
